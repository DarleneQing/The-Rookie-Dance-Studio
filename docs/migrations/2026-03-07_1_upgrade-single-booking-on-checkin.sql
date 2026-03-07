-- Migration: Upgrade 'single' bookings to 'subscription' at check-in when user has an active card
-- Date: 2026-03-07
-- Problem: A user books a course without a subscription (booking_type = 'single').
--          On the day of the course the admin sells/assigns them a subscription on site.
--          When the admin scans the QR code, perform_course_checkin reads the stored
--          booking_type ('single') and skips the credit-deduction block entirely.
-- Fix: In the non-drop-in path, after loading the booking, check whether the user now
--      has a valid active subscription. If so, upgrade the booking record and proceed
--      with the normal subscription validation + credit-deduction logic.

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

    -- If the booking was created as 'single' (user had no subscription at booking time),
    -- check whether they have since acquired a valid active subscription.
    -- This covers the case where a user buys/receives a card on the day of the class.
    IF v_booking_type = 'single' THEN
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

  -- Deduct credits for subscription-based check-ins (each time)
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
  'Each check-in deducts subscription credits if applicable. '
  'Accepts payment_method parameter. '
  'Marks expired monthly subscriptions as expired when used. '
  'Upgrades single bookings to subscription at check-in time when the user has '
  'acquired an active subscription after the original booking was made.';
