import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Clock, User, Users, FileText, Plus, Search, Filter, Edit, Trash2, CheckCircle, ShieldAlert, XCircle, Loader2 as Loader } from 'lucide-react';
import MeetingScheduler from '../components/MeetingScheduler';
import { supabase } from '../lib/supabase';
import { sendSMS } from '../lib/sms';
import { formatApprovedMessage, formatDeniedMessage, updateTelegramMessage } from '../lib/telegram';
import { logAudit } from '../lib/audit';

const ScheduledMeetingsView = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScheduler, setShowScheduler] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [meetingToDelete, setMeetingToDelete] = useState(null);
    const [filter, setFilter] = useState('upcoming'); // upcoming, today, past, all
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    // New states for integrated sections
    const [scheduledArrivals, setScheduledArrivals] = useState([]);
    const [confirmingMeeting, setConfirmingMeeting] = useState(null);

    const approveToken = searchParams.get('approve_token');

    const handleEdit = React.useCallback((meeting) => {
        // For multi-visitor, we need to gather all visitors in the same meeting group
        const groupMeetings = meetings.filter(m =>
            (meeting.meeting_id && m.meeting_id === meeting.meeting_id) ||
            (!meeting.meeting_id && m.id === meeting.id)
        );

        const initialData = {
            ...meeting,
            visitors: groupMeetings.map(m => ({
                name: m.visitor_name,
                nic: m.visitor_nic,
                contact: m.visitor_contact
            }))
        };

        setEditingMeeting(initialData);
        setShowScheduler(true);
    }, [meetings]);

    // Auto-open modal for approval token
    useEffect(() => {
        if (approveToken && meetings.length > 0) {
            const meetingToApprove = meetings.find(m => m.approval_token === approveToken && !m.approval_token_used);
            if (meetingToApprove) {
                handleEdit(meetingToApprove);
                // Clear the token from URL to avoid re-triggering
                setSearchParams({}, { replace: true });
            }
        }
    }, [approveToken, meetings, setSearchParams, handleEdit]);

    useEffect(() => {
        fetchMeetings();
        fetchScheduledArrivals();

        // Real-time subscription for scheduled changes
        const subscription = supabase
            .channel('meetings-ops-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_meetings' }, () => {
                fetchScheduledArrivals();
                fetchMeetings();
            })
            .subscribe();

        const interval = setInterval(() => {
            fetchScheduledArrivals();
        }, 5000);

        return () => {
            clearInterval(interval);
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchScheduledArrivals = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('scheduled_meetings')
            .select('*')
            .eq('meeting_date', today)
            .in('status', ['Scheduled', 'Confirmed', 'Approved']);
        setScheduledArrivals(data || []);
    };

    const handleCheckIn = (meeting) => setConfirmingMeeting(meeting);

    const proceedWithCheckIn = async () => {
        const meeting = confirmingMeeting;
        if (!meeting) return;
        try {
            await supabase.from('visitors').insert({
                name: meeting.visitor_name,
                nic_passport: meeting.visitor_nic,
                type: meeting.visitor_category || 'Visitor',
                purpose: meeting.purpose,
                meeting_with: meeting.meeting_with,
                status: 'Checked-in',
                validation_method: 'Agent-Auto',
                is_pre_registered: true
            });
            await supabase.from('scheduled_meetings').update({ status: 'Checked-in' }).eq('id', meeting.id);
            setConfirmingMeeting(null);
            fetchScheduledArrivals();
            fetchMeetings();
        } catch (err) {
            alert('Check-in error: ' + err.message);
        }
    };

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('scheduled_meetings')
                .select('id, meeting_id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, meeting_role, start_time, end_time, status, visitor_category, telegram_chat_id, telegram_message_id, approval_token, created_at, google_event_id')
                .order('meeting_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            setMeetings(data || []);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSuccess = () => {
        setShowScheduler(false);
        setEditingMeeting(null);
        fetchMeetings();
    };



    const handleDelete = async () => {
        if (!meetingToDelete) return;

        try {
            // 1. Handle Google Calendar Deletion if applicable
            if (meetingToDelete.google_event_id) {
                try {
                    const { deleteGoogleCalendarEvent, initGoogleApi } = await import('../lib/googleCalendar');
                    await initGoogleApi();
                    await deleteGoogleCalendarEvent(meetingToDelete.google_event_id);
                } catch (calErr) {
                    console.error('Error deleting from calendar:', calErr);
                }
            }

            // 2. Delete from Supabase
            const { error } = await supabase
                .from('scheduled_meetings')
                .delete()
                .eq('id', meetingToDelete.id);

            if (error) throw error;

            setMeetingToDelete(null);
            fetchMeetings();

            // Send SMS notification for cancellation
            if (meetingToDelete.visitor_contact) {
                const smsMessage = `Your scheduled meeting on ${meetingToDelete.meeting_date} has been cancelled by the administration.`;
                await sendSMS(meetingToDelete.visitor_contact, smsMessage);
            }

            alert('Meeting cancelled successfully.');
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Failed to cancel meeting: ' + error.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'checked-in': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredMeetings = meetings.filter(meeting => {
        const matchesSearch =
            meeting.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            meeting.meeting_with.toLowerCase().includes(searchTerm.toLowerCase()) ||
            meeting.purpose.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        const meetingDate = new Date(meeting.meeting_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        meetingDate.setHours(0, 0, 0, 0);

        if (filter === 'today') return meetingDate.getTime() === today.getTime();
        if (filter === 'upcoming') return meetingDate >= today;
        if (filter === 'past') return meetingDate < today;

        return true;
    });

    return (
        <div className="animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Scheduled Meetings</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage visitor appointments and pre-registrations</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowScheduler(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} />
                    Schedule Meeting
                </button>
            </div>

            {/* Expected Today (Integrated) */}
            <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 140, 0, 0.1)', borderRadius: '12px' }}>
                            <Calendar size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>Expected Today</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Confirmed arrivals for today</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {scheduledArrivals.filter(m => m.status !== 'Checked-in').length === 0 ? (
                        <div className="col-span-full" style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px dashed var(--glass-border)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No arrivals scheduled for today.</p>
                        </div>
                    ) : (
                        scheduledArrivals.filter(m => m.status !== 'Checked-in').map(meeting => (
                            <div key={meeting.id} style={{ padding: '1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{meeting.visitor_name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <Clock size={12} /> {meeting.start_time?.slice(0, 5)}
                                    </span>
                                </div>
                                <button onClick={() => handleCheckIn(meeting)} className="btn-primary" style={{ width: '100%', fontSize: '0.8125rem', padding: '0.5rem', borderRadius: '10px' }}>
                                    Confirm Arrival
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>



            {/* Filters & Search */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.625rem 1rem 0.625rem 2.5rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            outline: 'none',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['upcoming', 'today', 'past', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '12px',
                                textTransform: 'capitalize',
                                backgroundColor: filter === f ? 'var(--primary)' : 'transparent',
                                color: filter === f ? 'white' : 'var(--text-muted)',
                                border: filter === f ? 'none' : '1px solid var(--border)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Meetings List */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date & Time</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Visitor</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Meeting With</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Purpose</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading meetings...</td>
                                </tr>
                            ) : filteredMeetings.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No scheduled meetings found.</td>
                                </tr>
                            ) : (
                                filteredMeetings.map((meeting) => (
                                    <tr key={meeting.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 500 }}>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                    {meeting.start_time.slice(0, 5)} - {meeting.end_time.slice(0, 5)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={16} className="text-gray-400" />
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{meeting.visitor_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meeting.visitor_nic}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 500 }}>{meeting.meeting_with}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meeting.meeting_role}</div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {meeting.purpose}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                            }} className={getStatusColor(meeting.status)}>
                                                {meeting.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEdit(meeting)}
                                                    style={{ padding: '0.25rem', color: 'var(--primary)', backgroundColor: 'transparent' }}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setMeetingToDelete(meeting)}
                                                    style={{ padding: '0.25rem', color: 'var(--danger)', backgroundColor: 'transparent' }}
                                                    title="Cancel"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showScheduler && (
                <MeetingScheduler
                    initialData={editingMeeting}
                    onClose={() => {
                        setShowScheduler(false);
                        setEditingMeeting(null);
                    }}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Delete Confirmation Modal */}
            {meetingToDelete && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="card animate-fade-in-static" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center' }}>
                        <Trash2 size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Cancel Meeting?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            Are you sure you want to cancel this meeting for <strong>{meetingToDelete.visitor_name}</strong>?
                            This action cannot be undone and will remove the entry from the system.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setMeetingToDelete(null)}
                                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                            >
                                No, Keep it
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn-primary"
                                style={{ flex: 1, backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                            >
                                Yes, Cancel Meeting
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Check-in Confirmation Modal */}
            {confirmingMeeting && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem', textAlign: 'center' }}>
                        <Users size={40} color="var(--primary)" style={{ margin: '0 auto 1.5rem' }} />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Confirm Arrival</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Authorize entry for <strong>{confirmingMeeting.visitor_name}</strong>?</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => setConfirmingMeeting(null)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)' }}>Cancel</button>
                            <button onClick={proceedWithCheckIn} className="btn-primary">Confirm</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ScheduledMeetingsView;
