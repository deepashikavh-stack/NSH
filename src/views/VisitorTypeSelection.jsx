import React from 'react';
import { Home, User, Building2, Users, LogOut, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VisitorTypeSelection = ({ theme, toggleTheme }) => {
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const visitorTypes = [
        {
            id: 'Parent',
            label: 'Parent',
            icon: User,
            gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            shadowColor: 'rgba(37, 99, 235, 0.3)',
            description: 'Parent or guardian visiting the school'
        },
        {
            id: 'Lyceum',
            label: 'Lyceum',
            icon: Building2,
            gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
            shadowColor: 'rgba(124, 58, 237, 0.3)',
            description: 'Lyceum staff'
        },
        {
            id: 'Other',
            label: 'Other',
            icon: Users,
            gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
            shadowColor: 'rgba(234, 88, 12, 0.3)',
            description: 'General visitor or guest'
        },
        {
            id: 'CheckOut',
            label: 'Check Out',
            icon: LogOut,
            gradient: 'linear-gradient(135deg, #334155 0%, #475569 100%)',
            shadowColor: 'rgba(51, 65, 85, 0.3)',
            description: 'Record your exit from the premises'
        }
    ];

    const handleTypeSelect = (type) => {
        if (type === 'CheckOut') {
            navigate('/kiosk/check-out');
        } else {
            navigate(`/kiosk/check-in?type=${type}`);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorative Elements */}
            <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,0,0.08) 0%, transparent 70%)', filter: 'blur(120px)', zIndex: -1 }}></div>
            <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,71,121,0.08) 0%, transparent 70%)', filter: 'blur(120px)', zIndex: -1 }}></div>

            {/* Controls - Top Right */}
            <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 10000, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.75rem',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        boxShadow: 'var(--shadow)'
                    }}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            {/* Header with Home Button */}
            <header style={{
                width: '100%',
                maxWidth: '1100px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: isMobile ? '2rem' : '4rem',
                padding: '1rem 0',
                position: 'relative'
            }}>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        position: isMobile ? 'static' : 'absolute',
                        left: 0,
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        padding: '0.625rem 1rem',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        borderRadius: '12px',
                        transition: 'var(--transition)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        marginBottom: isMobile ? '1rem' : '0'
                    }}
                >
                    <Home size={16} />
                    Home
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                        <img src="/logo.png" alt="NGS Logo" style={{ width: '40px', height: 'auto' }} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Nextgen Shield (Private) Limited</h1>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                width: '100%',
                maxWidth: '1100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem', padding: '0 1rem' }}>
                    <h2 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                        Welcome to Visitor Check-In
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 500 }}>
                        Please select your visitor category to proceed
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: isMobile ? '1.5rem' : '2.5rem',
                    width: '100%',
                    maxWidth: '800px',
                    padding: isMobile ? '0 1rem' : '0'
                }}>
                    {visitorTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <div
                                key={type.id}
                                onClick={() => handleTypeSelect(type.id)}
                                className="card animate-fade-in"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: isMobile ? '1.5rem' : '3rem 2rem',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    background: type.gradient,
                                    padding: isMobile ? '1.25rem' : '2rem',
                                    borderRadius: '20px',
                                    color: 'white',
                                    marginBottom: '1rem',
                                    boxShadow: `0 10px 25px ${type.shadowColor}`
                                }}>
                                    <Icon size={isMobile ? 32 : 48} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                                    {type.label}
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 }}>
                                    {type.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </main>

            <footer style={{ marginTop: 'auto', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                &copy; {new Date().getFullYear()} Nextgen Shield (Private) Limited. All rights reserved.
            </footer>
        </div>
    );
};

export default VisitorTypeSelection;
