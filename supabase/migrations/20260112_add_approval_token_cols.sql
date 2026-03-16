-- Add Approval Token Columns to Visitors table
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS approval_token_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assigned_date DATE,
ADD COLUMN IF NOT EXISTS contact TEXT;
