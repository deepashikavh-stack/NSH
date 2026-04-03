import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ /* eslint-disable-line no-unused-vars */ title, value, icon: Icon /* eslint-disable-line */, trend, trendValue, color }) => {
    const isUp = trend === 'up';

    return (
        <div className="card animate-fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Accent Glow */}
            <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: color,
                opacity: '0.1',
                filter: 'blur(30px)',
                borderRadius: '50%'
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: isUp ? '#10b981' : '#ef4444',
                        backgroundColor: isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '20px'
                    }}>
                        {trendValue}
                    </div>
                )}
            </div>

            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{title}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{value}</h3>
            </div>
        </div>
    );
};

export default StatCard;
