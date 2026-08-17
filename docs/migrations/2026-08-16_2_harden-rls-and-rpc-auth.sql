-- Harden: RLS policies + RPC authorization (audit P0/P1 fixes)
-- Date: 2026-08-16
--
-- Fixes from the codebase audit (docs/audit-findings-by-severity.md):
--
-- P0-1  profiles UPDATE policy had no WITH CHECK and no column protection:
--       any user could PATCH role='admin' on their own row (self-service admin
--       escalation). Fixed with WITH CHECK + a trigger that blocks role changes
--       by non-admins.
-- P0-2  find_usable_subscription was SECURITY DEFINER + row_security=off with no
--       auth check and PUBLIC execute: anyone could read any user's subscription
--       data. Fixed with an auth gate + execute-grant restriction.
-- P1-3  book_course 3-arg overload: p_is_admin_override and arbitrary
--       p_user_id were ungated. Fixed with is_admin()/auth.uid() checks.
-- P1-4  cancel_booking never verified the caller owned the booking. Fixed.
-- P1-5  bookings FOR SELECT USING(true) leaked all users' booking history to
--       anon. Replaced with own + admin policies. Capacity display still works:
--       get_course_booking_count() is a SECURITY DEFINER count-only RPC
--       (and getCourses now calls it instead of querying bookings directly).
-- P1-6  User-level bookings INSERT/UPDATE policies let members bypass
--       book_course capacity checks. Removed — all booking writes go through
--       book_course/cancel_booking RPCs (verified: no TS code inserts/updates
--       bookings directly).
-- P2-7  profiles SELECT USING(true) leaked PII (dob, phone_number,
--       student_card_url, rejection_reason) to ANONYMOUS callers. Fixed with
--       column-level REVOKE from anon. (Authenticated non-admin reads of other
--       members' PII are now gated in the app layer via requireAdmin(); a full
--       public-view/private-table split is a follow-up.)
-- P2-8  SECURITY DEFINER functions missing SET search_path (is_admin,
--       assign_subscription, get_course_booking_count, can_cancel_booking,
--       cancel_booking, batch_create_courses, expire_past_monthly_subscriptions).
--       search_path now pinned everywhere.
-- P2-9  expire_past_monthly_subscriptions was an ungated global write RPC.
--       Added is_admin() guard.
-- P3-10 student-cards storage bucket lacked an UPDATE policy (upsert silently
--       failed when replacing a card) and admin DELETE. Added both.
--
-- All statements are idempotent (CREATE OR REPLACE / DROP POLICY IF EXISTS /
-- DROP TRIGGER IF EXISTS). Safe to apply on top of any current state.

-- ============================================================================
-- 1. is_admin — pin search_path (SECURITY DEFINER hardening)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 2. profiles — block self-service role escalation (P0-1)
-- ============================================================================

-- Trigger: only admins may change the role column.
CREATE OR REPLACE FUNCTION block_non_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS profiles_block_role_change ON profiles;
CREATE TRIGGER profiles_block_role_change
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION block_non_admin_role_change();

-- Own-row update policy: explicit WITH CHECK (same predicate as USING).
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Anonymous callers lose access to PII columns (dob, phone, student card,
-- rejection reason). id/full_name/avatar_url remain public for course
-- instructor display. Column-level REVOKE is role-scoped, so admins and
-- members (authenticated role) are unaffected.
REVOKE SELECT (dob, phone_number, student_card_url, rejection_reason)
  ON profiles FROM anon;

-- ============================================================================
-- 3. find_usable_subscription — auth gate + execute restriction (P0-2)
-- ============================================================================

CREATE OR REPLACE FUNCTION find_usable_subscription(
  p_user_id UUID,
  p_exclude_id UUID DEFAULT NULL
) RETURNS subscriptions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
BEGIN
  -- Only the user themselves or an admin may look up a subscription.
  -- (Internal calls from book_course/perform_course_checkin inherit the
  --  invoker's JWT, so members resolving their own card and admins resolving
  --  any member both pass.)
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT is_admin() THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_sub
  FROM subscriptions
  WHERE user_id = p_user_id
    AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    AND (
      (type IN ('5_times', '10_times')
       AND remaining_credits > 0
       AND status <> 'depleted')
      OR
      (type = 'monthly'
       AND status = 'active'
       AND end_date >= CURRENT_DATE)
    )
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_sub;
END;
$$;

