-- Add Meeting Time Columns to Visitors table
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS meeting_from TEXT,
ADD COLUMN IF NOT EXISTS meeting_to TEXT;
