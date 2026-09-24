-- Feature: monthly card takes priority over times cards
-- Date: 2026-09-24
--
-- Rule: a member may hold a monthly card and a times card at the same time.
-- Check-ins use the usable monthly card first and spend no times credit;
-- times credits are used only once no monthly card is usable (expired).
--
-- Changes:
--   1. Unique index: one active card PER KIND per user (was: one active card
--      per user), so an active monthly and an active times card can coexist.
--   2. assign_subscription: archives only the active card of the same kind.
--      Assigning a times card no longer archives a running monthly card.
--   3. find_usable_subscription: ORDER BY monthly first, then newest.
--      book_course and perform_checkin pick this up unchanged.
--   4. perform_course_checkin: a booking linked to a times card is re-linked
--      to a usable monthly card at check-in (booked before the monthly card
--      was assigned), so no times credit is spent.
--
-- KEEP IN SYNC with pickUsableSubscription() in
-- src/lib/utils/subscription-helpers.ts (TS mirror of the ordering).
--
-- Idempotent: IF [NOT] EXISTS / CREATE OR REPLACE. Grants on replaced
-- functions are preserved by CREATE OR REPLACE.

-- ============================================================================
-- 1. One active card per kind (monthly / times) per user
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS one_active_sub_per_kind_per_user
  ON subscriptions (user_id, (type = 'monthly'))
  WHERE status = 'active';

DROP INDEX IF EXISTS one_active_sub_per_user;

-- ============================================================================
-- 2. find_usable_subscription — monthly first
-- ============================================================================

CREATE OR REPLACE FUNCTION find_usable_subscription(
  p_user_id UUID,
  p_exclude_id UUID DEFAULT NULL
) RETURNS subscriptions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
BEGIN
  -- Only the user themselves or an admin may look up a subscription.
  -- (Internal calls from book_course/perform_course_checkin inherit the
  --  invoker's JWT, so members resolving their own card and admins resolving
  --  any member both pass.)
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT is_admin() THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_sub
  FROM subscriptions
  WHERE user_id = p_user_id
    AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    AND (
      (type IN ('5_times', '10_times')
       AND remaining_credits > 0
       AND status <> 'depleted')
      OR
      (type = 'monthly'
       AND status = 'active'
       AND end_date >= CURRENT_DATE)
    )
  -- Monthly first: times credits are only spent when no monthly card is usable
  ORDER BY (type = 'monthly') DESC, created_at DESC
  LIMIT 1;

  RETURN v_sub;
END;
$$;

-- ============================================================================
-- 3. assign_subscription — archive same kind only
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_subscription(
  p_user_id UUID,
  p_type subscription_type,
  p_start_date DATE DEFAULT NULL,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  v_new_sub_id UUID;
  v_end_date DATE;
  v_total_credits INTEGER;
  v_remaining_credits INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign subscriptions';
  END IF;

  -- Archive only the active card of the SAME kind. A new times card must not
  -- end a running monthly card (monthly is used first, then times credits);
  -- a new monthly card replaces the current monthly card.
  UPDATE subscriptions
  SET status = 'archived'
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (type = 'monthly') = (p_type = 'monthly');

  IF p_type = 'monthly' THEN
    IF p_start_date IS NULL THEN
      p_start_date := CURRENT_DATE;
    END IF;
    v_end_date := p_start_date + INTERVAL '30 days';
    v_total_credits := NULL;
    v_remaining_credits := NULL;
  ELSIF p_type = '5_times' THEN
    v_total_credits := 5;
    v_remaining_credits := 5;
    p_start_date := NULL;
    v_end_date := NULL;
  ELSIF p_type = '10_times' THEN
    v_total_credits := 10;
    v_remaining_credits := 10;
    p_start_date := NULL;
    v_end_date := NULL;
  END IF;

  INSERT INTO subscriptions (
    user_id, type, status, start_date, end_date,
    total_credits, remaining_credits, assigned_by
  ) VALUES (
    p_user_id, p_type, 'active', p_start_date, v_end_date,
    v_total_credits, v_remaining_credits, p_admin_id
  ) RETURNING id INTO v_new_sub_id;

  RETURN v_new_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 4. perform_course_checkin — re-link times-card bookings to monthly
-- ============================================================================

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
  v_alt subscriptions%ROWTYPE;
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
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_booking.subscription_id;
    -- Best other card (monthly first, see find_usable_subscription)
    v_alt := find_usable_subscription(p_user_id, v_booking.subscription_id);

    IF v_sub.id IS NULL
       OR (v_sub.type IN ('5_times', '10_times') AND v_sub.remaining_credits <= 0)
       OR (v_sub.type = 'monthly' AND v_sub.end_date < CURRENT_DATE)
    THEN
      -- Linked card is gone/depleted/expired — use the alternative (may be none)
      v_sub := v_alt;
    ELSIF v_sub.type IN ('5_times', '10_times') AND v_alt.type = 'monthly' THEN
      -- Booked with a times card, but a monthly card is usable now: use it
      -- instead of spending a times credit.
      v_sub := v_alt;
    END IF;

    IF v_sub.id IS NOT NULL AND v_sub.id IS DISTINCT FROM v_booking.subscription_id THEN
      UPDATE bookings
      SET subscription_id = v_sub.id
      WHERE id = v_booking.id;

      v_booking.subscription_id := v_sub.id;
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
-- 1. Member with an active monthly card; assign a 10-times card:
--      SELECT assign_subscription('<user>', '10_times');
--    -> both cards status = 'active'.
-- 2. Check in to a course:
--    -> checkins.subscription_id = the monthly card; times card still 10.
-- 3. Set the monthly card's end_date to yesterday and check in again:
--    -> times card drops to 9.
