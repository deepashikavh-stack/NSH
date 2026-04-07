-- 🚨 REPAIR DATABASE SCHEMA (RUN IN SUPABASE SQL EDITOR)

-- 1. Create the 'alerts' table if it is missing
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    type TEXT NOT NULL,          -- e.g., 'Visitor', 'Vehicle', 'Meeting'
    category TEXT NOT NULL,      -- e.g., 'Overstay', 'Pending Approval'
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    message TEXT,                 -- (Optional) Specific alert text
    source_id TEXT,              -- Reference to record that triggered it
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS and simple index for alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_category ON public.alerts (category);

-- Add column-level tracking to scheduled_meetings
ALTER TABLE public.scheduled_meetings 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS request_source TEXT DEFAULT 'webpage';

-- Force clear the schema cache notice (Internal)
NOTIFY pgrst, 'reload schema';
