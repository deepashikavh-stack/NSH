import { BaseService } from './BaseService';

/**
 * VisitorService — Manages visitor lifecycle operations.
 * 
 * Encapsulates all visitor-related business logic:
 *  - Check-in (walk-in, pre-registered, kiosk)
 *  - Check-out
 *  - Visitor search & filtering
 *  - Duration tracking and overstay detection
 */
export class VisitorService extends BaseService {
    constructor() {
        super('visitors');
    }

    /**
     * Fetch all active visitors (checked in but not yet checked out).
     * @returns {Promise<Array>}
     */
    async getActiveVisitors() {
        return this.query((qb) =>
            qb.select('id, name, nic_passport, entry_time, exit_time, status, type, purpose, meeting_with')
                .is('exit_time', null)
                .order('entry_time', { ascending: false })
        );
    }

    /**
     * Check in a visitor — insert a new visitor record.
     * @param {Object} visitorData
     * @returns {Promise<Object>}
     */
    async checkIn(visitorData) {
        const record = {
            ...visitorData,
            entry_time: new Date().toISOString(),
            status: visitorData.status || 'Checked-in',
        };
        return this.create(record);
    }

    /**
     * Check out a visitor — record exit time.
     * @param {string} visitorId
     * @returns {Promise<Object>}
     */
    async checkOut(visitorId) {
        return this.update(visitorId, {
            exit_time: new Date().toISOString(),
            status: 'Checked-out',
        });
    }

    /**
     * Find visitors who have overstayed (> threshold hours without checkout).
     * @param {number} [thresholdHours=4]
     * @returns {Promise<Array>} Visitors with calculated stay duration
     */
    async findOverstayedVisitors(thresholdHours = 4) {
        const activeVisitors = await this.getActiveVisitors();
        const now = new Date();

        return activeVisitors
            .map((v) => {
                const entryTime = new Date(v.entry_time);
                const hoursStayed = (now - entryTime) / (1000 * 60 * 60);
                return { ...v, hoursStayed: Math.round(hoursStayed * 10) / 10 };
            })
            .filter((v) => v.hoursStayed > thresholdHours);
    }

    /**
     * Search visitors by name or NIC/passport.
     * @param {string} searchTerm
     * @returns {Promise<Array>}
     */
    async search(searchTerm) {
        return this.query((qb) =>
            qb.select('*')
                .or(`name.ilike.%${searchTerm}%,nic_passport.ilike.%${searchTerm}%`)
                .order('entry_time', { ascending: false })
                .limit(50)
        );
    }

    /**
     * Get visitor statistics for a given date range.
     * @param {string} startDate — ISO date string
     * @param {string} endDate — ISO date string
     * @returns {Promise<Object>} { total, checkedIn, checkedOut, pending }
     */
    async getStats(startDate, endDate) {
        const visitors = await this.query((qb) =>
            qb.select('id, status, entry_time, exit_time')
                .gte('entry_time', startDate)
                .lte('entry_time', endDate)
        );

        return {
            total: visitors.length,
            checkedIn: visitors.filter((v) => v.status === 'Checked-in').length,
            checkedOut: visitors.filter((v) => v.status === 'Checked-out').length,
            pending: visitors.filter((v) => v.status === 'Pending').length,
        };
    }
}
