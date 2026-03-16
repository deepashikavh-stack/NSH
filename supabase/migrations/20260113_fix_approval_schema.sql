-- Add Audit Columns for Approval
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approval_time TIMESTAMP WITH TIME ZONE;
