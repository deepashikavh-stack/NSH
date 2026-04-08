-- ─── Fix alert details mapping ────────────────────────────────────────
-- The fn_generate_meeting_alert trigger was previously saving the payload 
-- into the `metadata` column, which AlertDetailView.jsx does not read.
-- It should save mapped fields into the `details` JSONB column.

CREATE OR REPLACE FUNCTION fn_generate_meeting_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's a new meeting request requiring approval (from kiosk)
    IF (NEW.status = 'Meeting Requested' AND NEW.request_source = 'kiosk') THEN
        INSERT INTO alerts (
            type,
            category,
            message,
            severity,
            source_id,
            is_read,
            details
        ) VALUES (
            'Meeting',
            'Pending Approval',
            'New visitor ' || COALESCE(NEW.visitor_name, 'Unknown') || ' is requesting an appointment with ' || COALESCE(NEW.meeting_with, 'TBD') || '.',
            'warning',
            NEW.id::TEXT,
            false,
            jsonb_build_object(
                'visitor', NEW.visitor_name,
                'nic', COALESCE(NEW.visitor_nic, 'Unknown'),
                'purpose', NEW.purpose,
                'date', NEW.meeting_date || ' ' || NEW.start_time,
                'meeting_with', NEW.meeting_with,
                'source', 'kiosk'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Retroactive fix for any alerts that have empty details but populated metadata
UPDATE alerts
SET details = jsonb_build_object(
    'visitor', metadata->>'visitor_name',
    'nic', 'Unknown',
    'purpose', message,
    'date', metadata->>'date',
    'meeting_with', metadata->>'meeting_with',
    'source', metadata->>'source'
)
WHERE type = 'Meeting' AND category = 'Pending Approval' AND details IS NULL AND metadata IS NOT NULL;
