import React from 'react';
import { Users, Car, ArrowRight, ShieldCheck } from 'lucide-react';

const LandingPage = ({ onNavigate, onLogin }) => {
    return (
        <div className="landing-container" style={{
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

            <header style={{
                width: '100%',
                maxWidth: '900px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6rem',
                padding: '1.5rem 0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                        <img src="/logo.png" alt="NGS Logo" style={{ width: '50px', height: 'auto' }} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Nextgen Shield (Private) Limited</h1>
                </div>
                <button
                    onClick={onLogin}
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: '#fff',
                        padding: '0.75rem 2rem',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        borderRadius: '14px',
                        transition: 'var(--transition)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    Administrative Login
                </button>
            </header>

            <main style={{
                width: '100%',
                maxWidth: '900px',
                display: 'flex',
                gap: '2rem'
            }}>
                <div
                    onClick={() => onNavigate('visitors')}
                    className="card animate-fade-in"
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4rem 2rem',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        textAlign: 'center'
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        padding: '2rem',
                        borderRadius: '24px',
                        color: 'white',
                        marginBottom: '2rem',
                        boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Users size={48} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Visitor Gateway</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 }}>Authorized check-in for guests,<br />parents, and staff visitors.</p>
                </div>

                <div
                    onClick={() => onNavigate('vehicles')}
                    className="card animate-fade-in"
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4rem 2rem',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        textAlign: 'center'
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                        padding: '2rem',
                        borderRadius: '24px',
                        color: 'white',
                        marginBottom: '2rem',
                        boxShadow: '0 10px 25px rgba(234, 88, 12, 0.3)'
                    }}>
                        <Car size={48} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Vehicle Portal</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 }}>Secure entry logging for<br />private and commercial vehicles.</p>
                </div>
            </main>

            <footer style={{ marginTop: 'auto', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                &copy; {new Date().getFullYear()} Nextgen Shield (Private) Limited. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingPage;
