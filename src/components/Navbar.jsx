import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Search, UserCircle, Sun, Moon, AlertTriangle, Menu } from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import AlertsOverlay from './AlertsOverlay';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = ({ activeTab, user, theme, toggleTheme, onToggleSidebar, isMobile }) => {
    const { t } = useTranslation();
    const { alerts, unreadCount, markAsRead } = useAlerts();
    const [showAlerts, setShowAlerts] = useState(false);

    const getTitle = (tab) => {
        switch (tab) {
            case 'dashboard': return t('common.operational_insights');
            case 'scheduled-meetings': return t('common.meeting_schedule');
            case 'visitors': return t('common.visitor_registry');
            case 'vehicles': return t('common.vehicle_access');
            case 'reports': return t('common.security_analytics');
            case 'audit-trail': return 'Audit Trail';
            case 'settings': return t('common.settings');
            default: return t('common.overview');
        }
    };

    const isSecurityRole = ['Admin', 'Security Officer', 'Security HOD', 'School Operations', 'School Management'].includes(user?.role);

    return (
        <header className="navbar" style={{
            height: isMobile ? '60px' : '70px',
            backgroundColor: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            margin: isMobile ? '0.5rem' : '1rem',
            padding: isMobile ? '0 1rem' : '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow)',
            position: 'sticky',
            top: isMobile ? '0.5rem' : '1rem',
            zIndex: 50
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isMobile && (
                    <button
                        onClick={onToggleSidebar}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            borderRadius: '10px'
                        }}
                    >
                        <Menu size={20} />
                    </button>
                )}
                <div className={isMobile ? 'desktop-only' : ''}>
                    <h2 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{getTitle(activeTab)}</h2>
                    {!isMobile && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem' }}>
                {/* Quick Search Removed - Localized search now available in each view */}


                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isSecurityRole && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowAlerts(!showAlerts)}
                                style={{
                                    padding: '0.625rem',
                                    backgroundColor: showAlerts ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: showAlerts ? 'white' : 'var(--text-secondary)',
                                    borderRadius: '12px',
                                    transition: 'var(--transition)',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                title="Security Alerts"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-5px',
                                        right: '-5px',
                                        backgroundColor: 'var(--danger)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        border: '2px solid var(--glass-bg)'
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            {showAlerts && (
                                <AlertsOverlay
                                    alerts={alerts}
                                    onClose={() => setShowAlerts(false)}
                                    onMarkRead={markAsRead}
                                    userRole={user?.role}
                                />
                            )}
                        </div>
                    )}

                    <LanguageSwitcher />
                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: '0.625rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-secondary)',
                            borderRadius: '12px',
                            transition: 'var(--transition)',
                            cursor: 'pointer'
                        }}
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <div style={{
                        height: '32px',
                        width: '1px',
                        backgroundColor: 'var(--glass-border)',
                        margin: '0 0.25rem'
                    }} className="desktop-only"></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ textAlign: 'right' }} className="desktop-only">
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.username || 'User'}</p>
                        </div>
                        <div style={{
                            width: isMobile ? '32px' : '40px',
                            height: isMobile ? '32px' : '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--primary), #ec4899)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: 'white',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            border: '2px solid rgba(255,255,255,0.2)'
                        }}>
                            {(user?.username || 'S').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
