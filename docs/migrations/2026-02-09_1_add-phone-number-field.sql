-- Add Phone Number Field to Profiles
-- Created: 2026-02-09
-- Description: Adds phone_number field to profiles table and updates trigger function

-- Step 1: Add phone_number column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Step 2: Update handle_new_user() trigger function to extract phone_number from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, dob, phone_number)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'member',
    NULLIF(new.raw_user_meta_data->>'dob', '')::DATE,
    NULLIF(new.raw_user_meta_data->>'phone_number', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
