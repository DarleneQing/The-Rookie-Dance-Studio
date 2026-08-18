-- ============================================================================
-- AUDIT: subscription balance vs. check-in record
-- Purpose: find times-card (5_times / 10_times) subscriptions whose
--          remaining_credits does NOT match what the check-in history says
--          it should be. This catches the "member checked in but no credit
--          was deducted" bug class (e.g. 2026-04-04_1 / 2026-08-10_1 /
--          2026-08-16_1 era) retroactively.
--
-- HOW TO RUN: paste into the Supabase SQL Editor (Dashboard -> SQL Editor).
--             It runs as the postgres role, so RLS does not apply.
--             ALL QUERIES ARE READ-ONLY — nothing here writes to the DB.
--
-- THE INVARIANT
--   For a times card, every check-in that consumed a credit left TWO traces:
--     (1) checkins row linked to the card via checkins.subscription_id, and
--     (2) remaining_credits decremented by 1.
--   A check-in consumes a credit when it is either:
--     - a course check-in billed to the subscription
--       (checkins.booking_type = 'subscription'), or
--     - a walk-in check-in (checkins.booking_type IS NULL) — the
--       perform_checkin() path always deducts one credit for times cards.
--   single / drop_in check-ins NEVER deduct, so they are excluded.
--   delete_course_checkin() deletes the row AND refunds +1 credit, so the
--   invariant stays consistent after deletions too.
--
--   Therefore: expected_remaining = total_credits - COUNT(consuming check-ins)
--              delta = remaining_credits - expected_remaining
--     delta > 0  -> card has MORE credits than it should: check-ins happened
--                   but the credit was never deducted. This is the bug you
--                   are hunting (members got classes for free).
--     delta < 0  -> card has FEWER credits than it should: credits were
--                   removed without a matching check-in (manual dashboard
--                   edit, a deleted walk-in check-in without refund, or a
--                   legacy over-deduction bug). Investigate before trusting.
-- ============================================================================


-- ============================================================================
-- QUERY 0 — SANITY CHECK: is the live refund function still buggy?
-- delete_course_checkin (created 2026-04-04_2) refunds a credit only when
--   IF v_sub IS NOT NULL AND v_sub.type IN ('5_times','10_times')
-- 'row IS NOT NULL' is true ONLY when EVERY column is non-null. Times cards
-- always have start_date/end_date = NULL, so this test is ALWAYS false and the
-- refund NEVER runs -> every deleted times-card check-in permanently eats a
-- credit (shows up as a NEGATIVE delta in Query 1). It was never re-declared
-- by the 2026-08-16_2 hardening migration.
-- Run this and look at the body: if you see "v_sub IS NOT NULL" -> bug is live.
-- ============================================================================
SELECT pg_get_functiondef('delete_course_checkin'::regproc) AS function_definition;


-- ============================================================================
-- QUERY 1 — THE CORE AUDIT
-- Every times card whose balance disagrees with its check-in history.
-- delta > 0 = under-deducted (the bug signature). delta < 0 = over-deducted.
-- ============================================================================
WITH consumed AS (
  SELECT subscription_id, COUNT(*) AS n
  FROM checkins
  WHERE booking_type = 'subscription' OR booking_type IS NULL
  GROUP BY subscription_id
)
SELECT
  p.full_name,
  s.id                 AS subscription_id,
  s.type,
  s.status,
  s.created_at::date   AS card_created,
  s.total_credits,
  s.remaining_credits  AS actual_remaining,
  COALESCE(c.n, 0)     AS checkins_consumed,
  s.total_credits - COALESCE(c.n, 0) AS expected_remaining,
  s.remaining_credits - (s.total_credits - COALESCE(c.n, 0)) AS delta
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
LEFT JOIN consumed c ON c.subscription_id = s.id
WHERE s.type IN ('5_times', '10_times')
  AND s.remaining_credits IS DISTINCT FROM (s.total_credits - COALESCE(c.n, 0))
ORDER BY delta DESC, p.full_name;


