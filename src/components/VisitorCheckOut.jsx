import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, CheckCircle, XCircle, ArrowRight, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

const VisitorCheckOut = () => {
    const navigate = useNavigate();
    const [idNumber, setIdNumber] = useState('');
    const [status, setStatus] = useState('idle'); // idle, searching, found, success, error
    const [visitor, setVisitor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!idNumber) return;

        setLoading(true);
        setError(null);
        setStatus('searching');

        try {
            // Find an active visitor (Checked-in and no exit_time)
            const { data, error: fetchError } = await supabase
                .from('visitors')
                .select('id, name, nic_passport, entry_time, status, type, meeting_with, purpose')
                .eq('nic_passport', idNumber)
                .is('exit_time', null)
                .order('entry_time', { ascending: false })
                .limit(1)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setError("No active check-in found for this ID.");
                    setStatus('error');
                } else {
                    throw fetchError;
                }
            } else {
                setVisitor(data);
                setStatus('found');
            }
        } catch (err) {
            console.error("Search error:", err);
            setError("Error searching for visitor. Please try again.");
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!visitor) return;
        setLoading(true);

        try {
            const { error: updateError } = await supabase
                .from('visitors')
                .update({ exit_time: new Date().toISOString() })
                .eq('id', visitor.id);

            if (updateError) throw updateError;

            setStatus('success');
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            console.error("Check-out error:", err);
            setError("Failed to process check-out. Please see security.");
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    // Helper for layout (consistent with premium aesthetic)
    const FullScreenContainer = ({ children }) => (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0a0c10',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 100%)',
            backdropFilter: 'blur(100px)'
        }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: -1 }}></div>
            {children}
        </div>
    );

    if (status === 'success') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', width: '90%', backgroundColor: '#1E293B', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-bounce-in" style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
                            <CheckCircle size={64} color="#10B981" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', marginBottom: '1rem' }}>Successfully Checked Out</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
                        Goodbye, <strong>{visitor.name}</strong>!<br />Thank you for visiting Nextgen Shield.
                    </p>
                </div>
            </FullScreenContainer>
        );
    }

    return (
        <FullScreenContainer>
            <div className="card animate-fade-in" style={{
                width: '100%', maxWidth: '500px', backgroundColor: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '32px', padding: '3rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                        <LogOut size={40} color="#3b82f6" />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Check Out</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Enter your ID to complete your visit</p>
                </div>

                {status !== 'found' ? (
                    <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="NIC / EMP Code"
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                style={{
                                    width: '100%', padding: '1.25rem 1rem 1.25rem 3rem', backgroundColor: '#fff',
                                    borderRadius: '16px', border: 'none', color: '#1e293b', fontWeight: 700, fontSize: '1.125rem', outline: 'none'
                                }}
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 600, justifyContent: 'center' }}>
                                <XCircle size={14} /> {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !idNumber}
                            className="btn-primary"
                            style={{ padding: '1.25rem', borderRadius: '16px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}
                        >
                            {loading ? <Loader className="animate-spin" size={24} /> : <>FIND MY CHECK-IN <ArrowRight size={20} /></>}
                        </button>
                    </form>
                ) : (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Visitor Found</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{visitor.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Arrival: {new Date(visitor.entry_time).toLocaleTimeString()}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setStatus('idle')}
                                style={{
                                    padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                                    color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                BACK
                            </button>
                            <button
                                type="button"
                                onClick={handleCheckOut}
                                disabled={loading}
                                className="btn-primary"
                                style={{ padding: '1rem', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                            >
                                {loading ? <Loader className="animate-spin" size={20} /> : 'CONFIRM EXIT'}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'underline' }}
                >
                    Cancel and Return to Home
                </button>
            </div>
        </FullScreenContainer>
    );
};

export default VisitorCheckOut;
