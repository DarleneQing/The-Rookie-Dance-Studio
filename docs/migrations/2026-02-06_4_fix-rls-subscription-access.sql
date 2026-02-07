-- Fix RLS issue preventing book_course from reading subscriptions
-- Created: 2026-02-06
-- Description: Ensure the function can properly access subscriptions table

-- Drop and recreate the function with proper security context
DROP FUNCTION IF EXISTS book_course(UUID, UUID);

CREATE OR REPLACE FUNCTION book_course(
  p_user_id UUID,
  p_course_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_course courses%ROWTYPE;
  v_current_bookings INTEGER;
  v_subscription subscriptions%ROWTYPE;
  v_booking_type booking_type;
  v_booking_id UUID;
  v_subscription_count INTEGER;
BEGIN
  -- Get course details with lock
  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;
  
  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;
  
  -- Check if course has already started
  IF (v_course.scheduled_date + v_course.start_time) < NOW() AT TIME ZONE 'Europe/Zurich' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course has already started');
  END IF;
  
  -- Get current booking count
  v_current_bookings := get_course_booking_count(p_course_id);
  
  -- Check capacity
  IF v_current_bookings >= v_course.capacity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course is full');
  END IF;
  
  -- Check for duplicate booking
  IF EXISTS (
    SELECT 1 FROM bookings 
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a booking for this course');
  END IF;
  
  -- CRITICAL FIX: Use security definer context to bypass RLS
  -- Check for active subscription
  SELECT COUNT(*) INTO v_subscription_count
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active';
  
  -- Get the active subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id 
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Determine booking type based on subscription
  IF v_subscription.id IS NOT NULL THEN
    v_booking_type := 'subscription'::booking_type;
    
    -- Additional validation for subscription
    IF v_subscription.type IN ('5_times', '10_times') THEN
      IF v_subscription.remaining_credits <= 0 THEN
        RETURN jsonb_build_object(
          'success', false, 
          'message', 'No credits remaining in your subscription'
        );
      END IF;
    ELSIF v_subscription.type = 'monthly' THEN
      IF v_subscription.end_date < CURRENT_DATE THEN
        RETURN jsonb_build_object(
          'success', false, 
          'message', 'Your monthly subscription has expired'
        );
      END IF;
    END IF;
  ELSE
    v_booking_type := 'single'::booking_type;
  END IF;
  
  -- Create the booking (subscription_id only set for subscription bookings; single always NULL)
  INSERT INTO bookings (user_id, course_id, subscription_id, booking_type, status)
  VALUES (
    p_user_id,
    p_course_id,
    CASE WHEN v_booking_type = 'subscription' THEN v_subscription.id ELSE NULL END,
    v_booking_type,
    'confirmed'
  )
  RETURNING id INTO v_booking_id;
  
  -- Return success with detailed information
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking successful',
    'booking_id', v_booking_id,
    'booking_type', v_booking_type,
    'subscription_found', v_subscription.id IS NOT NULL,
    'subscription_id', CASE WHEN v_booking_type = 'subscription' THEN v_subscription.id ELSE NULL END,
    'subscription_count', v_subscription_count,
    'current_capacity', v_current_bookings + 1,
    'max_capacity', v_course.capacity
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION book_course(UUID, UUID) TO authenticated;

-- Verify the function was created
SELECT 
    routine_name,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'book_course' 
  AND routine_schema = 'public';
