import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PDFExportService } from '../utils/pdfExport';
import {
    Users, Car, Download, XCircle, Loader2 as Loader,
    Clock, CheckCircle, TrendingUp, PieChart as PieIcon, BarChart3
} from 'lucide-react';
import { logAudit } from '../lib/audit';

import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, Title,
    Tooltip as ChartTooltip, Legend as ChartLegend,
    ArcElement, Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, ArcElement,
    Title, ChartTooltip, ChartLegend, Filler
);

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = [
    'rgba(59,130,246,0.85)',   // blue
    'rgba(16,185,129,0.85)',   // green
    'rgba(245,158,11,0.85)',   // amber
    'rgba(239,68,68,0.85)',    // red
    'rgba(139,92,246,0.85)',   // purple
    'rgba(236,72,153,0.85)',   // pink
    'rgba(20,184,166,0.85)',   // teal
    'rgba(251,146,60,0.85)',   // orange
];

// ─── Shared chart config ──────────────────────────────────────────────────────
const baseOptions = (isDark) => ({
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: isDark ? '#94a3b8' : '#475569',
                font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 }
            }
        },
        tooltip: { titleFont: { family: 'Plus Jakarta Sans' }, bodyFont: { family: 'Plus Jakarta Sans' } }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#64748b' }
        },
        y: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#94a3b8' : '#64748b' }
        }
    }
});

const pieOptions = (isDark) => ({
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right',
            labels: {
                color: isDark ? '#94a3b8' : '#475569',
                font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 },
                padding: 16
            }
        },
        tooltip: { titleFont: { family: 'Plus Jakarta Sans' }, bodyFont: { family: 'Plus Jakarta Sans' } }
    }
});

// ─── Period helpers ───────────────────────────────────────────────────────────
const getPeriodFilter = (period) => {
    const now = new Date();
    const start = new Date();
    if (period === 'Today') { start.setHours(0, 0, 0, 0); }
    else if (period === 'Weekly') { start.setDate(now.getDate() - 6); start.setHours(0,0,0,0); }
    else if (period === 'Monthly') { start.setDate(now.getDate() - 29); start.setHours(0,0,0,0); }
    else { start.setMonth(now.getMonth() - 3); start.setHours(0,0,0,0); }
    return start;
};

const getDayLabels = (period) => {
    const now = new Date();
    if (period === 'Today') {
        return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
    }
    const days = period === 'Weekly' ? 7 : period === 'Monthly' ? 30 : 91;
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(now.getDate() - (days - 1 - i)); d.setHours(0,0,0,0);
        return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
};

const getBucketIndex = (dateStr, period) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (period === 'Today') return d.getHours();
    const days = period === 'Weekly' ? 7 : period === 'Monthly' ? 30 : 91;
    const start = new Date(); start.setDate(now.getDate() - (days - 1)); start.setHours(0,0,0,0);
    const diff = Math.floor((d - start) / 86400000);
    return Math.min(Math.max(diff, 0), days - 1);
};

// ─── Period options (module scope — used in export helpers & JSX) ───────────────
 const PERIODS = [
    { value: 'Today', label: 'Today' },
    { value: 'Weekly', label: 'Last 7 Days' },
    { value: 'Monthly', label: 'Last 30 Days' },
    { value: '3Months', label: 'Last 3 Months' }
];