-- ============================================================================
-- QUERY 2 — DRILL-DOWN FOR A FLAGGED CARD
-- List every check-in linked to each times card, so you can eyeball the
-- history and confirm whether deductions were skipped.
-- ============================================================================
WITH consumed AS (
  SELECT subscription_id, COUNT(*) AS n
  FROM checkins
  WHERE booking_type = 'subscription' OR booking_type IS NULL
  GROUP BY subscription_id
),
flagged AS (
  SELECT s.id AS subscription_id
  FROM subscriptions s
  LEFT JOIN consumed c ON c.subscription_id = s.id
  WHERE s.type IN ('5_times', '10_times')
    AND s.remaining_credits IS DISTINCT FROM (s.total_credits - COALESCE(c.n, 0))
)
SELECT
  p.full_name,
  s.type,
  s.remaining_credits AS card_remaining,
  c.id                AS checkin_id,
  c.created_at        AS checked_in_at,
  c.booking_type,              -- NULL = walk-in check-in (deducted)
  c.payment_method,            -- 'abo' = admin intended the subscription
  co.dance_style      AS course
FROM checkins c
JOIN subscriptions s ON s.id = c.subscription_id
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE c.subscription_id IN (SELECT subscription_id FROM flagged)
ORDER BY p.full_name, c.created_at;


-- ============================================================================
-- QUERY 3 — THE INVISIBLE BUG VARIANT (upgrade path)
-- Balance audit above can't see the 2026-08-10_1 root-cause bug: a member
-- booked 'single', later got a card, then checked in — the booking was NOT
-- upgraded to 'subscription', so the check-in was recorded as 'single' with
-- NO link to the card and NO deduction. The card balance looks untouched and
-- consistent, hiding the free class.
--
-- Strong evidence of that: a manual check-in where the admin picked
-- payment 'abo' (Abo = subscription) but the row came out single/drop_in.
-- ============================================================================
SELECT
  p.full_name,
  c.id                AS checkin_id,
  c.created_at        AS checked_in_at,
  c.booking_type,
  c.payment_method,
  co.dance_style      AS course
FROM checkins c
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE c.booking_type IN ('single', 'drop_in')
  AND c.course_id IS NOT NULL
  AND c.payment_method = 'abo'
ORDER BY c.created_at DESC;


-- ============================================================================
-- QUERY 3B — CLASSIFY THE 'single abo' ROWS (the 14-row result set)
-- For each row found by Query 3, decide whether the member actually held a
-- usable subscription at check-in time. That determines whether the class
-- was genuinely free (credit should have been deducted) or just an admin
-- data-entry quirk (no card -> no credit owed).
--
--   'HAD TIMES CARD ...' -> the card was in existence before the check-in.
--      Card is always created full, so the member was entitled to the class
--      via the card -> 1 credit should have been consumed -> free class.
--      (Caveat: if the card was already fully used before this check-in,
--      "owed" is arguable; check the per-member summary in Query 3C.)
--   'Had monthly pass'  -> covered by the monthly pass, nothing owed.
--   'No usable subscription' -> admin picked 'abo' but member had nothing;
--      review the row manually.
-- ============================================================================
SELECT
  p.full_name,
  c.created_at   AS checked_in_at,
  co.dance_style AS course,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = c.user_id
        AND s.created_at <= c.created_at
        AND (s.type IN ('5_times', '10_times')
             AND s.remaining_credits > 0
             AND s.status <> 'depleted')
    ) THEN 'HAD TIMES CARD - credit should have been deducted (free class)'
    WHEN EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = c.user_id
        AND s.created_at <= c.created_at
        AND (s.type = 'monthly'
             AND s.status = 'active'
             AND s.end_date >= c.created_at::date)
    ) THEN 'Had monthly pass - covered, no credit owed'
    ELSE 'No usable subscription at check-in - admin picked abo without a card (review)'
  END AS finding
FROM checkins c
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE c.booking_type IN ('single', 'drop_in')
  AND c.course_id IS NOT NULL
  AND c.payment_method = 'abo'
ORDER BY finding, p.full_name, c.created_at;


