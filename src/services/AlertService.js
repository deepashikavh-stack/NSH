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
    static ALERT_ROLES = ['Admin', 'Security Officer', 'Security HOD', 'School Operations', 'School Management'];

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
     * Delegates detection logic to specific sub-generators.
     * @returns {Promise<void>}
     */
    async generateSystemAlerts() {
        const todayStr = new Date().toLocaleDateString('en-CA');

        try {
            // Run all alert generation logic in parallel
            await Promise.all([
                this._generateVisitorAlerts(todayStr),
                this._generateVehicleAlerts(todayStr),
                this._generateMeetingAlerts(),
                this._generateMeetingApprovalAlerts(),
                this._generateMeetingApprovedAlerts(),
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

    /**
     * Reconcile pending meeting requests.
     * NOTE: Primary generation is now handled by the database trigger (tr_on_meeting_requested).
     * This method acts as a safety fallback to catch any requests that failed to trigger.
     */
    async _generateMeetingApprovalAlerts() {
        const { data: pending } = await this.client
            .from('scheduled_meetings')
            .select('id, visitor_name, purpose, meeting_date')
            .or('status.eq.Pending,status.eq.Meeting Requested');

        if (!pending || pending.length === 0) return;

        for (const m of pending) {
            const exists = await this._alertExistsBySourceAndCategory(m.id, 'Pending Approval');
            if (!exists) {
                await this.create({
                    type: 'Meeting',
                    category: 'Pending Approval',
                    severity: 'info',
                    source_id: m.id,
                    title: 'New Meeting Request',
                    message: `Initial request from ${m.visitor_name} requires review.`,
                    details: {
                        visitor: m.visitor_name,
                        purpose: m.purpose,
                        date: m.meeting_date,
                        reconciled: true // Flag to indicate backup generation
                    }
                });
            }
        }
    }

    /**
     * Generate alerts for newly approved meetings.
     * NOTE: This can also be moved to a database trigger in the future.
     */
    async _generateMeetingApprovedAlerts() {
        const todayStr = new Date().toLocaleDateString('en-CA');

        const { data: approved } = await this.client
            .from('scheduled_meetings')
            .select('id, visitor_name, meeting_with, start_time, end_time, meeting_date')
            .eq('status', 'Approved')
            .gte('created_at', todayStr);

        if (!approved || approved.length === 0) return;

        for (const m of approved) {
            const exists = await this._alertExistsBySourceAndCategory(m.id, 'Meeting Approved');
            if (!exists) {
                await this.create({
                    type: 'Meeting',
                    category: 'Meeting Approved',
                    severity: 'success',
                    source_id: m.id,
                    title: 'Meeting Approved',
                    message: `Appointment for ${m.visitor_name} has been finalized.`,
                    details: {
                        visitor: m.visitor_name,
                        with: m.meeting_with,
                        time: `${m.start_time} - ${m.end_time}`,
                        date: m.meeting_date,
                    }
                });
            }
        }
    }
}
