import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, FileText, CheckCircle, XCircle, Search, ArrowRight, Loader, Calendar, Clock, MapPin, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendTelegramNotification } from '../lib/telegram';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const COMPANIES = [
    { name: "Lyceum Global Holdings (Private) Limited", code: "LGH" },
    { name: "General Secretariat (LGH)", code: "LGH-GNS" },
    { name: "Internal Audit (LGH)", code: "LGH-IAU" },
    { name: "Information Management & Information Security (LGH)", code: "LGH-IMS" },
    { name: "Legal And Compliance (LGH)", code: "LGH-LGL" },
    { name: "Ledgerwall (Private) Limited", code: "LDW" },
    { name: "Ledgerwall Business Solutions (Private) Limited", code: "LBS" },
    { name: "Nextgen Human Capital Solutions (Private) Limited", code: "GHC" },
    { name: "Bitrock (Private) Limited", code: "BTR" },
    { name: "Medivex Biotech (Private) Limited", code: "MVB" },
    { name: "Lyceum Education Holdings (Private) Limited", code: "LED" },
    { name: "Lyceum International School (Private) Limited", code: "LIS" },
    { name: "Lyceum Leaf School (Private) Limited", code: "LLS" },
    { name: "Lyceum Day Care (Private) Limited", code: "LDC" },
    { name: "The Lyceum Campus (Private) Limited", code: "LYC" },
    { name: "Lyceum Placements (Private) Limited", code: "LPL" },
    { name: "Lyceum Assessments (Private) Limited", code: "LYA" },
    { name: "The Lyceum Academy (Private) Limited", code: "LAC" },
    { name: "Nextgen Publications (Private) Limited", code: "GPU" },
    { name: "Journey By Design (Private) Limited", code: "JBD" },
    { name: "NCG Read Holdings (Private) Limited", code: "NRH" },
    { name: "The Book Studio (Private) Limited", code: "BKS" },
    { name: "Nextgen Library Solutions (Private) Limited", code: "GLS" },
    { name: "NCG Tech Holdings (Private) Limited", code: "NTH" },
    { name: "Zuse Technologies (Private) Limited", code: "ZTE" },
    { name: "Dream Team Media (Private) Limited", code: "DTM" },
    { name: "Dream Team Events (Private) Limited", code: "DTE" },
    { name: "EventiQ (Private) Limited", code: "EIQ" },
    { name: "NCG Kit Holdings (Private) Limited", code: "NKH" },
    { name: "Lyceum Collection (Private) Limited", code: "TLC" },
    { name: "The Uniform Hub (Private) Limited", code: "TUH" },
    { name: "NCG Build Holdings (Private) Limited", code: "NBH" },
    { name: "NCG Serengeti Property Management (Private) Limited", code: "NSM" },
    { name: "NCG Warehouse Solutions (Private) Limited", code: "NWS" },
    { name: "Nextgen Facility Management (Private) Limited", code: "GFM" },
    { name: "N C G Facility Management (Private) Limited", code: "NFA" },
    { name: "Vebuild Innovations By NCG (Private) Limited", code: "VEB" },
    { name: "Nextgen Shield (Private) Limited", code: "GSH" },
    { name: "N C G Green Energy (Private) Limited", code: "NGN" },
    { name: "N C G Holdings (Private) Limited", code: "NCG" },
    { name: "NCG Speed Holdings (Private) Limited", code: "NSH" },
    { name: "N C G Automotive Solutions (Private) Limited", code: "NAS" },
    { name: "N C G Express (Private) Limited", code: "NEX" },
    { name: "NCG Fleet Management (Private) Limited", code: "NFM" },
    { name: "N C G Mining (Private) Limited", code: "NMG" },
    { name: "N C G Spares (Private) Limited", code: "NSP" },
    { name: "NCG Maxload (Private) Limited", code: "NML" },
    { name: "Heracle Holdings (Private) Limited", code: "HCH" },
    { name: "L Y F E Kitchen (Private) Limited", code: "LFK" },
    { name: "Zeus Gymnasium And Rehabilitation (Private) Limited", code: "ZEG" },
    { name: "Heracle Sports Education (Private) Limited", code: "HCS" },
    { name: "Heracle Nutrition (Private) Limited", code: "HCN" },
    { name: "Heracle Earth (Private) Limited", code: "HCE" },
    { name: "Heracle Care and Wellness (Private) Limited", code: "HCA" },
    { name: "Heracle Sports Cafe (Private) Limited", code: "HCC" },
    { name: "Heracle Fresh (Private) Limited", code: "HCF" },
    { name: "Heracle Active (Private) Limited", code: "HAC" },
    { name: "Heracle Adventure (Private) Limited", code: "HAD" },
    { name: "Leaf & Bean (Private) Limited", code: "LFB" },
    { name: "Heracle Nursing (Private) Limited", code: "HNU" }
];

