import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AlertService } from '../services/AlertService';

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

export const useAlerts = () => useContext(AlertContext);

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
            await alertService.generateSystemAlerts();

            // Fetch all alerts
            const data = await alertService.fetchAll();
            setAlerts(data);
            setUnreadCount(data.filter(a => !a.is_read).length);
        } catch (err) {
            if (err.message?.includes('alerts')) {
                console.warn('AlertContext: alerts table missing. Run supabase_alerts_setup.sql.');
                setAlerts([]);
                setUnreadCount(0);
            } else {
                console.error('AlertContext: fetch error:', err);
            }
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
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000 * 5); // Poll every 5 minutes
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    return (
        <AlertContext.Provider value={{ alerts, unreadCount, markAsRead, fetchAlerts, loading }}>
            {children}
        </AlertContext.Provider>
    );
};
