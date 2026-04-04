-- Migration: Add delete_course_checkin RPC for manual attendance management
-- Date: 2026-04-04
-- Depends on: 2026-04-04_1_fix-book-course-and-checkin.sql
--
-- Adds an admin-only function to delete a check-in record and refund
-- subscription credits if the check-in used a times card.

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

  -- If the check-in used a subscription, refund the credit for times cards
  IF v_checkin.booking_type = 'subscription' AND v_checkin.subscription_id IS NOT NULL THEN
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_checkin.subscription_id;

    IF v_sub IS NOT NULL AND v_sub.type IN ('5_times', '10_times') THEN
      UPDATE subscriptions
      SET remaining_credits = remaining_credits + 1,
          status = CASE
                     WHEN status = 'depleted' THEN 'active'::subscription_status
                     ELSE status
                   END
      WHERE id = v_sub.id;
    END IF;
  END IF;

  -- Delete the check-in record
  DELETE FROM checkins WHERE id = p_checkin_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in deleted successfully'
  );
END;
$$;

COMMENT ON FUNCTION delete_course_checkin IS
  'Deletes a check-in record. Admin-only. Refunds 1 credit for times-card '
  'subscription check-ins and reactivates depleted cards.';
