import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, User, ArrowLeft, X, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';
import { logAudit } from '../lib/audit';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../utils/passwordUtils';

const LoginPage = ({ onLogin, onBack }) => {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, role, is_active')
                .eq('is_active', true)
                .order('role', { ascending: true });

            if (error) throw error;

            setUsers(data || []);
            if (data && data.length > 0) {
                const firstUser = data[0];
                setSelectedUser(firstUser);
                setUsername(firstUser.email);
            }
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error fetching users:', err);
            alert('Error loading users. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const handleUserChange = (email) => {
        const user = users.find(u => u.email === email);
        if (user) {
            setSelectedUser(user);
            setUsername(user.email);
            setPassword('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            alert('Please enter credentials');
            return;
        }

        if (!selectedUser) {
            alert('Please select a user');
            return;
        }

        // Verify password from database using bcrypt
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('password')
                .eq('email', username)
                .single();

            if (error || !user) {
                alert('Invalid credentials');
                return;
            }

            const isValid = await verifyPassword(password, user.password);
            if (isValid) {
                logAudit('Login', 'users', null, username, { role: selectedUser.role, name: selectedUser.full_name });
                onLogin({ id: selectedUser.id, username, role: selectedUser.role, full_name: selectedUser.full_name });
            } else {
                alert('Invalid credentials');
            }
        } catch (err) {
            if (import.meta.env.DEV) console.error('Login error:', err);
            alert('Login failed. Please try again.');
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setPasswordErrors([]);

        if (!resetEmail) {
            alert('Please enter your email address');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        // Validate password strength
        const { valid, errors } = validatePasswordStrength(newPassword);
        if (!valid) {
            setPasswordErrors(errors);
            return;
        }

        setResetting(true);
        try {
            // Verify user exists
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('email', resetEmail)
                .single();

            if (userError || !user) {
                alert('No account found with this email address');
                setResetting(false);
                return;
            }

            // Hash the new password before storing
            const hashedPassword = await hashPassword(newPassword);

            const { error: updateError } = await supabase
                .from('users')
                .update({ password: hashedPassword })
                .eq('email', resetEmail);

            if (updateError) {
                throw updateError;
            }

            logAudit('Password Reset', 'users', user.id, resetEmail, { name: user.full_name });
            alert(`Password reset successful for ${user.full_name}!\n\nYour new password has been set.\nPlease use it to login.`);

            // Close modal and reset form
            setShowForgotPassword(false);
            setResetEmail('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordErrors([]);

        } catch (err) {
            if (import.meta.env.DEV) console.error('Error resetting password:', err);
            alert('Error resetting password. Please try again.');
        } finally {
            setResetting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorative Blur */}
            <div style={{ position: 'fixed', top: '10%', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,0,0.1) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: -1 }}></div>
            <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,71,121,0.1) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: -1 }}></div>

            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 1.5rem' }}>
                <button
                    onClick={onBack}
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        marginBottom: '2.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--glass-border)',
                        fontSize: '0.8125rem',
                        fontWeight: 600
                    }}
                >
                    <ArrowLeft size={16} /> {t('login.return')}
                </button>

                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '24px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                        <img src="/logo.png" alt="NGS Logo" style={{ width: '60px', height: 'auto' }} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{t('login.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('login.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('kiosk.user_account')}</label>
                        <select
                            value={username}
                            onChange={(e) => handleUserChange(e.target.value)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '14px',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        >
                            {loading ? (
                                <option style={{ backgroundColor: 'var(--background)' }}>{t('kiosk.loading_users')}</option>
                            ) : users.length === 0 ? (
                                <option style={{ backgroundColor: 'var(--background)' }}>{t('kiosk.no_users')}</option>
                            ) : (
                                users.map(user => (
                                    <option key={user.id} value={user.email} style={{ backgroundColor: 'var(--background)', color: 'var(--text-main)' }}>
                                        {user.full_name} ({t(`roles.${user.role.toLowerCase().replace(/ /g, '_')}`)})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('kiosk.user_identifier')}</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t('kiosk.employee_id_placeholder')}
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    borderRadius: '14px',
                                    border: '1px solid var(--glass-border)',
                                    backgroundColor: 'var(--glass-bg)',
                                    color: 'var(--text-main)',
                                    fontWeight: 600,
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('kiosk.security_key')}</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    borderRadius: '14px',
                                    border: '1px solid var(--glass-border)',
                                    backgroundColor: 'var(--glass-bg)',
                                    color: 'var(--text-main)',
                                    fontWeight: 600,
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: '1rem', justifyContent: 'center', fontSize: '1rem' }}>
                        {t('login.sign_in')}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {t('kiosk.forgot_password')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(10px)'
                }}>
                    <div className="card animate-fade-in-static" style={{ maxWidth: '450px', width: '90%', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('kiosk.reset_modal.title')}</h3>
                            <button
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetEmail('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} color="var(--text-muted)" />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
                            {t('kiosk.reset_modal.instruction')}
                        </p>

                        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    {t('kiosk.reset_modal.email_label')}
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder={t('kiosk.reset_modal.email_placeholder')}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        color: 'var(--text-main)',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    {t('kiosk.reset_modal.new_password')}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Key size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder={t('kiosk.reset_modal.new_password_placeholder')}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    {t('kiosk.reset_modal.confirm_password')}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Key size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={t('kiosk.reset_modal.confirm_password_placeholder')}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                {passwordErrors.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', fontSize: '0.75rem', color: '#ef4444' }}>
                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                            {passwordErrors.map((err, i) => <li key={i}>• {err}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setResetEmail('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-main)',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('kiosk.reset_modal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetting}
                                    className="btn-primary"
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        borderRadius: '12px',
                                        fontWeight: 700
                                    }}
                                >
                                    {resetting ? t('kiosk.reset_modal.resetting') : t('kiosk.reset_modal.reset_btn')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default LoginPage;
