-- Fix: Times-card credit deduction + subscription usability detection (consolidated)
-- Date: 2026-08-16
--
-- Reported bugs this migration fixes:
--   1. Users with a times card (5_times / 10_times): after booking and check-in,
--      the card is not deducted properly.
--   2. User books a course first (booking_type = 'single'), then is assigned a
--      times card; the times card is not deducted at check-in.
--   3. Subscription status/availability is not detected consistently between
--      booking, check-in, and the UI (walk-in check-in only matched
--      status = 'active', ignoring archived cards that still have credits).
--
-- Why a consolidated file:
--   The codebase was built step-by-step and earlier partial fixes (2026-04-04_1,
--   2026-08-10_1) may or may not have been applied to the live database. This
--   file re-declares the four functions that drive subscription detection and
--   credit deduction in their final, correct form, so it can be applied on top
--   of ANY current state. Every statement here is CREATE OR REPLACE FUNCTION
--   (idempotent) and keeps the exact signatures + JSONB response shapes that the
--   TypeScript server actions depend on.
--
-- Changes vs the latest prior versions (2026-08-10_1 / 2026-03-05_1):
--   A. perform_course_checkin / perform_checkin now DECREMENT the times card
--      BEFORE inserting the check-in record, with a conditional decrement
--      (WHERE remaining_credits > 0) and a FOUND check. This closes the
--      double-spend race (two concurrent scans could both consume the last
--      credit) and guarantees a check-in is never recorded for a debit that
--      did not happen.
--   B. perform_checkin (walk-in) now uses find_usable_subscription() instead of
--      `status = 'active'`, matching the course check-in path and the scanner UI
--      rule: archived times cards with remaining credits are still usable.
--   C. All functions keep SECURITY DEFINER + SET search_path = public, pg_temp
--      (+ row_security = off where row access is needed).

-- ============================================================================
-- 1. find_usable_subscription — single source of truth for "usable" detection
--    (unchanged from 2026-04-04_1; re-declared so this file is self-contained)
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
  -- Relaxed subscription detection:
  --   Times cards (5_times / 10_times): any card with remaining_credits > 0
  --     that is not marked 'depleted'. Ignores 'active' vs 'archived'.
  --   Monthly: must be status = 'active' AND end_date >= today.
  -- Always picks the most recently created usable subscription.
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
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_sub;
END;
$$;

-- ============================================================================
-- 2. book_course — capacity-checked booking with subscription detection
--    (unchanged from 2026-08-10_1; re-declared so this file is self-contained)
-- ============================================================================

CREATE OR REPLACE FUNCTION book_course(
  p_user_id UUID,
  p_course_id UUID,
  p_is_admin_override BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_course courses%ROWTYPE;
  v_current_bookings INTEGER;
  v_subscription subscriptions%ROWTYPE;
  v_booking_type booking_type;
  v_booking_id UUID;
BEGIN
  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;

  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;

  -- Time check: normal users cannot book after start time.
  -- Admin override (walk-ins) can book anytime on the course day.
  IF p_is_admin_override THEN
    IF (NOW() AT TIME ZONE 'Europe/Zurich')::DATE > v_course.scheduled_date THEN
      RETURN jsonb_build_object('success', false, 'message', 'Course day has passed');
    END IF;
  ELSE
    IF (v_course.scheduled_date + v_course.start_time) < NOW() AT TIME ZONE 'Europe/Zurich' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Course has already started');
    END IF;
  END IF;

  -- Capacity check: skip for admin overrides (walk-ins / capacity override)
  v_current_bookings := get_course_booking_count(p_course_id);
  IF NOT p_is_admin_override AND v_current_bookings >= v_course.capacity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course is full');
  END IF;

  -- Duplicate booking check
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a booking for this course');
  END IF;

  -- Subscription detection via shared helper.
  -- Test .id, not the row itself: `row IS NOT NULL` requires ALL fields
  -- non-null and is always false for times cards (NULL start/end_date).
  v_subscription := find_usable_subscription(p_user_id);

  IF v_subscription.id IS NOT NULL THEN
    v_booking_type := 'subscription'::booking_type;
  ELSE
    v_booking_type := 'single'::booking_type;
  END IF;

  INSERT INTO bookings (user_id, course_id, subscription_id, booking_type, status)
  VALUES (p_user_id, p_course_id, v_subscription.id, v_booking_type, 'confirmed')
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking successful',
    'booking_id', v_booking_id,
    'booking_type', v_booking_type,
    'current_capacity', v_current_bookings + 1,
    'max_capacity', v_course.capacity
  );
