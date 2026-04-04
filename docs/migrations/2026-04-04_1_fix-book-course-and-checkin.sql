-- Migration: Fix book_course() subscription detection + allow admin walk-in overrides
--            + extract find_usable_subscription() helper to eliminate duplication
-- Date: 2026-04-04
-- Depends on: 2026-03-09_1_remove-drop-in-booking-on-checkin.sql
--
-- Problems fixed:
--
-- 1. book_course() rejects walk-ins because "Course has already started"
--    Walk-ins arrive DURING the course. The drop-in path in perform_course_checkin
--    delegates to book_course(), which blocks any booking after the course start
--    time. Fix: accept an optional p_is_admin_override flag; when true, allow
--    booking until the course END time (start + duration) and skip capacity check.
--
-- 2. book_course() subscription detection is too weak
--    It only checks status = 'active', without verifying remaining_credits > 0
--    for times cards or end_date >= CURRENT_DATE for monthly cards. It also
--    ignores archived times cards that still have credits (a real-world scenario
--    that 2026-03-07_3 fixed in perform_course_checkin but never in book_course).
--    Fix: use the same relaxed detection logic everywhere.
--
-- 3. Capacity override is broken
--    The admin capacity-override dialog calls performCourseCheckin(isDropIn=true),
--    which delegates to book_course(), which enforces capacity. Fix: skip the
--    capacity check when p_is_admin_override is true.
--
-- 4. Subscription detection logic was duplicated in 5 places (book_course,
--    perform_course_checkin x3, TypeScript actions x2). Fix: extract a single
--    SQL helper find_usable_subscription() used by all SQL consumers.
--
-- 5. Client-server subscription detection mismatch (handled in TypeScript, not SQL)
--    getUserBookingForCourse() checks status = 'active' only when looking for
--    upgraded subscriptions on single/drop_in bookings. The RPC uses the relaxed
--    check. (Fixed in accompanying TypeScript change.)

-- ============================================================================
-- Step 1: Create find_usable_subscription() helper — single source of truth
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

COMMENT ON FUNCTION find_usable_subscription IS
  'Returns the most recently created usable subscription for a user. '
  'For times cards: remaining_credits > 0 and not depleted (ignores active/archived). '
  'For monthly: status = active and end_date >= today. '
  'Optionally excludes a specific subscription ID (for re-linking).';

-- ============================================================================
-- Step 2: Fix book_course() with admin override, using the helper
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
  v_course_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;

  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;

  -- Time check: normal users cannot book after start time.
  -- Admin override (walk-ins) can book until the course END time.
  IF p_is_admin_override THEN
    v_course_end := (
      (v_course.scheduled_date + v_course.start_time)
      AT TIME ZONE 'Europe/Zurich'
      + (v_course.duration_minutes || ' minutes')::INTERVAL
    );
    IF NOW() AT TIME ZONE 'Europe/Zurich' > v_course_end THEN
      RETURN jsonb_build_object('success', false, 'message', 'Course has already ended');
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

  -- Subscription detection via shared helper
  v_subscription := find_usable_subscription(p_user_id);

  IF v_subscription IS NOT NULL THEN
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

COMMENT ON FUNCTION book_course IS
  'Books a user into a course. Uses find_usable_subscription() for detection. '
  'When p_is_admin_override is true (walk-in / capacity override), allows booking '
  'until the course end time and skips the capacity check.';

-- ============================================================================
-- Step 3: Update perform_course_checkin to use the helper
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

      IF v_sub IS NOT NULL THEN
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

      IF v_sub IS NULL
         OR (v_sub.type IN ('5_times', '10_times') AND v_sub.remaining_credits <= 0)
         OR (v_sub.type = 'monthly' AND v_sub.end_date < CURRENT_DATE)
      THEN
        -- Linked card is gone/depleted/expired — find an alternative
        v_sub := find_usable_subscription(p_user_id, v_booking.subscription_id);

        IF v_sub IS NOT NULL THEN
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
    IF v_sub IS NULL THEN
      SELECT * INTO v_sub FROM subscriptions WHERE id = v_booking.subscription_id;
    END IF;

    IF v_sub IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
    END IF;

    IF v_sub.type IN ('5_times', '10_times') THEN
      IF v_sub.remaining_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No remaining credits');
      END IF;
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

  -- Create the check-in record
  INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type, payment_method)
  VALUES (p_user_id, v_booking.subscription_id, p_admin_id, p_course_id, v_booking_type, p_payment_method)
  RETURNING id INTO v_checkin_id;

  -- Deduct one credit per check-in for times-card subscriptions
  IF v_booking_type = 'subscription' AND v_sub.type IN ('5_times', '10_times') THEN
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE
                   WHEN remaining_credits - 1 <= 0
                   THEN 'depleted'::subscription_status
                   ELSE status
                 END
    WHERE id = v_sub.id;

    SELECT * INTO v_sub FROM subscriptions WHERE id = v_sub.id;
  END IF;

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

COMMENT ON FUNCTION perform_course_checkin IS
  'Performs course check-in. For walk-ins (p_is_drop_in = true), delegates to '
  'book_course with admin override. Uses find_usable_subscription() for all '
  'subscription detection. Upgrades single/drop_in bookings and re-links '
  'subscription bookings with depleted/expired cards. '
  'Deducts one credit per check-in for times cards. '
  'Marks expired monthly subscriptions as expired when used after end_date.';
