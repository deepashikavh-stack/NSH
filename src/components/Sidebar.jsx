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
        { id: 'scheduled-meetings', label: 'Scheduled Meetings', icon: Calendar, roles: ['Admin', 'Security Officer', 'Security HOD', 'School Operations'] },
        { id: 'vehicles', label: 'Vehicle Logs', icon: Car, roles: ['Admin', 'Security Officer', 'Security HOD', 'School Management', 'School Operations'] },
        { id: 'reports', label: 'Reports & Stats', icon: PieChart, roles: ['Admin', 'Security HOD', 'School Management'] },
        { id: 'audit-trail', label: 'Audit Trail', icon: ClipboardList, roles: ['Admin', 'Security HOD'] },
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
            padding: '1.5rem',
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
                marginBottom: '2.5rem',
                padding: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img src="/logo.png" alt="NGS Logo" style={{ width: '28px', height: 'auto' }} />
                    </div>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Nextgen Shield</h1>
                </div>
                {isMobile && (
                    <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                )}
            </div>

            <nav style={{ flex: 1 }}>
                <ul style={{ listStyle: 'none' }}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <li key={item.id} style={{ marginBottom: '0.5rem' }}>
                                <button
                                    onClick={() => setActiveTab(item.id)}
                                    style={{
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        padding: '0.875rem 1rem',
                                        backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                                        color: isActive ? 'white' : 'var(--text-muted)',
                                        borderRadius: '14px',
                                        transition: 'var(--transition)',
                                        border: 'none',
                                        boxShadow: isActive ? '0 4px 15px rgba(255, 140, 0, 0.3)' : 'none'
                                    }}
                                >
                                    <Icon size={20} />
                                    <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="sidebar-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        padding: '0.75rem 1rem',
                        backgroundColor: activeTab === 'settings' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'settings' ? 'white' : 'var(--text-muted)',
                        borderRadius: '12px',
                        transition: 'var(--transition)',
                        boxShadow: activeTab === 'settings' ? '0 4px 15px rgba(255, 140, 0, 0.3)' : 'none'
                    }}
                >
                    <Settings size={20} />
                    <span style={{ fontWeight: activeTab === 'settings' ? 700 : 500 }}>Settings</span>
                </button>
                <button
                    onClick={onLogout}
                    style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        borderRadius: '12px',
                        marginTop: '0.5rem'
                    }}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
