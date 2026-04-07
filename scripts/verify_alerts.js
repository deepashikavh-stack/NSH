import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load env from absolute path
const envPath = join(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(envContent.split('\n')
    .filter(l => l.includes('='))
    .map(l => {
        const i = l.indexOf('=');
        return [l.substring(0, i).trim(), l.substring(i + 1).trim().replace(/^"|"$/g, '')];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTrigger() {
    console.log('--- Testing Meeting Alert Trigger ---');
    
    const testId = Date.now();
    const testMeeting = {
        visitor_name: 'Test Realtime Trigger ' + testId,
        visitor_nic: '123456789V',
        visitor_category: 'Parent',
        purpose: 'Testing Realtime Alerts',
        meeting_with: 'System Test',
        meeting_date: new Date().toISOString().split('T')[0],
        start_time: '14:00:00',
        end_time: '15:00:00',
        status: 'Meeting Requested'
    };

    console.log('Inserting test meeting...');
    const { data: meeting, error: meetingError } = await supabase
        .from('scheduled_meetings')
        .insert([testMeeting])
        .select()
        .single();

    if (meetingError) {
        console.error('Error inserting meeting:', meetingError);
        return;
    }
    console.log('Meeting inserted with ID:', meeting.id);

    // Wait for trigger
    console.log('Waiting for trigger (3s)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for alert
    const { data: alert, error: alertError } = await supabase
        .from('alerts')
        .select('*')
        .eq('source_id', meeting.id)
        .eq('category', 'Pending Approval')
        .maybeSingle();

    if (alertError) {
        console.error('Error fetching alert:', alertError);
    } else if (!alert) {
        console.error('FAILURE: No alert found for the meeting. Trigger might not have been applied.');
    } else {
        console.log('SUCCESS: Alert found!');
        console.log('Alert Title:', alert.title);
        console.log('Alert Details:', JSON.stringify(alert.details, null, 2));
    }

    // Cleanup
    console.log('Cleaning up...');
    if (alert) await supabase.from('alerts').delete().eq('id', alert.id);
    await supabase.from('scheduled_meetings').delete().eq('id', meeting.id);
    console.log('Cleanup complete.');
}

testTrigger();
