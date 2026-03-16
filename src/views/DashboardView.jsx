import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import LogTable from '../components/LogTable';
import { Users, UserPlus, Car, CheckCircle, Calendar, Clock, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateTelegramMessage, getTelegramUpdates, answerCallbackQuery, sendForceReply, editTelegramMessageMarkup, getTimeSelectorKeyboard, getMinuteSelectorKeyboard, formatApprovedMessage, formatDeniedMessage } from '../lib/telegram';
import { sendSMS } from '../lib/sms';
import { logAudit } from '../lib/audit';

const DashboardView = ({ user }) => {
    const [scheduledMeetings, setScheduledMeetings] = useState([]);
    const [unifiedLog, setUnifiedLog] = useState([]);
    const [confirmingMeeting, setConfirmingMeeting] = useState(null);
    const [stats, setStats] = useState([
        { title: 'Total Visitors', value: '0', icon: Users, trend: 'neutral', trendValue: '0%', color: '#2563eb' },
        { title: 'Vehicles (Traffic)', value: '0', icon: Car, trend: 'neutral', trendValue: '0%', color: '#10b981' },
        { title: 'Auto-Confirmed', value: '0%', icon: CheckCircle, trend: 'neutral', trendValue: '0%', color: '#8b5cf6' },
        { title: 'Scheduled', value: '0', icon: Calendar, trend: 'neutral', trendValue: '0%', color: '#f59e0b' },
    ]);

    // Approval Workflow State
    const [pendingVisitors, setPendingVisitors] = useState([]);

    useEffect(() => {
        fetchDashboardData();
        fetchPendingApprovals();

        // Realtime Subscription for Pending Visitors
        const pendingSubscription = supabase
            .channel('pending-approvals-unified')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'visitors'
                },
                () => {
                    fetchPendingApprovals();
                    fetchDashboardData();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'scheduled_meetings'
                },
                () => {
                    fetchPendingApprovals();
                    fetchDashboardData();
                }
            )
            .subscribe();

        // Optional: Set up real-time subscription here if needed later
        // Polling Fallback (Since Real-time seems to be failing in this environment)
        const interval = setInterval(() => {
            fetchDashboardData();
            fetchPendingApprovals();
        }, 3000);

        // --- Telegram Polling ---
        let lastUpdateId = 0;
        const telegramInterval = setInterval(async () => {
            if (['School Operations', 'School Management'].includes(user?.role)) return; // Only Admins/Security poll

            const { updates, maxUpdateId } = await getTelegramUpdates(lastUpdateId + 1);

            // Limit checks to prevent memory leak or unexpected behavior
            if (maxUpdateId > lastUpdateId) {
                lastUpdateId = maxUpdateId;
            }

            if (updates && updates.length > 0) {
                for (const update of updates) {
                    if (update.type === 'callback_query') {
                        // Acknowledge the click immediately
                        await answerCallbackQuery(update.callback_id, "Processing...");

                        // Parse Data: "action:visitorId"
                        const [action, id] = update.data.split(':');

                        console.log(`Telegram Action Received: ${action} for ${id}`);

                        if (action === 'approve') {
                            handleApprove(id);
                        } else if (action === 'reject') {
                            handleReject(id, 'visitors');
                        } else if (action === 'reject_mtg') {
                            handleReject(id, 'scheduled_meetings');
                        } else if (action === 'set_time') {
                            // Show Hour Selector for "From"
                            const keyboard = getTimeSelectorKeyboard(id, 'from_h');
                            editTelegramMessageMarkup(update.message.chat.id, update.message.message_id, keyboard);
                        } else if (action === 'time') {
                            handleTimeSelection(update);
                        } else if (action === 'resettle_hours') {
                            const [_, id, step] = update.data.split(':');
                            const keyboard = getTimeSelectorKeyboard(id, step);
                            editTelegramMessageMarkup(update.message.chat.id, update.message.message_id, keyboard);
                        } else if (action === 'cancel_time') {
                            const [_, id] = update.data.split(':');
                            // Restore original buttons
                            const keyboard = {
                                inline_keyboard: [[
                                    { text: "🕒 Approve & Set Time", callback_data: `set_time:${id}` },
                                    { text: "❌ Reject", callback_data: `reject:${id}` }
                                ]]
                            };
                            editTelegramMessageMarkup(update.message.chat.id, update.message.message_id, keyboard);
                        }
                    } else if (update.type === 'message' && update.reply_to_message) {
                        // Handle reply to set time
                        handleTelegramReply(update.reply_to_message.message_id, update.text, update.from.id, update.reply_to_message.text);
                    }
                }
            }
        }, 3000);

        return () => {
            clearInterval(interval);
            clearInterval(telegramInterval);
            supabase.removeChannel(pendingSubscription);
        };
    }, []);

    const fetchPendingApprovals = async () => {
        // 1. Fetch pending visitors
        const { data: visitors, error: visitorError } = await supabase
            .from('visitors')
            .select('id, name, nic_passport, purpose, meeting_with, entry_time, status, type, telegram_chat_id, telegram_message_id, meeting_from, meeting_to, validation_method, is_pre_registered, source_tag, approved_by')
            .eq('status', 'Pending');

        // 2. Fetch on-arrival meeting requests
        const { data: meetingRequests, error: meetingError } = await supabase
            .from('scheduled_meetings')
            .select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, meeting_role, start_time, end_time, status, visitor_category, telegram_chat_id, telegram_message_id, created_at, request_source, meeting_id')
            .eq('status', 'Meeting Requested');

        if (visitorError && import.meta.env.DEV) console.error("Error fetching pending visitors:", visitorError);
        if (meetingError && import.meta.env.DEV) console.error("Error fetching meeting requests:", meetingError);

        // Merge both into a single pending list
        const merged = [
            ...(visitors || []).map(v => ({ ...v, sourceTable: 'visitors' })),
            ...(meetingRequests || []).map(m => ({
                id: m.id,
                name: m.visitor_name,
                nic_passport: m.visitor_nic,
                purpose: m.purpose,
                meeting_with: m.meeting_with,
                entry_time: m.created_at || new Date().toISOString(), // Fallback to now
                status: m.status,
                sourceTable: 'scheduled_meetings',
                telegram_chat_id: m.telegram_chat_id,
                telegram_message_id: m.telegram_message_id
            }))
        ].sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time)); // Oldest first

        if (import.meta.env.DEV) console.log("Unified Pending List:", merged);
        setPendingVisitors(merged);
    };

    const handleApprove = async (id, sourceTable = 'visitors') => {
        if (sourceTable === 'scheduled_meetings') {
            const { data: meeting } = await supabase.from('scheduled_meetings').select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, start_time, end_time, status, telegram_chat_id, telegram_message_id, created_at, request_source').eq('id', id).single();
            if (!meeting) return;

            // Simple update to Scheduled (using default times as it's from dashboard)
            await supabase.from('scheduled_meetings').update({
                status: 'Scheduled',
                start_time: '10:00',
                end_time: '11:00'
            }).eq('id', id);

            // Telegram update
            if (meeting.telegram_chat_id && meeting.telegram_message_id) {
                const arrivalTime = new Date(meeting.created_at).toLocaleTimeString();
                const confirmationTime = new Date().toLocaleTimeString();
                const newText = formatApprovedMessage({
                    visitorNames: meeting.visitor_name,
                    purpose: meeting.purpose,
                    meetingWith: meeting.meeting_with,
                    requestReceived: arrivalTime,
                    approvedBy: 'Dashboard Admin',
                    approvedAt: confirmationTime,
                    startTime: '10:00',
                    endTime: '11:00',
                    date: meeting.meeting_date,
                    sourceTag: '(via Dashboard)'
                });
                updateTelegramMessage(meeting.telegram_chat_id, meeting.telegram_message_id, newText);
            }

            // Send SMS notification
            if (meeting.visitor_contact) {
                const smsMessage = `Your meeting with ${meeting.meeting_with || 'Lyceum Staff'} has been scheduled for ${meeting.meeting_date} at 10:00 AM. (scheduled through the web page)`;
                await sendSMS(meeting.visitor_contact, smsMessage);
            }
        } else {
            // Legacy handleApprove for visitors table
            const { data: visitor } = await supabase
                .from('visitors')
                .select('id, name, nic_passport, purpose, meeting_with, entry_time, status, type, telegram_chat_id, telegram_message_id, meeting_from, meeting_to, validation_method, is_pre_registered, approved_by')
                .eq('id', id)
                .single();

            if (!visitor) return;

            // 1. Create a Scheduled Meeting (On-arrival)
            const { error: meetingError } = await supabase
                .from('scheduled_meetings')
                .insert({
                    visitor_name: visitor.name,
                    visitor_nic: visitor.nic_passport,
                    visitor_category: 'On-arrival',
                    purpose: visitor.purpose,
                    meeting_with: visitor.meeting_with,
                    meeting_date: new Date().toISOString().split('T')[0],
                    start_time: visitor.meeting_from || '08:00',
                    end_time: visitor.meeting_to || '18:00',
                    status: 'Scheduled'
                });

            if (meetingError) {
                alert("Error scheduling meeting");
                return;
            }

            // 2. Update visitor status
            await supabase
                .from('visitors')
                .update({ status: 'Meeting Scheduled', approved_by: user?.role || 'Admin' })
                .eq('id', id);

            logAudit('Approve Visitor', 'visitors', id, user?.email || 'Admin', { name: visitor.name, purpose: visitor.purpose });
        }

        fetchPendingApprovals();
        fetchDashboardData();
    };

    const handleReject = async (id, sourceTable = 'visitors') => {
        if (sourceTable === 'scheduled_meetings') {
            const { data: meeting } = await supabase.from('scheduled_meetings').select('id, visitor_name, visitor_contact, purpose, meeting_with, meeting_date, telegram_chat_id, telegram_message_id').eq('id', id).single();
            await supabase.from('scheduled_meetings').update({ status: 'Cancelled' }).eq('id', id);

            if (meeting?.telegram_chat_id && meeting?.telegram_message_id) {
                const actionTime = new Date().toLocaleTimeString();
                const newText = formatDeniedMessage({
                    visitorNames: meeting.visitor_name,
                    purpose: meeting.purpose,
                    meetingWith: meeting.meeting_with,
                    actionBy: 'Dashboard Admin',
                    actionAt: actionTime
                });
                updateTelegramMessage(meeting.telegram_chat_id, meeting.telegram_message_id, newText);
            }

            // Send SMS notification for rejection
            if (meeting?.visitor_contact) {
                const smsMessage = `Your meeting request with ${meeting.meeting_with || 'Lyceum Staff'} has been denied. Please contact the security department for more information.`;
                await sendSMS(meeting.visitor_contact, smsMessage);
            }
        } else {
            const { data: visitor } = await supabase.from('visitors').select('name').eq('id', id).single();
            await supabase.from('visitors').update({ status: 'Denied', approved_by: user?.role || 'Admin' }).eq('id', id);
            logAudit('Reject Visitor', 'visitors', id, user?.email || 'Admin', { name: visitor?.name });
        }
        fetchPendingApprovals();
        fetchDashboardData();
    };

    const handleSetTime = async (visitorId, chatId, messageId) => {
        await sendForceReply(
            chatId,
            `🕒 Setting meeting time for visitor [${visitorId}]\n\nPlease reply to this message with the duration (e.g. 10:00 AM - 11:30 AM)`,
            messageId
        );
    };

    const handleTelegramReply = async (originalMessageId, replyText, telegramUserId, promptText = '') => {
        // Try to find visitor by original notification ID
        let { data: visitor, error } = await supabase
            .from('visitors')
            .select('id, name, nic_passport, purpose, meeting_with, entry_time, status, type, telegram_chat_id, telegram_message_id, meeting_from, meeting_to, approval_time, approved_by')
            .eq('telegram_message_id', originalMessageId)
            .single();

        // If not found, try to extract ID from prompt text (in case this was a reply to a prompt)
        if (error || !visitor) {
            const idMatch = promptText.match(/\[([a-f0-9-]+)\]/);
            if (idMatch && idMatch[1]) {
                const visitorId = idMatch[1];
                const { data: visitorById, error: errorById } = await supabase
                    .from('visitors')
                    .select('id, name, nic_passport, purpose, meeting_with, entry_time, status, type, telegram_chat_id, telegram_message_id, meeting_from, meeting_to, approval_time, approved_by')
                    .eq('id', visitorId)
                    .single();

                if (!errorById && visitorById) {
                    visitor = visitorById;
                }
            }
        }

        if (!visitor) return;

        // Update the Telegram message UI with the provided time
        const arrivalTime = visitor.entry_time ? new Date(visitor.entry_time).toLocaleTimeString() : 'N/A';
        const approvalTime = visitor.approval_time ? new Date(visitor.approval_time).toLocaleTimeString() : 'N/A';
        const approvedBy = visitor.approved_by || 'Admin';

        let statusText = visitor.status === 'Checked-in' ? '✅ *Visitor Approved*' : '🚨 *New Visitor Arrival (Walk-in)*';

        const newText = `
${statusText}

👤 *Visitor(s):* ${visitor.name}
🏢 *Purpose:* ${visitor.purpose}
🤝 *Meeting With:* ${visitor.meeting_with || 'Not Specified'}
⏰ *Arrival Time:* ${arrivalTime}

${visitor.status === 'Checked-in' ? `👮‍♂️ *Approved By:* ${approvedBy}\n⏰ *Approval Time:* ${approvalTime}\n` : ''}
🕒 *Meeting Time:* ${replyText}
📅 *From:* ${replyText.split('-')[0]?.trim() || '---'}
📅 *To:* ${replyText.split('-')[1]?.trim() || '---'}
        `.trim();

        updateTelegramMessage(visitor.telegram_chat_id, visitor.telegram_message_id, newText);

        // Log Audit
        logAudit('Update Meeting Time', 'visitors', visitor.id, `Telegram User ${telegramUserId}`, { meeting_duration: replyText });

        fetchDashboardData();
    };

    const handleTimeSelection = async (update) => {
        const parts = update.data.split(':'); // time:step:visitorId:hour:minute
        const step = parts[1];
        const visitorId = parts[2];
        const hour = parts[3];
        const minute = parts[4];
        const chatId = update.message.chat.id;
        const messageId = update.message.message_id;

        if (step === 'from_h') {
            // Hour picked for From, show minutes
            const keyboard = getMinuteSelectorKeyboard(visitorId, 'from_m', hour);
            editTelegramMessageMarkup(chatId, messageId, keyboard);
        } else if (step === 'from_m') {
            // Minute picked for From, show Hour grid for To
            const fromTime = `${hour}:${minute}`;
            await supabase.from('visitors').update({ meeting_from: fromTime }).eq('id', visitorId);

            const keyboard = getTimeSelectorKeyboard(visitorId, 'to_h');
            editTelegramMessageMarkup(chatId, messageId, keyboard);
            answerCallbackQuery(update.callback_id, `From set to ${fromTime}`);
        } else if (step === 'to_h') {
            // Hour picked for To, show minutes
            const keyboard = getMinuteSelectorKeyboard(visitorId, 'to_m', hour);
            editTelegramMessageMarkup(chatId, messageId, keyboard);
        } else if (step === 'to_m') {
            // Final step: Minute picked for To.
            const toTime = `${hour}:${minute}`;

            // Get current visitor to get meeting_from
            const { data: visitor } = await supabase.from('visitors').select('id, name, nic_passport, purpose, meeting_with, entry_time, status, type, meeting_from, meeting_to, approval_time, approved_by, telegram_chat_id, telegram_message_id').eq('id', visitorId).single();
            const fromTime = visitor?.meeting_from || '---';

            // 1. Create a Scheduled Meeting (On-arrival)
            const { error: meetingError } = await supabase
                .from('scheduled_meetings')
                .insert({
                    visitor_name: visitor.name,
                    visitor_nic: visitor.nic_passport,
                    visitor_category: 'On-arrival',
                    purpose: visitor.purpose,
                    meeting_with: visitor.meeting_with,
                    meeting_date: new Date().toISOString().split('T')[0],
                    start_time: fromTime,
                    end_time: toTime,
                    status: 'Scheduled'
                });

            if (meetingError) {
                answerCallbackQuery(update.callback_id, "Error scheduling meeting");
                console.error(meetingError);
                return;
            }

            // 2. Update the original visitor request status
            await supabase.from('visitors').update({
                meeting_to: toTime,
                status: 'Meeting Scheduled',
                approved_by: `Telegram`
            }).eq('id', visitorId);

            // 3. Update Message Text to finalized state (as in handleApprove)
            const arrivalTime = visitor.entry_time ? new Date(visitor.entry_time).toLocaleTimeString() : 'N/A';
            const approvalTime = new Date().toLocaleTimeString();

            const newText = `
📅 *Meeting Scheduled*

👤 *Visitor(s):* ${visitor.name}
🏢 *Purpose:* ${visitor.purpose}
🤝 *Meeting With:* ${visitor.meeting_with || 'Not Specified'}
⏰ *Request Recieved:* ${arrivalTime}

👮‍♂️ *Approved By:* Telegram
⏰ *Scheduled At:* ${approvalTime}

🕒 *Meeting Window:* ${fromTime} - ${toTime}
📍 *Next Step:* Please check-in via the kiosk.
            `.trim();

            updateTelegramMessage(chatId, messageId, newText);
            answerCallbackQuery(update.callback_id, `Meeting successfully scheduled!`);

            // Log Audit
            logAudit('Schedule Meeting for Walk-in', 'scheduled_meetings', visitorId, `Telegram`, { from: fromTime, to: toTime });
            fetchDashboardData();
        }
    };

    const fetchDashboardData = async () => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Scheduled Meetings
        const { data: meetings, error: meetingsError } = await supabase
            .from('scheduled_meetings')
            .select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, start_time, end_time, status, visitor_category, request_source')
            .eq('meeting_date', today)
            .in('status', ['Scheduled', 'Confirmed']);

        if (meetings) {
            setScheduledMeetings(meetings);
            setStats(prev => {
                const newStats = [...prev];
                // Update Scheduled Count (index 3)
                newStats[3].value = meetings.length.toString();
                return newStats;
            });
        }
        if (meetingsError) console.error("Error fetching scheduled meetings:", meetingsError);


        // 2. Fetch Visitors
        const { data: visitorsData, error: visitorsError } = await supabase
            .from('visitors')
            .select('id, name, nic_passport, purpose, meeting_with, entry_time, exit_time, status, type, validation_method, is_pre_registered, meeting_from, meeting_to, source_tag')
            .order('entry_time', { ascending: false })
            .limit(50); // Fetch recent 50
        if (visitorsError) console.error("Error fetching visitors:", visitorsError);


        // 3. Fetch Staff Entries
        const { data: staffData, error: staffError } = await supabase
            .from('staff_entries')
            .select('id, name, entry_time, exit_time, status, type')
            .order('entry_time', { ascending: false })
            .limit(20);
        if (staffError) console.error("Error fetching staff entries:", staffError);

        // 4. Fetch Vehicle Entries
        const { data: vehicleData, error: vehicleError } = await supabase
            .from('vehicle_entries')
            .select('id, vehicle_number, vehicle_type, driver_name, entry_time, exit_time, status, is_sbu_vehicle, type')
            .order('entry_time', { ascending: false })
            .limit(20);
        if (vehicleError) console.error("Error fetching vehicle entries:", vehicleError);

        // 5. Calculate Stats
        // Recalculating Stats (Visitors)
        if (visitorsData) {
            const todayVisitors = visitorsData.filter(v =>
                v.entry_time && v.entry_time.startsWith(today) && v.status === 'Checked-in'
            ).length;
            const autoConfirmed = visitorsData.filter(v =>
                v.entry_time && v.entry_time.startsWith(today) && v.status === 'Checked-in' && v.validation_method === 'Agent-Auto'
            ).length;
            const autoConfirmedPercentage = todayVisitors > 0 ? Math.round((autoConfirmed / todayVisitors) * 100) : 0;

            setStats(prev => {
                const newStats = [...prev];
                newStats[0].value = todayVisitors.toString(); // Total Visitors
                newStats[2].value = `${autoConfirmedPercentage}% `; // Auto-Confirmed %
                return newStats;
            });
        }

        // Recalculating Stats (Vehicles)
        if (vehicleData) {
            const todayVehicles = vehicleData.filter(v => v.entry_time && v.entry_time.startsWith(today)).length;
            setStats(prev => {
                const newStats = [...prev];
                newStats[1].value = todayVehicles.toString(); // Vehicles (Traffic)
                return newStats;
            });
        }

        // 6. Merge and Format Logs
        const validVisitors = (visitorsData || []).filter(v => v.status === 'Checked-in' || v.status === 'Denied');
        const validStaff = staffData || [];
        const validVehicles = vehicleData || [];

        const merged = [
            ...validVisitors.map(v => ({ ...v, sourceTable: 'visitors' })),
            ...validStaff.map(s => ({ ...s, sourceTable: 'staff_entries', type: 'Staff' })),
            ...validVehicles.map(v => ({ ...v, sourceTable: 'vehicle_entries', type: 'Vehicle' }))
        ];

        const formatted = merged.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time))
            .map(entry => {
                // Determine Types
                const isStaff = entry.type === 'Staff';
                const isVehicle = entry.sourceTable === 'vehicle_entries';
                const isSbuVehicle = isVehicle && entry.is_sbu_vehicle;

                let displayType = entry.type; // default

                if (entry.sourceTable === 'visitors') {
                    displayType = entry.type; // 'Parent', 'Lyceum', 'Other'
                } else if (isStaff) {
                    displayType = 'Lyceum';
                } else if (isVehicle) {
                    if (isSbuVehicle) displayType = 'Lyceum';
                    else displayType = entry.vehicle_type; // e.g. Car, Van
                }

                const isRealStaffEntry = entry.sourceTable === 'staff_entries';

                // Purpose Logic: Show for everyone except pure Staff Entires (which don't usually have purpose logged manually)
                let purposeDisplay = entry.purpose || '-';
                if (isRealStaffEntry) purposeDisplay = '-';

                // Scheduling Logic
                let schedulingStatus = '-';
                if (isVehicle) {
                    schedulingStatus = 'On-arrival';
                } else if (entry.sourceTable === 'visitors') {
                    // For all visitors, show scheduling status
                    schedulingStatus = entry.is_pre_registered ? 'Pre-scheduled' : 'On-arrival';
                }

                // Name mapping
                let displayName = entry.name;
                if (isVehicle) {
                    displayName = entry.vehicle_number; // Show Vehicle Number as Name
                }

                // Meeting With Logic
                let meetingWithDisplay = entry.meeting_with || '-';
                if (isRealStaffEntry) meetingWithDisplay = '-';

                return {
                    id: entry.id,
                    time: entry.entry_time,
                    formattedTime: entry.entry_time ? new Date(entry.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    displayType: displayType,
                    name: displayName || 'Unknown',
                    meetingWith: meetingWithDisplay,
                    purposeDisplay: purposeDisplay,
                    checkOutTime: entry.exit_time ? new Date(entry.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    schedulingStatus: schedulingStatus,
                    status: entry.status || '-',
                    method: entry.validation_method || '-',
                    category: isVehicle ? 'Vehicle' : 'Visitor',
                    scheduledFrom: entry.meeting_from || '-',
                    scheduledTo: entry.meeting_to || '-'
                };
            });

        setUnifiedLog(formatted);
    };

    const handleCheckOut = async (entry) => {
        const table = entry.category === 'Vehicle' ? 'vehicle_entries' : 'visitors';
        const { error } = await supabase
            .from(table)
            .update({ exit_time: new Date().toISOString() })
            .eq('id', entry.id);

        if (error) {
            alert("Error during check-out");
            console.error(error);
        } else {
            // Log Audit
            logAudit('Check-out', table, entry.id, user?.email || 'Admin', {
                name: entry.name || entry.vehicle_number,
                category: entry.category,
                entry_time: entry.time
            });
            fetchDashboardData();
        }
    };

    const handleCheckIn = async (meeting) => {
        setConfirmingMeeting(meeting);
    };

    const proceedWithCheckIn = async () => {
        const meeting = confirmingMeeting;
        if (!meeting) return;

        try {
            // 1. Create visitor entry
            const { error: visitorError } = await supabase
                .from('visitors')
                .insert({
                    name: meeting.visitor_name,
                    nic_passport: meeting.visitor_nic,
                    type: meeting.visitor_category || 'Visitor',
                    purpose: meeting.purpose,
                    meeting_with: meeting.meeting_with,
                    status: 'Checked-in',
                    validation_method: 'Agent-Auto',
                    is_pre_registered: true,
                    source_tag: meeting.request_source === 'webpage' ? 'pre-scheduled-via web page' : null
                });


            if (visitorError) throw visitorError;

            // 2. Update meeting status
            const { error: meetingError } = await supabase
                .from('scheduled_meetings')
                .update({ status: 'Checked-in' })
                .eq('id', meeting.id);

            if (meetingError) throw meetingError;

            // 3. Log Audit
            logAudit('Check-in', 'visitors', meeting.id, user?.email || 'Admin', {
                name: meeting.visitor_name,
                purpose: meeting.purpose,
                meeting_with: meeting.meeting_with
            });

            setConfirmingMeeting(null);
            alert('Visitor checked in successfully');
            fetchDashboardData();
        } catch (err) {
            alert('Error checking in: ' + err.message);
        }
    };

    const columns = [
        { header: 'Time', key: 'formattedTime' },
        { header: 'Type', key: 'displayType' },
        { header: 'Name', key: 'name' },
        { header: 'Meeting With', key: 'meetingWith' },
        { header: 'Purpose', key: 'purposeDisplay' },
        {
            header: 'Scheduled',
            key: 'scheduled',
            render: (val, row) => {
                if (row.scheduledFrom !== '-' || row.scheduledTo !== '-') {
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{row.scheduledFrom} - {row.scheduledTo}</span>
                        </div>
                    );
                }
                return '-';
            }
        },
        {
            header: 'Check-out',
            key: 'checkOutTime',
            render: (val, row) => {
                if (val !== '-') return val;
                // Only show check-out for checked-in visitors/vehicles
                if (row.status === 'Checked-in' || row.category === 'Vehicle') {
                    return (
                        <button
                            onClick={() => handleCheckOut(row)}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Check-out
                        </button>
                    );
                }
                return '-';
            }
        },
        { header: 'Scheduling', key: 'schedulingStatus' },
    ];

    // Role-based visibility
    const showAnalytics = user?.role !== 'Security Officer';

    // Filters
    const [logFilter, setLogFilter] = useState('All');
    const filteredLog = unifiedLog.filter(item => {
        if (logFilter === 'All') return true;
        return item.category === logFilter; // 'Visitor' or 'Vehicle'
    });

    return (
        <>
            <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
                {showAnalytics && (
                    <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '2.5rem' }}>
                        {stats.map((stat, idx) => (
                            <StatCard key={idx} {...stat} />
                        ))}
                    </div>
                )}
                {!showAnalytics && (
                    <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Real-time Operations</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Monitor and manage secure facility access.</p>
                    </div>
                )}

                {/* Expected Today Section - Full Width */}
                {!['School Operations', 'School Management'].includes(user?.role) && (
                    <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 140, 0, 0.1)', borderRadius: '12px' }}>
                                    <Calendar size={24} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>Expected Today</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scheduled arrivals for today</p>
                                </div>
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '0.25rem 0.75rem',
                                backgroundColor: 'rgba(255, 140, 0, 0.1)',
                                color: 'var(--primary)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 140, 0, 0.2)'
                            }}>
                                {scheduledMeetings.length} ARRIVALS
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                            {scheduledMeetings.length === 0 ? (
                                <div className="col-span-full" style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Quiet day so far. No arrivals scheduled.</p>
                                </div>
                            ) : (
                                scheduledMeetings.map(meeting => (
                                    <div key={meeting.id} style={{
                                        padding: '1.25rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '16px',
                                        transition: 'var(--transition)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9375rem' }}>{meeting.visitor_name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                                                <Clock size={12} /> {meeting.start_time.slice(0, 5)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                                            Hosting: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{meeting.meeting_with}</span>
                                        </div>
                                        <button
                                            onClick={() => handleCheckIn(meeting)}
                                            className="btn-primary"
                                            style={{
                                                width: '100%',
                                                fontSize: '0.8125rem',
                                                padding: '0.75rem',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                borderRadius: '12px'
                                            }}
                                        >
                                            <CheckCircle size={14} />
                                            Confirm Arrival
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Pending Approvals Section (Admin/Security Only) */}
                {pendingVisitors.length > 0 && !['School Operations', 'School Management'].includes(user?.role) && (
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(234, 179, 8, 0.3)', background: 'rgba(234, 179, 8, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="animate-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EAB308' }}></div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#EAB308', letterSpacing: '-0.01em' }}>Pending Approvals ({pendingVisitors.length})</h3>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                            {pendingVisitors.map(visitor => (
                                <div key={`${visitor.sourceTable}-${visitor.id}`} style={{
                                    padding: '1.25rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {visitor.name}
                                            {visitor.sourceTable === 'scheduled_meetings' && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    backgroundColor: visitor.telegram_chat_id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                                    color: visitor.telegram_chat_id ? '#3b82f6' : '#EAB308',
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '4px',
                                                    marginLeft: '0.5rem'
                                                }}>
                                                    {visitor.telegram_chat_id ? 'SITE REQ' : 'Kiosk Req'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            To meet: <span style={{ color: 'var(--text-main)' }}>{visitor.meeting_with || 'General'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                            "{visitor.purpose}"
                                        </div>
                                    </div>
                                    {/* Buttons removed per user request - approval via Telegram only */}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8">
                    {/* Main Content - Logs */}
                    <div className="w-full space-y-8">
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            padding: '0.4rem',
                            display: 'inline-flex',
                            gap: '0.25rem',
                            borderRadius: '16px',
                            border: '1px solid var(--glass-border)',
                            marginBottom: '0.5rem',
                            maxWidth: '100%',
                            overflowX: 'auto',
                            whiteSpace: 'nowrap'
                        }}>
                            {['All', 'Visitor', 'Vehicle'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setLogFilter(filter)}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        borderRadius: '12px',
                                        backgroundColor: logFilter === filter ? 'var(--primary)' : 'transparent',
                                        color: logFilter === filter ? 'white' : 'var(--text-muted)',
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'var(--transition)',
                                        boxShadow: logFilter === filter ? '0 4px 12px rgba(255, 140, 0, 0.2)' : 'none'
                                    }}
                                >
                                    {filter === 'Visitor' ? 'Visitors' : filter === 'Vehicle' ? 'Vehicles' : filter}
                                </button>
                            ))}
                        </div>
                        <LogTable title={`Access Activity - ${logFilter === 'All' ? 'Live' : logFilter + 's'} `} data={filteredLog} columns={columns} />
                    </div>

                </div>
            </div>

            {/* Custom Confirmation Modal - Moved OUTSIDE animate-fade-in to fix centering */}
            {
                confirmingMeeting && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 9999, /* Increased z-index */
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem', textAlign: 'center' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 140, 0, 0.1)', borderRadius: '20px' }}>
                                    <Users size={40} color="var(--primary)" />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', textAlign: 'center', width: '100%' }}>Confirm Arrival</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center', width: '100%', display: 'block' }}>
                                Authorize entry for <strong style={{ color: 'var(--text-main)' }}>{confirmingMeeting.visitor_name}</strong> to meet with <strong style={{ color: 'var(--text-main)' }}>{confirmingMeeting.meeting_with}</strong>?
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => setConfirmingMeeting(null)}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', padding: '0.75rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={proceedWithCheckIn}
                                    className="btn-primary"
                                    style={{ padding: '0.75rem', justifyContent: 'center' }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default DashboardView;