END;
$$;

-- ============================================================================
-- 3. perform_course_checkin — course-scoped check-in
--    Base: 2026-08-10_1. Changed: times-card debit happens BEFORE the check-in
--    INSERT, with a conditional decrement + FOUND check (race fix).
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

  -- Walk-in path: delegate to book_course with admin override
  IF p_is_drop_in THEN
    v_book_result := book_course(p_user_id, p_course_id, true);

    IF NOT COALESCE((v_book_result->>'success')::BOOLEAN, false) THEN
      RETURN v_book_result;
    END IF;

    v_booking_id := (v_book_result->>'booking_id')::UUID;

    SELECT * INTO v_booking FROM bookings WHERE id = v_booking_id;

    IF v_booking IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Booking not found after creation');
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

    -- Try to (re-)link to a usable subscription. Covers:
    --   1. single/drop_in: user acquired a subscription after booking
    --   2. subscription with depleted/expired card: user has a new card
    IF v_booking_type IN ('single'::booking_type, 'drop_in'::booking_type) THEN
      v_sub := find_usable_subscription(p_user_id);

      -- .id test, not row test — see header notes
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
  END IF;

  -- Validate subscription before check-in
  IF v_booking_type = 'subscription' THEN
    -- Load subscription if not already loaded (drop-in path set it via book_course)
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
-- 4. perform_checkin — walk-in check-in (no course)
--    Base: 2026-03-05_1. Changed:
--      - Detection now uses find_usable_subscription() (archived times cards
--        with credits are usable; monthly must be active + within end_date)
--      - Times-card debit happens BEFORE the check-in INSERT, with a
--        conditional decrement + FOUND check (race fix)
--      - Response shape unchanged: { success, message, checkin_id, remaining }
-- ============================================================================

CREATE OR REPLACE FUNCTION perform_checkin(
  p_user_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_payment_method payment_method DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
  v_checkin_id UUID;
BEGIN
  -- Check if admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can perform check-ins';
  END IF;

  -- Use the same relaxed usability rule as course check-ins / the scanner UI:
  -- archived times cards with remaining credits are still usable.
  v_sub := find_usable_subscription(p_user_id);

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
  END IF;

  -- Validate subscription, then debit BEFORE inserting the check-in record
  -- (debit first => a failed debit never leaves an orphan check-in).
  IF v_sub.type = 'monthly' THEN
    IF CURRENT_DATE < v_sub.start_date OR CURRENT_DATE > v_sub.end_date THEN
       -- For past-end_date monthlies, flip to expired
       IF v_sub.end_date < CURRENT_DATE THEN
         UPDATE subscriptions
         SET status = 'expired'
         WHERE id = v_sub.id
           AND status = 'active'
           AND end_date < CURRENT_DATE;
       END IF;

       RETURN jsonb_build_object('success', false, 'message', 'Subscription expired or not started');
    END IF;
  ELSE -- Times card
    IF v_sub.remaining_credits <= 0 THEN
       UPDATE subscriptions SET status = 'depleted' WHERE id = v_sub.id;
       RETURN jsonb_build_object('success', false, 'message', 'No credits remaining');
    END IF;

    -- Conditional decrement closes the double-spend race
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 <= 0 THEN 'depleted'::subscription_status ELSE status END
    WHERE id = v_sub.id
      AND remaining_credits > 0;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'No credits remaining');
    END IF;

    SELECT * INTO v_sub FROM subscriptions WHERE id = v_sub.id;
  END IF;

  -- Perform Check-in
  INSERT INTO checkins (user_id, subscription_id, admin_id, payment_method)
  VALUES (p_user_id, v_sub.id, p_admin_id, p_payment_method)
  RETURNING id INTO v_checkin_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful',
    'checkin_id', v_checkin_id,
    'remaining', CASE
      WHEN v_sub.type = 'monthly' THEN (v_sub.end_date - CURRENT_DATE)::int
      ELSE v_sub.remaining_credits
    END
  );
END;
$$;

-- ============================================================================
-- Verification queries (run after applying)
-- ============================================================================
--
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_name IN ('find_usable_subscription','book_course',
--                        'perform_course_checkin','perform_checkin')
--   AND routine_schema = 'public'
-- ORDER BY routine_name;
--
-- Expected: all 4 present. Search for 'WHERE id = v_sub.id' in the function
-- bodies of perform_course_checkin / perform_checkin to confirm the
-- conditional-decrement race fix is in place.