-- ============================================================================
-- QUERY 3C — PER-MEMBER SUMMARY OF 'single abo' CHECK-INS
-- Total classes each member checked in as single+abo (likely owed classes),
-- plus their current times-card state so you can see how many credits are
-- left to reconcile against.
-- ============================================================================
SELECT
  p.full_name,
  COUNT(*) AS classes_recorded_single_with_abo,
  MIN(c.created_at)::date AS first_date,
  MAX(c.created_at)::date AS last_date,
  (SELECT s.type || ' card - ' || s.remaining_credits || '/' || s.total_credits || ' left'
   FROM subscriptions s
   WHERE s.user_id = p.id
     AND s.type IN ('5_times', '10_times')
   ORDER BY s.created_at DESC
   LIMIT 1) AS current_card
FROM checkins c
JOIN profiles p ON p.id = c.user_id
WHERE c.booking_type IN ('single', 'drop_in')
  AND c.course_id IS NOT NULL
  AND c.payment_method = 'abo'
GROUP BY p.full_name, p.id
ORDER BY classes_recorded_single_with_abo DESC;


-- ============================================================================
-- QUERY 4 — BROADER SWEEP (OPTIONAL, NOISIER)
-- Every single/drop_in course check-in where the member already had a times
-- card in existence at check-in time. Catches scanner-era rows where
-- payment_method is NULL (scanner never passes it). Expect false positives:
-- a member may legitimately pay cash/TWINT per class while owning a card.
-- Use only as a review list, then confirm with the member's history.
-- ============================================================================
WITH card_at_checkin AS (
  SELECT
    c.id AS checkin_id,
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = c.user_id
        AND s.type IN ('5_times', '10_times')
        AND s.created_at <= c.created_at
    ) AS had_card
  FROM checkins c
  WHERE c.course_id IS NOT NULL
    AND c.booking_type IN ('single', 'drop_in')
)
SELECT
  p.full_name,
  c.created_at     AS checked_in_at,
  c.booking_type,
  c.payment_method,
  co.dance_style   AS course
FROM checkins c
JOIN card_at_checkin ca ON ca.checkin_id = c.id
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE ca.had_card
ORDER BY c.created_at DESC;


-- ============================================================================
-- QUERY 4A — THE ROWS QUERY 3 CANNOT SEE (Query 4 minus Query 3)
-- Query 4 returns 33 rows; Query 3 (payment = 'abo') returns 31. These 2 rows
-- are single/drop_in course check-ins where the member had a times card at
-- check-in time but payment_method was NULL or cash/twint:
--   - payment NULL      -> scanner-era check-in during the bug window: the
--                          upgrade silently failed -> FREE CLASS. ADD to that
--                          member's outstanding in Query 6/7.
--   - payment cash/twint -> member paid for the class in cash/TWINT -> NOT
--                          free -> leave the reconciliation unchanged.
-- ============================================================================
SELECT
  p.full_name,
  c.created_at     AS checked_in_at,
  c.booking_type,
  c.payment_method,
  co.dance_style   AS course
FROM checkins c
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE c.booking_type IN ('single', 'drop_in')
  AND c.course_id IS NOT NULL
  AND (c.payment_method IS NULL OR c.payment_method <> 'abo')
  AND EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = c.user_id
      AND s.type IN ('5_times', '10_times')
      AND s.created_at <= c.created_at
  )
ORDER BY c.created_at DESC;


