-- Fix: session-timezone skew in cancellation window + batch-creation cutoff
-- Date: 2026-08-16
--
-- Bug class (flagged in the diff-vs-main review):
--   `NOW() AT TIME ZONE 'Europe/Zurich'` yields a *wall-clock* timestamp
--   (no timezone). When that value is
--     a) assigned to a TIMESTAMPTZ variable  (can_cancel_booking,
--        batch_create_courses), or
--     b) compared directly against a TIMESTAMPTZ expression
--        (can_cancel_bookings),
--   Postgres re-interprets the Zurich wall-clock value in the SESSION
--   timezone. Supabase sessions default to UTC, so the value shifts by the
--   UTC <-> Europe/Zurich offset (1h CET / 2h CEST). Effect:
--     * the 24h cancellation window is extended/shortened by that offset
--       (can_cancel_booking, can_cancel_bookings) — members get falsely
--       blocked from cancelling in the last 1-2h before the true deadline;
--     * the past-date cutoff in batch_create_courses skews by the offset —
--       courses starting within the offset window can be wrongly skipped as
--       "past" or, with a session behind Zurich, courses whose start time
--       already passed can be created.
--
-- Fix: compare absolute instants. `NOW()` is already TIMESTAMPTZ, and the
-- course start is converted to an absolute instant with
-- `(scheduled_date + start_time) AT TIME ZONE 'Europe/Zurich'` (correct).
-- The session timezone no longer influences the result.
--
-- Re-declares the three functions in their latest authoritative forms
-- (2026-08-16_2 / 2026-08-16_3) with only this fix applied. All statements
-- are idempotent (CREATE OR REPLACE), signatures and response shapes are
-- unchanged, and the security attributes (SECURITY DEFINER/INVOKER, pinned
-- search_path) are preserved.

-- ============================================================================
-- 1. can_cancel_booking — single-booking 24h window (latest: 2026-08-16_2)
-- ============================================================================

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

  -- Absolute instant, NOT Zurich wall clock: storing the wall-clock value
  -- into a TIMESTAMPTZ re-interprets it in the session timezone (UTC by
  -- default), skewing the deadline by the UTC/Zurich offset.
  v_current_time := NOW();
  v_deadline := v_course_start - INTERVAL '24 hours';

  RETURN v_current_time < v_deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 2. can_cancel_bookings — batched 24h windows (latest: 2026-08-16_3)
-- ============================================================================

CREATE OR REPLACE FUNCTION can_cancel_bookings(p_booking_ids UUID[])
RETURNS TABLE(booking_id UUID, can_cancel BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- SECURITY INVOKER: bookings RLS (own + admin) filters rows automatically,
  -- so a member can never probe another member's booking window.
  RETURN QUERY
  SELECT
    b.id,
    NOW() <
      ((c.scheduled_date + c.start_time) AT TIME ZONE 'Europe/Zurich' - INTERVAL '24 hours')
  FROM bookings b
  JOIN courses c ON c.id = b.course_id
  WHERE b.id = ANY(p_booking_ids)
    AND b.status = 'confirmed';
END;
$$;

-- ============================================================================
-- 3. batch_create_courses — past-date cutoff (latest: 2026-08-16_2)
-- ============================================================================

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

  -- Absolute instant (see header note on session-timezone skew).
  v_current_time := NOW();

  FOR v_date IN
    SELECT generate_series(
      make_date(p_year, p_month, 1),
      make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day',
      '1 day'::interval
    )::date
  LOOP
    IF EXTRACT(DOW FROM v_date) = 6 THEN
      v_course_datetime := (v_date + p_start_time) AT TIME ZONE 'Europe/Zurich';

      IF v_course_datetime <= v_current_time THEN
        v_skipped_count := v_skipped_count + 1;
        v_past_dates := array_append(v_past_dates, v_date::TEXT);
      ELSIF EXISTS (SELECT 1 FROM courses WHERE scheduled_date = v_date AND start_time = p_start_time) THEN
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
    'skipped_dates', v_skipped_dates,
    'past_dates', v_past_dates
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- Verification (run after applying)
-- ============================================================================
--
-- 1. Session-timezone independence — the same answer in any session TZ:
--      SET timezone = 'UTC';
--      SELECT can_cancel_booking('<booking-id>');
--      SET timezone = 'Europe/Zurich';
--      SELECT can_cancel_booking('<booking-id>');
--    Both must return the same value (previously they differed by the
--    UTC/Zurich offset whenever the deadline fell within the skew window).
--
-- 2. Batched window still RLS-scoped:
--      SELECT * FROM can_cancel_bookings(ARRAY['<booking-id>']::uuid[]);
--    As a member, only your own bookings appear (SECURITY INVOKER + RLS).
--
-- 3. Batch cutoff exact:
--      SELECT batch_create_courses(2026, 8, 'Hip Hop', NULL, 'Studio',
--                                  '18:00'::TIME, 90, 20);
--    Courses whose (scheduled_date + start_time) is already past are listed
--    in past_dates and never inserted; no course is skipped just because the
--    session timezone differs from Europe/Zurich.
