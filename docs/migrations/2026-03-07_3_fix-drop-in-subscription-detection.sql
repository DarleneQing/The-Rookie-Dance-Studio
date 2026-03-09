-- Migration: Fix drop-in subscription detection and booking_type for times cards
-- Date: 2026-03-07
-- Depends on:
--   - 2026-03-05_1_expire-monthly-subscriptions.sql
--   - 2026-03-07_1_upgrade-single-booking-on-checkin.sql
--   - 2026-03-07_2_upgrade-drop-in-booking-on-checkin.sql
--
-- Problem:
--   For users who already have a valid times-card subscription (5_times / 10_times),
--   the drop-in check-in flow should:
--     - Create a booking with booking_type = 'subscription'
--     - Create a check-in with booking_type = 'subscription'
--     - Deduct exactly one credit per check-in
--
--   However, in some real data the subscription row is not marked as status = 'active'
--   (e.g., older cards kept as 'archived' but still with remaining_credits > 0).
--   Because the previous logic filtered strictly on status = 'active', v_sub was NULL
--   in the drop-in branch and the function fell back to creating a 'drop_in' booking,
--   so:
--     - booking.booking_type = 'drop_in'
--     - checkins.booking_type = 'drop_in'
--     - no times-card credit was deducted.
--
-- Fix:
--   Relax the subscription filter for times cards in BOTH:
--     - The drop-in path
--     - The non-drop-in upgrade path (single/drop_in -> subscription)
--
--   New semantics:
--     - For times cards (5_times / 10_times):
--         * Treat any card with remaining_credits > 0 as usable,
--           regardless of subscription.status (ignore 'active' vs 'archived'),
--           but still ignore status = 'depleted'.
--     - For monthly subscriptions:
--         * Keep the stricter rule: status = 'active' AND end_date >= CURRENT_DATE.
--
--   This guarantees:
--     - A user who holds any non-depleted times card will have drop-in check-ins
--       recorded as 'subscription' and have one credit deducted per scan.
--     - Existing monthly expiration behaviour remains unchanged.

