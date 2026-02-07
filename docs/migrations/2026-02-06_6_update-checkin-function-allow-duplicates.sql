-- Migration: Update perform_course_checkin to allow duplicate check-ins
-- Date: 2026-02-06
-- Purpose: Remove duplicate check-in prevention to allow users to check in multiple times
--          Each check-in will deduct subscription credits if applicable

CREATE OR REPLACE FUNCTION perform_course_checkin(
  p_user_id UUID,
  p_course_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_is_drop_in BOOLEAN DEFAULT false
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
  
  -- REMOVED: Duplicate check-in prevention
  -- Users can now check in multiple times for the same course
  
  IF p_is_drop_in THEN
    INSERT INTO bookings (user_id, course_id, booking_type, status)
    VALUES (p_user_id, p_course_id, 'drop_in', 'confirmed')
    RETURNING * INTO v_booking;
    v_booking_type := 'drop_in'::booking_type;
  ELSE
    SELECT * INTO v_booking FROM bookings
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'confirmed';
    
    IF v_booking IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No confirmed booking found');
    END IF;
    v_booking_type := v_booking.booking_type;
  END IF;
  
  IF v_booking_type = 'subscription' THEN
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_booking.subscription_id AND status = 'active';
    
    IF v_sub IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
    END IF;
    
    IF v_sub.type IN ('5_times', '10_times') THEN
      IF v_sub.remaining_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No remaining credits');
      END IF;
    ELSIF v_sub.type = 'monthly' THEN
      IF v_sub.end_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Subscription expired');
      END IF;
    END IF;
  END IF;
  
  INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type)
  VALUES (p_user_id, v_booking.subscription_id, p_admin_id, p_course_id, v_booking_type)
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

GRANT EXECUTE ON FUNCTION perform_course_checkin TO authenticated;

COMMENT ON FUNCTION perform_course_checkin IS 'Performs course check-in. Allows duplicate check-ins for the same course. Each check-in deducts subscription credits if applicable.';
