-- Function to generate alert for meeting requested
-- FIXED: Explicitly cast UUID to TEXT for source_id compatibility
CREATE OR REPLACE FUNCTION public.fn_generate_meeting_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate alert if status is 'Meeting Requested'
    IF (NEW.status = 'Meeting Requested') THEN
        -- Avoid duplicate alerts for the same source_id and category
        -- Cast NEW.id (UUID) to TEXT to match alerts.source_id (TEXT)
        IF NOT EXISTS (
            SELECT 1 FROM public.alerts 
            WHERE source_id = NEW.id::TEXT AND category = 'Pending Approval'
        ) THEN
            INSERT INTO public.alerts (
                type,
                category,
                severity,
                source_id,
                title,
                message,
                details
            ) VALUES (
                'Meeting',
                'Pending Approval',
                'info',
                NEW.id::TEXT, -- Explicitly cast UUID to TEXT
                'New Meeting Request',
                'Initial request from ' || NEW.visitor_name || ' requires review.',
                jsonb_build_object(
                    'visitor', NEW.visitor_name,
                    'purpose', NEW.purpose,
                    'date', NEW.meeting_date
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after insert on scheduled_meetings
DROP TRIGGER IF EXISTS tr_on_meeting_requested ON public.scheduled_meetings;
CREATE TRIGGER tr_on_meeting_requested
AFTER INSERT ON public.scheduled_meetings
FOR EACH ROW
EXECUTE FUNCTION public.fn_generate_meeting_alert();

-- Trigger to run after update on scheduled_meetings (if status changes to Meeting Requested)
DROP TRIGGER IF EXISTS tr_on_meeting_status_change ON public.scheduled_meetings;
CREATE TRIGGER tr_on_meeting_status_change
AFTER UPDATE OF status ON public.scheduled_meetings
FOR EACH ROW
WHEN (NEW.status = 'Meeting Requested' AND (OLD.status IS DISTINCT FROM NEW.status))
EXECUTE FUNCTION public.fn_generate_meeting_alert();
