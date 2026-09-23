-- Default course duration becomes 120 minutes (from 90), effective October 2026.
-- The admin create/batch dialogs pre-fill DEFAULT_COURSE_DURATION_MINUTES
-- (src/lib/pricing.ts); this keeps the column default in step for any insert
-- that omits duration_minutes. Existing courses are not changed.
ALTER TABLE courses ALTER COLUMN duration_minutes SET DEFAULT 120;
