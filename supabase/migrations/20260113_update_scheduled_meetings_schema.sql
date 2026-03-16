-- Add Telegram and Approval columns to scheduled_meetings table
ALTER TABLE scheduled_meetings 
ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS approval_token_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_message_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add Meeting Requested to allowed statuses if constrained (usually TEXT)
-- No explicit constraint in schema, but good to note.
