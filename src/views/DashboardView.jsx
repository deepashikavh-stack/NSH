import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import { Users, Car, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DashboardView = () => {
    const [stats, setStats] = useState([
        { title: 'Total Visitors', value: '0', icon: Users, trend: 'neutral', trendValue: '0%', color: '#2563eb' },
        { title: 'Vehicles (Traffic)', value: '0', icon: Car, trend: 'neutral', trendValue: '0%', color: '#10b981' },
        { title: 'Pending Requests', value: '0', icon: Clock, trend: 'neutral', trendValue: '0%', color: '#8b5cf6' },
        { title: 'Scheduled', value: '0', icon: Calendar, trend: 'neutral', trendValue: '0%', color: '#f59e0b' },
    ]);

    const fetchDashboardStats = async () => {
        const localNow = new Date();
        const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;

        try {
            // 1. Fetch Today's Scheduled Count
            const { count: scheduledCount } = await supabase
                .from('scheduled_meetings')
                .select('*', { count: 'exact', head: true })
                .eq('meeting_date', today)
                .in('status', ['Scheduled', 'Confirmed', 'Approved']);

            // 2. Fetch Today's Visitor Stats
            const { data: visitorsData } = await supabase
                .from('visitors')
                .select('status, entry_time, validation_method')
                .filter('entry_time', 'gte', `${today}T00:00:00Z`);

            const checkedInToday = visitorsData?.filter(v => v.status === 'Checked-in').length || 0;
            // 3. Fetch Pending Requests
            const { count: pendingCount } = await supabase
                .from('scheduled_meetings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Pending');

            // 4. Fetch Today's Vehicle Traffic
            const { count: vehicleCount } = await supabase
                .from('vehicle_entries')
                .select('*', { count: 'exact', head: true })
                .filter('entry_time', 'gte', `${today}T00:00:00Z`);

            setStats(prev => {
                const newStats = [...prev];
                newStats[0].value = checkedInToday.toString();
                newStats[1].value = (vehicleCount || 0).toString();
                newStats[2].value = (pendingCount || 0).toString();
                newStats[3].value = (scheduledCount || 0).toString();
                return newStats;
            });
        } catch (err) {
            console.error("Error fetching dashboard stats:", err);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDashboardStats();
        const interval = setInterval(fetchDashboardStats, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Operations Overview</h2>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>High-level system health and traffic intelligence.</p>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Optional: Placeholder for future dashboard widgets or charts if needed */}
            <div style={{ marginTop: '3rem', textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analytical widgets and trends can be added here.</p>
            </div>
        </div>
    );
};

export default DashboardView;
