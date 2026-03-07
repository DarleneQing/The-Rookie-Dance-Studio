-- Guardian-Minor Membership Handling
-- Created: 2026-03-04
-- Description: Ensure member_type enum and column exist, then update
--              handle_new_user() to assign student member_type when
--              a guardian registers a minor (under 18).

-- Step 1: Create enum type in public schema if missing.
-- (Auth trigger can run with restricted search_path; public. prefix ensures the type is found.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'member_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.member_type AS ENUM ('adult', 'student');
  END IF;
END
$$;

-- Step 2: Add column to profiles if missing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS member_type public.member_type
  DEFAULT 'adult'::public.member_type NOT NULL;

-- Step 3: Trigger function uses public.member_type so it resolves when Auth runs the trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_member_type public.member_type := 'adult'::public.member_type;
BEGIN
  IF COALESCE(new.raw_user_meta_data->>'guardian_for_minor', '') = 'true' THEN
    v_member_type := 'student'::public.member_type;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, dob, phone_number, member_type)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'member',
    NULLIF(new.raw_user_meta_data->>'dob', '')::DATE,
    NULLIF(new.raw_user_meta_data->>'phone_number', ''),
    v_member_type
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger resolves public.member_type when run by Auth (search_path can be restricted).
ALTER FUNCTION public.handle_new_user() SET search_path = public;

