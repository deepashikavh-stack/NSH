-- SQL for creating the alerts table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    type TEXT NOT NULL, -- 'Visitor', 'Vehicle', 'Meeting'
    category TEXT NOT NULL, -- 'Missing Logout', 'Overstay', 'Missed Arrival'
    severity TEXT DEFAULT 'warning', -- 'warning', 'critical'
    source_id UUID, -- Link to visitor_id, vehicle_id, or meeting_id
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    details JSONB DEFAULT '{}', -- Stores snapshots of visitor names, contact, etc.
    resolved_at TIMESTAMPTZ
);

-- Index for faster fetching of unread alerts
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
