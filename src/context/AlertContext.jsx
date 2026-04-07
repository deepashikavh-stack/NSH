import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AlertService } from '../services/AlertService';
import { supabase } from '../lib/supabase';

/**
 * AlertContext — Thin React wrapper around AlertService.
 * 
 * All business logic (alert generation, overstay detection, etc.) is
 * delegated to AlertService. This context only manages React state
 * and the polling lifecycle.
 * 
 * Design: Separation of Concerns — React state management in the context,
 * domain logic in the service layer.
 */

const AlertContext = createContext();
const alertService = new AlertService();

 /* eslint-disable-next-line react-refresh/only-export-components */ export const useAlerts = () => useContext(AlertContext);

export const AlertProvider = ({ children, user }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchAlerts = useCallback(async () => {
        if (!user || !AlertService.canAccess(user.role)) {
            setAlerts([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        try {
            // Generate system alerts (idempotent — won't duplicate)
            // Note: DB Triggers handle new meeting requests immediately now.
            // This call still manages time-based alerts (overstays).
            await alertService.generateSystemAlerts();

            // Fetch all alerts
            const data = await alertService.fetchAll();
            setAlerts(data);
            setUnreadCount(data.filter(a => !a.is_read).length);
        } catch (err) {
            // Silently degrade — missing alerts table or any DB error
            // must NOT crash the app or blank other views
            console.warn('AlertContext: alerts unavailable:', err?.message || err);
            setAlerts([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = async (alertId) => {
        try {
            await alertService.markAsRead(alertId);
            fetchAlerts();
        } catch (err) {
            console.error('AlertContext: mark-as-read error:', err);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchAlerts();

        // Real-time subscription for instant dashboard updates
        const channel = supabase
            .channel('public:alerts')
            .on(
                'postgres_changes', 
                { event: '*', schema: 'public', table: 'alerts' }, 
                (payload) => {
                    console.log('AlertContext: Real-time alert change received:', payload.eventType);
                    fetchAlerts();
                }
            )
            .subscribe();

        // Fallback polling for time-based alerts (e.g., overstays)
        // Interval increased as triggers handle the most critical "new" events.
        const interval = setInterval(fetchAlerts, 60000); 

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [fetchAlerts]);

    return (
        <AlertContext.Provider value={{ alerts, unreadCount, markAsRead, fetchAlerts, loading }}>
            {children}
        </AlertContext.Provider>
    );
};
