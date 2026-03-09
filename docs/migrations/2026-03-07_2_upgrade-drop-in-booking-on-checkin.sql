-- Migration: Extend subscription upgrade at check-in to cover 'drop_in' bookings
-- Date: 2026-03-07
-- Depends on: 2026-03-07_1_upgrade-single-booking-on-checkin.sql
--
-- Problem: Migration _1 only upgrades 'single' bookings → 'subscription' at check-in
--          time when the user has acquired an active card after the original booking.
--          'drop_in' bookings were not covered. Scenario:
--
--            1. User has no booking and no subscription → admin scans → drop_in
--               booking is created on the spot and user is checked in.
--            2. User acquires a subscription card (sold on site or between scans).
--            3. Admin scans again (duplicate check-in). The non-drop-in path finds
--               the existing 'drop_in' booking. Previously the upgrade check was
--               skipped for drop_in, so the subscription was never used and no
--               credit was deducted.
--
-- Fix: Extend the upgrade condition from `v_booking_type = 'single'` to
--      `v_booking_type IN ('single', 'drop_in')` so that any plain booking
--      (pre-booked or walk-in) is upgraded when the user now holds an active
--      subscription. Credit deduction and subscription validation then proceed
--      via the existing shared block below.
--
-- Note: The TypeScript getUserBookingForCourse helper was updated in parallel to
--       also surface subscription details for 'drop_in' bookings, so the UI
--       correctly shows the subscription plan and remaining credits before the
--       admin confirms the duplicate check-in.

CREATE OR REPLACE FUNCTION perform_course_checkin(
  p_user_id UUID,
  p_course_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_is_drop_in BOOLEAN DEFAULT false,
  p_payment_method payment_method DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_sub subscriptions%ROWTYPE;
  v_checkin_id UUID;
  v_booking_type booking_type;
  v_course courses%ROWTYPE;
  v_current_attendance INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can perform check-ins';
  END IF;

  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;

  IF p_is_drop_in THEN
    -- For drop-ins, check if user has an active subscription first
    SELECT * INTO v_sub FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (
        (type IN ('5_times', '10_times') AND remaining_credits > 0)
        OR (type = 'monthly' AND end_date >= CURRENT_DATE)
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub IS NOT NULL THEN
      -- User has active subscription - use it instead of drop-in
      INSERT INTO bookings (user_id, course_id, subscription_id, booking_type, status)
      VALUES (p_user_id, p_course_id, v_sub.id, 'subscription', 'confirmed')
      RETURNING * INTO v_booking;
      v_booking_type := 'subscription'::booking_type;
    ELSE
      -- No active subscription - create drop-in booking
      INSERT INTO bookings (user_id, course_id, booking_type, status)
      VALUES (p_user_id, p_course_id, 'drop_in', 'confirmed')
      RETURNING * INTO v_booking;
      v_booking_type := 'drop_in'::booking_type;
    END IF;
  ELSE
    SELECT * INTO v_booking FROM bookings
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'confirmed';

    IF v_booking IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No confirmed booking found');
    END IF;

    v_booking_type := v_booking.booking_type;

    -- If the booking was created as 'single' (pre-booked without a subscription) OR
    -- 'drop_in' (walked in without a subscription on first scan), check whether the
    -- user has since acquired a valid active subscription.
    --
    -- Covers:
    --   • User pre-books as single class then buys a card on the day of the class.
    --   • User walked in as drop-in (first scan created drop_in booking) then
    --     acquires a subscription before/during a duplicate check-in scan.
    IF v_booking_type IN ('single'::booking_type, 'drop_in'::booking_type) THEN
      SELECT * INTO v_sub FROM subscriptions
      WHERE user_id = p_user_id
        AND status = 'active'
        AND (
          (type IN ('5_times', '10_times') AND remaining_credits > 0)
          OR (type = 'monthly' AND end_date >= CURRENT_DATE)
        )
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_sub IS NOT NULL THEN
        -- Upgrade the booking to subscription so credits are deducted correctly
        v_booking_type := 'subscription'::booking_type;
        UPDATE bookings
        SET booking_type = 'subscription',
            subscription_id = v_sub.id
        WHERE id = v_booking.id;
        -- Keep v_booking in sync so the checkin INSERT below uses the right subscription_id
        v_booking.booking_type := 'subscription';
        v_booking.subscription_id := v_sub.id;
      END IF;
    END IF;
  END IF;

  IF v_booking_type = 'subscription' THEN
    -- Get subscription if not already loaded (for existing bookings)
    IF v_sub IS NULL THEN
      SELECT * INTO v_sub FROM subscriptions WHERE id = v_booking.subscription_id AND status = 'active';
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
        -- Flip monthly subscription to expired when used after end_date
        UPDATE subscriptions
        SET status = 'expired'
        WHERE id = v_sub.id
          AND status = 'active';

        RETURN jsonb_build_object('success', false, 'message', 'Subscription expired');
      END IF;
    END IF;
  END IF;

  INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type, payment_method)
  VALUES (p_user_id, v_booking.subscription_id, p_admin_id, p_course_id, v_booking_type, p_payment_method)
  RETURNING id INTO v_checkin_id;

  -- Deduct one credit per check-in for times-card subscriptions
  IF v_booking_type = 'subscription' AND v_sub.type IN ('5_times', '10_times') THEN
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 <= 0 THEN 'depleted'::subscription_status ELSE status END
    WHERE id = v_sub.id;
    -- Re-read subscription so returned remaining_credits matches DB (avoids stale value)
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_sub.id;
  END IF;

  SELECT COUNT(*) INTO v_current_attendance FROM checkins WHERE course_id = p_course_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION perform_course_checkin IS
  'Performs course check-in. Allows duplicate check-ins for the same course. '
  'Each check-in deducts one credit if applicable (times-card subscriptions). '
  'Accepts payment_method parameter. '
  'Marks expired monthly subscriptions as expired when used. '
  'Upgrades single OR drop_in bookings to subscription at check-in time when the '
  'user has acquired an active subscription after the original booking was made. '
  'Covers pre-booked single-class users and walk-in drop-in users who buy a card '
  'on the day of the class or between duplicate check-in scans.';