REVOKE EXECUTE ON FUNCTION find_usable_subscription(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION find_usable_subscription(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION find_usable_subscription(UUID, UUID) TO authenticated;

-- ============================================================================
-- 4. book_course — gate admin override + caller identity (P1-3)
-- ============================================================================

CREATE OR REPLACE FUNCTION book_course(
  p_user_id UUID,
  p_course_id UUID,
  p_is_admin_override BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_course courses%ROWTYPE;
  v_current_bookings INTEGER;
  v_subscription subscriptions%ROWTYPE;
  v_booking_type booking_type;
  v_booking_id UUID;
BEGIN
  -- Admin override (walk-ins / capacity override) is admin-only.
  IF p_is_admin_override AND NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only admins can override booking rules');
  END IF;

  -- Members may only book for themselves; admins may book for anyone.
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;

  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;

  -- Time check: normal users cannot book after start time.
  -- Admin override (walk-ins) can book anytime on the course day.
  IF p_is_admin_override THEN
    IF (NOW() AT TIME ZONE 'Europe/Zurich')::DATE > v_course.scheduled_date THEN
      RETURN jsonb_build_object('success', false, 'message', 'Course day has passed');
    END IF;
  ELSE
    IF (v_course.scheduled_date + v_course.start_time) < NOW() AT TIME ZONE 'Europe/Zurich' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Course has already started');
    END IF;
  END IF;

  -- Capacity check: skip for admin overrides (walk-ins / capacity override)
  v_current_bookings := get_course_booking_count(p_course_id);
  IF NOT p_is_admin_override AND v_current_bookings >= v_course.capacity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course is full');
  END IF;

  -- Duplicate booking check
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a booking for this course');
  END IF;

  -- Subscription detection via shared helper.
  v_subscription := find_usable_subscription(p_user_id);

  IF v_subscription.id IS NOT NULL THEN
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
$$;

-- ============================================================================
-- 5. cancel_booking — verify caller owns the booking (P1-4)
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  -- Only the owner (or an admin) may cancel a booking.
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 6. bookings — restore own + admin SELECT; drop user INSERT/UPDATE (P1-5/P1-6)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
-- NOTE: "Admins can view all bookings" was created by 2026-02-06_1 and was
-- never dropped by 2026-02-19_1, so it may already exist on live DBs. Drop
-- first to keep this script re-runnable (otherwise CREATE POLICY fails 42710).
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT TO authenticated
  USING (is_admin());

-- Capacity display is served by the count-only RPC below, so the public
-- course page keeps working without exposing booking rows.

-- ============================================================================
-- 7. get_course_booking_count — pin search_path (P2-8) so members/anon can
--    keep reading capacity via this SECURITY DEFINER RPC.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_course_booking_count(p_course_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM bookings
    WHERE course_id = p_course_id AND status = 'confirmed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 8. can_cancel_booking — pin search_path (P2-8)
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

  v_current_time := NOW() AT TIME ZONE 'Europe/Zurich';
  v_deadline := v_course_start - INTERVAL '24 hours';

  RETURN v_current_time < v_deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 9. assign_subscription — pin search_path (P2-8); body unchanged
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_subscription(
  p_user_id UUID,
  p_type subscription_type,
  p_start_date DATE DEFAULT NULL,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  v_new_sub_id UUID;
  v_end_date DATE;
  v_total_credits INTEGER;
  v_remaining_credits INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign subscriptions';
  END IF;

  UPDATE subscriptions
  SET status = 'archived'
  WHERE user_id = p_user_id AND status = 'active';

  IF p_type = 'monthly' THEN
    IF p_start_date IS NULL THEN
      p_start_date := CURRENT_DATE;
    END IF;
    v_end_date := p_start_date + INTERVAL '30 days';
    v_total_credits := NULL;
    v_remaining_credits := NULL;
  ELSIF p_type = '5_times' THEN
    v_total_credits := 5;
    v_remaining_credits := 5;
    p_start_date := NULL;
    v_end_date := NULL;
  ELSIF p_type = '10_times' THEN
    v_total_credits := 10;
    v_remaining_credits := 10;
    p_start_date := NULL;
    v_end_date := NULL;
  END IF;

  INSERT INTO subscriptions (
    user_id, type, status, start_date, end_date,
    total_credits, remaining_credits, assigned_by
  ) VALUES (
    p_user_id, p_type, 'active', p_start_date, v_end_date,
    v_total_credits, v_remaining_credits, p_admin_id
  ) RETURNING id INTO v_new_sub_id;

  RETURN v_new_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 10. batch_create_courses — pin search_path (P2-8); body unchanged
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

  v_current_time := NOW() AT TIME ZONE 'Europe/Zurich';

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
-- 11. expire_past_monthly_subscriptions — admin-only guard (P2-9)
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_past_monthly_subscriptions()
RETURNS void AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can expire subscriptions';
  END IF;

  UPDATE subscriptions
  SET status = 'expired'
  WHERE type = 'monthly'
    AND status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- ============================================================================
-- 12. Storage: student-cards — add user-scoped UPDATE (upsert) + admin DELETE
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own student cards" ON storage.objects;
CREATE POLICY "Users can update their own student cards"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can delete student cards" ON storage.objects;
CREATE POLICY "Admins can delete student cards"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-cards' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- Verification (run after applying)
-- ============================================================================
--
-- 1. Role escalation blocked:
--      SET ROLE authenticated;
--      UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
--      -- expected: ERROR: Only admins can change roles
-- 2. find_usable_subscription gated:
--      -- as anon: rpc/find_usable_subscription returns null / permission denied
-- 3. bookings own-row only:
--      -- as a member, SELECT * FROM bookings shows only own rows
-- 4. Capacity still visible:
--      SELECT get_course_booking_count('<course-uuid>');  -- works for all
