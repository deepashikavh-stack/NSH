import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, FileText, Phone, Send, CheckCircle, ArrowLeft, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendTelegramNotification } from '../lib/telegram';

const PublicMeetingRequestView = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        visitorName: '',
        visitorNic: '',
        visitorContact: '',
        purpose: '',
        meetingWith: ''
    });

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const approvalToken = generateUUID();

            // 1. Insert into scheduled_meetings
            const { data: meeting, error: insertError } = await supabase
                .from('scheduled_meetings')
                .insert({
                    visitor_name: formData.visitorName,
                    visitor_nic: formData.visitorNic,
                    visitor_contact: formData.visitorContact,
                    visitor_category: 'Parent',
                    meeting_with: formData.meetingWith || 'To be assigned',
                    purpose: formData.purpose,
                    meeting_date: new Date().toISOString().split('T')[0],
                    start_time: '10:00', // Default placeholders for requested meetings
                    end_time: '11:00',
                    status: 'Meeting Requested',
                    approval_token: approvalToken,
                    request_source: 'webpage'
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 2. Trigger Telegram Notification with isExternal = true
            console.log('PublicMeetingRequestView: Triggering Telegram with isExternal=true');
            const telegramData = await sendTelegramNotification(
                formData.visitorName,
                formData.purpose,
                formData.meetingWith,
                meeting.id,
                approvalToken,
                formData.visitorContact,
                true, // isExternal flag
                'webpage' // source
            );

            if (telegramData?.message_id) {
                await supabase.from('scheduled_meetings').update({
                    telegram_message_id: telegramData.message_id.toString(),
                    telegram_chat_id: telegramData.chat_id.toString()
                }).eq('id', meeting.id);
            }

            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting meeting request:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
                padding: '2rem'
            }}>
                <div className="card animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center', padding: '3rem' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
                            <CheckCircle size={64} color="#10B981" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1rem' }}>Request Sent</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        Your meeting request has been submitted successfully. You will be notified once it is approved.
                    </p>
                    <button onClick={() => window.location.href = 'https://www.lyceum.lk'} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Go to Official Website
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '600px', width: '100%' }}>
                <button
                    onClick={() => window.location.href = 'https://www.lyceum.lk'}
                    style={{ background: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}
                >
                    <ArrowLeft size={20} /> Visit Official Website
                </button>

                <div className="card animate-fade-in" style={{ padding: '3rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Request a Meeting</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Fill in the details below to schedule a meeting with our staff.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="space-y-4">
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Your Full Name"
                                    value={formData.visitorName}
                                    onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    placeholder="NIC / Passport Number"
                                    value={formData.visitorNic}
                                    onChange={(e) => setFormData({ ...formData, visitorNic: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="tel"
                                    required
                                    placeholder="Contact Number"
                                    value={formData.visitorContact}
                                    onChange={(e) => setFormData({ ...formData, visitorContact: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Staff Member to Meet"
                                    value={formData.meetingWith}
                                    onChange={(e) => setFormData({ ...formData, meetingWith: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <textarea
                                    required
                                    placeholder="Purpose of Meeting"
                                    rows="3"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'white', outline: 'none', resize: 'none' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '1.25rem', borderRadius: '16px' }}
                        >
                            {loading ? <Loader className="animate-spin" size={20} /> : (
                                <>
                                    Submit Request <Send size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicMeetingRequestView;
