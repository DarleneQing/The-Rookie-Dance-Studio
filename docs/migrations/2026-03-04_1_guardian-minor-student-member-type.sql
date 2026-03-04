-- Guardian-Minor Membership Handling
-- Created: 2026-03-04
-- Description: Update handle_new_user() to assign student member_type
--              when a guardian registers a minor (under 18).

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_member_type member_type := 'adult';
BEGIN
  -- If the signup metadata indicates a guardian registered a minor,
  -- assign the student member type immediately.
  IF COALESCE(new.raw_user_meta_data->>'guardian_for_minor', '') = 'true' THEN
    v_member_type := 'student';
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

