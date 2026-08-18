-- Fix: delete_course_checkin refund never runs (row-NULL test) + walk-in hole
-- Date: 2026-08-16
--
-- Bug 1 (credit-eating): the refund branch tested the subscription with
--   IF v_sub IS NOT NULL
-- For a composite row, 'row IS NOT NULL' is true ONLY when EVERY column is
-- non-null. A times card (5_times / 10_times) always has start_date/end_date
-- = NULL, so this test is ALWAYS false and the refund NEVER executed: every
-- deleted times-card check-in permanently ate a credit, silently moving the
-- member's balance further from the check-in record (negative deltas in the
-- balance audit, docs/audit-subscription-balance.sql). Same bug family as
-- 2026-08-10_1_fix-row-null-check-times-card-deduction.sql; the correct test
-- is on the row's id column.
--
-- Bug 2 (refund hole for walk-ins): the outer condition required
--   booking_type = 'subscription'
-- but walk-in check-ins (perform_checkin, no course) insert booking_type as
-- NULL and DO consume one credit for times cards. Deleting one of those via
-- this RPC never refunded, even after the row test is fixed. single / drop_in
-- check-ins never deduct, so they must stay un-refunded (bug-era rows may be
-- linked to a card id while never having deducted).
--
-- Idempotent (CREATE OR REPLACE). Apply in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION delete_course_checkin(
  p_checkin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_checkin checkins%ROWTYPE;
  v_sub subscriptions%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete check-ins';
  END IF;

  SELECT * INTO v_checkin FROM checkins WHERE id = p_checkin_id;

  IF v_checkin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Check-in not found');
  END IF;

  -- Refund one credit iff this check-in CONSUMED one:
  --   - course check-in billed to the subscription (booking_type = 'subscription')
  --   - walk-in check-in (booking_type IS NULL) — perform_checkin() always
  --     deducts one credit for times cards.
  -- single / drop_in rows never deduct -> no refund, even when a card id is
  -- present on the row.
  IF (v_checkin.booking_type = 'subscription' OR v_checkin.booking_type IS NULL)
     AND v_checkin.subscription_id IS NOT NULL THEN
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_checkin.subscription_id;

    -- Test v_sub.id, NOT v_sub (row-level NULL test is always false for
    -- times cards — see 2026-08-10_1). id is NOT NULL on real rows and NULL
    -- when no row was found.
    IF v_sub.id IS NOT NULL AND v_sub.type IN ('5_times', '10_times') THEN
      UPDATE subscriptions
      SET remaining_credits = remaining_credits + 1,
          status = CASE
                     WHEN status = 'depleted' THEN 'active'::subscription_status
                     ELSE status
                   END
      WHERE id = v_sub.id;
    END IF;
  END IF;

  -- Delete the check-in record (after a successful refund, if any)
  DELETE FROM checkins WHERE id = p_checkin_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in deleted successfully'
  );
END;
$$;

COMMENT ON FUNCTION delete_course_checkin IS
  'Deletes a check-in record. Admin-only. Refunds 1 credit when the check-in '
  'consumed one (course check-in billed to a subscription, or any walk-in '
  'check-in) and the linked subscription is a times card; reactivates '
  'depleted cards.';

-- ============================================================================
-- Verification (run after applying)
-- ============================================================================
-- 1. Confirm the fix is live:
--      SELECT pg_get_functiondef('delete_course_checkin'::regproc);
--    -> the body must contain "v_sub.id IS NOT NULL" (no "v_sub IS NOT NULL").
-- 2. Refund smoke test (use a throwaway member + card):
--      - create a test times card (5 credits), perform one walk-in check-in
--        (SELECT perform_checkin('<test_user>')) -> remaining = 4
--      - delete that check-in via delete_course_checkin('<checkin_id>')
--      - remaining must be back to 5 (previously it stayed at 4 -> credit lost)
-- 3. Walk-in refund test: delete a booking_type IS NULL check-in linked to a
--    times card -> remaining must increase by 1.
-- 4. Non-refund test: delete a 'single' check-in -> remaining must NOT change.
-- ============================================================================