-- ============================================================================
-- QUERY 8 — SAME-DAY DUPLICATE CHECK-INS (one class, several scans)
-- Groups course check-ins by (member, course, Zurich day). A group with more
-- than one row is either:
--   - a SHARED account (family members under one login) -> legitimate: each
--     row is one person and one credit (this is the documented feature);
--   - OR the admin re-scanned because the card was not deducting -> spurious:
--     ONE attended class produced several check-in rows (the known case:
--     Xuheng Zhao 2026-03-07, two scans 4 minutes apart, Kpop).
-- For spurious groups on single-user accounts, the extra rows are not extra
-- classes: the free-class count (Query 6/7) and any same-day deductions
-- should count the group as ONE.
-- To focus on the two members: add  AND p.full_name IN ('Yuanzhao Liu','Xuheng Zhao')
-- ============================================================================
SELECT
  p.full_name,
  co.dance_style AS course,
  (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS checkin_date,
  COUNT(*) AS n_checkins,
  array_agg(c.booking_type::text ORDER BY c.created_at) AS booking_types,
  array_agg(c.payment_method::text ORDER BY c.created_at) AS payment_methods,
  array_agg(to_char(c.created_at AT TIME ZONE 'Europe/Zurich', 'HH24:MI')
            ORDER BY c.created_at) AS zurich_times
FROM checkins c
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE c.course_id IS NOT NULL
GROUP BY p.id, p.full_name, co.dance_style,
         (c.created_at AT TIME ZONE 'Europe/Zurich')::date
HAVING COUNT(*) > 1
ORDER BY p.full_name, checkin_date;


-- ============================================================================
-- QUERY 8B — FREE CLASSES: counted per check-in ROW vs per DISTINCT CLASS
-- The difference per member = how many check-in rows were re-scans of the
-- same class (for single-user accounts, these must be collapsed to 1).
-- booking_types in the group tells you whether any of the re-scans DEDUCTED
-- (a 'subscription' row in the same group = member charged once per row).
-- ============================================================================
WITH free_rows AS (
  SELECT c.user_id, c.course_id,
         (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS d
  FROM checkins c
  WHERE c.booking_type IN ('single', 'drop_in')
    AND c.course_id IS NOT NULL
    AND c.payment_method = 'abo'
)
SELECT
  p.full_name,
  COUNT(*)                                    AS free_rows,
  COUNT(DISTINCT (user_id, course_id, d))     AS free_classes_deduped,
  COUNT(*) - COUNT(DISTINCT (user_id, course_id, d)) AS rescans
FROM free_rows f
JOIN profiles p ON p.id = f.user_id
GROUP BY p.full_name, p.id
ORDER BY rescans DESC;


-- ============================================================================
-- QUERY 8C — SAME-DAY DUPLICATE WALK-IN CHECK-INS (no course)
-- Walk-in check-ins (perform_checkin, booking_type NULL) deduct 1 credit
-- each. Two walk-ins for one account on the same day = either two people
-- (shared account, legitimate) or a re-scan (single-user account — the
-- member was over-charged one credit). Known case: Emy 2026-01-24 (two
-- walk-ins 36s apart) and 2026-01-31 (10s apart).
-- ============================================================================
SELECT
  p.full_name,
  (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS checkin_date,
  COUNT(*) AS n_walkins,
  array_agg(to_char(c.created_at AT TIME ZONE 'Europe/Zurich', 'HH24:MI:SS')
            ORDER BY c.created_at) AS zurich_times
FROM checkins c
JOIN profiles p ON p.id = c.user_id
WHERE c.course_id IS NULL
GROUP BY p.id, p.full_name, (c.created_at AT TIME ZONE 'Europe/Zurich')::date
HAVING COUNT(*) > 1
ORDER BY p.full_name, checkin_date;


-- ============================================================================
-- QUERY 5 — FULL MEMBER TIMELINE (reconstruction)
-- For ONE member at a time, list EVERY check-in (all booking types, linked or
-- not) so you can reconstruct what actually happened to their card. Change the
-- ILIKE filter to the member you are investigating (e.g. 'Wei Huang').
-- booking_type NULL   = walk-in check-in (deducted 1 credit, never linked)
-- subscription_id     = NULL means the check-in was never linked to a card
-- ============================================================================
SELECT
  p.full_name,
  c.created_at       AS checked_in_at,
  c.booking_type,
  c.payment_method,
  c.subscription_id,
  (SELECT s.type FROM subscriptions s WHERE s.id = c.subscription_id) AS linked_card,
  co.dance_style     AS course
FROM checkins c
JOIN profiles p ON p.id = c.user_id
LEFT JOIN courses co ON co.id = c.course_id
WHERE p.full_name ILIKE '%Emy%'          -- <-- change this to the member's name
ORDER BY c.created_at;


-- ============================================================================
-- QUERY 6 — PER-MEMBER NET RECONCILIATION TARGET (read-only)
-- The definitive answer per member: how many credits are still outstanding
-- after accounting for legit deductions, free classes (single+abo) and any
-- manual DB adjustments already made (visible as negative deltas in Q1).
--
--   outstanding = classes_that_should_have_deducted - credits_actually_deducted
--               = (legit_consumed + free_classes) - (sum(total) - sum(remaining))
--
--   outstanding > 0 -> member still owes that many credits (deduct from card)
--   outstanding < 0 -> member was overcharged (refund credits)
--
-- Sums across ALL the member's times cards (past + current), so members who
-- replaced a card are handled correctly: free classes on an old card are
-- charged to the member's total balance.
-- ============================================================================
WITH free_classes AS (
  -- Count DISTINCT classes, not check-in rows: a re-scan of the same class
  -- (same member, same course, same Zurich day) is ONE class. Verified safe
  -- against Query 8/8B: only Xuheng Zhao has same-day 'abo' duplicates
  -- (03-07 x3, 03-14 x2). The cash/twint groups (Aria & Aluna, Elsa,
  -- Viola/Isabella) are NOT in this count: they had no card and paid per
  -- class, so they are not free classes.
  SELECT p.id AS user_id, p.full_name, COUNT(*) AS n_free
  FROM (
    SELECT DISTINCT c.user_id, c.course_id,
           (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS d
    FROM checkins c
    WHERE c.booking_type IN ('single', 'drop_in')
      AND c.course_id IS NOT NULL
      AND c.payment_method = 'abo'
  ) dc
  JOIN profiles p ON p.id = dc.user_id
  GROUP BY p.id, p.full_name
),
user_cards AS (
  SELECT
    s.user_id,
    SUM(s.total_credits)     AS total_credits_all,
    SUM(s.remaining_credits) AS remaining_all
  FROM subscriptions s
  WHERE s.type IN ('5_times', '10_times')
  GROUP BY s.user_id
),
consumed_per_user AS (
  SELECT s.user_id, COUNT(*) AS n_consumed
  FROM checkins c
  JOIN subscriptions s ON s.id = c.subscription_id
  WHERE (c.booking_type = 'subscription' OR c.booking_type IS NULL)
    AND s.type IN ('5_times', '10_times')
  GROUP BY s.user_id
)
SELECT
  uc.user_id,
  fc.full_name,
  uc.total_credits_all,
  uc.remaining_all              AS actual_remaining_all,
  COALESCE(cu.n_consumed, 0)    AS legit_consumed,
  COALESCE(fc.n_free, 0)        AS free_classes,
  uc.total_credits_all - COALESCE(cu.n_consumed, 0) - COALESCE(fc.n_free, 0)
                                AS true_expected_remaining,
  uc.remaining_all - (uc.total_credits_all
                      - COALESCE(cu.n_consumed, 0) - COALESCE(fc.n_free, 0))
                                AS outstanding
FROM user_cards uc
LEFT JOIN free_classes fc       ON fc.user_id = uc.user_id
LEFT JOIN consumed_per_user cu  ON cu.user_id = uc.user_id
WHERE COALESCE(fc.n_free, 0) > 0
   OR uc.remaining_all <> uc.total_credits_all - COALESCE(cu.n_consumed, 0)
ORDER BY outstanding DESC;


-- ============================================================================
-- QUERY 7 — RECONCILIATION DRY-RUN  *** WRITES — INSIDE A TRANSACTION ***
-- Deducts each member's `outstanding` credits from their CURRENT (most recent)
-- times card, capped at 0 (card marked 'depleted' when it hits 0). Anything
-- beyond the card's balance is reported as carryover_debt instead.
--
-- HOW TO USE:
--   1. Run as-is: BEGIN ... ROLLBACK  -> you get a PREVIEW of every change
--      and nothing persists.
--   2. Review the preview rows. If they look right, re-run the script and
--      change the final ROLLBACK to COMMIT.
--   3. If you prefer to write the damage off instead of charging members,
--      do NOT run this at all — the audit (Queries 1-6) is already your
--      permanent record.
-- ============================================================================
BEGIN;

WITH free_classes AS (
  -- Count DISTINCT classes, not check-in rows (re-scans = one class).
  -- Same rationale as Query 6; only Xuheng Zhao is affected.
  SELECT p.id AS user_id, COUNT(*) AS n_free
  FROM (
    SELECT DISTINCT c.user_id, c.course_id,
           (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS d
    FROM checkins c
    WHERE c.booking_type IN ('single', 'drop_in')
      AND c.course_id IS NOT NULL
      AND c.payment_method = 'abo'
  ) dc
  JOIN profiles p ON p.id = dc.user_id
  GROUP BY p.id
),
user_cards AS (
  SELECT
    s.user_id,
    SUM(s.total_credits)     AS total_credits_all,
    SUM(s.remaining_credits) AS remaining_all
  FROM subscriptions s
  WHERE s.type IN ('5_times', '10_times')
  GROUP BY s.user_id
),
consumed_per_user AS (
  SELECT s.user_id, COUNT(*) AS n_consumed
  FROM checkins c
  JOIN subscriptions s ON s.id = c.subscription_id
  WHERE (c.booking_type = 'subscription' OR c.booking_type IS NULL)
    AND s.type IN ('5_times', '10_times')
  GROUP BY s.user_id
),
targets AS (
  SELECT
    uc.user_id,
    COALESCE(fc.n_free, 0) + uc.remaining_all
      - (uc.total_credits_all - COALESCE(cu.n_consumed, 0)) AS outstanding
  FROM user_cards uc
  LEFT JOIN free_classes fc      ON fc.user_id = uc.user_id
  LEFT JOIN consumed_per_user cu ON cu.user_id = uc.user_id
),
current_card AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id, s.id AS card_id, s.remaining_credits, s.status
  FROM subscriptions s
  WHERE s.type IN ('5_times', '10_times')
  ORDER BY s.user_id, s.created_at DESC
)
UPDATE subscriptions s
SET remaining_credits = GREATEST(0, cc.remaining_credits - t.outstanding),
    status = CASE
               WHEN GREATEST(0, cc.remaining_credits - t.outstanding) <= 0
               THEN 'depleted'::subscription_status
               ELSE s.status
             END
FROM targets t
JOIN current_card cc ON cc.user_id = t.user_id
WHERE s.id = cc.card_id
  AND t.outstanding <> 0
RETURNING
  cc.user_id,
  cc.card_id,
  cc.remaining_credits              AS old_remaining,
  GREATEST(0, cc.remaining_credits - t.outstanding) AS new_remaining,
  t.outstanding                     AS outstanding,
  GREATEST(0, t.outstanding - cc.remaining_credits) AS carryover_debt;

-- Review the preview rows above.
-- If correct, re-run the script with the line below changed to: COMMIT;
ROLLBACK;


-- ============================================================================
-- QUERY 9 — RESTORE YUQING HUANG'S TEST-CONSUMED CREDITS (one-off, WRITES)
-- Context: the walk-in check-ins on her account (2025-12-15 x2, 2026-01-10 x3,
-- 2026-02-06 x10) were admin testing. The 10 walk-ins on 2026-02-06 drained
-- her 10_times card to 0 (status 'depleted') — that is the legit_consumed=10
-- in Query 6. All of it was testing, so the credits are restored:
--
-- DECISION (2026-08-16): NOT APPLIED. The admin chose to leave Yuqing Huang's
-- record as-is (test credits accepted as a write-off). Do not run this block
-- unless that decision is revisited.
--
--   - 10_times card -> back to 10/10, status 'archived'.
--     ('archived' is required: her 5_times is 'active' and the
--     one_active_sub_per_user unique index allows only ONE active card.
--     Archived times cards with remaining_credits > 0 are still usable per
--     find_usable_subscription, so she gets the credits back in usable form.)
--   - 5_times card -> OPTIONAL restore to 5/5 (uncomment the second UPDATE)
--     only if the 2026-03-07 single+abo class (and the missing 1 credit)
--     were also testing.
--
-- AFTER APPLYING: re-running Query 1/6 will show Yuqing with a POSITIVE
-- outstanding (+10 or +11). That is the deliberate refund, NOT damage —
-- ignore it in future audits.
--
-- Run as-is (BEGIN ... ROLLBACK) for a preview; flip ROLLBACK -> COMMIT to
-- apply.
-- ============================================================================
BEGIN;

UPDATE subscriptions
SET remaining_credits = total_credits,   -- 10
    status = 'archived'::subscription_status
WHERE user_id = '3c530cb2-cd8e-46f1-b2d3-b2a73d0e2117'
  AND type = '10_times'
  AND status = 'depleted'
RETURNING id, type, total_credits, remaining_credits, status;

-- Optional: restore the 5_times to full if the 03-07 class was testing too:
-- UPDATE subscriptions
-- SET remaining_credits = total_credits  -- 5
-- WHERE user_id = '3c530cb2-cd8e-46f1-b2d3-b2a73d0e2117'
--   AND type = '5_times'
-- RETURNING id, type, total_credits, remaining_credits, status;

ROLLBACK;


-- ============================================================================
-- QUERY 10 — CROSS-REFERENCE: was a card ACTUALLY usable at each 'abo' check-in?
-- Purpose: verify we did NOT reconcile MORE than we should. For every
-- single/drop_in + 'abo' check-in (the 31 reconciled free classes), reconstruct
-- the subscription state AT THAT MOMENT from records instead of trusting
-- current balances:
--   - a times card counts as usable iff it was ASSIGNED before the check-in
--     (assigned date vs course date) AND
--     remaining_at_that_time = total_credits - (consuming check-ins on that
--     card earlier than this one) > 0
--   - a monthly pass counts iff start_date <= check-in date <= end_date.
-- Rows flagged 'NO usable subscription at that time' were charged by Query 7
-- but were NOT free classes (card not yet assigned / already depleted / admin
-- mis-recorded an 'abo' on a cash class) -> OVER-RECONCILED -> refund needed.
-- 'Mixed payers' who sometimes pay single cash/TWINT are handled by design:
-- only 'abo' rows are counted, and this query re-verifies each one.
-- Limitation: reconstruction uses surviving check-in records only; manual
-- dashboard credit edits and delete-without-refund (pre-2026-08-16_7) skew it.
-- ============================================================================
WITH free_classes AS (
  SELECT
    c.id AS checkin_id,
    c.user_id,
    c.course_id,
    c.created_at,
    (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS checkin_date,
    c.booking_type,
    c.payment_method
  FROM checkins c
  WHERE c.booking_type IN ('single', 'drop_in')
    AND c.course_id IS NOT NULL
    AND c.payment_method = 'abo'
)
SELECT
  p.full_name,
  f.checkin_date,
  co.dance_style AS course,
  card.card_id,
  card.card_type,
  card.total_credits,
  COALESCE(used.n_used, 0) AS credits_used_before,
  card.total_credits - COALESCE(used.n_used, 0) AS remaining_at_time,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = f.user_id
        AND s.type IN ('5_times', '10_times')
        AND s.created_at <= f.created_at
        AND s.total_credits - (
              SELECT COUNT(*) FROM checkins c2
              WHERE c2.subscription_id = s.id
                AND (c2.booking_type = 'subscription' OR c2.booking_type IS NULL)
                AND c2.created_at < f.created_at
            ) > 0
    ) THEN 'HAD USABLE CARD - free class confirmed'
    WHEN EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = f.user_id
        AND s.type = 'monthly'
        AND s.start_date <= f.checkin_date
        AND s.end_date >= f.checkin_date
    ) THEN 'Had valid monthly pass - covered, no credit owed'
    ELSE 'NO usable subscription at that time - OVER-RECONCILED (refund)'
  END AS finding
FROM free_classes f
JOIN profiles p ON p.id = f.user_id
LEFT JOIN courses co ON co.id = f.course_id
LEFT JOIN LATERAL (
  -- most recent times card in existence at check-in time (display context only)
  SELECT s.id AS card_id, s.type AS card_type, s.total_credits
  FROM subscriptions s
  WHERE s.user_id = f.user_id
    AND s.type IN ('5_times', '10_times')
    AND s.created_at <= f.created_at
  ORDER BY s.created_at DESC
  LIMIT 1
) card ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS n_used
  FROM checkins c2
  WHERE c2.subscription_id = card.card_id
    AND (c2.booking_type = 'subscription' OR c2.booking_type IS NULL)
    AND c2.created_at < f.created_at
) used ON true
ORDER BY finding, p.full_name, f.checkin_date;


-- ============================================================================
-- QUERY 10B — SUMMARY of Query 10: confirmed vs over-reconciled per member
-- If any member has over_reconciled > 0, they were charged too much in
-- Query 7 and need a refund of that many credits (add back to current card).
-- ============================================================================
WITH free_classes AS (
  SELECT
    c.user_id,
    c.created_at,
    (c.created_at AT TIME ZONE 'Europe/Zurich')::date AS checkin_date
  FROM checkins c
  WHERE c.booking_type IN ('single', 'drop_in')
    AND c.course_id IS NOT NULL
    AND c.payment_method = 'abo'
),
classified AS (
  SELECT
    f.user_id,
    p.full_name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = f.user_id
          AND s.type IN ('5_times', '10_times')
          AND s.created_at <= f.created_at
          AND s.total_credits - (
                SELECT COUNT(*) FROM checkins c2
                WHERE c2.subscription_id = s.id
                  AND (c2.booking_type = 'subscription' OR c2.booking_type IS NULL)
                  AND c2.created_at < f.created_at
              ) > 0
      ) THEN 'confirmed'
      WHEN EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = f.user_id
          AND s.type = 'monthly'
          AND s.start_date <= f.checkin_date
          AND s.end_date >= f.checkin_date
      ) THEN 'monthly'
      ELSE 'over'
    END AS kind
  FROM free_classes f
  JOIN profiles p ON p.id = f.user_id
)
SELECT
  full_name,
  COUNT(*) AS charged_classes,
  COUNT(*) FILTER (WHERE kind = 'confirmed') AS confirmed_free,
  COUNT(*) FILTER (WHERE kind = 'monthly')   AS covered_by_monthly,
  COUNT(*) FILTER (WHERE kind = 'over')      AS over_reconciled
