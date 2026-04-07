import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, CheckCircle, Clock, XCircle, Filter, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/audit';
import LogTable from '../components/LogTable';

const VisitorManagementView = ({ user }) => {
    const [unifiedLog, setUnifiedLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        visitorType: '',
        method: '',
        scheduledDate: '',
        status: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchVisitorData = async () => {
        setLoading(true);
        const localNow = new Date();
        const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;

        try {
            // 1. Fetch Visitors
            const { data: visitorsData } = await supabase
                .from('visitors')
                .select('*')
                .order('entry_time', { ascending: false })
                .limit(100);

            // 2. Fetch Staff Entries
            const { data: staffData } = await supabase
                .from('staff_entries')
                .select('*')
                .order('entry_time', { ascending: false })
                .limit(50);

            // 3. Fetch Scheduled Meetings to map scheduling method and time
            const { data: meetingsData } = await supabase
                .from('scheduled_meetings')
                .select('*')
                .gte('meeting_date', today);

            // Create Unified Log (Visitors + Staff)
            const combined = [
                ...(visitorsData || []).map(v => {
                    const match = (meetingsData || []).find(m => 
                        m.visitor_name && v.name && 
                        m.visitor_name.trim().toLowerCase() === v.name.trim().toLowerCase() && 
                        v.entry_time && v.entry_time.startsWith(m.meeting_date)
                    );
                    
                    let method = 'On-Arrival';
                    if (match) {
                        if (match.visitor_category === 'On-arrival') method = 'On-Arrival';
                        else if (match.request_source === 'webpage') method = 'Via Web Page';
                        else method = 'Via System';
                    } else if (v.is_pre_registered) {
                        method = v.source_tag === 'pre-scheduled-via web page' ? 'Via Web Page' : 'Via System';
                    }

                    return {
                        ...v,
                        category: 'Visitor',
                        time: v.entry_time,
                        displayType: v.type,
                        name: v.name,
                        employeeCode: v.nic_passport || 'N/A',
                        method: method,
                        scheduledDate: match?.meeting_date ? new Date(match.meeting_date).toLocaleDateString('en-GB') : 'N/A',
                        scheduledTime: match?.start_time ? match.start_time.slice(0,5) : 'N/A',
                        checkedInDateRaw: v.entry_time ? v.entry_time.split('T')[0] : '', // YYYY-MM-DD
                        scheduledDateRaw: match?.meeting_date || ''
                    };
                }),
                ...(staffData || []).map(s => ({
                    ...s,
                    category: 'Staff',
                    time: s.entry_time,
                    displayType: 'Employee',
                    name: s.name,
                    employeeCode: s.employee_id || s.employee_code || s.staff_id || 'N/A',
                    method: 'N/A',
                    scheduledDate: 'N/A',
                    scheduledTime: 'N/A',
                    checkedInDateRaw: s.entry_time ? s.entry_time.split('T')[0] : '',
                    scheduledDateRaw: ''
                }))
            ].sort((a, b) => new Date(b.time) - new Date(a.time));

            setUnifiedLog(combined);
        } catch (err) {
            console.error("Error fetching visitor management data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitorData();
        const interval = setInterval(fetchVisitorData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const handleCheckOut = async (entry) => {
        const table = entry.category === 'Staff' ? 'staff_entries' : 'visitors';
        const { error } = await supabase
            .from(table)
            .update({ exit_time: new Date().toISOString() })
            .eq('id', entry.id);

        if (error) {
            alert("Error during check-out");
        } else {
            logAudit('Check-out', table, entry.id, user?.email || 'Admin', {
                name: entry.name,
                category: entry.category,
                entry_time: entry.time
            });
            fetchVisitorData();
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => setFilters({
        fromDate: '',
        toDate: '',
        visitorType: '',
        method: '',
        scheduledDate: '',
        status: ''
    });

    const overdueVisitors = unifiedLog.filter(entry => entry.category === 'Visitor' && !entry.exit_time);

    const filteredLog = unifiedLog.filter(entry => {
        const matchesSearch = 
            (entry.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.purpose || '').toLowerCase().includes(searchTerm.toLowerCase());
            
        if (!matchesSearch) return false;

        if (filters.fromDate && entry.checkedInDateRaw < filters.fromDate) return false;
        if (filters.toDate && entry.checkedInDateRaw > filters.toDate) return false;
        if (filters.visitorType && entry.displayType !== filters.visitorType) return false;
        if (filters.method && entry.method !== filters.method) return false;
        if (filters.scheduledDate && entry.scheduledDateRaw !== filters.scheduledDate) return false;
        
        if (filters.status) {
            const isCheckedOut = entry.exit_time != null;
            if (filters.status === 'Checked-in' && isCheckedOut) return false;
            if (filters.status === 'Checked-out' && !isCheckedOut) return false;
        }

        return true;
    });

    const formatDate = (t) => {
        if (!t) return 'N/A';
        return new Date(t).toLocaleDateString('en-GB');
    };

    const formatTime = (t) => {
        if (!t) return 'N/A';
        return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const logColumns = [
        { 
            header: 'Checked-in', 
            subColumns: [
                { header: 'Date', key: 'time', render: formatDate },
                { header: 'Time', key: 'time', render: formatTime }
            ]
        },
        { header: 'Employee code/ID', key: 'employeeCode' },
        { header: 'Visitor type', key: 'displayType', render: (val, row) => row.purpose ? `${val} (${row.purpose})` : val },
        { header: 'Name', key: 'name' },
        { header: 'Method', key: 'method' },
        { 
            header: 'Scheduled', 
            subColumns: [
                { header: 'Date', key: 'scheduledDate' },
                { header: 'Time', key: 'scheduledTime' }
            ]
        },
        { header: 'Status', key: 'status', render: (s, row) => row.exit_time ? 'Checked-out' : 'Checked-in' },
        {
            header: 'Actions',
            key: 'actions',
            render: (_, row) => !row.exit_time ? (
                <button
                    onClick={() => handleCheckOut(row)}
                    className="btn-danger btn-sm btn-pill"
                    style={{ gap: '0.4rem' }}
                >
                    Check-out
                </button>
            ) : (
                <span className="btn-sm btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', fontWeight: 700 }}>
                    <CheckCircle size={12} />
                    Checked out
                </span>
            )
        }
    ];

    return (
        <div className="animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Visitor Management</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Monitor and manage on-site visitor activity.</p>
            </div>

            {/* Security Risks Section */}
            {overdueVisitors.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <ShieldAlert size={20} color="#ef4444" />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ef4444' }}>Security Alert: Overdue Exits</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {overdueVisitors.slice(0, 6).map(v => (
                            <div key={v.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>{v.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inside since: {new Date(v.time).toLocaleTimeString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters Section */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <Filter size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Filter & Search</h3>
                </div>
                
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Users size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search by name, NIC, or purpose..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', fontSize: '0.875rem' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>From (Checked-in)</label>
                        <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>To (Checked-in)</label>
                        <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Visitor Type</label>
                        <select name="visitorType" value={filters.visitorType} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}>
                            <option value="">All Types</option>
                            <option value="Lyceum">Lyceum</option>
                            <option value="Parent">Parent</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Method</label>
                        <select name="method" value={filters.method} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}>
                            <option value="">All Methods</option>
                            <option value="On-Arrival">On-Arrival</option>
                            <option value="Via Web Page">Via Web Page</option>
                            <option value="Via System">Via System</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Scheduled Date</label>
                        <input type="date" name="scheduledDate" value={filters.scheduledDate} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status</label>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field" style={{ width: '100%', padding: '0.625rem', fontSize: '0.875rem' }}>
                            <option value="">All Statuses</option>
                            <option value="Checked-in">Checked-in</option>
                            <option value="Checked-out">Checked-out</option>
                        </select>
                    </div>
                </div>
                {(filters.fromDate || filters.toDate || filters.visitorType || filters.method || filters.scheduledDate || filters.status) && (
                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
                        <button onClick={clearFilters} className="btn-secondary btn-sm btn-pill" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', gap: '0.5rem' }}>Clear Active Filters</button>
                    </div>
                )}
            </div>

            {/* Visitor Activity Log */}
            <LogTable
                title="Visitor Logs"
                data={filteredLog}
                columns={logColumns}
                period={
                    filters.fromDate && filters.toDate ? `${filters.fromDate} to ${filters.toDate}` :
                    filters.fromDate ? `From ${filters.fromDate}` :
                    filters.toDate ? `Up to ${filters.toDate}` : 'Live Feed'
                }
            />
        </div>
    );
};

export default VisitorManagementView;
