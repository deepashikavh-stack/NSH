import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, User, Phone, FileText, X, MapPin, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { initGoogleApi, createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../lib/googleCalendar';

const MeetingScheduler = ({ onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        visitorCategory: initialData?.visitor_category || 'Parent',
        visitors: initialData?.visitors || [{ name: '', nic: '', contact: '' }],
        meetingWith: initialData?.meeting_with || '',
        meetingRole: initialData?.meeting_role || '',
        purpose: initialData?.purpose || '',
        date: initialData?.meeting_date || '',
        startTime: initialData?.start_time?.slice(0, 5) || '',
        endTime: initialData?.end_time?.slice(0, 5) || '',
        meetingId: initialData?.meeting_id || null,
        googleEventId: initialData?.google_event_id || null
    });
    const [loading, setLoading] = useState(false);
    const [syncToCalendar, setSyncToCalendar] = useState(!!initialData?.google_event_id);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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

        // 0. Time Validation (7:30 AM - 5:30 PM)
        const isTimeValid = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            const minMinutes = 7 * 60 + 30; // 07:30
            const maxMinutes = 17 * 60 + 30; // 17:30
            return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
        };

        if (!isTimeValid(formData.startTime) || !isTimeValid(formData.endTime)) {
            alert("Meetings can only be scheduled between 7:30 AM and 5:30 PM.");
            setLoading(false);
            return;
        }

        if (formData.startTime >= formData.endTime) {
            alert("End time must be after start time.");
            setLoading(false);
            return;
        }

        try {
            const meetingId = formData.meetingId || generateUUID();
            let googleEventId = formData.googleEventId;

            // 1. Handle Google Calendar Sync First (to get event ID if new)
            if (syncToCalendar) {
                try {
                    await initGoogleApi();
                    const eventDetails = {
                        visitorNames: formData.visitors.map(v => v.name),
                        purpose: formData.purpose,
                        meetingWith: formData.meetingWith,
                        meetingRole: formData.meetingRole,
                        date: formData.date,
                        startTime: formData.startTime,
                        endTime: formData.endTime
                    };

                    if (googleEventId) {
                        await updateGoogleCalendarEvent(googleEventId, eventDetails);
                    } else {
                        const event = await createGoogleCalendarEvent(eventDetails);
                        googleEventId = event.id;
                    }
                } catch (calendarErr) {
                    console.error('Google Calendar Error:', calendarErr);
                    // Continue anyway, but warn user later?
                }
            } else if (googleEventId) {
                // If it was synced but now untoggled, delete the event
                try {
                    await deleteGoogleCalendarEvent(googleEventId);
                    googleEventId = null;
                } catch (err) {
                    console.error('Error deleting calendar event:', err);
                }
            }

            // 2. Database Operations
            if (initialData) {
                // Delete existing entries for this meeting and re-insert (robust for multi-visitor changes)
                const { error: deleteError } = await supabase
                    .from('scheduled_meetings')
                    .delete()
                    .eq('meeting_id', meetingId);

                if (deleteError) throw deleteError;
            }

            const insertData = formData.visitors
                .filter(v => v.name && v.nic)
                .map(visitor => ({
                    meeting_id: meetingId,
                    google_event_id: googleEventId,
                    visitor_category: formData.visitorCategory,
                    visitor_name: visitor.name,
                    visitor_nic: visitor.nic,
                    visitor_contact: visitor.contact,
                    meeting_with: formData.meetingWith,
                    meeting_role: formData.meetingRole,
                    purpose: formData.purpose,
                    meeting_date: formData.date,
                    start_time: formData.startTime,
                    end_time: formData.endTime,
                    status: initialData?.status || 'Scheduled'
                }));

            if (insertData.length === 0) {
                alert("Please add at least one visitor with valid details.");
                setLoading(false);
                return;
            }

            const { error: insertError } = await supabase
                .from('scheduled_meetings')
                .insert(insertData);

            if (insertError) throw insertError;

            alert(initialData ? 'Meeting updated successfully!' : `Meeting scheduled successfully for ${formData.visitors.length} visitor(s)!`);

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
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
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
        }}>
            <div className="modal-content-wrapper animate-fade-in-static">

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                            {initialData ? 'Edit Scheduled Visit' : 'Schedule New Visit'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {initialData ? 'Update visitor details or meeting time.' : 'Pre-register visitors for secure entry.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '12px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: isMobile ? '1rem' : '1.25rem' }}>

                    {/* Visitor Category */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <User size={12} style={{ display: 'inline', marginRight: '0.5rem' }} />
                            Visitor Category
                        </label>
                        <select
                            name="visitorCategory"
                            value={formData.visitorCategory}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                color: 'var(--text-main)',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        >
                            <option value="Parent" style={{ backgroundColor: '#1a1d21' }}>Parent</option>
                            <option value="Lyceum" style={{ backgroundColor: '#1a1d21' }}>Lyceum</option>
                            <option value="Other" style={{ backgroundColor: '#1a1d21' }}>Other</option>
                        </select>
                    </div>


                    {/* Visitor Information */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>Visitor Information</h4>
                            <button
                                type="button"
                                onClick={addVisitor}
                                style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 140, 0, 0.1)',
                                    color: 'var(--primary)',
                                    border: '1px solid rgba(255, 140, 0, 0.2)',
                                    cursor: 'pointer'
                                }}
                            >
                                + Add Another Visitor
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {formData.visitors.map((visitor, index) => (
                                <div key={index} style={{
                                    padding: isMobile ? '1rem' : '1.25rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    position: 'relative'
                                }}>
                                    {index > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => removeVisitor(index)}
                                            style={{
                                                position: 'absolute',
                                                top: '1rem',
                                                right: '1rem',
                                                backgroundColor: 'transparent',
                                                color: 'var(--danger)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                opacity: 0.7
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}

                                    <div className={`grid ${window.innerWidth <= 640 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                                NIC / EMP Code *
                                            </label>
                                            <input
                                                type="text"
                                                value={visitor.nic}
                                                onChange={(e) => updateVisitor(index, 'nic', e.target.value)}
                                                required
                                                placeholder="ID Number"
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                                Visitor Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={visitor.name}
                                                onChange={(e) => updateVisitor(index, 'name', e.target.value)}
                                                required
                                                placeholder="Full Name"
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                            Contact Number
                                        </label>
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <span style={{ padding: '0.625rem 0.5rem 0.625rem 0.625rem', color: 'var(--text-muted)', fontWeight: 600, borderRight: '1px solid var(--border)' }}>+94</span>
                                                <input
                                                    type="tel"
                                                    value={visitor.contact ? visitor.contact.replace(/^\+94/, '') : ''}
                                                    maxLength={9}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                                        if (val.startsWith('0')) val = val.substring(1);
                                                        updateVisitor(index, 'contact', val ? '+94' + val : '');
                                                    }}
                                                    placeholder="775432765"
                                                    pattern="\d{9}"
                                                    title="Contact number must be exactly 9 digits after +94"
                                                    style={{ width: '100%', padding: '0.625rem', border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', outline: 'none' }}
                                                />
                                            </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Meeting Details */}
                    <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>Meeting Details</h4>
                        <div className={`grid ${window.innerWidth <= 640 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Meeting With *
                                </label>
                                <input
                                    type="text"
                                    name="meetingWith"
                                    value={formData.meetingWith}
                                    onChange={handleChange}
                                    required
                                    placeholder="Staff/Teacher Name"
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Role/Department
                                </label>
                                <input
                                    type="text"
                                    name="meetingRole"
                                    value={formData.meetingRole}
                                    onChange={handleChange}
                                    placeholder="e.g., Principal, Math Teacher"
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                <FileText size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                Purpose *
                            </label>
                            <textarea
                                name="purpose"
                                value={formData.purpose}
                                onChange={handleChange}
                                required
                                rows="2"
                                placeholder="Brief description of meeting purpose"
                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>Schedule</h4>
                        <div className={`grid ${window.innerWidth <= 640 ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                    min={new Date().toLocaleDateString('en-CA')}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    <Clock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    Start Time *
                                </label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    required
                                    min="07:30"
                                    max="17:30"
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    <Clock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    End Time *
                                </label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    required
                                    min="07:30"
                                    max="17:30"
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600 }}>
                            Note: Operating hours are between 7:30 AM and 5:30 PM.
                        </p>
                    </div>

                    {/* Google Calendar Sync Toggle */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1.5rem',
                        backgroundColor: syncToCalendar ? 'rgba(255, 140, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${syncToCalendar ? 'var(--primary)' : 'var(--glass-border)'}`,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'var(--transition)'
                    }}
                        onClick={() => setSyncToCalendar(!syncToCalendar)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="Google Calendar" style={{ width: '24px' }} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>Sync with Google Calendar</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automatically create a calendar event</p>
                            </div>
                        </div>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: `2px solid ${syncToCalendar ? 'var(--primary)' : 'var(--text-muted)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: syncToCalendar ? 'var(--primary)' : 'transparent',
                            flexShrink: 0
                        }}>
                            {syncToCalendar && <CheckCircle size={16} color="#fff" />}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ flex: 1, opacity: loading ? 0.6 : 1 }}
                        >
                            {loading ? 'Confirming...' : 'Confirm Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default MeetingScheduler;
