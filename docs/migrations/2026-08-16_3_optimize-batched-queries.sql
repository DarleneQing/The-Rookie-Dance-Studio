-- Optimize: batch count queries to kill the N+1 request storms
-- Date: 2026-08-16
--
-- The courses page previously issued ~3 queries per course (booking count +
-- checkin count + user booking) plus 1 RPC per booking for the cancellation
-- window, re-triggered every 10s by the client poll — 60+ round trips per
-- open member session. These two functions collapse the counts into a single
-- round trip per page render:
--
--   get_course_counts(uuid[])      -> booking_count + checkin_count per course
--   can_cancel_bookings(uuid[])    -> 24h-cancellation window per booking
--
-- Security notes:
--   * get_course_counts is SECURITY DEFINER (needs to see all bookings for
--     capacity display, which is public info) but checkin_count is only
--     returned to admins (checkins are not public).
--   * can_cancel_bookings is SECURITY INVOKER, so RLS applies: members only
--     ever get results for their own bookings; admins see all.
-- All statements are idempotent.

-- ============================================================================
-- 1. get_course_counts — one round trip for booking + check-in counts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_course_counts(p_course_ids UUID[])
RETURNS TABLE(course_id UUID, booking_count BIGINT, checkin_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    (
      SELECT COUNT(*)::BIGINT
      FROM bookings b
      WHERE b.course_id = c.id AND b.status = 'confirmed'
    ),
    -- checkins are not public: only admins may see attendance counts.
    CASE WHEN is_admin() THEN
      (
        SELECT COUNT(*)::BIGINT
        FROM checkins ch
        WHERE ch.course_id = c.id
      )
    ELSE 0::BIGINT END
  FROM courses c
  WHERE c.id = ANY(p_course_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_course_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_course_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_counts(UUID[]) TO anon;

-- ============================================================================
-- 2. can_cancel_bookings — one round trip for cancellation windows
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
    (NOW() AT TIME ZONE 'Europe/Zurich') <
      ((c.scheduled_date + c.start_time) AT TIME ZONE 'Europe/Zurich' - INTERVAL '24 hours')
  FROM bookings b
  JOIN courses c ON c.id = b.course_id
  WHERE b.id = ANY(p_booking_ids)
    AND b.status = 'confirmed';
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================
--
-- SELECT * FROM get_course_counts(ARRAY['<course-uuid>']::uuid[]);
--   -- returns 1 row with booking_count (and checkin_count when admin)
-- SELECT * FROM can_cancel_bookings(ARRAY['<booking-uuid>']::uuid[]);
--   -- as a member: only your own bookings appear
