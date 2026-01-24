-- Allow same-day check-ins by removing Zurich-day uniqueness
DROP INDEX IF EXISTS checkins_one_per_user_per_zurich_day;

-- Function: Perform Check-in without duplicate guard
CREATE OR REPLACE FUNCTION perform_checkin(
  p_user_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
  v_checkin_id UUID;
BEGIN
  -- Check if admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can perform check-ins';
  END IF;

  -- Find active subscription
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
  END IF;

  -- Validate Subscription
  IF v_sub.type = 'monthly' THEN
    IF CURRENT_DATE < v_sub.start_date OR CURRENT_DATE > v_sub.end_date THEN
       RETURN jsonb_build_object('success', false, 'message', 'Subscription expired or not started');
    END IF;
  ELSE -- Times card
    IF v_sub.remaining_credits <= 0 THEN
       UPDATE subscriptions SET status = 'depleted' WHERE id = v_sub.id;
       RETURN jsonb_build_object('success', false, 'message', 'No credits remaining');
    END IF;
  END IF;

  -- Perform Check-in
  INSERT INTO checkins (user_id, subscription_id, admin_id)
  VALUES (p_user_id, v_sub.id, p_admin_id)
  RETURNING id INTO v_checkin_id;

  -- Update credits if applicable
  IF v_sub.type IN ('5_times', '10_times') THEN
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 <= 0 THEN 'depleted'::subscription_status ELSE status END
    WHERE id = v_sub.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful',
    'checkin_id', v_checkin_id,
    'remaining', CASE
      WHEN v_sub.type = 'monthly' THEN (v_sub.end_date - CURRENT_DATE)::int
      ELSE v_sub.remaining_credits - 1
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

