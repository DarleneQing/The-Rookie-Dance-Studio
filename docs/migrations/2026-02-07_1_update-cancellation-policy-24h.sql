-- Migration: Update cancellation policy from 3 hours to 24 hours
-- Date: 2026-02-07
-- Purpose: Change the cancellation window from 3 hours to 24 hours before course start time
--          This updates both the validation function and error messages

-- Update can_cancel_booking function to use 24-hour window
CREATE OR REPLACE FUNCTION can_cancel_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_course_start TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ;
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT (c.scheduled_date + c.start_time) AT TIME ZONE 'Europe/Zurich'
  INTO v_course_start
  FROM bookings b
  JOIN courses c ON b.course_id = c.id
  WHERE b.id = p_booking_id;
  
  v_current_time := NOW() AT TIME ZONE 'Europe/Zurich';
  v_deadline := v_course_start - INTERVAL '24 hours';
  
  RETURN v_current_time < v_deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update cancel_booking function with new error message
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id AND user_id = p_user_id;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Booking not found');
  END IF;
  
  IF v_booking.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Booking is not confirmed');
  END IF;
  
  IF NOT can_cancel_booking(p_booking_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel within 24 hours of course start');
  END IF;
  
  UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_booking_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Booking cancelled successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
