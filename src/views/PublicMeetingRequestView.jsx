import { useState } from 'react';
import { User, FileText, Phone, Send, CheckCircle, ArrowLeft, Loader, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendTelegramNotification } from '../lib/telegram';

const PublicMeetingRequestView = () => {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        visitors: [{ name: '', nic: '', contact: '' }],
        purpose: '',
        meetingWith: '',
        meetingDate: '',
        startTime: '',
        endTime: ''
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

    const handleAddVisitor = () => {
        setFormData({
            ...formData,
            visitors: [...formData.visitors, { name: '', nic: '', contact: '' }]
        });
    };

    const handleRemoveVisitor = (index) => {
        if (formData.visitors.length > 1) {
            const newVisitors = formData.visitors.filter((_, i) => i !== index);
            setFormData({ ...formData, visitors: newVisitors });
        }
    };

    const handleVisitorChange = (index, field, value) => {
        const newVisitors = [...formData.visitors];
        newVisitors[index][field] = value;
        setFormData({ ...formData, visitors: newVisitors });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const approvalToken = generateUUID();
            const meetingGroupId = `REQ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            const insertData = formData.visitors.map(v => ({
                visitor_name: v.name,
                visitor_nic: v.nic,
                visitor_contact: v.contact || '',
                visitor_category: 'Parent',
                meeting_with: formData.meetingWith || 'To be assigned',
                purpose: formData.purpose,
                meeting_date: formData.meetingDate || new Date().toLocaleDateString('en-CA'),
                start_time: formData.startTime || '10:00',
                end_time: formData.endTime || '11:00',
                status: 'Meeting Requested',
                approval_token: approvalToken,
                request_source: 'webpage',
                meeting_id: meetingGroupId
            }));

            // 1. Insert into scheduled_meetings
            const { data: meetings, error: insertError } = await supabase
                .from('scheduled_meetings')
                .insert(insertData)
                .select();

            if (insertError) throw insertError;

            const visitorNames = formData.visitors.map(v => v.name).join(', ');
            const allContacts = [...new Set(formData.visitors.map(v => v.contact).filter(c => c))].join(', ');

            // 2. Trigger Telegram Notification with isExternal = true
            console.log('PublicMeetingRequestView: Triggering Telegram with isExternal=true');
            const telegramData = await sendTelegramNotification(
                visitorNames,
                formData.purpose,
                formData.meetingWith,
                meetingGroupId, // Pass meetingGroupId instead of individual ID
                approvalToken,
                allContacts,
                true, // isExternal flag
                'webpage', // source
                formData.meetingDate,
                `${formData.startTime} - ${formData.endTime}`
            );

            if (telegramData?.message_id) {
                await supabase.from('scheduled_meetings').update({
                    telegram_message_id: telegramData.message_id.toString(),
                    telegram_chat_id: telegramData.chat_id.toString()
                }).eq('meeting_id', meetingGroupId);
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
                            
                            {/* Dynamic Visitors List */}
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Visitors Information</span>
                                    <button 
                                        type="button" 
                                        onClick={handleAddVisitor}
                                        style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none' }}
                                    >
                                        + Add Visitor
                                    </button>
                                </label>
                                
                                {formData.visitors.map((visitor, index) => (
                                    <div key={index} className="animate-fade-in" style={{ padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'grid', gap: '1rem', position: 'relative' }}>
                                        {formData.visitors.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveVisitor(index)}
                                                style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', color: '#ef4444' }}
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input
                                                type="text"
                                                required
                                                placeholder={`Visitor ${index + 1} Name`}
                                                value={visitor.name}
                                                onChange={(e) => handleVisitorChange(index, 'name', e.target.value)}
                                                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="NIC / Passport"
                                                    value={visitor.nic}
                                                    onChange={(e) => handleVisitorChange(index, 'nic', e.target.value)}
                                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                                                <Phone size={16} style={{ marginLeft: '1rem', color: 'var(--text-muted)' }} />
                                                <span style={{ padding: '0 0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '0.8rem' }}>+94</span>
                                                <input
                                                    type="tel"
                                                    required={index === 0}
                                                    placeholder="775..."
                                                    value={visitor.contact ? visitor.contact.replace(/^\+94/, '') : ''}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '');
                                                        if (val.startsWith('0')) val = val.substring(1);
                                                        handleVisitorChange(index, 'contact', val ? '+94' + val : '');
                                                    }}
                                                    pattern="\d{9}"
                                                    title="9 digits after +94"
                                                    style={{ width: '100%', padding: '1rem 1rem 1rem 0.25rem', backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>



                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Staff Member to Meet"
                                    value={formData.meetingWith}
                                    onChange={(e) => setFormData({ ...formData, meetingWith: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none' }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <textarea
                                    required
                                    placeholder="Purpose of Meeting"
                                    rows="1"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toLocaleDateString('en-CA')}
                                        value={formData.meetingDate}
                                        onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                                        style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>Preferred Date</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="time"
                                            required
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            style={{ width: '100%', padding: '1rem 0.5rem 1rem 2.5rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem' }}
                                        />
                                        <span style={{ position: 'absolute', left: '2.5rem', top: '-10px', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>START</span>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="time"
                                            required
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            style={{ width: '100%', padding: '1rem 0.5rem 1rem 2.5rem', backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem' }}
                                        />
                                        <span style={{ position: 'absolute', left: '2.5rem', top: '-10px', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>END</span>
                                    </div>
                                </div>
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
