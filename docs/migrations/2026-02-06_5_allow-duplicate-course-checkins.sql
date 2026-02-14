-- Migration: Allow duplicate check-ins for the same course
-- Date: 2026-02-06
-- Purpose: Remove unique constraint to allow users to check in multiple times for the same course
--          This is useful for users who leave and come back, or for tracking multiple attendances

-- Drop the unique constraint that prevents duplicate check-ins for the same course
DROP INDEX IF EXISTS unique_course_checkin;

-- Add a comment to document the change
COMMENT ON TABLE checkins IS 'Stores check-in records. Users can check in multiple times for the same course (e.g., if they leave and return).';
