import React from 'react';
import { MoreVertical, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';

const LogTable = ({ title, data, columns, period }) => {
    const handleExport = async () => {
        // Exclude 'actions' column from PDF report as requested
        const exportColumns = columns.filter(col => col.key !== 'actions');
        
        await exportToPDF({
            title: title,
            data: data,
            columns: exportColumns,
            filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`,
            metadata: { 
                generatedBy: 'Security Operations',
                period: period || 'Live Feed'
            },
            orientation: 'l' // Landscape to fit extra columns securely
        });
    };

    const getStatusBadge = (status) => {
        if (!status) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>N/A</span>;

        let styles = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600
        };

        const lowerStatus = status.toLowerCase();
        switch (lowerStatus) {
            case 'approved':
            case 'confirmed':
            case 'auto-confirmed':
            case 'checked-in':
            case 'authorized':
                return <span style={{ ...styles, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}><CheckCircle size={12} /> {status}</span>;
            case 'pending':
                return <span style={{ ...styles, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}><Clock size={12} /> {status}</span>;
            case 'rejected':
            case 'denied':
            case 'closed':
                return <span style={{ ...styles, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}><XCircle size={12} /> {status}</span>;
            default:
                return <span style={{ ...styles, backgroundColor: 'var(--background)', color: 'var(--text-muted)' }}>{status}</span>;
        }
    };

    const getMethodBadge = (method) => {
        if (!method) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Manual</span>;

        let styles = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600
        };

        if (method.includes('Agent-Auto') || method.includes('SBU-Auth')) {
            return <span style={{ ...styles, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}>🤖 {method}</span>;
        } else if (method.includes('Manual')) {
            return <span style={{ ...styles, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>👤 {method}</span>;
        } else {
            return <span style={{ ...styles, backgroundColor: 'var(--background)', color: 'var(--text-muted)' }}>{method}</span>;
        }
    };

    return (
        <div className="card animate-fade-in" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleExport}
                        className="btn-secondary"
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
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

            <div style={{ overflowX: 'auto', margin: '0 -1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        {columns.some(c => c.subColumns) ? (
                            <>
                                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                    {columns.map((col, idx) => (
                                        <th key={`top-${idx}`} colSpan={col.subColumns?.length || 1} rowSpan={col.subColumns ? 1 : 2} style={{
                                            padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                                            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                                            borderBottom: '1px solid var(--glass-border)',
                                            borderRight: col.subColumns ? '1px solid var(--glass-border)' : 'none',
                                            textAlign: col.subColumns ? 'center' : 'left',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                    {columns.filter(c => c.subColumns).flatMap(c => c.subColumns).map((sub, idx) => (
                                        <th key={`bot-${idx}`} style={{
                                            padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                                            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                                            borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap'
                                        }}>
                                            {sub.header}
                                        </th>
                                    ))}
                                </tr>
                            </>
                        ) : (
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                {columns.map((col, idx) => (
                                    <th key={idx} style={{
                                        padding: '0.75rem 1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        borderBottom: '1px solid var(--glass-border)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.flatMap(c => c.subColumns || [c]).length} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No records found for today.
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr key={rowIdx} className="table-row" style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'var(--transition)'
                                }}>
                                    {columns.flatMap(c => c.subColumns || [c]).map((col, colIdx) => (
                                        <td key={colIdx} style={{
                                            padding: '0.75rem 1rem',
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
