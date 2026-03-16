import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, User, FileText, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import MeetingScheduler from '../components/MeetingScheduler';
import { supabase } from '../lib/supabase';
import { sendSMS } from '../lib/sms';

const ScheduledMeetingsView = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScheduler, setShowScheduler] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [meetingToDelete, setMeetingToDelete] = useState(null);
    const [filter, setFilter] = useState('upcoming'); // upcoming, today, past, all
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('scheduled_meetings')
                .select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, meeting_role, start_time, end_time, status, visitor_category, meeting_id, google_event_id, created_at')
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

    const handleEdit = (meeting) => {
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
                .eq(meetingToDelete.meeting_id ? 'meeting_id' : 'id',
                    meetingToDelete.meeting_id || meetingToDelete.id);

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
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            outline: 'none'
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
                                borderRadius: '8px',
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
        </div>
    );
};

export default ScheduledMeetingsView;
