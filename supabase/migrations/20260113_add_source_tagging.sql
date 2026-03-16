-- Add source tagging columns
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS request_source TEXT DEFAULT 'On-arrival';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS source_tag TEXT;

-- Update comment for documentation
COMMENT ON COLUMN scheduled_meetings.request_source IS 'Source of the meeting request: On-arrival, webpage, etc.';
COMMENT ON COLUMN visitors.source_tag IS 'Tag for identifying the origin of the visitor log, e.g., pre-scheduled-via web page';
