import React from 'react';
import ReactDOM from 'react-dom';
import { X, Clock, User, Car, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';

const AlertDetailView = ({ alert, onClose, onMarkRead }) => {
    if (!alert) return null;

    const data = alert.details || {};
    
    // Normalize data between different alert types (Visitor, Meeting, Vehicle)
    const displayName = data.name || data.visitor || data.vehicle_number || 'N/A';
    const displayId = data.nic || data.nic_passport || 'N/A';
    const displayTime = data.entry_time || data.date || 'N/A';
    const displayPurpose = data.purpose || alert.message || 'N/A';

    const getIcon = (type) => {
        switch (type) {
            case 'Visitor': return <User size={32} />;
            case 'Vehicle': return <Car size={32} />;
            case 'Meeting': return <Calendar size={32} />;
            default: return <AlertTriangle size={32} />;
        }
    };

    // Use a Portal to render outside the parent's stacking context (fixes clipping/hidden issues)
    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999, // Extremely high to stay on top
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '520px',
                padding: '0',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                backgroundColor: 'var(--background)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    background: alert.severity === 'critical' ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'linear-gradient(135deg, #f59e0b, #b45309)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                            {getIcon(alert.type)}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{alert.title}</h3>
                            <span style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                {alert.category} • {alert.type}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2.5rem' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Alert Reason</h4>
                        <div style={{
                            padding: '1.25rem',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '16px',
                            borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}`,
                            color: 'var(--text-main)',
                            fontWeight: 500,
                            lineHeight: 1.6,
                            fontSize: '1rem'
                        }}>
                            {displayPurpose}
                            {data.stay_duration && (
                                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--warning)', fontWeight: 700 }}>
                                    Current stay duration: {data.stay_duration} hours
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                {alert.type === 'Vehicle' ? 'Identification' : 'Full Name'}
                            </h4>
                            <p style={{ color: 'var(--text-main)', fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>
                                {displayName}
                            </p>
                        </div>

                        {alert.type !== 'Vehicle' && (
                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>ID Number</h4>
                                <p style={{ color: 'var(--text-main)', fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>{displayId}</p>
                            </div>
                        )}

                        <div>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Reference Time</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>
                                <Clock size={16} />
                                {displayTime !== 'N/A' && !isNaN(Date.parse(displayTime)) 
                                    ? new Date(displayTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                    : displayTime}
                            </div>
                        </div>

                        {data.end_time && (
                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Scheduled Exit</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>
                                    <Clock size={16} />
                                    {data.end_time}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem 2.5rem',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem'
                }}>
                    {!alert.is_read && (
                        <button
                            onClick={() => {
                                onMarkRead(alert.id);
                                onClose();
                            }}
                            className="btn-primary"
                            style={{ padding: '0.875rem 1.75rem', borderRadius: '14px', fontSize: '1rem' }}
                        >
                            <ShieldCheck size={20} /> Mark as Read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.875rem 1.75rem',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-main)',
                            borderRadius: '14px',
                            fontWeight: 700,
                            border: '1px solid var(--glass-border)',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AlertDetailView;
