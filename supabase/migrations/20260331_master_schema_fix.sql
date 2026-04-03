-- ============================================
-- MASTER SCHEMA FIX (Resolving Critical Mismatches)
-- ============================================
-- Run this in the Supabase SQL Editor.
-- All statements use IF NOT EXISTS / DO blocks to be safe to re-run.

-- ─── 1. visitors table ───────────────────────────────────────────────────────
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS category          TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS validation_method TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS is_pre_registered BOOLEAN DEFAULT false;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS entry_time        TIMESTAMPTZ;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS source_tag        TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS meeting_id        UUID REFERENCES scheduled_meetings(id) ON DELETE SET NULL;

-- ─── 2. scheduled_meetings table ─────────────────────────────────────────────
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS meeting_id      TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS approval_token  TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS request_source  TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS visitor_nic     TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS visitor_contact TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS visitor_category TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS telegram_chat_id   TEXT;

-- ─── 3. alerts table (optional) ──────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alerts') THEN
        ALTER TABLE alerts ADD COLUMN IF NOT EXISTS category TEXT;
    END IF;
END $$;

-- ─── 4. RLS Policies — allow kiosk (anon) to read & write ────────────────────
DROP POLICY IF EXISTS "Allow public access to visitors"          ON visitors;
DROP POLICY IF EXISTS "Allow public access to vehicle_entries"   ON vehicle_entries;
DROP POLICY IF EXISTS "Allow public access to scheduled_meetings" ON scheduled_meetings;

CREATE POLICY "Allow public access to visitors"
    ON visitors FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to vehicle_entries"
    ON vehicle_entries FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to scheduled_meetings"
    ON scheduled_meetings FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── 5. Grant full access to all roles ───────────────────────────────────────
GRANT ALL ON visitors          TO anon, authenticated, postgres, service_role;
GRANT ALL ON vehicle_entries   TO anon, authenticated, postgres, service_role;
GRANT ALL ON scheduled_meetings TO anon, authenticated, postgres, service_role;