// ─── Chart Card wrapper ───────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, icon: Icon, color, onExport }) => (
    <div className="card animate-fade-in" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {Icon && (
                    <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: `${color}20`, flexShrink: 0 }}>
                        <Icon size={18} color={color} />
                    </div>
                )}
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{title}</h3>
                    {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 500 }}>{subtitle}</p>}
                </div>
            </div>
            {onExport && (
                <button
                    onClick={onExport}
                    title="Download PDF Report"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
                        backgroundColor: 'var(--glass-bg)', color: 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                        whiteSpace: 'nowrap', flexShrink: 0
                    }}
                >
                    <Download size={13} /> PDF
                </button>
            )}
        </div>
        {children}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ReportsView = ({ user }) => {
    const [activeTab, setActiveTab] = useState('Visitors');
    const [period, setPeriod] = useState('Weekly');
    const [loading, setLoading] = useState(true);
    const [isDark, setIsDark] = useState(document.documentElement.getAttribute('data-theme') !== 'light');

    const [visitors, setVisitors] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [meetings, setMeetings] = useState([]);

    // Watch theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        const start = getPeriodFilter(period);
        const ISOFilter = start.toISOString();
        const dateFilter = ISOFilter.split('T')[0];
        try {
            const [vRes, vhRes, mRes] = await Promise.all([
                supabase.from('visitors')
                    .select('id, name, type, entry_time, exit_time, status, validation_method, is_pre_registered, source_tag, purpose')
                    .gte('entry_time', ISOFilter),
                supabase.from('vehicle_entries')
                    .select('id, vehicle_type, is_sbu_vehicle, entry_time, exit_time, vehicle_number, driver_name, purpose')
                    .gte('entry_time', ISOFilter),
                supabase.from('scheduled_meetings')
                    .select('id, visitor_name, meeting_date, start_time, status, visitor_category, request_source')
                    .gte('meeting_date', dateFilter)
            ]);
            setVisitors(vRes.data || []);
            setVehicles(vhRes.data || []);
            setMeetings(mRes.data || []);
        } catch (err) {
            console.error('ReportsView fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Access control
    const allowedRoles = ['Admin', 'Security HOD', 'School Management'];
    if (!allowedRoles.includes(user?.role)) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
                <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <XCircle size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Your current security clearance does not permit access to advanced analytics.</p>
                </div>
            </div>
        );
    }

    // ── PDF Export helpers ──────────────────────────────────────────────────────
    const periodLabel = PERIODS.find(p => p.value === period)?.label || period;
    const periodShort = period;

    const exportChart = async (title, columns, rows, filename) => {
        await new PDFExportService(title)
            .withMetadata({ 
                generatedBy: 'Security Operations',
                period: periodLabel
            })
            .addTable(columns, rows)
            .export(filename);
        logAudit('Export Chart Report', null, null, user?.email, { title, range: period });
    };

    // Breakdown helper: counts → rows with % column
    const breakdownRows = (labels, counts) => {
        const total = counts.reduce((a, b) => a + b, 0);
        return labels.map((l, i) => ({
            category: l,
            count: counts[i],
            percentage: total ? `${Math.round((counts[i] / total) * 100)}%` : '0%'
        }));
    };

    const breakdownCols = [
        { header: 'Category', key: 'category' },
        { header: 'Count', key: 'count' },
        { header: 'Percentage', key: 'percentage' }
    ];

    // 1. Export: Visitor Categorization
    const exportVisitorCategorization = () => {
        const counts = { 'Parent': 0, 'Lyceum': 0, 'Other': 0 };
        visitors.forEach(v => {
            const t = v.type || '';
            if (t === 'Parents' || t === 'Parent') counts['Parent']++;
            else if (t === 'Lyceum') counts['Lyceum']++;
            else counts['Other']++;
        });
        const rows = breakdownRows(Object.keys(counts), Object.values(counts));
        exportChart(`Visitor Categorization — ${periodLabel}`, breakdownCols, rows,
            `visitor_categorization_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // 2. Export: Meeting Scheduling Method
    const exportSchedulingMethod = () => {
        const { datasets } = getSchedulingMethodData();
        const rows = breakdownRows(['On-Arrival', 'Via System', 'Via Web Page'], datasets[0].data);
        exportChart(`Meeting Scheduling Method — ${periodLabel}`, breakdownCols, rows,
            `scheduling_method_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // 3. Export: On-Time Arrival detail
    const exportOnTimeArrival = () => {
        const preReg = visitors.filter(v => v.is_pre_registered && v.entry_time);
        const rows = preReg.map(v => {
            const match = meetings.find(m =>
                m.visitor_name && v.name &&
                m.visitor_name.trim().toLowerCase() === v.name.trim().toLowerCase()
            );
            let status = 'No schedule found';
            let scheduledTime = '-';
            if (match?.start_time) {
                scheduledTime = match.start_time.slice(0, 5);
                try {
                    const [h, min] = match.start_time.split(':').map(Number);
                    const sched = new Date(match.meeting_date);
                    sched.setHours(h, min, 0, 0);
                    const diffMin = (new Date(v.entry_time) - sched) / 60000;
                    status = diffMin <= 15 ? 'On Time' : `Delayed (+${Math.round(diffMin)} min)`;
                } catch { status = 'On Time'; }
            }
            return {
                name: v.name,
                scheduled_time: scheduledTime,
                arrival_time: new Date(v.entry_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                date: new Date(v.entry_time).toLocaleDateString('en-GB'),
                status
            };
        });
        const cols = [
            { header: 'Visitor Name', key: 'name' },
            { header: 'Date', key: 'date' },
            { header: 'Scheduled Time', key: 'scheduled_time' },
            { header: 'Arrival Time', key: 'arrival_time' },
            { header: 'Status', key: 'status' }
        ];
        exportChart(`On-Time Arrival Report — ${periodLabel}`, cols, rows,
            `ontime_arrival_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // 4. Export: Visitors over time
    const exportVisitorCount = () => {
        const labels = getDayLabels(period);
        const buckets = new Array(labels.length).fill(0);
        visitors.forEach(v => {
            if (v.entry_time) {
                const idx = getBucketIndex(v.entry_time, period);
                if (idx >= 0 && idx < buckets.length) buckets[idx]++;
            }
        });
        const rows = labels.map((l, i) => ({ period: l, count: buckets[i] }));
        const cols = [
            { header: period === 'Today' ? 'Hour' : 'Date', key: 'period' },
            { header: 'Visitor Count', key: 'count' }
        ];
        exportChart(`Visitor Count Over Time — ${periodLabel}`, cols, rows,
            `visitor_count_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // 5. Export: Vehicle Categorization
    const exportVehicleCategorization = () => {
        const counts = {};
        vehicles.forEach(v => { const t = v.vehicle_type || 'Unknown'; counts[t] = (counts[t] || 0) + 1; });
        const rows = breakdownRows(Object.keys(counts), Object.values(counts));
        exportChart(`Vehicle Categorization — ${periodLabel}`, breakdownCols, rows,
            `vehicle_categorization_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // 6. Export: SBU vs Non-SBU
    const exportSBU = () => {
        const sbu = vehicles.filter(v => v.is_sbu_vehicle).length;
        const nonSbu = vehicles.length - sbu;
        const rows = breakdownRows(['SBU Vehicle', 'Non-SBU Vehicle'], [sbu, nonSbu]);
        exportChart(`SBU Vehicle Report — ${periodLabel}`, breakdownCols, rows,
            `sbu_vehicles_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // 7. Export: Vehicles per day
    const exportVehicleCount = () => {
        const labels = getDayLabels(period);
        const buckets = new Array(labels.length).fill(0);
        vehicles.forEach(v => {
            if (v.entry_time) {
                const idx = getBucketIndex(v.entry_time, period);
                if (idx >= 0 && idx < buckets.length) buckets[idx]++;
            }
        });
        const rows = labels.map((l, i) => ({ period: l, count: buckets[i] }));
        const cols = [
            { header: period === 'Today' ? 'Hour' : 'Date', key: 'period' },
            { header: 'Vehicle Count', key: 'count' }
        ];
        exportChart(`Vehicle Count Per Day — ${periodLabel}`, cols, rows,
            `vehicle_count_${periodShort}_${new Date().toISOString().split('T')[0]}`);
    };

    // ── Visitor chart data ─────────────────────────────────────────────────────

    // 1. Visitor categorization — grouped into Parent / Lyceum / Other
    const getVisitorCategorizationData = () => {
        const counts = { 'Parent': 0, 'Lyceum': 0, 'Other': 0 };
        visitors.forEach(v => {
            const t = v.type || '';
            if (t === 'Parents' || t === 'Parent') counts['Parent']++;
            else if (t === 'Lyceum') counts['Lyceum']++;
            else counts['Other']++;
        });
        const labels = Object.keys(counts);
        return {
            labels,
            datasets: [{
                data: labels.map(l => counts[l]),
                backgroundColor: [COLORS[0], COLORS[1], COLORS[2]],
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]
        };
    };

    // 2. Meeting Scheduling Method — sourced from scheduled_meetings table
    // On Arrival (Kiosk)       = visitor_category === 'On-arrival' (walk-in, Telegram approval required)
    // Pre-Scheduled via System = created through internal Scheduled Meetings module
    // Via Web Page             = request_source === 'webpage'
    const getSchedulingMethodData = () => {
        const kiosk     = meetings.filter(m => m.visitor_category === 'On-arrival').length;
        const webPage   = meetings.filter(m => m.request_source === 'webpage').length;
        const system    = meetings.filter(m => m.visitor_category !== 'On-arrival' && m.request_source !== 'webpage').length;
        return {
            labels: ['On-Arrival', 'Via System', 'Via Web Page'],
            datasets: [{
                data: [kiosk, system, webPage],
                backgroundColor: [COLORS[0], COLORS[1], COLORS[3]],
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]
        };
    };

    // 3. On-time vs delayed arrival (pre-registered only, 15-min grace)
    const getOnTimeData = () => {
        let onTime = 0, delayed = 0;
        const preReg = visitors.filter(v => v.is_pre_registered && v.entry_time);

        preReg.forEach(v => {
            // Find matching meeting
            const match = meetings.find(m =>
                m.visitor_name && v.name &&
                m.visitor_name.trim().toLowerCase() === v.name.trim().toLowerCase()
            );
            if (!match || !match.start_time) { onTime++; return; }

            try {
                const [h, min] = match.start_time.split(':').map(Number);
                const scheduledDate = new Date(match.meeting_date);
                scheduledDate.setHours(h, min, 0, 0);
                const arrival = new Date(v.entry_time);
                const diffMin = (arrival - scheduledDate) / 60000;
                if (diffMin <= 15) { onTime++; } else { delayed++; }
            } catch { onTime++; }
        });

        return {
            labels: ['On Time (≤15 min)', 'Delayed (>15 min)'],
            datasets: [{
                data: [onTime, delayed],
                backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)'],
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]
        };
    };

    // 4. No. of visitors over time
    const getVisitorCountData = () => {
        const labels = getDayLabels(period);
        const buckets = new Array(labels.length).fill(0);
        visitors.forEach(v => {
            if (v.entry_time) {
                const idx = getBucketIndex(v.entry_time, period);
                if (idx >= 0 && idx < buckets.length) buckets[idx]++;
            }
        });
        return {
            labels,
            datasets: [{
                label: 'Visitors',
                data: buckets,
                borderColor: 'rgba(59,130,246,1)',
                backgroundColor: 'rgba(59,130,246,0.15)',
                fill: true,
                tension: 0.4,
                pointRadius: labels.length > 20 ? 0 : 4,
                pointBackgroundColor: 'rgba(59,130,246,1)'
            }]
        };
    };

    // ── Vehicle chart data ─────────────────────────────────────────────────────

    // 1. Vehicle categorization
    const getVehicleCategorizationData = () => {
        const counts = {};
        vehicles.forEach(v => { const t = v.vehicle_type || 'Unknown'; counts[t] = (counts[t] || 0) + 1; });
        const labels = Object.keys(counts);
        return {
            labels,
            datasets: [{
                data: labels.map(l => counts[l]),
                backgroundColor: COLORS.slice(0, labels.length),
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]
        };
    };

    // 2. Vehicles per day
    const getVehicleCountData = () => {
        const labels = getDayLabels(period);
        const buckets = new Array(labels.length).fill(0);
        vehicles.forEach(v => {
            if (v.entry_time) {
                const idx = getBucketIndex(v.entry_time, period);
                if (idx >= 0 && idx < buckets.length) buckets[idx]++;
            }
        });
        return {
            labels,
            datasets: [{
                label: 'Vehicles',
                data: buckets,
                backgroundColor: 'rgba(16,185,129,0.75)',
                borderColor: 'rgba(16,185,129,1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        };
    };

    // 3. SBU vs Non-SBU
    const getSBUData = () => {
        const sbu = vehicles.filter(v => v.is_sbu_vehicle).length;
        const nonSbu = vehicles.length - sbu;
        return {
            labels: ['SBU Vehicle', 'Non-SBU Vehicle'],
            datasets: [{
                data: [sbu, nonSbu],
                backgroundColor: ['rgba(139,92,246,0.85)', 'rgba(100,116,139,0.7)'],
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]
        };
    };

    // ── Shared options ─────────────────────────────────────────────────────────
    const lineOpts = { ...baseOptions(isDark), plugins: { ...baseOptions(isDark).plugins } };
    const barOpts  = { ...baseOptions(isDark) };
    const pOpts    = pieOptions(isDark);

    const TABS = ['Visitors', 'Vehicles'];

    return (
        <div className="animate-fade-in" style={{ padding: '1rem 0' }}>

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                            Reports &amp; Statistics
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Advanced security analytics &amp; operational reporting.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Period selector */}
                        <div style={{ display: 'flex', gap: '0.375rem', padding: '0.3rem', backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px' }}>
                            {PERIODS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                        backgroundColor: period === p.value ? 'var(--primary)' : 'transparent',
                                        color: period === p.value ? '#fff' : 'var(--text-muted)',
                                        transition: 'var(--transition)',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Export button */}
                        <button
                            className="btn-primary"
                            onClick={async () => {
                                // 1. Visitor Categorization
                                const tCounts = { 'Parent': 0, 'Lyceum': 0, 'Other': 0 };
                                visitors.forEach(v => { const t = v.type || ''; if (t === 'Parents' || t === 'Parent') tCounts['Parent']++; else if (t === 'Lyceum') tCounts['Lyceum']++; else tCounts['Other']++; });
                                const vCatRows = breakdownRows(Object.keys(tCounts), Object.values(tCounts));

                                // 2. Scheduling Methods
                                const kiosk  = meetings.filter(m => m.visitor_category === 'On-arrival').length;
                                const webPage = meetings.filter(m => m.request_source === 'webpage').length;
                                const system  = meetings.filter(m => m.visitor_category !== 'On-arrival' && m.request_source !== 'webpage').length;
                                const sMetRows = breakdownRows(['On Arrival (Kiosk)', 'Pre-Scheduled via System', 'Via Web Page'], [kiosk, system, webPage]);

                                // 3. On-time Arrival
                                const onTimeRows = visitors.filter(v => v.is_pre_registered && v.entry_time).map(v => {
                                    const match = meetings.find(m => m.visitor_name && v.name && m.visitor_name.trim().toLowerCase() === v.name.trim().toLowerCase());
                                    let status = 'No schedule found'; let scheduledTime = '-';
                                    if (match?.start_time) {
                                        scheduledTime = match.start_time.slice(0, 5);
                                        try {
                                            const [h, min] = match.start_time.split(':').map(Number);
                                            const sched = new Date(match.meeting_date); sched.setHours(h, min, 0, 0);
                                            const diffMin = (new Date(v.entry_time) - sched) / 60000;
                                            status = diffMin <= 15 ? 'On Time' : `Delayed (+${Math.round(diffMin)} min)`;
                                        } catch { status = 'On Time'; }
                                    }
                                    return { name: v.name, scheduled_time: scheduledTime, arrival_time: new Date(v.entry_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), date: new Date(v.entry_time).toLocaleDateString('en-GB'), status };
                                });

                                // 4. Visitors over time
                                const vLabels = getDayLabels(period); const vBuckets = new Array(vLabels.length).fill(0);
                                visitors.forEach(v => { if (v.entry_time) { const idx = getBucketIndex(v.entry_time, period); if (idx >= 0 && idx < vBuckets.length) vBuckets[idx]++; } });
                                const vTimeRows = vLabels.map((l, i) => ({ period: l, count: vBuckets[i] }));

                                // 5. Vehicle Categorization
                                const vhCounts = {}; vehicles.forEach(v => { const t = v.vehicle_type || 'Unknown'; vhCounts[t] = (vhCounts[t] || 0) + 1; });
                                const vhCatRows = breakdownRows(Object.keys(vhCounts), Object.values(vhCounts));

                                // 6. SBU vs Non-SBU
                                const sbu = vehicles.filter(v => v.is_sbu_vehicle).length; const nonSbu = vehicles.length - sbu;
                                const sbuRows = breakdownRows(['SBU Vehicle', 'Non-SBU Vehicle'], [sbu, nonSbu]);

                                // 7. Vehicles over time
                                const vhLabels = getDayLabels(period); const vhBuckets = new Array(vhLabels.length).fill(0);
                                vehicles.forEach(v => { if (v.entry_time) { const idx = getBucketIndex(v.entry_time, period); if (idx >= 0 && idx < vhBuckets.length) vhBuckets[idx]++; } });
                                const vhTimeRows = vhLabels.map((l, i) => ({ period: l, count: vhBuckets[i] }));

                                // 8. Generate Final Comprehensive Report
                                await new PDFExportService(`Overall Report — ${periodLabel}`)
                                    .withMetadata({ 
                                        generatedBy: 'Security Operations',
                                        period: periodLabel
                                    })
                                    .addTable(breakdownCols, vCatRows, 'Visitor Categorization Breakdown')
                                    .addTable(breakdownCols, sMetRows, 'Meeting Scheduling Methods')
                                    .addTable([
                                        { header: 'Visitor Name', key: 'name' },
                                        { header: 'Date', key: 'date' },
                                        { header: 'Scheduled Time', key: 'scheduled_time' },
                                        { header: 'Arrival Time', key: 'arrival_time' },
                                        { header: 'Status', key: 'status' }
                                    ], onTimeRows, 'On-Time Arrival History')
                                    .addTable([{ header: period === 'Today' ? 'Hour' : 'Date', key: 'period' }, { header: 'Visitor Count', key: 'count' }], vTimeRows, 'Visitor Flow Over Time')
                                    .addTable(breakdownCols, vhCatRows, 'Vehicle Categorization Breakdown')
                                    .addTable(breakdownCols, sbuRows, 'SBU vs Non-SBU Vehicles')
                                    .addTable([{ header: period === 'Today' ? 'Hour' : 'Date', key: 'period' }, { header: 'Vehicle Count', key: 'count' }], vhTimeRows, 'Vehicle Traffic Over Time')
                                    .export(`OVERALL_REPORT_${periodShort}_${new Date().toISOString().split('T')[0]}`);

                                logAudit('Export Overall Report', null, null, user?.email, { range: period });
                            }}
                            style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Download size={16} /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Tab Bar */}
                <div style={{ display: 'flex', gap: '0.375rem', padding: '0.3rem', backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', width: 'fit-content' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.6rem 1.5rem',
                                borderRadius: '12px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                backgroundColor: activeTab === tab ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                                transition: 'var(--transition)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            {tab === 'Visitors' ? <Users size={15} /> : <Car size={15} />}
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ───────────────────────────────────────────────────── */}
            <div style={{ padding: '0 1.5rem', position: 'relative', minHeight: '400px' }}>

                {/* Loading overlay */}
                {loading && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px' }}>
                        <Loader className="animate-spin" size={36} color="var(--primary)" />
                    </div>
                )}

                {/* ── Visitors Tab ───────────────────────────────────────────── */}
                {activeTab === 'Visitors' && !loading && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>

                        {/* Summary row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                            {[
                                { label: 'Total Visitors', value: visitors.length, color: '#2563eb', icon: Users },
                                { label: 'Pre-Scheduled', value: visitors.filter(v => v.is_pre_registered).length, color: '#3b82f6', icon: CheckCircle },
                                { label: 'Via Web Page', value: visitors.filter(v => v.source_tag === 'pre-scheduled-via web page').length, color: '#8b5cf6', icon: TrendingUp },
                                { label: 'Currently Inside', value: visitors.filter(v => !v.exit_time).length, color: '#f59e0b', icon: Clock }
                            ].map(kpi => (
                                <div key={kpi.label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: `${kpi.color}20` }}>
                                        <kpi.icon size={20} color={kpi.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>{kpi.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kpi.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts row 1: 2 cols */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

                            {/* 1. Visitor categorization */}
                            <ChartCard title="Visitor Categorization" subtitle="Breakdown by visitor type" icon={PieIcon} color="#2563eb" onExport={exportVisitorCategorization}>
                                <div style={{ height: '280px' }}>
                                    <Pie data={getVisitorCategorizationData()} options={pOpts} />
                                </div>
                            </ChartCard>

                            {/* 2. Scheduling method */}
                            <ChartCard title="Meeting Scheduling Method" subtitle="How visitors were registered" icon={BarChart3} color="#8b5cf6" onExport={exportSchedulingMethod}>
                                <div style={{ height: '280px' }}>
                                    <Doughnut data={getSchedulingMethodData()} options={pOpts} />
                                </div>
                            </ChartCard>
                        </div>

                        {/* Charts row 2: 2 cols */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

                            {/* 3. On-time arrival */}
                            <ChartCard
                                title="On-Time Arrival Rate"
                                subtitle={
                                    <span>Pre-scheduled visitors only · <strong style={{ color: '#f59e0b' }}>Standard: arrivals delayed &gt;15 min after scheduled time are marked as late</strong></span>
                                }
                                icon={Clock}
                                color="#2563eb"
                                onExport={exportOnTimeArrival}
                            >
                                <div style={{ height: '260px' }}>
                                    <Doughnut data={getOnTimeData()} options={pOpts} />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                                    ⏱ Delay threshold: &gt;15 minutes after the scheduled meeting start time is considered late.
                                </p>
                            </ChartCard>

                            {/* 4. No. of visitors over time */}
                            <ChartCard title="No. of Visitors Over Time" subtitle={`Visitor arrivals — ${PERIODS.find(p => p.value === period)?.label}`} icon={TrendingUp} color="#2563eb" onExport={exportVisitorCount}>
                                <div style={{ height: '280px' }}>
                                    <Line data={getVisitorCountData()} options={lineOpts} />
                                </div>
                            </ChartCard>
                        </div>
                    </div>
                )}

                {/* ── Vehicles Tab ───────────────────────────────────────────── */}
                {activeTab === 'Vehicles' && !loading && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>

                        {/* Summary row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                            {[
                                { label: 'Total Vehicles', value: vehicles.length, color: '#10b981', icon: Car },
                                { label: 'SBU Vehicles', value: vehicles.filter(v => v.is_sbu_vehicle).length, color: '#8b5cf6', icon: CheckCircle },
                                { label: 'Non-SBU', value: vehicles.filter(v => !v.is_sbu_vehicle).length, color: '#f59e0b', icon: BarChart3 },
                                { label: 'Currently Inside', value: vehicles.filter(v => !v.exit_time).length, color: '#2563eb', icon: Clock }
                            ].map(kpi => (
                                <div key={kpi.label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: `${kpi.color}20` }}>
                                        <kpi.icon size={20} color={kpi.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>{kpi.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kpi.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts row 1 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

                            {/* 1. Vehicle categorization */}
                            <ChartCard title="Vehicle Categorization" subtitle="Breakdown by vehicle type" icon={PieIcon} color="#10b981" onExport={exportVehicleCategorization}>
                                <div style={{ height: '280px' }}>
                                    <Pie data={getVehicleCategorizationData()} options={pOpts} />
                                </div>
                            </ChartCard>

                            {/* 3. SBU vs Non-SBU */}
                            <ChartCard title="SBU vs Non-SBU Vehicles" subtitle="School Bus Unit vehicle distribution" icon={BarChart3} color="#8b5cf6" onExport={exportSBU}>
                                <div style={{ height: '280px' }}>
                                    <Doughnut data={getSBUData()} options={pOpts} />
                                </div>
                            </ChartCard>
                        </div>

                        {/* Charts row 2: full width */}
                        <ChartCard title="No. of Vehicles Per Day" subtitle={`Daily vehicle traffic — ${PERIODS.find(p => p.value === period)?.label}`} icon={TrendingUp} color="#10b981" onExport={exportVehicleCount}>
                            <div style={{ height: '300px' }}>
                                <Bar data={getVehicleCountData()} options={barOpts} />
                            </div>
                        </ChartCard>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsView;
