-- Add Telegram Message Tracking Columns
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS telegram_message_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
