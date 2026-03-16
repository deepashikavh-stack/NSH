import React, { useState, useEffect } from 'react';
import { History, RotateCw, Search, Info, Shield, Key, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuditTrailView = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditSearch, setAuditSearch] = useState('');
    const [auditTab, setAuditTab] = useState('All');
    const [expandedLog, setExpandedLog] = useState(null);

    useEffect(() => { fetchAuditLogs(); }, []);

    const fetchAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('id, action, table_name, record_id, user_id, details, timestamp')
                .order('timestamp', { ascending: false })
                .limit(200);
            if (error) throw error;
            setAuditLogs(data || []);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setAuditLoading(false);
        }
    };

    const getActionCategory = (action) => {
        const accessActions = ['Approve Visitor', 'Reject Visitor', 'Check-in', 'Check-out', 'Log Vehicle', 'Check-out Vehicle'];
        const authActions = ['Login', 'Logout'];
        const securityActions = ['Password Reset', 'Update Profile'];
        if (accessActions.includes(action)) return { label: 'Access', color: '#3b82f6', icon: ArrowRightLeft };
        if (authActions.includes(action)) return { label: 'Auth', color: '#10b981', icon: Key };
        if (securityActions.includes(action)) return { label: 'Security', color: '#f59e0b', icon: Shield };
        return { label: 'System', color: '#8b5cf6', icon: Info };
    };

    const filteredLogs = auditLogs.filter(log => {
        const category = getActionCategory(log.action).label;
        const matchesTab = auditTab === 'All' || category === auditTab;
        const matchesSearch = !auditSearch ||
            log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
            log.user_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
            JSON.stringify(log.details).toLowerCase().includes(auditSearch.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="animate-fade-in" style={{ padding: '1.5rem 0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                    Audit Trail
                </h2>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                    Read-only history of all system-wide actions and events.
                </p>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
                {/* Controls Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Category Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['All', 'Access', 'Security', 'Auth', 'System'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setAuditTab(tab)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--glass-border)',
                                    backgroundColor: auditTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                    color: auditTab === tab ? 'white' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Search + Refresh */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search action, user, details..."
                                value={auditSearch}
                                onChange={(e) => setAuditSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.875rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            onClick={fetchAuditLogs}
                            disabled={auditLoading}
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <RotateCw size={15} className={auditLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                        <thead>
                            <tr>
                                {['Timestamp', 'Action', 'User', 'Details', 'Data'].map((h, i) => (
                                    <th key={h} style={{
                                        textAlign: i === 4 ? 'center' : 'left',
                                        padding: '0.75rem 1rem',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {auditLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <RotateCw size={24} className="animate-spin" />
                                            <span>Loading audit history...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No matching activity found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const category = getActionCategory(log.action);
                                    const CategoryIcon = category.icon;
                                    const isExpanded = expandedLog === log.id;

                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '1rem', borderRadius: '12px 0 0 12px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                        <span style={{ opacity: 0.7 }}>
                                                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ padding: '0.25rem', borderRadius: '6px', backgroundColor: `${category.color}15`, color: category.color }}>
                                                                <CategoryIcon size={13} />
                                                            </div>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>{log.action}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: category.color, letterSpacing: '0.05em' }}>
                                                            {category.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                                    {log.user_id || 'System'}
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                                    {log.details?.name ? `Target: ${log.details.name}` : ''}
                                                    {log.table_name && !log.details?.name ? `Module: ${log.table_name}` : ''}
                                                    {!log.details?.name && !log.table_name ? 'System Event' : ''}
                                                </td>
                                                <td style={{ padding: '1rem', borderRadius: '0 12px 12px 0', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                                                    >
                                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '0 1rem 1rem 1rem' }}>
                                                        <div style={{
                                                            padding: '1.5rem',
                                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                                            borderRadius: '0 0 16px 16px',
                                                            border: '1px solid var(--glass-border)',
                                                            borderTop: 'none',
                                                            marginTop: '-0.5rem'
                                                        }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Record ID</div>
                                                                    <code style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'monospace' }}>{log.record_id || 'N/A'}</code>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Technical Details</div>
                                                                    <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                                                                        {JSON.stringify(log.details, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer count */}
                {!auditLoading && filteredLogs.length > 0 && (
                    <p style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Showing {filteredLogs.length} of {auditLogs.length} records
                    </p>
                )}
            </div>
        </div>
    );
};

export default AuditTrailView;
