import React from 'react';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Car,
    AlertTriangle,
    BarChart3,
    Settings,
    LogOut,
    ShieldCheck,
    LogIn,
    Calendar,
    PieChart,
    ClipboardList,
    X,
    UserCog
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout, role, isOpen, onClose, isMobile }) => {
    const allMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Security Officer', 'Security HOD', 'School Management', 'School Operations'] },
        { id: 'visitors', label: 'Visitor Management', icon: Users, roles: ['Admin', 'Security Officer', 'Security HOD', 'School Management', 'School Operations'] },
        { id: 'scheduled-meetings', label: 'Scheduled Meetings', icon: Calendar, roles: ['Admin', 'Security Officer', 'Security HOD', 'School Operations'] },
        { id: 'vehicles', label: 'Vehicle Management', icon: Car, roles: ['Admin', 'Security Officer', 'Security HOD', 'School Management', 'School Operations'] },
        { id: 'reports', label: 'Reports & Stats', icon: PieChart, roles: ['Admin', 'Security HOD', 'School Management'] },
        { id: 'audit-trail', label: 'Audit Trail', icon: ClipboardList, roles: ['Admin'] },
        { id: 'user-management', label: 'User Management', icon: UserCog, roles: ['Admin'] },
    ];

    const menuItems = allMenuItems.filter(item => item.roles.includes(role));

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{
            width: '240px',
            height: isMobile ? 'calc(100vh - 1rem)' : 'calc(100vh - 2rem)',
            margin: isMobile ? '0.5rem' : '1rem',
            backgroundColor: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: isMobile ? (isOpen ? '0' : '-280px') : '0',
            top: 0,
            zIndex: 1000,
            boxShadow: 'var(--shadow)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            <div className="logo-container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                padding: '0.25rem 0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img src="/logo.png" alt="NGS Logo" style={{ width: '24px', height: 'auto' }} />
                    </div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>Nextgen Shield</h1>
                </div>
                {isMobile && (
                    <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                )}
            </div>

            <nav style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }} className="hide-scrollbar">
                <ul style={{ listStyle: 'none' }}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <li key={item.id} style={{ marginBottom: '0.25rem' }}>
                                <button
                                    onClick={() => setActiveTab(item.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        justifyContent: 'flex-start',
                                        textAlign: 'left',
                                        padding: '0.75rem 0.875rem',
                                        backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                                        color: isActive ? 'white' : 'var(--text-muted)',
                                        borderRadius: '12px',
                                        transition: 'var(--transition)',
                                        border: 'none',
                                        boxShadow: isActive ? '0 4px 15px rgba(255, 140, 0, 0.3)' : 'none'
                                    }}
                                >
                                    <Icon size={18} />
                                    <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.9rem' }}>{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="sidebar-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        padding: '0.7rem 0.875rem',
                        backgroundColor: activeTab === 'settings' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'settings' ? 'white' : 'var(--text-muted)',
                        borderRadius: '12px',
                        transition: 'var(--transition)',
                        boxShadow: activeTab === 'settings' ? '0 4px 15px rgba(255, 140, 0, 0.3)' : 'none',
                        border: 'none'
                    }}
                >
                    <Settings size={18} />
                    <span style={{ fontWeight: activeTab === 'settings' ? 700 : 500, fontSize: '0.9rem' }}>Settings</span>
                </button>
                <button
                    onClick={onLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        padding: '0.7rem 0.875rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        borderRadius: '12px',
                        marginTop: '0.375rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <LogOut size={18} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
