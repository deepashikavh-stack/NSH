import { BaseService } from './BaseService';
import { VisitorService } from './VisitorService';
import { VehicleService } from './VehicleService';
import { MeetingService } from './MeetingService';

/**
 * AlertService — Manages alert generation, retrieval, and lifecycle.
 * 
 * Extracts all business logic previously in AlertContext.jsx.
 * Uses composition with VisitorService, VehicleService, and MeetingService
 * to detect alert-worthy conditions (overstays, missing logouts, etc.).
 * 
 * Design Pattern: Facade — Orchestrates multiple domain services
 *   to produce unified alert output.
 */
export class AlertService extends BaseService {
    /** Roles allowed to view/manage alerts */
    static ALERT_ROLES = ['Security Officer', 'Security HOD'];

    constructor() {
        super('alerts');
        this.visitorService = new VisitorService();
        this.vehicleService = new VehicleService();
        this.meetingService = new MeetingService();
    }

    /**
     * Check if a user role is authorized to access alerts.
     * @param {string} role
     * @returns {boolean}
     */
    static canAccess(role) {
        return AlertService.ALERT_ROLES.includes(role);
    }

    /**
     * Generate all system alerts by checking for anomalies.
     * Delegates detection to domain services and creates alert records.
     * @returns {Promise<void>}
     */
    async generateSystemAlerts() {
        const todayStr = new Date().toISOString().split('T')[0];

        try {
            await Promise.all([
                this._generateVisitorAlerts(todayStr),
                this._generateVehicleAlerts(todayStr),
                this._generateMeetingAlerts(),
            ]);
        } catch (err) {
            if (err.message?.includes('alerts')) {
                console.warn('AlertService: alerts table is missing. Run supabase_alerts_setup.sql to enable.');
            } else {
                console.error('AlertService: generation error:', err);
            }
        }
    }

    /**
     * Fetch all alerts, ordered by newest first.
     * @returns {Promise<Array>}
     */
    async fetchAll() {
        return this.findAll({
            select: 'id, type, category, severity, source_id, title, message, details, is_read, created_at',
            order: { column: 'created_at', ascending: false },
        });
    }

    /**
     * Mark an alert as read.
     * @param {string} alertId
     * @returns {Promise<void>}
     */
    async markAsRead(alertId) {
        await this.update(alertId, { is_read: true });
    }

    /**
     * Get unread alert count.
     * @returns {Promise<number>}
     */
    async getUnreadCount() {
        const alerts = await this.fetchAll();
        return alerts.filter((a) => !a.is_read).length;
    }

    // ─── Private Alert Generators ────────────────────────────────────────────

    /**
     * Generate missing-logout alerts for visitors who stayed > 4 hours
     * or are still present after 6 PM.
     */
    async _generateVisitorAlerts(todayStr) {
        const now = new Date();
        const isAfter6PM = now.getHours() >= 18;
        const overstayed = await this.visitorService.findOverstayedVisitors(4);

        // Include visitors after 6 PM even if under 4 hours
        let allFlagged = overstayed;
        if (isAfter6PM) {
            const active = await this.visitorService.getActiveVisitors();
            const activeIds = new Set(overstayed.map((v) => v.id));
            const additional = active.filter((v) => !activeIds.has(v.id));
            allFlagged = [...overstayed, ...additional.map((v) => ({ ...v, hoursStayed: 0 }))];
        }

        for (const v of allFlagged) {
            const exists = await this._alertExists(v.id, 'Missing Logout', todayStr);
            if (!exists) {
                await this.create({
                    type: 'Visitor',
                    category: 'Missing Logout',
                    severity: v.hoursStayed > 6 ? 'critical' : 'warning',
                    source_id: v.id,
                    title: 'Missing Logout Alert',
                    message: 'Visitor has not logged out from the premises.',
                    details: {
                        name: v.name,
                        category: v.category,
                        nic: v.nic_passport,
                        entry_time: v.entry_time,
                        stay_duration: Math.round(v.hoursStayed),
                    },
                });
            }
        }
    }

    /**
     * Generate missing-logout alerts for vehicles on premises > 4 hours.
     */
    async _generateVehicleAlerts(todayStr) {
        const overstayed = await this.vehicleService.findOverstayedVehicles(4);

        for (const v of overstayed) {
            const exists = await this._alertExists(v.id, 'Missing Logout', todayStr);
            if (!exists) {
                await this.create({
                    type: 'Vehicle',
                    category: 'Missing Logout',
                    severity: 'warning',
                    source_id: v.id,
                    title: 'Missing Logout Alert',
                    message: 'Vehicle has not logged out from the premises.',
                    details: {
                        vehicle_number: v.vehicle_number,
                        entry_time: v.entry_time,
                        stay_duration: Math.round(v.hoursStayed),
                    },
                });
            }
        }
    }

    /**
     * Generate overstay alerts for meetings past their end time.
     */
    async _generateMeetingAlerts() {
        const overdue = await this.meetingService.findOverdueMeetings();

        for (const m of overdue) {
            const exists = await this._alertExistsBySourceAndCategory(m.id, 'Overstay');
            if (!exists) {
                await this.create({
                    type: 'Meeting',
                    category: 'Overstay',
                    severity: 'warning',
                    source_id: m.id,
                    title: 'Overstay Alert',
                    message: 'Visitor has exceeded the scheduled meeting duration.',
                    details: {
                        name: m.visitor_name,
                        meeting_with: m.meeting_with,
                        purpose: m.purpose,
                        end_time: m.end_time,
                        date: m.meeting_date,
                    },
                });
            }
        }
    }

    /**
     * Check if an alert already exists for a source today.
     */
    async _alertExists(sourceId, category, todayStr) {
        const results = await this.query((qb) =>
            qb.select('id')
                .eq('source_id', sourceId)
                .eq('category', category)
                .gt('created_at', todayStr)
                .maybeSingle()
        );
        return !!results;
    }

    /**
     * Check if an alert exists for a source and category (any date).
     */
    async _alertExistsBySourceAndCategory(sourceId, category) {
        const results = await this.query((qb) =>
            qb.select('id')
                .eq('source_id', sourceId)
                .eq('category', category)
                .maybeSingle()
        );
        return !!results;
    }
}
