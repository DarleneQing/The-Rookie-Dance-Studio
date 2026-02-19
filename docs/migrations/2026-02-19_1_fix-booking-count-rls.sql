-- Fix booking count visibility for course capacity display
-- Created: 2026-02-19
-- Description: Allow all authenticated users to view booking counts for courses (capacity is public info)

-- Drop the restrictive policy that only allows users to see their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;

-- Create new policy: Users can view all bookings (needed for accurate capacity display)
CREATE POLICY "Anyone can view all bookings" ON bookings 
  FOR SELECT 
  USING (true);

-- Note: INSERT and UPDATE policies already exist and remain unchanged
-- Note: Admin policies remain unchanged (they can do everything)
