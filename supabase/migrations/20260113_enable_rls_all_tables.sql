-- ============================================
-- Enable RLS on All Critical Tables
-- ============================================
-- Run this migration on your Supabase SQL Editor.
--
-- NOTE: Since the NGS System uses the Supabase anon key with custom
-- authentication (not Supabase Auth), these policies are currently
-- permissive to avoid breaking the app. They serve as a foundation
-- for stricter policies once Supabase Auth is integrated.
-- ============================================

-- 1. visitors
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated operations on visitors"
ON visitors FOR ALL
USING (true)
WITH CHECK (true);

-- 2. staff_entries
ALTER TABLE staff_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated operations on staff_entries"
ON staff_entries FOR ALL
USING (true)
WITH CHECK (true);

-- 3. vehicle_entries
ALTER TABLE vehicle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated operations on vehicle_entries"
ON vehicle_entries FOR ALL
USING (true)
WITH CHECK (true);

-- 4. scheduled_meetings
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated operations on scheduled_meetings"
ON scheduled_meetings FOR ALL
USING (true)
WITH CHECK (true);

-- 5. audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated operations on audit_logs"
ON audit_logs FOR ALL
USING (true)
WITH CHECK (true);

-- 6. alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated operations on alerts"
ON alerts FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- NEXT STEPS (after migrating to Supabase Auth):
-- 1. Replace the permissive policies above with role-based restrictions
-- 2. Use auth.uid() and auth.jwt() claims to restrict access per-role
-- 3. Example restrictive policy:
--
-- CREATE POLICY "Admin full access" ON visitors
-- FOR ALL USING (auth.jwt() ->> 'role' = 'Admin');
--
-- CREATE POLICY "Security Officer read own" ON visitors
-- FOR SELECT USING (auth.jwt() ->> 'role' IN ('Security Officer', 'Security HOD'));
-- ============================================
