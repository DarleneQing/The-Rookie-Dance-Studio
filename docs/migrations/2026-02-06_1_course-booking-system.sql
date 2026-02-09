-- Course Booking & Attendance System Migration
-- Created: 2026-02-06
-- Description: Adds courses, bookings tables and extends checkins for course support

-- Step 1: Extend existing enums
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'instructor';

-- Step 2: Create new enums
CREATE TYPE course_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE booking_type AS ENUM ('subscription', 'single', 'drop_in');

-- Step 3: Create courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dance_style TEXT NOT NULL,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  capacity INTEGER NOT NULL DEFAULT 20,
  status course_status DEFAULT 'scheduled'::course_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_course_datetime UNIQUE (scheduled_date, start_time),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0)
);

CREATE INDEX idx_courses_scheduled_date ON courses(scheduled_date) WHERE status = 'scheduled';
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);

-- Step 4: Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  booking_type booking_type NOT NULL,
  status booking_status DEFAULT 'confirmed'::booking_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT valid_subscription_booking CHECK (
    (booking_type = 'subscription' AND subscription_id IS NOT NULL) OR
    (booking_type != 'subscription')
  )
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_course ON bookings(course_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE UNIQUE INDEX unique_confirmed_booking ON bookings (user_id, course_id) WHERE (status = 'confirmed');

-- Step 5: Extend checkins table
ALTER TABLE checkins 
  ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN booking_type booking_type;

ALTER TABLE checkins 
  ALTER COLUMN subscription_id DROP NOT NULL;

CREATE INDEX idx_checkins_course ON checkins(course_id);
CREATE UNIQUE INDEX unique_course_checkin ON checkins (user_id, course_id) WHERE (course_id IS NOT NULL);

-- Step 6: Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are viewable by everyone" ON courses FOR SELECT USING (true);
CREATE POLICY "Admins can insert courses" ON courses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update courses" ON courses FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete courses" ON courses FOR DELETE USING (is_admin());

CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT USING (is_admin());
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can create any booking" ON bookings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update any booking" ON bookings FOR UPDATE USING (is_admin());

-- Step 7: Helper functions
CREATE OR REPLACE FUNCTION get_course_booking_count(p_course_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM bookings
    WHERE course_id = p_course_id AND status = 'confirmed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_deadline := v_course_start - INTERVAL '3 hours';
  
  RETURN v_current_time < v_deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Core business logic functions
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
BEGIN
  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;
  
  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;
  
  IF (v_course.scheduled_date + v_course.start_time) < NOW() AT TIME ZONE 'Europe/Zurich' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course has already started');
  END IF;
  
  v_current_bookings := get_course_booking_count(p_course_id);
  
  IF v_current_bookings >= v_course.capacity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course is full');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM bookings 
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a booking for this course');
  END IF;
  
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel within 3 hours of course start');
  END IF;
  
  UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = p_booking_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Booking cancelled successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  
  IF EXISTS (SELECT 1 FROM checkins WHERE user_id = p_user_id AND course_id = p_course_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already checked in for this course');
  END IF;
  
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
    
    IF v_sub.type = 'monthly' THEN
      IF CURRENT_DATE < v_sub.start_date OR CURRENT_DATE > v_sub.end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Subscription expired or not started');
      END IF;
    ELSE
      IF v_sub.remaining_credits <= 0 THEN
        UPDATE subscriptions SET status = 'depleted' WHERE id = v_sub.id;
        RETURN jsonb_build_object('success', false, 'message', 'No credits remaining');
      END IF;
    END IF;
  END IF;
  
  INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type)
  VALUES (p_user_id, v_booking.subscription_id, p_admin_id, p_course_id, v_booking_type)
  RETURNING id INTO v_checkin_id;
  
  IF v_booking_type = 'subscription' AND v_sub.type IN ('5_times', '10_times') THEN
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 <= 0 THEN 'depleted'::subscription_status ELSE status END
    WHERE id = v_sub.id;
  END IF;
  
  SELECT COUNT(*) INTO v_current_attendance FROM checkins WHERE course_id = p_course_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful',
    'checkin_id', v_checkin_id,
    'booking_type', v_booking_type,
    'current_attendance', v_current_attendance,
    'capacity', v_course.capacity,
    'remaining', CASE 
      WHEN v_sub IS NOT NULL AND v_sub.type = 'monthly' THEN (v_sub.end_date - CURRENT_DATE)::int 
      WHEN v_sub IS NOT NULL THEN v_sub.remaining_credits - 1
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION batch_create_courses(
  p_year INTEGER,
  p_month INTEGER,
  p_dance_style TEXT,
  p_instructor_id UUID,
  p_location TEXT,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_capacity INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_date DATE;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_created_dates TEXT[] := ARRAY[]::TEXT[];
  v_skipped_dates TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create courses';
  END IF;
  
  FOR v_date IN 
    SELECT generate_series(
      make_date(p_year, p_month, 1),
      make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day',
      '1 day'::interval
    )::date
  LOOP
    IF EXTRACT(DOW FROM v_date) = 6 THEN
      IF EXISTS (SELECT 1 FROM courses WHERE scheduled_date = v_date AND start_time = p_start_time) THEN
        v_skipped_count := v_skipped_count + 1;
        v_skipped_dates := array_append(v_skipped_dates, v_date::TEXT);
      ELSE
        INSERT INTO courses (
          dance_style, instructor_id, location, scheduled_date, 
          start_time, duration_minutes, capacity, status
        ) VALUES (
          p_dance_style, p_instructor_id, p_location, v_date,
          p_start_time, p_duration_minutes, p_capacity, 'scheduled'
        );
        v_created_count := v_created_count + 1;
        v_created_dates := array_append(v_created_dates, v_date::TEXT);
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count,
    'created_dates', v_created_dates,
    'skipped_dates', v_skipped_dates
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Triggers
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();