CREATE OR REPLACE FUNCTION perform_course_checkin(
  p_user_id UUID,
  p_course_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_is_drop_in BOOLEAN DEFAULT false,
  p_payment_method payment_method DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_sub subscriptions%ROWTYPE;
  v_checkin_id UUID;
  v_booking_type booking_type;
  v_course courses%ROWTYPE;
  v_current_attendance INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can perform check-ins';
  END IF;

  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF v_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Course not found');
  END IF;

  IF p_is_drop_in THEN
    -- For drop-ins, prefer using any non-depleted times card or a valid monthly
    -- subscription before falling back to a plain drop_in booking.
    SELECT * INTO v_sub
    FROM subscriptions
    WHERE user_id = p_user_id
      AND (
        -- Times cards: any non-depleted card with remaining_credits > 0
        (type IN ('5_times', '10_times')
         AND remaining_credits > 0
         AND status <> 'depleted')
        OR
        -- Monthly: must still be active and not past end_date
        (type = 'monthly'
         AND status = 'active'
         AND end_date >= CURRENT_DATE)
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub IS NOT NULL THEN
      -- User has a usable subscription - create a subscription booking
      INSERT INTO bookings (user_id, course_id, subscription_id, booking_type, status)
      VALUES (p_user_id, p_course_id, v_sub.id, 'subscription', 'confirmed')
      RETURNING * INTO v_booking;
      v_booking_type := 'subscription'::booking_type;
    ELSE
      -- No usable subscription - create a standard single-class booking
      INSERT INTO bookings (user_id, course_id, booking_type, status)
      VALUES (p_user_id, p_course_id, 'single', 'confirmed')
      RETURNING * INTO v_booking;
      v_booking_type := 'single'::booking_type;
    END IF;
  ELSE
    SELECT * INTO v_booking
    FROM bookings
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND status = 'confirmed';

    IF v_booking IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No confirmed booking found');
    END IF;

    v_booking_type := v_booking.booking_type;

    -- If the booking was created as 'single' (pre-booked without a subscription) OR
    -- 'drop_in' (walked in without a subscription on first scan), check whether the
    -- user has since acquired a usable subscription.
    --
    -- Covers:
    --   • User pre-books as single class then buys a card on the day of the class.
    --   • User walked in as drop-in (first scan created drop_in booking) then
    --     acquires a times card or monthly subscription before/during a duplicate scan.
    IF v_booking_type IN ('single'::booking_type, 'drop_in'::booking_type) THEN
      SELECT * INTO v_sub
      FROM subscriptions
      WHERE user_id = p_user_id
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

      IF v_sub IS NOT NULL THEN
        -- Upgrade the booking to subscription so credits are deducted correctly
        v_booking_type := 'subscription'::booking_type;
        UPDATE bookings
        SET booking_type = 'subscription',
            subscription_id = v_sub.id
        WHERE id = v_booking.id;
        -- Keep v_booking in sync so the checkin INSERT below uses the right subscription_id
        v_booking.booking_type := 'subscription';
        v_booking.subscription_id := v_sub.id;
      END IF;
    END IF;
  END IF;

  IF v_booking_type = 'subscription' THEN
    -- Get subscription if not already loaded (for existing bookings)
    IF v_sub IS NULL THEN
      SELECT * INTO v_sub
      FROM subscriptions
      WHERE id = v_booking.subscription_id
        AND (
          (type IN ('5_times', '10_times')
           AND remaining_credits >= 0)  -- allow 0 here so we can flip to depleted below
          OR
          (type = 'monthly')
        );
    END IF;

    IF v_sub IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
    END IF;

    IF v_sub.type IN ('5_times', '10_times') THEN
      IF v_sub.remaining_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No remaining credits');
      END IF;
    ELSIF v_sub.type = 'monthly' THEN
      IF v_sub.end_date < CURRENT_DATE THEN
        -- Flip monthly subscription to expired when used after end_date
        UPDATE subscriptions
        SET status = 'expired'
        WHERE id = v_sub.id
          AND status = 'active';

        RETURN jsonb_build_object('success', false, 'message', 'Subscription expired');
      END IF;
    END IF;
  END IF;

  INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type, payment_method)
  VALUES (p_user_id, v_booking.subscription_id, p_admin_id, p_course_id, v_booking_type, p_payment_method)
  RETURNING id INTO v_checkin_id;

  -- Deduct one credit per check-in for times-card subscriptions
  IF v_booking_type = 'subscription' AND v_sub.type IN ('5_times', '10_times') THEN
    UPDATE subscriptions
    SET remaining_credits = remaining_credits - 1,
        status = CASE WHEN remaining_credits - 1 <= 0 THEN 'depleted'::subscription_status ELSE status END
    WHERE id = v_sub.id;
    -- Re-read subscription so returned remaining_credits matches DB (avoids stale value)
    SELECT * INTO v_sub FROM subscriptions WHERE id = v_sub.id;
  END IF;

  SELECT COUNT(*) INTO v_current_attendance FROM checkins WHERE course_id = p_course_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Check-in successful',
    'checkin_id', v_checkin_id,
    'booking_type', v_booking_type,
    'current_attendance', v_current_attendance,
    'max_capacity', v_course.capacity,
    'remaining_credits', CASE
      WHEN v_booking_type = 'subscription' AND v_sub.type IN ('5_times', '10_times')
      THEN v_sub.remaining_credits
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION perform_course_checkin IS
  'Performs course check-in. Allows duplicate check-ins for the same course. '
  'For drop-ins, prefers any non-depleted times-card or valid monthly subscription '
  'and records booking_type = subscription when used, deducting exactly one credit '
  'per check-in for times cards. '
  'Accepts payment_method parameter. '
  'Marks expired monthly subscriptions as expired when used. '
  'Upgrades single OR drop_in bookings to subscription at check-in time when the '
  'user has a usable subscription (non-depleted times card or active monthly).';

