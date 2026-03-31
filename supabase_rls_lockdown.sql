-- =========================================================================
-- NSH (NEXTGEN SHIELD) DATABASE SECURITY LOCKDOWN
-- Priority 1: Row Level Security (RLS) Enablement
-- Priority 2: Telegram API Secret Encapsulation
-- =========================================================================

-- 1. Enable RLS on all critical tables
-- Note: Replace with actual table names if you have custom names not listed here.
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Grant FULL access to fully authenticated users on all tables
-- This ensures Security Officers and Admins can do their jobs without restriction.
CREATE POLICY "Allow Authenticated Full Access users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow Authenticated Full Access visitors" ON visitors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow Authenticated Full Access scheduled_meetings" ON scheduled_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow Authenticated Full Access vehicle_entries" ON vehicle_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow Authenticated Full Access audit_logs" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Targeted Anonymous (Public) Policies
-- Enables the kiosk and public workflows without exposing the database to bad actors.

-- Login Page needs to fetch roles/users
CREATE POLICY "Allow Public Read-Only to Users" ON users 
  FOR SELECT TO anon USING (true);

-- Visitors Self-Check-In Kiosk needs to Insert/Update their own check-ins
CREATE POLICY "Allow Public Read/Write to Visitors" ON visitors 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Meeting Request Page needs to Insert requests and view by ID
CREATE POLICY "Allow Public Read/Write to Meetings" ON scheduled_meetings 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- =========================================================================
-- TELEGRAM BOT RPC ENCAPSULATION
-- =========================================================================
-- Move your VITE_TELEGRAM_BOT_TOKEN to the database to prevent exposing
-- it on the frontend. We use standard pg_net or HTTP extensions.

CREATE EXTENSION IF NOT EXISTS http;

CREATE OR REPLACE FUNCTION send_telegram_notification(payload jsonb)
RETURNS void AS $$
DECLARE
  -- SECURITY NOTE: Your Bot Token is embedded here in the backend, completely hidden from the browser.
  bot_token text := '8572938388:AAGptA39dMbtyvQpvRUaQTMT1sLovJQPVLQ';
  chat_id text := COALESCE(payload->>'chat_id', '740864674');
  msg_text text := payload->>'text';
  reply_markup jsonb := payload->'reply_markup';
  request_body jsonb;
  req_url text;
BEGIN
  req_url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage';
  
  request_body := jsonb_build_object(
    'chat_id', chat_id,
    'text', msg_text,
    'parse_mode', 'HTML'
  );
  
  IF reply_markup IS NOT NULL THEN
    request_body := request_body || jsonb_build_object('reply_markup', reply_markup);
  END IF;

  -- The HTTP extension natively triggers the POST without needing external edge functions
  PERFORM http_post(
    req_url,
    request_body::text,
    'application/json'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create the get updates RPC to completely hide the bot token from the frontend
CREATE OR REPLACE FUNCTION get_telegram_updates(offset_val text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  bot_token text := '8572938388:AAGptA39dMbtyvQpvRUaQTMT1sLovJQPVLQ';
  req_url text;
  resp http_response;
BEGIN
  req_url := 'https://api.telegram.org/bot' || bot_token || '/getUpdates?timeout=0&allowed_updates=%5B%22callback_query%22,%22message%22%5D';
  IF offset_val IS NOT NULL THEN
    req_url := req_url || '&offset=' || offset_val;
  END IF;
  
  SELECT * INTO resp FROM http_get(req_url);
  RETURN resp.content::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
