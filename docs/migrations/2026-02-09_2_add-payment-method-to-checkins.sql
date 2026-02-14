-- Migration: Add payment_method to checkins table
-- Date: 2026-02-09
-- Purpose: Add payment method tracking for check-ins (Cash, TWINT, Abo)

-- Step 1: Create payment_method enum type (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'twint', 'abo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add payment_method column to checkins table
ALTER TABLE checkins 
ADD COLUMN IF NOT EXISTS payment_method payment_method;

-- Step 3: Drop old perform_course_checkin function to avoid ambiguity
-- Drop all overloads of the function
DROP FUNCTION IF EXISTS perform_course_checkin(UUID, UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS perform_course_checkin(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS perform_course_checkin(UUID, UUID);

-- Step 4: Create perform_course_checkin function with payment_method parameter
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
  
  -- REMOVED: Duplicate check-in prevention
  -- Users can now check in multiple times for the same course
  
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

GRANT EXECUTE ON FUNCTION perform_course_checkin TO authenticated;

COMMENT ON FUNCTION perform_course_checkin IS 'Performs course check-in. Allows duplicate check-ins for the same course. Each check-in deducts subscription credits if applicable. Accepts payment_method parameter.';

-- Step 5: Drop old perform_checkin function to avoid ambiguity
DROP FUNCTION IF EXISTS perform_checkin(UUID, UUID);
DROP FUNCTION IF EXISTS perform_checkin(UUID);

-- Step 6: Create perform_checkin function with payment_method parameter
CREATE OR REPLACE FUNCTION perform_checkin(
  p_user_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_payment_method payment_method DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
  v_checkin_id UUID;
BEGIN
  -- Check if admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can perform check-ins';
  END IF;

  -- Find active subscription
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
  END IF;

  -- Validate Subscription
  IF v_sub.type = 'monthly' THEN
    IF CURRENT_DATE < v_sub.start_date OR CURRENT_DATE > v_sub.end_date THEN
       RETURN jsonb_build_object('success', false, 'message', 'Subscription expired or not started');
    END IF;
  ELSE -- Times card
    IF v_sub.remaining_credits <= 0 THEN
       UPDATE subscriptions SET status = 'depleted' WHERE id = v_sub.id;
       RETURN jsonb_build_object('success', false, 'message', 'No credits remaining');
    END IF;
  END IF;

  -- Perform Check-in
  INSERT INTO checkins (user_id, subscription_id, admin_id, payment_method)
  VALUES (p_user_id, v_sub.id, p_admin_id, p_payment_method)
  RETURNING id INTO v_checkin_id;

  -- Update credits if applicable
  IF v_sub.type IN ('5_times', '10_times') THEN
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 <= 0 THEN 'depleted'::subscription_status ELSE status END
    WHERE id = v_sub.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful',
    'checkin_id', v_checkin_id,
    'remaining', CASE
      WHEN v_sub.type = 'monthly' THEN (v_sub.end_date - CURRENT_DATE)::int
      ELSE v_sub.remaining_credits - 1
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION perform_checkin IS 'Performs check-in for user with active subscription. Accepts payment_method parameter.';
