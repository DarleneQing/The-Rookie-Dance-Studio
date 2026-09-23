-- Feature: fixed-window rate limiting for the login / signup Server Actions
-- Date: 2026-09-23
--
-- Why: login and signup run as Server Actions, so Supabase Auth sees
-- Vercel's server IPs, not the visitor's. Its per-IP limits therefore cannot
-- tell attackers apart from members on that path (and one abuser could trip
-- the limit for everyone sharing those IPs). src/lib/utils/rate-limit.ts
-- calls hit_rate_limit() per email and per visitor IP before calling Auth.
-- (Password reset runs browser -> Supabase directly, where Supabase already
-- sees the real IP, so it is not routed through here.)
--
-- Design: one row per key; a single atomic INSERT ... ON CONFLICT counts the
-- hit and rolls the window, so concurrent requests cannot under-count.
-- The table has RLS enabled with NO policies and no grants to anon /
-- authenticated: only this SECURITY DEFINER function can touch it, so a
-- caller cannot read, reset, or delete buckets.
--
-- Known limit: anyone can call hit_rate_limit() with the public anon key, so
-- someone could deliberately exhaust a victim's email bucket and block that
-- victim from logging in through the app for one window (15 min). The same is
-- already possible by submitting wrong passwords through the form; the
-- window is short. Fixing it would need a server-only secret or key.
--
-- Idempotent. Apply in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hits INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limit_buckets FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION hit_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hits INTEGER;
BEGIN
  IF p_key IS NULL OR length(p_key) > 200
     OR p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit arguments';
  END IF;

  -- Absolute NOW() comparisons only (see CLAUDE.md timezone rule).
  INSERT INTO rate_limit_buckets AS b (key, window_start, hits)
  VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE
             WHEN b.window_start <= NOW() - make_interval(secs => p_window_seconds) THEN 1
             ELSE b.hits + 1
           END,
    window_start = CASE
                     WHEN b.window_start <= NOW() - make_interval(secs => p_window_seconds) THEN NOW()
                     ELSE b.window_start
                   END
  RETURNING hits INTO v_hits;

  -- ponytail: probabilistic cleanup instead of a cron job; rows older than the
  -- longest allowed window (1 day) can never block anything. Add pg_cron if
  -- the table ever grows enough for this to matter.
  IF random() < 0.01 THEN
    DELETE FROM rate_limit_buckets WHERE window_start < NOW() - INTERVAL '1 day';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION hit_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hit_rate_limit(TEXT, INTEGER, INTEGER) TO anon, authenticated;

COMMENT ON FUNCTION hit_rate_limit(TEXT, INTEGER, INTEGER) IS
  'Counts one hit for p_key in a fixed window of p_window_seconds and returns '
  'true while the count is within p_limit. Used by the login/signup Server '
  'Actions (src/lib/utils/rate-limit.ts).';

-- ============================================================================
-- Verification (run after applying)
-- ============================================================================
--   SELECT hit_rate_limit('verify:test', 2, 60);  -- true
--   SELECT hit_rate_limit('verify:test', 2, 60);  -- true
--   SELECT hit_rate_limit('verify:test', 2, 60);  -- false
--   DELETE FROM rate_limit_buckets WHERE key = 'verify:test';
