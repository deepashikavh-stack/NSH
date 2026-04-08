import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, Clock, User, FileText, Phone, CheckCircle, 
    XCircle, Loader, ArrowLeft, ShieldCheck, Mail, MapPin, 
    AlertCircle, Check, Trash2, Edit 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateTelegramMessage, formatApprovedMessage, formatDeniedMessage } from '../lib/telegram';
import { logAudit } from '../lib/audit';

const AppointmentApprovalView = () => {
    const [searchParams] = useSearchParams();
    const meetingGroupIdFromUrl = searchParams.get('meeting_id');
    const requestIdFromUrl = searchParams.get('request_id');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [visitors, setVisitors] = useState([]);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [meetingDate, setMeetingDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const fetchMeetingGroup = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            let finalMeetingId = meetingGroupIdFromUrl;
            console.log('[Approval] Starting fetch. Parameters:', { meeting_id: meetingGroupIdFromUrl, request_id: requestIdFromUrl });

            // 1. Backward Compatibility: If we only have request_id (UUID), find its meeting_id
            if (!finalMeetingId && requestIdFromUrl) {
                console.log('[Approval] Searching for group ID via request_id:', requestIdFromUrl);
                const { data: singleRow, error: singleError } = await supabase
                    .from('scheduled_meetings')
                    .select('meeting_id, id')
                    .eq('id', requestIdFromUrl)
                    .single();
                
                if (singleError) {
                    console.warn('[Approval] UUID lookup failed, trying direct load:', singleError);
                } else if (singleRow?.meeting_id) {
                    finalMeetingId = singleRow.meeting_id;
                    console.log('[Approval] Found group ID:', finalMeetingId);
                }
            }

            // 2. Primary Query: Try fetching by meeting_id (group ID)
            if (finalMeetingId) {
                const { data, error: fetchError } = await supabase
                    .from('scheduled_meetings')
                    .select('*')
                    .eq('meeting_id', finalMeetingId);

                if (!fetchError && data && data.length > 0) {
                    setVisitors(data);
                    setupInitialState(data[0]);
                    setLoading(false);
                    return;
                }
            }

            // 3. Last Resort Fallback: Single-visitor legacy links
            const fallbackId = requestIdFromUrl || finalMeetingId;
            if (fallbackId) {
                const { data, error: fallbackError } = await supabase
                    .from('scheduled_meetings')
                    .select('*')
                    .eq('id', fallbackId);

                if (!fallbackError && data && data.length > 0) {
                    setVisitors(data);
                    setupInitialState(data[0]);
                    setLoading(false);
                    return;
                }
            }

            throw new Error(`Meeting not found (ID: ${finalMeetingId || requestIdFromUrl || 'Unknown'}). The link may have expired.`);

        } catch (err) {
            console.error('[Approval] Critical Load Error:', err);
            setError(err.message || 'Could not load meeting details.');
        } finally {
            setLoading(false);
        }
    }, [meetingGroupIdFromUrl, requestIdFromUrl]);

    const setupInitialState = (mtg) => {
        const localNow = new Date();
        const localDate = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
        setMeetingDate(mtg.meeting_date || localDate);
        setStartTime(mtg.start_time || '10:00');
        setEndTime(mtg.end_time || '11:00');
    };

    useEffect(() => {
        if (!meetingGroupIdFromUrl && !requestIdFromUrl) {
            setError('Invalid access point. Please use a link from the official Telegram alert.');
            setLoading(false);
            return;
        }
        fetchMeetingGroup();
    }, [meetingGroupIdFromUrl, requestIdFromUrl, fetchMeetingGroup]);

    const handleApprove = async () => {
        if (!meetingDate || !startTime || !endTime) {
            alert('Please select date, start time, and end time.');
            return;
        }

        const mGroupId = visitors[0]?.meeting_id;
        const fallbackId = visitors[0]?.id;
        const targetId = mGroupId || fallbackId;

        setSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('scheduled_meetings')
                .update({
                    status: 'Approved',
                    meeting_date: meetingDate,
                    start_time: startTime,
                    end_time: endTime,
                    approved_at: new Date().toISOString()
                })
                .eq(mGroupId ? 'meeting_id' : 'id', targetId);

            if (updateError) throw updateError;

            const firstMeeting = visitors[0];
            const visitorNames = visitors.map(v => v.visitor_name).join(', ');

            logAudit('Approve Meeting Group', 'scheduled_meetings', targetId, null, {
                visitors: visitorNames,
                status: 'Approved',
                date: meetingDate,
                time: `${startTime} - ${endTime}`
            });

            // Telegram notification
            if (firstMeeting.telegram_chat_id && firstMeeting.telegram_message_id) {
                const details = {
                    visitorNames,
                    purpose: firstMeeting.purpose,
                    meetingWith: firstMeeting.meeting_with,
                    requestReceived: new Date(firstMeeting.created_at).toLocaleString(),
                    approvedBy: 'Web Portal',
                    approvedAt: new Date().toLocaleString(),
                    startTime,
                    endTime,
                    date: meetingDate
                };
                await updateTelegramMessage(firstMeeting.telegram_chat_id, firstMeeting.telegram_message_id, formatApprovedMessage(details));
            }

            setSuccessMessage(`Successfully approved ${visitors.length} visitors.`);
            setVisitors(prev => prev.map(v => ({ ...v, status: 'Approved', meeting_date: meetingDate, start_time: startTime, end_time: endTime })));
        } catch (err) {
            console.error('Error approving group:', err);
            alert('Failed to approve. Please check your connection.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        const mGroupId = visitors[0]?.meeting_id;
        const fallbackId = visitors[0]?.id;
        const targetId = mGroupId || fallbackId;

        if (!window.confirm('Are you sure you want to reject this entire group?')) return;

        setSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('scheduled_meetings')
                .update({ status: 'Rejected' })
                .eq(mGroupId ? 'meeting_id' : 'id', targetId);

            if (updateError) throw updateError;

            const firstMeeting = visitors[0];
            const visitorNames = visitors.map(v => v.visitor_name).join(', ');

            logAudit('Reject Meeting Group', 'scheduled_meetings', targetId, null, {
                visitors: visitorNames,
                status: 'Rejected'
            });

            if (firstMeeting.telegram_chat_id && firstMeeting.telegram_message_id) {
                const details = {
                    visitorNames,
                    purpose: firstMeeting.purpose,
                    meetingWith: firstMeeting.meeting_with,
                    actionBy: 'Web Portal',
                    actionAt: new Date().toLocaleString()
                };
                await updateTelegramMessage(firstMeeting.telegram_chat_id, firstMeeting.telegram_message_id, formatDeniedMessage(details));
            }

            setSuccessMessage('Meeting request has been rejected.');
            setVisitors(prev => prev.map(v => ({ ...v, status: 'Rejected' })));
        } catch (err) {
            console.error('Error rejecting group:', err);
            alert('Failed to reject meeting.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top left, #1e293b, #0f172a)' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Loader className="text-primary" size={64} />
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top left, #0f172a, #101010)', padding: '2rem' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
                    <XCircle size={64} className="text-danger" style={{ margin: '0 auto 1.5rem auto' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
                    <button onClick={() => navigate('/')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Return Home</button>
                </motion.div>
            </div>
        );
    }

    const meeting = visitors[0];
    const isPending = meeting?.status?.toLowerCase() === 'meeting requested' || meeting?.status?.toLowerCase() === 'pending';
    const isApproved = meeting?.status?.toLowerCase() === 'approved' || meeting?.status?.toLowerCase() === 'scheduled';
    const isRejected = meeting?.status?.toLowerCase() === 'rejected';

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a, #000000)',
            padding: '2rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                style={{ maxWidth: '600px', width: '100%' }}
            >
                {/* Brand Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '16px', background: 'rgba(255, 140, 0, 0.1)', border: '1px solid rgba(255, 140, 0, 0.2)', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={32} className="text-primary" />
                    </div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>Nextgen Shield</h1>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.7 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Secure Approval Portal</span>
                    </div>
                </div>

                <div className="card" style={{ 
                    borderRadius: '28px', 
                    padding: '0', 
                    overflow: 'hidden', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}>
                    {/* Status Header */}
                    <div style={{ 
                        background: isApproved ? 'rgba(16, 185, 129, 0.15)' : isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isApproved ? '#34d399' : isRejected ? '#f87171' : '#fbbf24', fontWeight: 800, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {isApproved ? <Check size={16} /> : isRejected ? <XCircle size={16} /> : <AlertCircle size={16} />}
                            {meeting.status}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            GROUP ID: {meeting.meeting_id || 'INDIVIDUAL'}
                        </div>
                    </div>

                    <div style={{ padding: '2.5rem' }}>
                        {/* Header Section */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Review Request</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Confirm the identity and schedule for the following group.</p>
                        </div>

                        {/* Success Banner */}
                        <AnimatePresence>
                            {successMessage && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }}
                                    style={{ marginBottom: '2rem' }}
                                >
                                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.25rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', color: '#6ee7b7' }}>
                                        <CheckCircle size={24} />
                                        <div style={{ fontWeight: 600 }}>{successMessage}</div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Metadata Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                            <div className="info-blob">
                                <div className="label"><User size={12} /> Meeting With</div>
                                <div className="value">{meeting.meeting_with}</div>
                                {meeting.meeting_role && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>{meeting.meeting_role}</div>}
                            </div>
                            <div className="info-blob">
                                <div className="label"><Calendar size={12} /> Preferred Date</div>
                                <div className="value">{meeting.meeting_date}</div>
                            </div>
                            <div className="info-blob" style={{ gridColumn: 'span 2' }}>
                                <div className="label"><FileText size={12} /> Purpose of Visit</div>
                                <div className="value" style={{ lineHeight: 1.5 }}>{meeting.purpose}</div>
                            </div>
                        </div>

                        {/* Visitor Cards */}
                        <div style={{ marginBottom: '3rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} /> Registered Visitors ({visitors.length})
                            </h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {visitors.map((v, i) => (
                                    <motion.div 
                                        key={i} 
                                        whileHover={{ x: 5 }}
                                        style={{ 
                                            padding: '1.25rem', 
                                            background: 'rgba(255,255,255,0.03)', 
                                            borderRadius: '16px', 
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {v.visitor_name}
                                                <span style={{ fontSize: '0.65rem', background: 'rgba(255,140,0,0.1)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 800 }}>{v.visitor_category || 'Parent'}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    <Mail size={12} /> {v.visitor_nic}
                                                </div>
                                                {v.visitor_contact && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                        <Phone size={12} /> {v.visitor_contact}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Scheduling Section */}
                        {isPending ? (
                            <div style={{ 
                                background: 'rgba(0,0,0,0.2)', 
                                border: '1px solid rgba(255,255,255,0.05)', 
                                padding: '2rem', 
                                borderRadius: '24px',
                                marginBottom: '2.5rem'
                            }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '1px' }}>Set Final Schedule</h3>
                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Confirmed Meeting Date</label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input
                                                type="date"
                                                value={meetingDate}
                                                onChange={e => setMeetingDate(e.target.value)}
                                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Start Time</label>
                                            <div style={{ position: 'relative' }}>
                                                <Clock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={e => setStartTime(e.target.value)}
                                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', outline: 'none', colorScheme: 'dark' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>End Time</label>
                                            <div style={{ position: 'relative' }}>
                                                <Clock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', outline: 'none', colorScheme: 'dark' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                padding: '2rem', 
                                borderRadius: '24px',
                                marginBottom: '2.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2rem',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Confirmed Slot</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{meeting.meeting_date}</div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary)' }}>{meeting.start_time} - {meeting.end_time}</div>
                                </div>
                                <div style={{ height: '50px', width: '50px', borderRadius: '50%', background: isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isApproved ? '#34d399' : '#f87171' }}>
                                    {isApproved ? <ShieldCheck size={32} /> : <XCircle size={32} />}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {isPending && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleApprove}
                                    disabled={submitting}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '18px',
                                        backgroundColor: 'var(--primary)',
                                        border: 'none',
                                        color: '#fff',
                                        fontWeight: 800,
                                        fontSize: '1.125rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        boxShadow: '0 10px 25px -5px rgba(255, 140, 0, 0.4)',
                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {submitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader size={24} /></motion.div> : <CheckCircle size={24} />}
                                    Approve Request
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleReject}
                                    disabled={submitting}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '18px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#f87171',
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Trash2 size={18} /> Reject
                                </motion.button>
                            </div>
                        )}
                        
                        {!isPending && (
                            <div style={{ textAlign: 'center' }}>
                                <button onClick={() => navigate('/')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ArrowLeft size={18} /> Exit Management
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: '3rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px' }}>
                    Nextgen Shield Security Framework V2.0
                </p>
            </motion.div>

            <style>{`
                .info-blob {
                    background: rgba(255,255,255,0.03);
                    padding: 1.25rem;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .info-blob .label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    display: flex;
                    alignItems: center;
                    gap: 0.4rem;
                }
                .info-blob .value {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #fff;
                }
                @media (max-width: 640px) {
                    .info-blob {
                        grid-column: span 2;
                    }
                }
            `}</style>
        </div>
    );
};

export default AppointmentApprovalView;
