import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, User, FileText, Phone, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateTelegramMessage, formatApprovedMessage, formatDeniedMessage } from '../lib/telegram';
import { logAudit } from '../lib/audit';

const AppointmentApprovalView = () => {
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('request_id');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [meeting, setMeeting] = useState(null);
    const [error, setError] = useState('');

    const [meetingDate, setMeetingDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const fetchMeeting = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('scheduled_meetings')
                .select('*')
                .eq('id', requestId)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Meeting not found.');

            setMeeting(data);

            // Pre-fill fields if they exist, otherwise use defaults
            const localNow = new Date();
            const localDate = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
            setMeetingDate(data.meeting_date || localDate);
            setStartTime(data.start_time || '10:00');
            setEndTime(data.end_time || '11:00');

        } catch (err) {
            console.error('Error fetching meeting:', err);
            setError('Could not load meeting details or meeting does not exist.');
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        if (!requestId) {
            setError('Invalid Request ID.');
            setLoading(false);
            return;
        }
        fetchMeeting();
    }, [requestId, fetchMeeting]);

    const handleApprove = async () => {
        if (!meetingDate || !startTime || !endTime) {
            alert('Please select date, start time, and end time.');
            return;
        }

        setSubmitting(true);
        try {
            // Update Supabase
            const { error: updateError } = await supabase
                .from('scheduled_meetings')
                .update({
                    status: 'Approved',
                    meeting_date: meetingDate,
                    start_time: startTime,
                    end_time: endTime
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Audit
            logAudit('Approve Meeting', 'scheduled_meetings', requestId, null, {
                visitor: meeting.visitor_name,
                status: 'Approved',
                date: meetingDate,
                time: `${startTime} - ${endTime}`
            });

            // Update Telegram
            if (meeting.telegram_chat_id && meeting.telegram_message_id) {
                const details = {
                    visitorNames: meeting.visitor_name,
                    purpose: meeting.purpose,
                    meetingWith: meeting.meeting_with,
                    requestReceived: new Date(meeting.created_at).toLocaleString(),
                    approvedBy: 'Web Administrator',
                    approvedAt: new Date().toLocaleString(),
                    startTime,
                    endTime,
                    date: meetingDate,
                    sourceTag: '(via Web Portal)'
                };
                const updatedMessage = formatApprovedMessage(details);
                await updateTelegramMessage(
                    meeting.telegram_chat_id,
                    meeting.telegram_message_id,
                    updatedMessage
                );
            }

            // Update local state
            setMeeting({ ...meeting, status: 'Approved', meeting_date: meetingDate, start_time: startTime, end_time: endTime });
        } catch (err) {
            console.error('Error approving meeting:', err);
            alert('Failed to approve meeting.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        setSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('scheduled_meetings')
                .update({ status: 'Rejected' })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Audit
            logAudit('Reject Meeting', 'scheduled_meetings', requestId, null, {
                visitor: meeting.visitor_name,
                status: 'Rejected'
            });

            // Update Telegram
            if (meeting.telegram_chat_id && meeting.telegram_message_id) {
                const details = {
                    visitorNames: meeting.visitor_name,
                    purpose: meeting.purpose,
                    meetingWith: meeting.meeting_with,
                    actionBy: 'Web Administrator',
                    actionAt: new Date().toLocaleString()
                };
                const updatedMessage = formatDeniedMessage(details);
                await updateTelegramMessage(
                    meeting.telegram_chat_id,
                    meeting.telegram_message_id,
                    updatedMessage
                );
            }

            // Update local state
            setMeeting({ ...meeting, status: 'Rejected' });
        } catch (err) {
            console.error('Error rejecting meeting:', err);
            alert('Failed to reject meeting.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top left, #1e293b, #0f172a)' }}>
                <Loader className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top left, #1e293b, #0f172a)', padding: '2rem' }}>
                <div className="card animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center', padding: '3rem' }}>
                    <XCircle size={64} color="#EF4444" style={{ margin: '0 auto 1.5rem auto' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>{error}</h2>
                    <button onClick={() => navigate('/')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>Back to Home</button>
                </div>
            </div>
        );
    }

    const isPending = meeting?.status?.toLowerCase() === 'meeting requested' || meeting?.status?.toLowerCase() === 'pending';
    const isApproved = meeting?.status?.toLowerCase() === 'approved' || meeting?.status?.toLowerCase() === 'scheduled';
    const isRejected = meeting?.status?.toLowerCase() === 'rejected';

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
            padding: '2rem 1rem'
        }}>
            <div style={{ maxWidth: '600px', width: '100%' }}>
                <div className="card animate-fade-in" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Status Banner */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        padding: '0.75rem',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        background: isApproved ? 'rgba(16, 185, 129, 0.2)' : isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isApproved ? '#34d399' : isRejected ? '#f87171' : '#fbbf24'
                    }}>
                        Status: {meeting.status}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Appointment Approval</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Review visitor details and finalize the schedule.</p>
                    </div>

                    {/* Visitor Details Card */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={20} className="text-primary" /> Visitor Information
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Visitor Name</div>
                                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.visitor_name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Visitor Category</div>
                                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.visitor_category || 'Parent'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <FileText size={14} /> ID / NIC
                                </div>
                                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.visitor_nic}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Phone size={14} /> Contact
                                </div>
                                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.visitor_contact}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Meeting With</div>
                                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.meeting_with}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Purpose</div>
                                <div style={{ fontWeight: 500, color: 'var(--text-main)', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                    {meeting.purpose}
                                </div>
                            </div>
                            {isPending && (
                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Clock size={20} color="#fbbf24" />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>Requested Schedule</div>
                                        <div style={{ fontWeight: 700, color: '#fde68a' }}>{meeting.meeting_date} at {meeting.start_time}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule Section */}
                    {isPending ? (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={18} className="text-primary" /> Setup Schedule
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Meeting Date</label>
                                    <input
                                        type="date"
                                        value={meetingDate}
                                        onChange={e => setMeetingDate(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Start Time</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none', colorScheme: 'dark' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>End Time</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none', colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '2.5rem', padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={18} className="text-primary" /> Confirmed Schedule
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Date</div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.meeting_date}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Time</div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{meeting.start_time} - {meeting.end_time}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {isPending && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                onClick={handleReject}
                                disabled={submitting}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--danger)',
                                    color: 'var(--danger)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                <XCircle size={20} /> Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={submitting}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--primary)',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.7 : 1,
                                    boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
                                }}
                            >
                                {submitting ? <Loader className="animate-spin" size={20} /> : <CheckCircle size={20} />} Approve
                            </button>
                        </div>
                    )}

                    {!isPending && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isApproved ? '#34d399' : '#f87171', borderRadius: '50px', fontWeight: 600 }}>
                                {isApproved ? <CheckCircle size={20} /> : <XCircle size={20} />} 
                                This request has been {meeting.status.toLowerCase()}.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentApprovalView;
