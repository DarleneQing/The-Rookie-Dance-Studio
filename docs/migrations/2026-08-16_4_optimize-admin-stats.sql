-- Optimize: dashboard stats in one round trip
-- Date: 2026-08-16
--
-- The admin dashboard previously fired 9 separate head-count queries per
-- render (profiles totals, subscriptions by type, check-ins today, pending
-- verifications). This replaces them with one admin-gated aggregate RPC.
-- Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
BEGIN
  -- Dashboard stats are admin-only; RLS alone is not the authorization
  -- boundary for a SECURITY DEFINER function.
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view statistics';
  END IF;

  -- "Today" in the studio's timezone (Europe/Zurich), matching the rest of
  -- the app's Zurich-aware date handling.
  v_today_start := (date_trunc('day', NOW() AT TIME ZONE 'Europe/Zurich')) AT TIME ZONE 'Europe/Zurich';
  v_today_end := v_today_start + INTERVAL '1 day';

  RETURN jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
    'today_checkins', (SELECT COUNT(*) FROM checkins WHERE created_at >= v_today_start AND created_at < v_today_end),
    'pending_verifications', (SELECT COUNT(*) FROM profiles WHERE verification_status = 'pending'),
    'adult_members', (SELECT COUNT(*) FROM profiles WHERE member_type = 'adult'),
    'student_members', (SELECT COUNT(*) FROM profiles WHERE member_type = 'student'),
    'monthly_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND type = 'monthly'),
    'five_times_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND type = '5_times'),
    'ten_times_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND type = '10_times')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

-- Verification:
--   SELECT get_admin_stats();
--   -- admin: returns all nine counts as JSON; non-admin: permission error
