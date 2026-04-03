import { BaseService } from './BaseService';

/**
 * MeetingService — Manages the full meeting lifecycle.
 * 
 * Encapsulates business logic for:
 *  - Scheduling meetings (single and multi-visitor)
 *  - Approval / rejection workflows
 *  - Time slot validation
 *  - Meeting status transitions
 *  - Overstay detection
 */
export class MeetingService extends BaseService {
    /** Operating hours for time slot validation */
    static OPERATING_HOURS = { start: '07:30', end: '17:30' };

    constructor() {
        super('scheduled_meetings');
    }

    /**
     * Schedule a new meeting.
     * @param {Object} meetingData
     * @returns {Promise<Object>}
     */
    async schedule(meetingData) {
        this._validateTimeSlot(meetingData.start_time, meetingData.end_time);

        const record = {
            ...meetingData,
            status: meetingData.status || 'Scheduled',
            created_at: new Date().toISOString(),
        };
        return this.create(record);
    }

    /**
     * Approve a meeting request with a time slot.
     * @param {string} meetingId
     * @param {Object} approval — { approvedBy, startTime, endTime, date }
     * @returns {Promise<Object>}
     */
    async approve(meetingId, { approvedBy, startTime, endTime, date }) {
        this._validateTimeSlot(startTime, endTime);

        return this.update(meetingId, {
            status: 'Approved',
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            start_time: startTime,
            end_time: endTime,
            meeting_date: date,
        });
    }

    /**
     * Reject/deny a meeting request.
     * @param {string} meetingId
     * @param {string} rejectedBy
     * @returns {Promise<Object>}
     */
    async reject(meetingId, rejectedBy) {
        return this.update(meetingId, {
            status: 'Denied',
            approved_by: rejectedBy,
            approved_at: new Date().toISOString(),
        });
    }

    /**
     * Mark a meeting as completed (visitor confirmed arrival).
     * @param {string} meetingId
     * @returns {Promise<Object>}
     */
    async confirmArrival(meetingId) {
        return this.update(meetingId, {
            status: 'Confirmed',
            arrival_confirmed_at: new Date().toISOString(),
        });
    }

    /**
     * Get today's meetings.
     * @param {string} [status] — Optional status filter
     * @returns {Promise<Array>}
     */
    async getTodaysMeetings(status = null) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const filters = { meeting_date: todayStr };
        if (status) filters.status = status;

        return this.findAll({
            filters,
            order: { column: 'start_time', ascending: true },
        });
    }

    /**
     * Find meetings that have exceeded their scheduled end time without completion.
     * @returns {Promise<Array>} Overdue meetings
     */
    async findOverdueMeetings() {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const currentTime = new Date().toTimeString().slice(0, 5);

        return this.query((qb) =>
            qb.select('id, meeting_date, start_time, end_time, status, visitor_name, meeting_with, purpose')
                .eq('meeting_date', todayStr)
                .eq('status', 'Scheduled')
                .lt('end_time', currentTime)
        );
    }

    /**
     * Fetch meetings by a specific meeting_id group (multi-visitor meetings).
     * @param {string} meetingGroupId
     * @returns {Promise<Array>}
     */
    async getByGroupId(meetingGroupId) {
        return this.findAll({
            filters: { meeting_id: meetingGroupId },
            order: { column: 'created_at', ascending: true },
        });
    }

    /**
     * Validate that a time slot falls within operating hours.
     * @param {string} startTime — HH:mm
     * @param {string} endTime — HH:mm
     * @throws {Error} If outside operating hours or invalid range
     */
    _validateTimeSlot(startTime, endTime) {
        if (!startTime || !endTime) return; // Allow null for pending requests

        const { start, end } = MeetingService.OPERATING_HOURS;

        if (startTime < start || endTime > end) {
            throw new Error(`Time slot must be within operating hours (${start} - ${end})`);
        }

        if (startTime >= endTime) {
            throw new Error('Start time must be before end time');
        }
    }
}
