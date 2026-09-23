-- Perf: add plain user_id indexes on subscriptions and checkins
-- Date: 2026-09-23
--
-- subscriptions: the only index on user_id is the PARTIAL unique index
-- one_active_sub_per_user (WHERE status = 'active', docs/schema.sql). The
-- usability lookups (find_usable_subscription, usableSubscriptionFilter in
-- src/lib/utils/subscription-helpers.ts) and the profile history query also
-- match non-active rows, so the planner cannot use it and falls back to a
-- sequential scan.
--
-- checkins: both indexes that led with user_id were dropped on purpose to
-- allow same-day / same-course repeat check-ins for shared accounts
-- (2026-01-24_2 and 2026-02-06_5). No non-unique replacement was added, so
-- has_checked_in_today, the profile check-in history and the admin history
-- all scan the table. (user_id, created_at DESC) also serves the ordered
-- history reads. This is a plain index: repeat check-ins stay allowed.
--
-- Not CONCURRENTLY: the Supabase SQL Editor runs scripts in a transaction,
-- and these tables are small enough that the brief lock is irrelevant.

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_checkins_user_created
  ON checkins (user_id, created_at DESC);
