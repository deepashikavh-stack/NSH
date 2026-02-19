import React from 'react';
import { MoreVertical, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';

const LogTable = ({ title, data, columns }) => {
    const handleExport = async () => {
        await exportToPDF({
            title: title,
            data: data,
            columns: columns,
            filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`,
            metadata: { generatedBy: 'Security Operations' }
        });
    };

    const getStatusBadge = (status) => {
        let styles = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600
        };

        switch (status.toLowerCase()) {
            case 'approved':
            case 'confirmed':
            case 'auto-confirmed':
            case 'checked-in':
                return <span style={{ ...styles, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}><CheckCircle size={12} /> {status}</span>;
            case 'pending':
                return <span style={{ ...styles, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}><Clock size={12} /> {status}</span>;
            case 'rejected':
            case 'closed':
                return <span style={{ ...styles, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}><XCircle size={12} /> {status}</span>;
            default:
                return <span style={{ ...styles, backgroundColor: 'var(--background)', color: 'var(--text-muted)' }}>{status}</span>;
        }
    };

    const getMethodBadge = (method) => {
        let styles = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600
        };

        if (method && method.includes('Agent-Auto')) {
            return <span style={{ ...styles, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}>🤖 {method}</span>;
        } else if (method && method.includes('Manual')) {
            return <span style={{ ...styles, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>👤 {method}</span>;
        } else {
            return <span style={{ ...styles, backgroundColor: 'var(--background)', color: 'var(--text-muted)' }}>{method || 'N/A'}</span>;
        }
    };

    return (
        <div className="card animate-fade-in" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleExport}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', margin: '0 -1.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                            {columns.map((col, idx) => (
                                <th key={idx} style={{
                                    padding: '1rem 1.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    borderBottom: '1px solid var(--glass-border)'
                                }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No records found for today.
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr key={rowIdx} className="table-row" style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'var(--transition)'
                                }}>
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} style={{
                                            padding: '1rem 1.75rem',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500
                                        }}>
                                            {col.key === 'status' ? getStatusBadge(row[col.key]) :
                                                col.key === 'method' ? getMethodBadge(row[col.key]) :
                                                    col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LogTable;
