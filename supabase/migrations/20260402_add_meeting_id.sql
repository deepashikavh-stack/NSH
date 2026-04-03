-- Add missing meeting_id column to scheduled_meetings table
-- This column is required for grouping multiple visitors into a single scheduled meeting
-- and for the unified management of these groups.

ALTER TABLE scheduled_meetings 
ADD COLUMN IF NOT EXISTS meeting_id TEXT;

-- Create an index to improve search speed for grouped meetings
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_meeting_id ON scheduled_meetings(meeting_id);

-- Optional: If there are existing records, generate random IDs for them (one-time fix)
-- UPDATE scheduled_meetings SET meeting_id = id::text WHERE meeting_id IS NULL;
