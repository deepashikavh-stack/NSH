-- ─── Fix broken meeting alert trigger ────────────────────────────────────────
-- The previous trigger (20260406_meeting_alert_trigger.sql) referenced
-- NEW.request_type (column does not exist — should be NEW.request_source)
-- and NEW.host_name (column does not exist — should be NEW.meeting_with).
-- This caused every kiosk INSERT to fail with:
--   "record "new" has no field "request_type""
-- RUN IN SUPABASE SQL EDITOR.

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
            metadata
        ) VALUES (
            'Meeting',
            'Pending Approval',
            'New visitor ' || COALESCE(NEW.visitor_name, 'Unknown') || ' is requesting an appointment with ' || COALESCE(NEW.meeting_with, 'TBD') || '.',
            'warning',
            NEW.id::TEXT,
            false,
            jsonb_build_object(
                'meeting_id', NEW.meeting_id,
                'visitor_name', NEW.visitor_name,
                'meeting_with', NEW.meeting_with,
                'source', 'kiosk'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger cleanly
DROP TRIGGER IF EXISTS tr_on_meeting_requested ON scheduled_meetings;
CREATE TRIGGER tr_on_meeting_requested
AFTER INSERT OR UPDATE OF status ON scheduled_meetings
FOR EACH ROW
EXECUTE FUNCTION fn_generate_meeting_alert();

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
