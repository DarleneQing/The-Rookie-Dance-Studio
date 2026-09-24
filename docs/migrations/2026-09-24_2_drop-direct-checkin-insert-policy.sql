-- Drop the direct-INSERT policy on checkins (audit R2, docs/audit-deduction-code-review.md).
--
-- "Admins can insert checkins" (schema.sql) let an admin POST a check-in row
-- straight to PostgREST, recording attendance without deducting a credit.
-- No app code does this: every check-in goes through perform_checkin /
-- perform_course_checkin, which are SECURITY DEFINER and owned by the table
-- owner, so they bypass RLS and never needed this policy.
--
-- With no INSERT policy left, RLS denies direct inserts for anon and
-- authenticated; the RPCs keep working unchanged.

DROP POLICY IF EXISTS "Admins can insert checkins" ON checkins;