FROM classified
GROUP BY full_name
ORDER BY over_reconciled DESC, full_name;


-- ============================================================================
-- CAVEATS / FALSE-POSITIVE SOURCES
--   1. Manual dashboard edits: if an admin changed remaining_credits by hand
--      in the Supabase dashboard (e.g. to "fix" a balance or gift a class),
--      the card will show a delta even though nothing is wrong. Verify these
--      against whatever manual adjustments were made during the outage.
--   2. Monthly subscriptions have no credits to audit this way — they are
--      governed by end_date. This audit is times-cards only, by design.
--   3. delete_course_checkin() refunds only when booking_type = 'subscription'.
--      A walk-in check-in (booking_type NULL) deleted via raw SQL/RPC would
--      show as delta < 0. The app only exposes delete for course check-ins,
--      so this should be rare.
--   4. delta = 0 but the member still owes classes? Possible only if credits
--      were deducted but the check-in row was later deleted WITH refund
--      (consistent) — i.e. no, the invariant holds. The invisible case is
--      Query 3 / 4, not Query 1.
--   5. Emy (786755d2-3f44-4076-9b2d-0ef19a0731c8): the -4 / 4-credit carryover
--      debt computed by Query 6/7 was WITHDRAWN (2026-08-16). Her card was
--      created 2026-01-24 14:14:30 (25s before her first walk-in) — the 4
--      January walk-ins (01-24 x2, 01-31 x2) are creation/testing artifacts,
--      not member consumption. With them excluded her claims exactly match the
--      10-credit card: settled at 0/10 after Query 7, no debt, no refund.
--      Do not re-flag or re-charge her for this.
-- ============================================================================
