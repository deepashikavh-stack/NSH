import React from 'react';
import { Download, FileText } from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';

const ReportTable = ({ title, description, data, columns, onExport }) => {
    const handlePDFExport = () => {
        exportToPDF({
            title: title,
            data: data,
            columns: columns,
            filename: `${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`,
            metadata: { generatedBy: 'System Report' }
        });
    };

    return (
        <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>{title}</h3>
                    {description && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{description}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handlePDFExport}
                        style={{
                            padding: '0.625rem 1.25rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 700
                        }}
                    >
                        <Download size={16} /> EXPORT PDF
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {columns.map((col, idx) => (
                                <th key={idx} style={{ textAlign: 'left', padding: '1rem', fontWeight: 800 }}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <FileText size={48} opacity={0.2} />
                                        <span>No records found for this criteria.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr key={rowIdx} style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    transition: 'var(--transition)',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} style={{
                                            padding: '1.25rem 1rem',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-main)',
                                            fontWeight: 500,
                                            borderTop: colIdx === 0 ? '1px solid var(--glass-border)' : 'none',
                                            borderBottom: colIdx === 0 ? '1px solid var(--glass-border)' : 'none'
                                        }}>
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
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

export default ReportTable;
