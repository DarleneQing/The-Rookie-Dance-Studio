-- Fix: shared-account duplicate check-ins in the walk-in path
-- Date: 2026-08-16
--
-- Design intent (confirmed with product): duplicate check-ins are a FEATURE.
-- Several members share one account, so the same user_id legitimately checks
-- into the SAME course more than once — once per person — and every check-in
-- must deduct one subscription credit. This has always been true for the
-- normal (non-drop-in) path, which has no duplicate guard and deducts per
-- check-in.
--
-- Gap fixed here: the WALK-IN (p_is_drop_in = true) path delegated booking
-- creation to book_course(), whose "You already have a booking for this
-- course" guard (and the unique_confirmed_booking partial index) rejected the
-- SECOND walk-in for the same account + course. That broke:
--   - manual "Add Check-in" in the course details dialog (always drop-in)
--   - any direct walk-in RPC call for an account that already had a booking
--     for that course
--
-- Fix: the drop-in path first looks for an existing confirmed booking for
-- (user, course) and reuses it; only when none exists does it delegate to
-- book_course() to create one. The rest of the function is unchanged: it
-- validates the subscription, upgrades single/drop_in to subscription when a
-- usable card exists, and deducts exactly one credit per check-in.
--
-- book_course() itself is unchanged: a MEMBER still cannot create two
-- bookings for the same course (correct behavior); only the check-in path
-- tolerates repeats, which is the intent.
--
-- Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION perform_course_checkin(
  p_user_id UUID,
  p_course_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_is_drop_in BOOLEAN DEFAULT false,
  p_payment_method payment_method DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_sub subscriptions%ROWTYPE;
  v_checkin_id UUID;
  v_booking_type booking_type;
  v_course courses%ROWTYPE;
  v_current_attendance INTEGER;
  v_book_result JSONB;
  v_booking_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can perform check-ins';
  END IF;

  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;

  IF p_is_drop_in THEN
    -- Shared-account tolerance: the same account may already hold a confirmed
    -- booking for this course (e.g. a family member was checked in earlier).
    -- Reuse that booking instead of failing on book_course's duplicate guard,
    -- so the second person's check-in still records and deducts a credit.
    SELECT * INTO v_booking
    FROM bookings
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND status = 'confirmed';

    IF v_booking.id IS NULL THEN
      -- No booking yet — create one (capacity, time and subscription rules
      -- all live in book_course).
      v_book_result := book_course(p_user_id, p_course_id, true);

      IF NOT COALESCE((v_book_result->>'success')::BOOLEAN, false) THEN
        RETURN v_book_result;
      END IF;

      v_booking_id := (v_book_result->>'booking_id')::UUID;

      SELECT * INTO v_booking FROM bookings WHERE id = v_booking_id;

      IF v_booking IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Booking not found after creation');
      END IF;
    END IF;

    v_booking_type := v_booking.booking_type;

  ELSE
    -- Normal path: user must already have a confirmed booking
    SELECT * INTO v_booking
    FROM bookings
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND status = 'confirmed';

    IF v_booking IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No confirmed booking found');
    END IF;

    v_booking_type := v_booking.booking_type;
  END IF;

  -- Upgrade / re-link subscription on the booking. Runs for BOTH paths:
  --   - normal path: single/drop_in -> subscription when a card was acquired
  --     after booking; subscription with depleted/expired card -> new card
  --   - walk-in path reusing an existing booking: the first person may have
  --     paid cash (single booking); if the account now has a usable card,
  --     the second person's check-in should upgrade and deduct too.
  --   - walk-in path that just created a booking via book_course: book_course
  --     already set the right type, so this block is a harmless no-op.
  IF v_booking_type IN ('single'::booking_type, 'drop_in'::booking_type) THEN
    v_sub := find_usable_subscription(p_user_id);

    -- .id test, not row test — see 2026-08-16_1 header notes
    IF v_sub.id IS NOT NULL THEN
      v_booking_type := 'subscription'::booking_type;

      UPDATE bookings
      SET booking_type    = 'subscription',
          subscription_id = v_sub.id
      WHERE id = v_booking.id;

      v_booking.booking_type    := 'subscription';
      v_booking.subscription_id := v_sub.id;
    END IF;

  ELSIF v_booking_type = 'subscription' THEN
    -- Check if the linked subscription is still usable
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_booking.subscription_id;

    IF v_sub.id IS NULL
       OR (v_sub.type IN ('5_times', '10_times') AND v_sub.remaining_credits <= 0)
       OR (v_sub.type = 'monthly' AND v_sub.end_date < CURRENT_DATE)
    THEN
      -- Linked card is gone/depleted/expired — find an alternative
      v_sub := find_usable_subscription(p_user_id, v_booking.subscription_id);

      IF v_sub.id IS NOT NULL THEN
        UPDATE bookings
        SET subscription_id = v_sub.id
        WHERE id = v_booking.id;

        v_booking.subscription_id := v_sub.id;
      END IF;
    END IF;
  END IF;

  -- Validate subscription before check-in
  IF v_booking_type = 'subscription' THEN
    -- Load subscription if not already loaded (walk-in path may have reused
    -- an existing booking without touching v_sub)
    IF v_sub.id IS NULL THEN
      SELECT * INTO v_sub FROM subscriptions WHERE id = v_booking.subscription_id;
    END IF;

    IF v_sub.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
    END IF;

    IF v_sub.type IN ('5_times', '10_times') THEN
      IF v_sub.remaining_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No remaining credits');
      END IF;

      -- Deduct one credit per check-in for times-card subscriptions.
      -- Conditional decrement + FOUND check: two concurrent scans can no longer
      -- both consume the last credit, and a check-in is never recorded for a
      -- debit that did not happen (debit runs BEFORE the check-in INSERT).
      UPDATE subscriptions
      SET remaining_credits = remaining_credits - 1,
          status = CASE
                     WHEN remaining_credits - 1 <= 0
                     THEN 'depleted'::subscription_status
                     ELSE status
                   END
      WHERE id = v_sub.id
        AND remaining_credits > 0;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No remaining credits');
      END IF;

      SELECT * INTO v_sub FROM subscriptions WHERE id = v_sub.id;
    ELSIF v_sub.type = 'monthly' THEN
      IF v_sub.end_date < CURRENT_DATE THEN
        UPDATE subscriptions
        SET status = 'expired'
        WHERE id = v_sub.id
          AND status = 'active';

        RETURN jsonb_build_object('success', false, 'message', 'Subscription expired');
      END IF;
    END IF;
  END IF;

  -- Create the check-in record (after a successful debit, if any)
  INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type, payment_method)
  VALUES (p_user_id, v_booking.subscription_id, p_admin_id, p_course_id, v_booking_type, p_payment_method)
  RETURNING id INTO v_checkin_id;

  SELECT COUNT(*) INTO v_current_attendance
  FROM checkins
  WHERE course_id = p_course_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful',
    'checkin_id', v_checkin_id,
    'booking_type', v_booking_type,
    'current_attendance', v_current_attendance,
    'max_capacity', v_course.capacity,
    'remaining_credits', CASE
      WHEN v_booking_type = 'subscription' AND v_sub.type IN ('5_times', '10_times')
      THEN v_sub.remaining_credits
      ELSE NULL
    END
  );
END;
$$;

-- ============================================================================
-- Verification (run after applying)
-- ============================================================================
--
-- 1. Create a test course + a member with a 5_times card (5 credits).
-- 2. Walk-in check-in #1 (p_is_drop_in = true):
--      SELECT perform_course_checkin('<user>', '<course>', auth.uid(), true, 'abo');
--    -> success, remaining_credits = 4, one booking + one checkin created.
-- 3. Walk-in check-in #2 (same account + course):
--      SELECT perform_course_checkin('<user>', '<course>', auth.uid(), true, 'abo');
--    -> success (booking reused, NOT "already have a booking"), remaining = 3,
--       second checkin row created. This is the shared-account repeat.
-- 4. Confirm book_course still guards members:
--      SELECT book_course('<user>', '<course>');
--    -> "You already have a booking for this course" (unchanged, correct).
