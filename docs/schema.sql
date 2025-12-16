-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE member_type AS ENUM ('adult', 'student');
CREATE TYPE verification_status AS ENUM ('none', 'pending', 'approved', 'rejected', 'reupload_required');
CREATE TYPE subscription_type AS ENUM ('monthly', '5_times', '10_times');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'depleted', 'archived');

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'member'::user_role NOT NULL,
  member_type member_type DEFAULT 'adult'::member_type NOT NULL,
  verification_status verification_status DEFAULT 'none'::verification_status NOT NULL,
  student_card_url TEXT,
  rejection_reason TEXT,
  dob DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type subscription_type NOT NULL,
  status subscription_status DEFAULT 'active'::subscription_status NOT NULL,
  
  -- For Monthly
  start_date DATE,
  end_date DATE,
  
  -- For Times Card
  total_credits INTEGER,
  remaining_credits INTEGER,
  
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraint: Only one active subscription per user
  -- We use a partial unique index for this
  CONSTRAINT valid_monthly_dates CHECK (
    (type = 'monthly' AND start_date IS NOT NULL AND end_date IS NOT NULL) OR
    (type != 'monthly')
  ),
  CONSTRAINT valid_credits CHECK (
    (type IN ('5_times', '10_times') AND total_credits IS NOT NULL AND remaining_credits IS NOT NULL) OR
    (type = 'monthly')
  )
);

CREATE UNIQUE INDEX one_active_sub_per_user 
ON subscriptions (user_id) 
WHERE (status = 'active');

-- CHECKINS
CREATE TABLE checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" 
ON profiles FOR UPDATE USING (is_admin());

-- SUBSCRIPTIONS Policies
CREATE POLICY "Users can view own subscriptions" 
ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
ON subscriptions FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert subscriptions" 
ON subscriptions FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update subscriptions" 
ON subscriptions FOR UPDATE USING (is_admin());

-- CHECKINS Policies
CREATE POLICY "Users can view own checkins" 
ON checkins FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins" 
ON checkins FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert checkins" 
ON checkins FOR INSERT WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- 4. Functions & Triggers
-- -----------------------------------------------------------------------------

-- Trigger: Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, dob)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'member',
    (new.raw_user_meta_data->>'dob')::DATE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function: Assign Subscription
-- Archives existing active subscription and creates a new one
CREATE OR REPLACE FUNCTION assign_subscription(
  p_user_id UUID,
  p_type subscription_type,
  p_start_date DATE DEFAULT NULL, -- for monthly
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  v_new_sub_id UUID;
  v_end_date DATE;
  v_total_credits INTEGER;
  v_remaining_credits INTEGER;
BEGIN
  -- Check if admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign subscriptions';
  END IF;

  -- Archive current active subscription
  UPDATE subscriptions 
  SET status = 'archived' 
  WHERE user_id = p_user_id AND status = 'active';

  -- Prepare data based on type
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

  -- Insert new subscription
  INSERT INTO subscriptions (
    user_id, type, status, start_date, end_date, 
    total_credits, remaining_credits, assigned_by
  ) VALUES (
    p_user_id, p_type, 'active', p_start_date, v_end_date, 
    v_total_credits, v_remaining_credits, p_admin_id
  ) RETURNING id INTO v_new_sub_id;

  RETURN v_new_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Perform Check-in
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

