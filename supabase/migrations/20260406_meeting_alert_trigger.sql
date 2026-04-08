-- ─── Function to generate alerts for new meeting requests ──────────────────────
CREATE OR REPLACE FUNCTION fn_generate_meeting_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's a new meeting request requiring approval
    IF (NEW.status = 'Meeting Requested' AND NEW.request_type = 'Kiosk') THEN
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
            'New visitor ' || NEW.visitor_name || ' is requesting an appointment with ' || NEW.host_name || '.',
            'warning',
            NEW.id::TEXT,
            false,
            jsonb_build_object(
                'meeting_id', NEW.id,
                'visitor_name', NEW.visitor_name,
                'host_name', NEW.host_name,
                'source', 'Kiosk'
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Trigger on scheduled_meetings table ───────────────────────────────────
DROP TRIGGER IF EXISTS tr_on_meeting_requested ON scheduled_meetings;
CREATE TRIGGER tr_on_meeting_requested
AFTER INSERT OR UPDATE OF status ON scheduled_meetings
FOR EACH ROW
EXECUTE FUNCTION fn_generate_meeting_alert();