const BRANCH_REQUIRED_COMPANIES = [
    "Lyceum International School (Private) Limited",
    "Lyceum Leaf School (Private) Limited",
    "Lyceum Day Care (Private) Limited",
    "Ledgerwall (Private) Limited",
    "Nextgen Human Capital Solutions (Private) Limited",
    "Zuse Technologies (Private) Limited",
    "Dream Team Media (Private) Limited"
];

const VisitorSelfCheckIn = ({ onClose,  __unused_onSuccess, theme, toggleTheme }) /* eslint-disable-line no-unused-vars */ => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const typeFromUrl = searchParams.get('type');

    const [step, setStep] = useState(typeFromUrl ? 2 : 1);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [formData, setFormData] = useState({
        visitorType: typeFromUrl || 'Parents', // Use type from URL if available
        isScheduled: false,
        visitors: [{ name: '', nic: '', contact: '' }], // Support multiple visitors
        purpose: '',
        sbu: '',
        branch: '',
        meetingWith: '', // Derived from schedule
        scheduledMeetingId: null,
        requestedDate: new Date().toISOString().split('T')[0],
        requestedTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    });

    // Approval Workflow State
    const [submittedData, setSubmittedData] = useState(null);
    const [approvalStatus, setApprovalStatus] = useState('initial'); // initial, pending, approved, denied, scheduled
    const [visitorId, setVisitorId] = useState(null);
    const [meetingDetails, setMeetingDetails] = useState(null);

    // Real-time Subscription for Approval Status
    useEffect(() => {
        let subscription;
        let pollInterval;

        if (approvalStatus === 'pending' && visitorId) {
            // Prevent accidental close/refresh
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            console.log(`Setting up Real-time listener for Meeting ID: ${visitorId}`);
            subscription = supabase
                .channel(`meeting-monitor-${visitorId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'scheduled_meetings'
                    },
                    (payload) => {
                        console.log("Kiosk received Real-time Update:", payload);

                        if (payload.new && payload.new.id === visitorId) {
                            const newStatus = payload.new.status;
                            if (newStatus === 'Scheduled' || newStatus === 'Confirmed' || newStatus === 'Approved') {
                                setMeetingDetails({
                                    date: payload.new.meeting_date,
                                    from: payload.new.start_time,
                                    to: payload.new.end_time
                                });
                                setApprovalStatus('scheduled');
                            } else if (newStatus === 'Denied' || newStatus === 'Rejected' || newStatus === 'Cancelled') {
                                setApprovalStatus('denied');
                            }
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Kiosk Real-time Subscription Status: ${status}`);
                });

            // Polling Fallback (Every 3 seconds)
            pollInterval = setInterval(async () => {
                const { data } = await supabase.from('scheduled_meetings').select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, start_time, end_time, status, visitor_category').eq('id', visitorId).single();
                if (data) {
                    const newStatus = data.status;
                    if (['Scheduled', 'Confirmed', 'Approved'].includes(newStatus)) {
                        setMeetingDetails({ date: data.meeting_date, from: data.start_time, to: data.end_time });
                        setApprovalStatus('scheduled');
                    } else if (['Denied', 'Rejected', 'Cancelled'].includes(newStatus)) {
                        setApprovalStatus('denied');
                    }
                }
            }, 3000);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                if (subscription) supabase.removeChannel(subscription);
                if (pollInterval) clearInterval(pollInterval);
            };
        }

        return () => {
            if (subscription) supabase.removeChannel(subscription);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [approvalStatus, visitorId, navigate]);

    const [scheduleMatch, setScheduleMatch] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeFromUrl) {
            setFormData(prev => ({
                ...prev,
                visitorType: typeFromUrl,
                purpose: prev.purpose
            }));
            setStep(2);
        }
    }, [typeFromUrl]);

    const handleTypeSelect = (type) => {
        const isScheduled = type === 'Pre-Scheduled Meeting';
        setFormData({ 
            ...formData, 
            visitorType: isScheduled ? 'Other' : type, 
            isScheduled: isScheduled, 
            visitors: [{ name: '', nic: '', contact: '' }], 
            purpose: '', 
            sbu: '', 
            branch: '' 
        });
        setStep(2);
    };

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleVerifySchedule = async () => {
        const primaryNic = formData.visitors[0].nic?.trim();
        if (!primaryNic) return;

        setVerifying(true);
        setError(null);
        setScheduleMatch(null);

        try {
            const localNow = new Date();
            const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;

            // Step 1 — Search by NIC only (no date filter) so approved meetings
            // set for today show up regardless of when the request was submitted.
            const { data, error } = await supabase
                .from('scheduled_meetings')
                .select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, start_time, end_time, status, visitor_category, approval_token, request_source')
                .ilike('visitor_nic', `%${primaryNic}%`)
                .in('status', ['Scheduled', 'Confirmed', 'Approved'])
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            console.log('[CheckIn] NIC lookup result:', data);

            if (!data || data.length === 0) {
                setError('No approved appointment found for this ID. If your appointment has not been approved yet, please wait or contact security.');
                setVerifying(false);
                return;
            }

            // Step 2 — Find the one scheduled for today
            const meeting = data.find(m => m.meeting_date === today);

            if (!meeting) {
                const dates = data.map(m => m.meeting_date).join(', ');
                setError(`Your appointment is not scheduled for today (${today}). Scheduled date(s): ${dates}. Please contact security.`);
                setVerifying(false);
                return;
            }

            // Step 3 — Time window validation (15-min early buffer, 30-min late grace)
            const now = new Date();
            const nowTotal = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = (meeting.start_time || '00:00').split(':').map(Number);
            const startTotal = startH * 60 + startM;
            const [endH, endM] = (meeting.end_time || '23:59').split(':').map(Number);
            let endTotal = endH * 60 + endM;
            if (endTotal <= startTotal) {
                endTotal += 24 * 60; // handle cross-midnight or "00:00" end times
            }

            if (nowTotal < startTotal - 15) {
                setError(`You are too early. Your appointment is at ${meeting.start_time.slice(0, 5)}. Please return 15 minutes before then.`);
                setVerifying(false);
                return;
            }

            if (nowTotal > endTotal + 30) {
                setError(`Your appointment (${meeting.start_time.slice(0, 5)} – ${meeting.end_time.slice(0, 5)}) has already expired. Please proceed as a walk-in or contact security.`);
                setVerifying(false);
                return;
            }

            // Step 4 — Log the visitor entry
            const { error: insertError } = await supabase
                .from('visitors')
                .insert({
                    name: meeting.visitor_name,
                    nic_passport: meeting.visitor_nic,
                    contact: meeting.visitor_contact,
                    type: formData.visitorType || meeting.visitor_category || 'Visitor',
                    purpose: meeting.purpose,
                    meeting_with: meeting.meeting_with,
                    status: 'Checked-in',
                    validation_method: 'Agent-Auto',
                    is_pre_registered: true,
                    entry_time: new Date().toISOString(),
                    source_tag: meeting.request_source === 'webpage' ? 'pre-scheduled-via web page' : 'pre-scheduled'
                });

            if (insertError) {
                console.error('[CheckIn] visitors insert error:', insertError);
                throw new Error(`Check-in failed: ${insertError.message}`);
            }

            // Step 5 — Mark meeting as Checked-in
            const { error: updateError } = await supabase
                .from('scheduled_meetings')
                .update({ status: 'Checked-in' })
                .eq('id', meeting.id);

            if (updateError) {
                console.error('[CheckIn] status update error:', updateError);
                // We don't throw here to ensure the user still sees the "Success" screen, 
                // but we log it.
            }

            setScheduleMatch(meeting);
            setSubmittedData({
                visitors: [{ name: meeting.visitor_name }],
                meetingWith: meeting.meeting_with
            });
            setApprovalStatus('approved');

        } catch (err) {
            console.error('[CheckIn] Unexpected error:', err);
            setError(`Check-in error: ${err.message || 'Please try again or contact security.'}`);
        } finally {
            setVerifying(false);
        }
    };

    const addVisitor = () => {
        setFormData(prev => ({
            ...prev,
            visitors: [...prev.visitors, { name: '', nic: '', contact: '' }]
        }));
    };

    const removeVisitor = (index) => {
        if (formData.visitors.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            visitors: prev.visitors.filter((_, i) => i !== index)
        }));
    };

    const updateVisitor = (index, field, value) => {
        setFormData(prev => {
            const newVisitors = [...prev.visitors];
            newVisitors[index] = { ...newVisitors[index], [field]: value };
            return { ...prev, visitors: newVisitors };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // If the user submits while "Scheduled" is toggled, treat it as a verification attempt
        if (formData.isScheduled) {
            return handleVerifySchedule();
        }

        setLoading(true);
        try {
            // Case 2: WALK-IN MEETING REQUEST (PURE SCHEDULING)
            // Note: Case 1 is now handled by handleVerifySchedule directly
            const approvalToken = generateUUID();
            const meetingGroupId = `REQ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            const insertData = formData.visitors
                .filter(v => v.name && v.nic)
                .map(v => ({
                    visitor_name: v.name,
                    visitor_nic: v.nic,
                    visitor_contact: v.contact || '',
                    visitor_category: 'On-arrival',
                    meeting_with: formData.meetingWith || 'To be assigned',
                    purpose: formData.purpose,
                    sbu: formData.sbu,
                    branch: formData.branch,
                    meeting_date: formData.requestedDate,
                    start_time: formData.requestedTime,
                    end_time: (() => {
                        const [h, m] = formData.requestedTime.split(':').map(Number);
                        const endH = (h + 1) % 24;
                        return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    })(),
                    status: 'Meeting Requested',
                    approval_token: approvalToken,
                    meeting_id: meetingGroupId,
                    request_source: 'kiosk'
                }));

            const { data: insertedData, error: insertError } = await supabase
                .from('scheduled_meetings')
                .insert(insertData)
                .select();

            if (insertError) throw insertError;
            
            // Set the ID of the first visitor/meeting to monitor for approval
            if (insertedData && insertedData.length > 0) {
                setVisitorId(insertedData[0].id);
            }

            setSubmittedData(formData);
            setApprovalStatus('pending');

            // Trigger Telegram Notification
            const visitorNames = formData.visitors.map(v => v.name).join(', ');
            const allContacts = [...new Set(formData.visitors.map(v => v.contact).filter(c => c))].join(', ');
            
            console.log("Triggering Telegram for Group:", visitorNames);
            try {
                const telegramData = await sendTelegramNotification(
                    visitorNames,
                    formData.purpose,
                    formData.meetingWith,
                    meetingGroupId, 
                    approvalToken,
                    allContacts,
                    false,
                    'On-arrival',
                    formData.requestedDate,
                    formData.requestedTime
                );

                if (telegramData?.result?.message_id || telegramData?.message_id) {
                    const msgId = telegramData?.result?.message_id || telegramData?.message_id;
                    const chId = telegramData?.result?.chat?.id || telegramData?.chat_id;

                    await supabase.from('scheduled_meetings').update({
                        telegram_message_id: msgId.toString(),
                        telegram_chat_id: chId.toString()
                    }).eq('meeting_id', meetingGroupId);
                } else {
                    console.error("Telegram notification returned null or failed.");
                }
            } catch (tgErr) {
                console.error("Telegram error catch:", tgErr);
                alert("Telegram Error: " + tgErr.message);
            }

        } catch (error) {
            console.error(error);
            alert("An error occurred: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper for full screen background
    const FullScreenContainer = ({ children }) => (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--background)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 100%)',
            backdropFilter: 'blur(100px)'
        }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: -1 }}></div>
            {children}
        </div>
    );

    // Waiting State (Pending)
    if (submittedData && approvalStatus === 'pending') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-pulse" style={{ padding: '1.5rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '50%' }}>
                            <Loader size={48} color="#EAB308" className="animate-spin" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1rem' }}>{t('kiosk.pending_title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        {t('kiosk.pending_msg')}
                        <br />
                        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Do not close this window.</span>
                    </p>
                    <div style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                        Host: {submittedData.meetingWith || 'General Visit'}
                    </div>
                    {/* Fallback Refresh Button */}
                    <button
                        onClick={async () => {
                            const { data } = await supabase.from('scheduled_meetings').select('id, visitor_name, visitor_nic, visitor_contact, purpose, meeting_with, meeting_date, start_time, end_time, status, visitor_category').eq('id', visitorId).single();
                            if (data && (data.status === 'Scheduled' || data.status === 'Confirmed')) {
                                setMeetingDetails({ date: data.meeting_date, from: data.start_time, to: data.end_time });
                                setApprovalStatus('scheduled');
                            }
                        }}
                        style={{ marginTop: '2rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                        Click here if screen doesn't update automatically
                    </button>
                </div>
            </FullScreenContainer>
        );
    }

    // Access Denied State
    if (submittedData && approvalStatus === 'denied') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
                            <XCircle size={64} color="#EF4444" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#EF4444', marginBottom: '1rem' }}>{t('kiosk.denied_title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        {t('kiosk.denied_msg')}
                        <br />Please contact security for assistance.
                    </p>
                </div>
            </FullScreenContainer>
        );
    }

    // Meeting Scheduled State
    if (submittedData && approvalStatus === 'scheduled') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-bounce-in" style={{ padding: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%' }}>
                            <Calendar size={64} color="#F59E0B" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', marginBottom: '1rem' }}>Meeting Scheduled</h2>

                    {meetingDetails && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#F59E0B', marginBottom: '0.5rem' }}>
                                <Clock size={16} />
                                <span style={{ fontWeight: 700 }}>{meetingDetails.from} - {meetingDetails.to}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                <Calendar size={16} />
                                <span>{meetingDetails.date}</span>
                            </div>
                        </div>
                    )}

                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        Your meeting has been scheduled, <strong>{submittedData?.visitors?.[0]?.name || 'Visitor'}</strong>!
                        <br />
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Please close this and use the "Scheduled" option for check-in.</span>
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            backgroundColor: 'var(--glass-bg)',
                            color: 'var(--text-main)',
                            borderRadius: '16px',
                            fontWeight: 800,
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        CLOSE & START CHECK-IN <CheckCircle size={20} />
                    </button>
                </div>
            </FullScreenContainer>
        );
    }

    // Success / Approved State
    if (submittedData && approvalStatus === 'approved') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-bounce-in" style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
                            <CheckCircle size={64} color="#10B981" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', marginBottom: '1rem' }}>{t('kiosk.granted_title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        <strong>{submittedData?.visitors?.[0]?.name}</strong> scheduled appointment with <strong>{submittedData?.meetingWith}</strong>
                        <br />
                        <span style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1rem', display: 'block' }}>{t('kiosk.granted_msg')}</span>
                    </p>
                    <div style={{ marginTop: '2rem' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                padding: '1rem 2rem',
                                backgroundColor: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                borderRadius: '12px',
                                fontWeight: 700,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        >
                            <ArrowRight size={18} transform="rotate(180)" /> {t('common.back_to_home', 'Back to Home')}
                        </button>
                    </div>
                </div >
            </FullScreenContainer >
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--background)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto',
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 100%)',
            backdropFilter: 'blur(100px)'
        }}>
            {/* Background Blur Overlay for Premium Feel */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: -1 }}></div>

            {/* Controls - Prominent for Visitors */}
            <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 10000, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button onClick={toggleTheme} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <LanguageSwitcher variant="kiosk" />
            </div>

            <div style={{
                width: '100%',
                maxWidth: '850px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
            }}>
                {/* Floating Top Icon Badge */}
                <div style={{
                    width: '110px',
                    height: '110px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    marginBottom: '-55px',
                    zIndex: 10,
                    position: 'relative'
                }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        border: '2px solid var(--glass-border)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <User size={36} color="var(--text-main)" />
                    </div>
                </div>

                {/* Main Glass Card */}
                <div className="card animate-fade-in" style={{
                    width: '100%',
                    backgroundColor: 'var(--glass-bg)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    padding: '4.5rem 1.5rem 1.5rem 1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                            {step === 1 ? t('kiosk.title') : t('kiosk.identity')}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {step === 1 ? t('kiosk.subtitle') : `${t(`kiosk.${formData.visitorType.toLowerCase()}`)} ${t('kiosk.entry_portal_suffix')}`}
                        </p>
                    </div>

                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {['Pre-Scheduled Meeting', 'Parents', 'Lyceum', 'Other'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleTypeSelect(type)}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        backgroundColor: type === 'Pre-Scheduled Meeting' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid',
                                        borderColor: type === 'Pre-Scheduled Meeting' ? 'rgba(37, 99, 235, 0.4)' : 'var(--glass-border)',
                                        borderRadius: '16px',
                                        color: 'var(--text-main)',
                                        fontSize: '1.125rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'var(--transition)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                    className="hover-brighten"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {type === 'Pre-Scheduled Meeting' ? <Calendar size={20} color="var(--primary)" /> : <User size={20} style={{ color: type === 'Lyceum' ? 'var(--primary)' : 'var(--text-main)' }} />}
                                        {type === 'Pre-Scheduled Meeting' ? 'I have a Pre-Scheduled Appointment' : t(`kiosk.${type.toLowerCase()}`)}
                                    </div>
                                    <ArrowRight size={18} opacity={0.5} />
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Pre-scheduled Toggle Section */}
                            <div
                                onClick={() => setFormData(p => ({ ...p, isScheduled: !p.isScheduled }))}
                                style={{
                                    padding: '1.25rem',
                                    backgroundColor: formData.isScheduled ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid',
                                    borderColor: formData.isScheduled ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'var(--transition)'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: formData.isScheduled ? 'var(--primary)' : 'transparent',
                                    borderColor: formData.isScheduled ? 'var(--primary)' : 'rgba(255,255,255,0.3)'
                                }}>
                                    {formData.isScheduled && <CheckCircle size={14} color="#fff" />}
                                </div>
                                <span style={{ color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 600 }}>{t('kiosk.scheduled_toggle')}</span>
                            </div>

                            <p className="animate-fade-in" style={{
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '0.9rem',
                                marginTop: '-0.5rem',
                                textAlign: 'center',
                                width: '100%',
                                display: 'block'
                            }}>
                                {t('kiosk.request_msg')}
                            </p>

                            {/* Verification Section */}
                            {formData.isScheduled && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    padding: '1.5rem',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    borderRadius: '20px',
                                    border: '1px dashed rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="text"
                                            placeholder={formData.visitorType === 'Lyceum' ? t('kiosk.emp_code_placeholder') : t('kiosk.nic_placeholder')}
                                            value={formData.visitors[0].nic}
                                            onChange={(e) => updateVisitor(0, 'nic', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3rem',
                                                backgroundColor: '#fff',
                                                borderRadius: '12px',
                                                border: 'none',
                                                color: '#1e293b',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleVerifySchedule}
                                        disabled={verifying}
                                        style={{
                                            padding: '1rem 3rem',
                                            background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                                            color: '#fff',
                                            borderRadius: '12px',
                                            fontWeight: 800,
                                            border: 'none',
                                            cursor: 'pointer',
                                            width: 'fit-content',
                                            alignSelf: 'center',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                                        }}
                                    >
                                        {verifying ? <Loader className="animate-spin" size={18} /> : t('kiosk.verify_button')}
                                    </button>
                                    {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>{error}</p>}
                                </div>
                            )}

                            {/* Data Entry Fields - Multiple Visitors */}
                            {(!formData.isScheduled || scheduleMatch) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {formData.visitors.map((visitor, index) => (
                                            <div key={index} style={{
                                                padding: '1rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr 1fr',
                                                gap: '1rem',
                                                position: 'relative',
                                                alignItems: 'flex-start'
                                            }}>
                                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-0.5rem' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                                        {t('kiosk.visitor_label', { count: index + 1 })}
                                                    </span>
                                                    {index > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVisitor(index)}
                                                            style={{ padding: '0.25rem', backgroundColor: 'transparent', color: '#ef4444', opacity: 0.7 }}
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ position: 'relative' }}>
                                                    <FileText size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input
                                                        type="text"
                                                        required
                                                        readOnly={formData.isScheduled && index === 0}
                                                        placeholder={formData.visitorType === 'Lyceum' ? t('kiosk.emp_code_placeholder') : t('kiosk.nic_placeholder')}
                                                        value={visitor.nic}
                                                        onChange={(e) => updateVisitor(index, 'nic', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                            backgroundColor: '#fff',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            color: '#1e293b',
                                                            fontWeight: 600,
                                                            fontSize: '0.9375rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ position: 'relative' }}>
                                                    <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input
                                                        type="text"
                                                        required
                                                        readOnly={!!scheduleMatch && index === 0}
                                                        placeholder={t('kiosk.name_placeholder')}
                                                        value={visitor.name}
                                                        onChange={(e) => updateVisitor(index, 'name', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                            backgroundColor: '#fff',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            color: '#1e293b',
                                                            fontWeight: 600,
                                                            fontSize: '0.9375rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>

                                                {/* Contact Number Field */}
                                                <div style={{ position: 'relative' }}>

                                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', backgroundColor: '#fff', borderRadius: '12px', border: visitor.contact && visitor.contact.replace('+94', '').length > 9 ? '1px solid #ef4444' : 'none', overflow: 'hidden' }}>
                                                        <span style={{ padding: '0.875rem 0.5rem 0.875rem 1rem', color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>+94</span>
                                                        <input
                                                            type="tel"
                                                            required={!formData.isScheduled}
                                                            placeholder="775432765"
                                                            value={visitor.contact ? visitor.contact.replace(/^\+94/, '') : ''}
                                                            onChange={(e) => {
                                                                let val = e.target.value.replace(/\D/g, '');
                                                                if (val.startsWith('0')) val = val.substring(1);
                                                                updateVisitor(index, 'contact', val ? '+94' + val : '');
                                                            }}
                                                            pattern="\d{9}"
                                                            title="Contact number must be exactly 9 digits after +94"
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.875rem 1rem',
                                                                backgroundColor: 'transparent',
                                                                border: 'none',
                                                                color: '#1e293b',
                                                                fontWeight: 600,
                                                                fontSize: '0.9375rem',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                    </div>
                                                    {visitor.contact && visitor.contact.replace('+94', '').length > 9 && (
                                                        <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', position: 'absolute', bottom: '-20px', left: '1rem' }}>Invalid contact number (exceeds 9 digits)</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {(!formData.isScheduled || scheduleMatch) && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={addVisitor}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem',
                                                        backgroundColor: 'rgba(251, 146, 60, 0.9)',
                                                        color: '#fff',
                                                        borderRadius: '12px',
                                                        fontWeight: 700,
                                                        fontSize: '0.9rem',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        boxShadow: '0 4px 12px rgba(251, 146, 60, 0.3)'
                                                    }}
                                                >
                                                    {loading ? <Loader className="animate-spin" size={16} /> : (
                                                        <>
                                                            {t('kiosk.add_visitor_button')} <ArrowRight size={16} />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: formData.visitorType === 'Lyceum' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '1rem' }}>
                                        {formData.visitorType === 'Lyceum' && (
                                            <div style={{ position: 'relative' }}>
                                                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                <select
                                                    required
                                                    value={formData.sbu}
                                                    onChange={(e) => setFormData({ ...formData, sbu: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                        backgroundColor: '#fff',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        color: '#1e293b',
                                                        fontWeight: 600,
                                                        fontSize: '0.9375rem',
                                                        outline: 'none',
                                                        appearance: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="" disabled>{t('kiosk.sbu_placeholder')}</option>
                                                    {COMPANIES.map(comp => (
                                                        <option key={comp.code} value={comp.name}>
                                                            {comp.name} ({comp.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {BRANCH_REQUIRED_COMPANIES.includes(formData.sbu) && (
                                            <div style={{ position: 'relative' }}>
                                                <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder={t('kiosk.branch_placeholder')}
                                                    value={formData.branch}
                                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                        backgroundColor: '#fff',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        color: '#1e293b',
                                                        fontWeight: 600,
                                                        fontSize: '0.9375rem',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <div style={{ position: 'relative' }}>
                                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="text"
                                                required
                                                readOnly={!!scheduleMatch}
                                                placeholder={t('kiosk.host_placeholder')}
                                                value={formData.meetingWith || (scheduleMatch ? scheduleMatch.meeting_with : '')}
                                                onChange={(e) => setFormData({ ...formData, meetingWith: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                    backgroundColor: '#fff',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    color: '#1e293b',
                                                    fontWeight: 600,
                                                    fontSize: '0.9375rem',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="text"
                                                required
                                                readOnly={!!scheduleMatch}
                                                placeholder={t('kiosk.purpose_placeholder')}
                                                value={formData.purpose}
                                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                    backgroundColor: '#fff',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    color: '#1e293b',
                                                    fontWeight: 600,
                                                    fontSize: '0.9375rem',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Requested Date & Time Section */}
                                    {!formData.isScheduled && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Requested Date</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formData.requestedDate}
                                                        onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', backgroundColor: '#fff', borderRadius: '12px', border: 'none', color: '#1e293b', fontWeight: 600, fontSize: '0.9375rem', outline: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Preferred Time</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Clock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input
                                                        type="time"
                                                        required
                                                        value={formData.requestedTime}
                                                        onChange={(e) => setFormData({ ...formData, requestedTime: e.target.value })}
                                                        style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', backgroundColor: '#fff', borderRadius: '12px', border: 'none', color: '#1e293b', fontWeight: 600, fontSize: '0.9375rem', outline: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            width: 'fit-content',
                                            minWidth: '240px',
                                            padding: '0.875rem 2rem',
                                            background: formData.isScheduled ? 'var(--primary)' : 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', // Lighter orange gradient
                                            color: '#fff',
                                            borderRadius: '14px',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'pointer',
                                            marginTop: '0.5rem',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            alignSelf: 'center'
                                        }}
                                    >
                                        {loading ? <Loader className="animate-spin" size={20} /> : (formData.isScheduled ? t('common.submit') : t('kiosk.schedule_button'))}
                                    </button>
                                </div>
                            )}

                            {/* Utility Links matched to reference style */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0 0.5rem',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.4)'
                            }}>
                                <span onClick={() => step === 2 && !typeFromUrl && setStep(1)} style={{ cursor: step === 2 && !typeFromUrl ? 'pointer' : 'default' }}>
                                    {step === 2 && !typeFromUrl ? t('kiosk.change_profile') : ''}
                                </span>
                                <span
                                    onClick={() => onClose ? onClose() : navigate('/')}
                                    style={{ cursor: 'pointer', color: 'rgba(239, 68, 68, 0.6)' }}
                                >
                                    {t('kiosk.cancel_entry')}
                                </span>
                            </div>
                        </form>
                    )}
                </div>

                <div style={{
                    marginTop: '3.5rem',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 600
                }}>
                    Copyright &copy; {new Date().getFullYear()} Nextgen Shield (Private) Limited. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default VisitorSelfCheckIn;
