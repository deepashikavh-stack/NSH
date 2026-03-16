-- check status check constraint
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_status_check;
ALTER TABLE visitors ADD CONSTRAINT visitors_status_check 
CHECK (status IN ('Pending', 'Checked-in', 'Checked-out', 'Overstay', 'Denied', 'Approved', 'On arrival-Checked-in', 'Expected', 'Cancelled', 'No-Show'));

-- Create Trigger for Edge Function
-- Note: In a real Supabase project, you would create a Webhook via the Dashboard > Database > Webhooks
-- OR use usage of pg_net extension if available.

-- For this instruction, I'll provide the user with the instruction to set up the webhook via the dashboard
-- as it is the most reliable method without direct superuser access for some extensions.

-- However, if using the pg_net or http extension manually:

/*
create extension if not exists http with schema extensions;

create or replace function notify_edge_function()
returns trigger as $$
declare
  response_status integer;
begin
  if NEW.status = 'Pending' then
      select status into response_status
      from http((
          'POST',
          'https://<your-project-ref>.supabase.co/functions/v1/telegram-bot/notify',
          ARRAY[http_header('Content-Type', 'application/json'), http_header('Authorization', 'Bearer <service_role_key>')],
          'application/json',
          json_build_object('record', row_to_json(NEW))::text
      )::http_request);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_visitor_created
after insert on visitors
for each row
execute function notify_edge_function();
*/
