-- Migration: Fix times card not deducted on check-in (row-level NULL test bug)
-- Date: 2026-08-10
--
-- Bug: a member books a course with no subscription (booking_type = 'single'),
-- then buys a times card, then checks in — the booking is not upgraded to
-- 'subscription' and no credit is deducted.
--
-- Root cause: find_usable_subscription() returns a subscriptions%ROWTYPE, and
-- callers tested it with `IF v_sub IS NOT NULL`. For a composite row, Postgres
-- defines `row IS NOT NULL` as "EVERY field is non-null". A times card always
-- has start_date/end_date = NULL (monthly-only columns), and a monthly pass
-- always has total_credits/remaining_credits = NULL, so the test was ALWAYS
-- false and the upgrade/deduction branch never ran. (`IS NULL` and
-- `IS NOT NULL` are not inverses for rows — a mixed-null row fails both.)
--
-- Fix: test `v_sub.id IS [NOT] NULL` instead (id is NOT NULL on real rows, and
-- NULL when SELECT INTO found nothing or the helper returned no row). Same fix
-- in book_course(), which had regressed from the correct `.id` test in
-- 2026-02-06_4_fix-rls-subscription-access.sql — that regression also made
-- bookings by existing card holders come out as 'single'.
--
-- Bodies below are copied verbatim from 2026-04-04_1_fix-book-course-and-checkin.sql
-- with only the five NULL-test predicates changed.

-- ============================================================================
-- Step 1: book_course — fix subscription detection predicate
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

COMMENT ON FUNCTION book_course IS
  'Books a user into a course. Uses find_usable_subscription() for detection. '
  'When p_is_admin_override is true (walk-in / capacity override), allows booking '
  'until the course end time and skips the capacity check.';

-- ============================================================================
-- Step 2: perform_course_checkin — fix upgrade/re-link/validation predicates
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

      -- .id test, not row test — see migration header
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
