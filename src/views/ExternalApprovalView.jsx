import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Calendar, User, ArrowRight, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateTelegramMessage, formatApprovedMessage } from '../lib/telegram';
import { sendSMS } from '../lib/sms';
import { logAudit } from '../lib/audit';
import { initGoogleApi, createGoogleCalendarEvent } from '../lib/googleCalendar';

const ExternalApprovalView = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [visitor, setVisitor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('loading'); // loading, authorized, used, invalid, success
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00'
    });
    const [syncToCalendar, setSyncToCalendar] = useState(true);

    useEffect(() => {
        fetchVisitor();
    }, [token]);

    const fetchVisitor = async () => {
        try {
            const { data, error } = await supabase
                .from('scheduled_meetings')
                .select('*')
                .eq('approval_token', token)
                .single();

            if (error || !data) {
                setStatus('invalid');
            } else if (data.status === 'Scheduled' || data.status === 'Confirmed' || data.approval_token_used) {
                setStatus('used');
            } else {
                setVisitor(data);
                setStatus('authorized');
            }
        } catch (err) {
            console.error(err);
            setStatus('invalid');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            // 1. Update the existing Scheduled Meeting
            const { error: meetingError } = await supabase
                .from('scheduled_meetings')
                .update({
                    meeting_date: formData.date,
                    start_time: formData.startTime,
                    end_time: formData.endTime,
                    status: 'Scheduled',
                    approval_token_used: true,
                    google_event_id: null // Will update if sync succeeds
                })
                .eq('id', visitor.id);

            if (meetingError) throw meetingError;

            // 1b. Google Calendar Sync
            let googleEventId = null;
            if (syncToCalendar) {
                try {
                    await initGoogleApi();
                    const event = await createGoogleCalendarEvent({
                        visitorName: visitor.visitor_name,
                        purpose: visitor.purpose,
                        meetingWith: visitor.meeting_with,
                        date: formData.date,
                        startTime: formData.startTime,
                        endTime: formData.endTime
                    });
                    googleEventId = event.id;

                    // Update meeting with google_event_id
                    await supabase
                        .from('scheduled_meetings')
                        .update({ google_event_id: googleEventId })
                        .eq('id', visitor.id);
                } catch (calendarErr) {
                    console.error('Google Calendar Error:', calendarErr);
                }
            }

            // 2. Update Telegram Message
            const arrivalTime = visitor.created_at ? new Date(visitor.created_at).toLocaleTimeString() : 'N/A';
            const confirmationTime = new Date().toLocaleTimeString();

            const newText = formatApprovedMessage({
                visitorNames: visitor.visitor_name,
                purpose: visitor.purpose,
                meetingWith: visitor.meeting_with,
                requestReceived: arrivalTime,
                approvedBy: 'External Approver',
                approvedAt: confirmationTime,
                startTime: formData.startTime,
                endTime: formData.endTime,
                date: formData.date,
                sourceTag: '(via Web Portal)'
            });

            await updateTelegramMessage(visitor.telegram_chat_id, visitor.telegram_message_id, newText);

            // 3. Send SMS to Visitor
            if (visitor.visitor_contact) {
                const smsMessage = `Your meeting with ${visitor.meeting_with || 'Lyceum Staff'} has been scheduled for ${formData.date} at ${formData.startTime}. Please show this message at the security point. (scheduled through the web page)`;
                await sendSMS(visitor.visitor_contact, smsMessage);
            }

            // 4. Log Audit
            logAudit('Web-Based Approval', 'scheduled_meetings', visitor.id, 'External Approver', {
                start: formData.startTime,
                end: formData.endTime,
                date: formData.date
            });

            setStatus('success');
        } catch (err) {
            console.error(err);
            alert("Confirmation failed: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    if (status === 'invalid' || status === 'used') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                <div style={{ padding: '2rem', backgroundColor: status === 'used' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '2rem' }}>
                    {status === 'used' ? <CheckCircle size={64} color="var(--primary)" /> : <XCircle size={64} color="#EF4444" />}
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
                    {status === 'used' ? 'Link Already Used' : 'Invalid or Expired Link'}
                </h1>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                    {status === 'used' ? 'This visitor has already been approved.' : 'This approval link is no longer valid or has expired for security reasons.'}
                </p>
                <button onClick={() => navigate('/')} style={{ marginTop: '2rem', padding: '1rem 2rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    BACK TO SYSTEM
                </button>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                <div style={{ padding: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '2rem' }}>
                    <CheckCircle size={64} color="#10B981" className="animate-bounce-in" />
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', marginBottom: '1rem' }}>Meeting Scheduled</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>
                    The visitor has been notified.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0c10',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '500px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '32px',
                padding: '3rem 2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2.5rem'
            }}>
                <header style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(37, 99, 235, 0.2)', borderRadius: '20px', marginBottom: '1.5rem' }}>
                        <Clock color="#3b82f6" size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Assign Visit Time</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>Approving walk-in for {visitor.visitor_name}</p>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>VISIT DATE</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>START TIME</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>END TIME</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={14} /> VISITOR DETAILS
                    </h3>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{visitor.visitor_name}</p>
                    <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <p>Contact: {visitor.visitor_contact || 'N/A'}</p>
                        <p>Purpose: {visitor.purpose}</p>
                    </div>
                </div>

                {/* Google Calendar Embed */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={14} /> SCHOOL CALENDAR
                        </h4>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                            <input
                                type="checkbox"
                                checked={syncToCalendar}
                                onChange={(e) => setSyncToCalendar(e.target.checked)}
                                style={{ accentColor: '#2563eb' }}
                            />
                            Sync with Google Calendar
                        </label>
                    </div>
                    <div style={{ width: '100%', height: '250px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <iframe
                            src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(import.meta.env.VITE_PRINCIPAL_CALENDAR_ID || 'primary')}&ctz=${Intl.DateTimeFormat().resolvedOptions().timeZone}&mode=WEEK&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&bgcolor=%230a0c10&wkst=1`}
                            style={{ border: 0, width: '100%', height: '100%' }}
                            frameBorder="0"
                            scrolling="no"
                        ></iframe>
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    style={{
                        padding: '1.25rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '1.125rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {submitting ? <Loader className="animate-spin" size={24} /> : (
                        <>
                            SCHEDULE MEETING <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ExternalApprovalView;
