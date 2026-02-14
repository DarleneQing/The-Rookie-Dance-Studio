-- Migration: Prevent creating courses with past date/time
-- Date: 2026-02-07
-- Purpose: Add validation to batch_create_courses function to prevent creating courses
--          when the date/time has already passed (using Europe/Zurich timezone)

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
  v_past_dates TEXT[] := ARRAY[]::TEXT[];
  v_course_datetime TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create courses';
  END IF;
  
  v_current_time := NOW() AT TIME ZONE 'Europe/Zurich';
  
  FOR v_date IN 
    SELECT generate_series(
      make_date(p_year, p_month, 1),
      make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day',
      '1 day'::interval
    )::date
  LOOP
    IF EXTRACT(DOW FROM v_date) = 6 THEN
      -- Check if course datetime is in the past
      v_course_datetime := (v_date + p_start_time) AT TIME ZONE 'Europe/Zurich';
      
      IF v_course_datetime <= v_current_time THEN
        -- Skip past dates
        v_skipped_count := v_skipped_count + 1;
        v_past_dates := array_append(v_past_dates, v_date::TEXT);
      ELSIF EXISTS (SELECT 1 FROM courses WHERE scheduled_date = v_date AND start_time = p_start_time) THEN
        -- Skip existing courses (same date and time)
        v_skipped_count := v_skipped_count + 1;
        v_skipped_dates := array_append(v_skipped_dates, v_date::TEXT);
      ELSE
        -- Create new course
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
    'skipped_dates', v_skipped_dates,
    'past_dates', v_past_dates
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
