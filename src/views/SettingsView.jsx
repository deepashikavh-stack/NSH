import React, { useState } from 'react';
import { User, Lock, Save, ShieldCheck, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../utils/passwordUtils';

const SettingsView = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passwordErrors, setPasswordErrors] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setPasswordErrors([]);

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            // If changing password, verify current and hash new
            if (formData.newPassword) {
                // Validate strength
                const { valid, errors } = validatePasswordStrength(formData.newPassword);
                if (!valid) {
                    setPasswordErrors(errors);
                    setLoading(false);
                    return;
                }

                // Verify current password
                const { data: userData, error: fetchError } = await supabase
                    .from('users')
                    .select('password')
                    .eq('email', user?.username || user?.email)
                    .single();

                if (fetchError || !userData) {
                    setMessage({ type: 'error', text: 'Could not verify current password.' });
                    setLoading(false);
                    return;
                }

                const isCurrentValid = await verifyPassword(formData.currentPassword, userData.password);
                if (!isCurrentValid) {
                    setMessage({ type: 'error', text: 'Current password is incorrect.' });
                    setLoading(false);
                    return;
                }

                // Hash and save new password
                const hashedNew = await hashPassword(formData.newPassword);
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ password: hashedNew })
                    .eq('email', user?.username || user?.email);

                if (updateError) throw updateError;
            }

            const updatedUser = { ...user, username: formData.username };
            onUpdateUser(updatedUser);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
            setPasswordErrors([]);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, var(--primary), #ec4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <UserCircle size={40} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Account Settings</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage your personal information and security preferences</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Username / Email</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem 0.875rem 3rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        color: 'var(--text-main)',
                                        fontWeight: 600,
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Access Role</label>
                            <div style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-muted)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <ShieldCheck size={18} />
                                {user?.role}
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Change Password</h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Current Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        placeholder="Enter current password"
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem 0.875rem 3rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Repeat new password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: message.type === 'success' ? '#10b981' : '#ef4444',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textAlign: 'center'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{
                                padding: '0.875rem 2.5rem',
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsView;
