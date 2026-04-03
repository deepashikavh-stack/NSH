-- ============================================
-- Fix RLS Permissions for Kiosk (Public Access)
-- ============================================
-- These policies ensure that the Kiosk (which uses the anon key)
-- can correctly insert visitor and vehicle logs.

-- 1. Visitors
DROP POLICY IF EXISTS "Allow authenticated operations on visitors" ON visitors;
CREATE POLICY "Allow public access to visitors"
ON visitors FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 2. Vehicle Entries
DROP POLICY IF EXISTS "Allow authenticated operations on vehicle_entries" ON vehicle_entries;
CREATE POLICY "Allow public access to vehicle_entries"
ON vehicle_entries FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. Scheduled Meetings
DROP POLICY IF EXISTS "Allow authenticated operations on scheduled_meetings" ON scheduled_meetings;
CREATE POLICY "Allow public access to scheduled_meetings"
ON scheduled_meetings FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Audit Logs
DROP POLICY IF EXISTS "Allow authenticated operations on audit_logs" ON audit_logs;
CREATE POLICY "Allow public access to audit_logs"
ON audit_logs FOR ALL
TO public
USING (true)
WITH CHECK (true);
