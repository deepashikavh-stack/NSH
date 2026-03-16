-- Add missing created_by_name column to vehicle_entries
ALTER TABLE vehicle_entries 
ADD COLUMN IF NOT EXISTS created_by_name TEXT;
