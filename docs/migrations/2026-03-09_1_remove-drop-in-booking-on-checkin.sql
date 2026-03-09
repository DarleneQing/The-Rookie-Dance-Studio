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

  -- Walk-in path: user has no prior booking and scans QR.
  -- Reuse the same booking logic as the normal user-facing flow by
  -- delegating to book_course, then immediately check in that booking.
  IF p_is_drop_in THEN
    -- Let book_course handle capacity, duplicate booking checks and
    -- subscription vs single detection.
    v_book_result := book_course(p_user_id, p_course_id);

    IF NOT COALESCE((v_book_result->>'success')::BOOLEAN, false) THEN
      -- Bubble up the booking error (course full, already booked, etc.)
      RETURN v_book_result;
    END IF;

    v_booking_id := (v_book_result->>'booking_id')::UUID;

    SELECT *
    INTO v_booking
    FROM bookings
    WHERE id = v_booking_id;

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

    -- Upgrade legacy single/drop_in bookings to subscription if a usable
    -- subscription exists now. We no longer create new drop_in, but we still
    -- support upgrading old ones.
    IF v_booking_type IN ('single'::booking_type, 'drop_in'::booking_type) THEN
      SELECT *
      INTO v_sub
      FROM subscriptions
      WHERE user_id = p_user_id
        AND (
          (type IN ('5_times', '10_times')
           AND remaining_credits > 0
           AND status <> 'depleted')
          OR
          (type = 'monthly'
           AND status = 'active'
           AND end_date >= CURRENT_DATE)
          OR
          (type NOT IN ('5_times', '10_times', 'monthly')
           AND status = 'active')
        )
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_sub IS NOT NULL THEN
        v_booking_type := 'subscription'::booking_type;

        UPDATE bookings
        SET booking_type    = 'subscription',
            subscription_id = v_sub.id
        WHERE id = v_booking.id;

        v_booking.booking_type    := 'subscription';
        v_booking.subscription_id := v_sub.id;
      END IF;
    END IF;
  END IF;

  -- If this check-in uses a subscription, validate it
  IF v_booking_type = 'subscription' THEN
    IF v_sub IS NULL THEN
      SELECT *
      INTO v_sub
      FROM subscriptions
      WHERE id = v_booking.subscription_id
        AND (
          (type IN ('5_times', '10_times')
           AND remaining_credits >= 0)
          OR
          (type = 'monthly')
          OR
          (type NOT IN ('5_times', '10_times', 'monthly'))
        );
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
  'Performs course check-in. For walk-ins (p_is_drop_in = true), auto-creates '
  'either a subscription booking when any usable subscription exists (including '
  '5_times/10_times/monthly) or a single-class booking when none does. Uses and '
  'updates subscription credits for times cards, expires monthly subscriptions '
  'when used after end_date, and upgrades legacy single/drop_in bookings to '
  'subscription at check-in time when the user has a usable subscription.';