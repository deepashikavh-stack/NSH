import { supabase } from './supabase';

/**
 * EntryAgent — Abstract base class for automated entry validation.
 * 
 * Implements the Template Method pattern where subclasses provide
 * domain-specific validation logic while the base class manages
 * the validation lifecycle (validate → decide → respond).
 * 
 * Design Patterns:
 *  - Template Method: validate() calls abstract _performValidation()
 *  - Strategy: Different agent types for different entry scenarios
 */
export class EntryAgent {
    /**
     * @param {string} agentType — 'Staff' | 'Visitor' | 'Vehicle'
     */
    constructor(agentType) {
        if (new.target === EntryAgent) {
            throw new Error('EntryAgent is abstract. Use StaffEntryAgent or VisitorEntryAgent.');
        }
        this.agentType = agentType;
        this.client = supabase;
    }

    /**
     * Public validation entry point — Template Method.
     * @param {Object} entryData — Domain-specific entry data
     * @returns {Promise<{ status: string, message: string, details: Object|null }>}
     */
    async validate(entryData) {
        try {
            const result = await this._performValidation(entryData);
            return {
                status: result.status,
                message: result.message,
                details: result.details || null,
                agentType: this.agentType,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'Error',
                message: `Validation failed: ${error.message}`,
                details: null,
                agentType: this.agentType,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Abstract — Must be implemented by subclasses.
     * @param {Object} __unused_entryData
     * @returns {Promise<{ status: string, message: string, details?: Object }>}
     */
    async _performValidation(__unused_entryData) /* eslint-disable-line no-unused-vars */ {
        throw new Error(`${this.constructor.name}: _performValidation() not implemented`);
    }
}

/**
 * StaffEntryAgent — Validates staff entries against the employee database.
 */
export class StaffEntryAgent extends EntryAgent {
    constructor() {
        super('Staff');
    }

    async _performValidation(entryData) {
        const { staffId } = entryData;

        if (!staffId) {
            return {
                status: 'Exception',
                message: 'Staff ID is required for validation.',
            };
        }

        // Check against the employees/staff_entries table
        const { data: employee, error } = await this.client
            .from('users')
            .select('id, username, full_name, role')
            .eq('username', staffId)
            .maybeSingle();

        if (error) {
            console.error('StaffEntryAgent: database lookup failed:', error);
            return {
                status: 'Exception',
                message: 'Unable to verify employee. Please try manual approval.',
            };
        }

        if (employee) {
            return {
                status: 'Auto-confirmed',
                message: 'Employee verified. Entry logged.',
                details: {
                    name: employee.full_name,
                    role: employee.role,
                    id: employee.id,
                },
            };
        }

        return {
            status: 'Exception',
            message: 'Employee ID not found. Routing to manual approval.',
        };
    }
}

/**
 * VisitorEntryAgent — Validates visitor entries against scheduled meetings.
 */
export class VisitorEntryAgent extends EntryAgent {
    constructor() {
        super('Visitor');
    }

    async _performValidation(entryData) {
        const { type, name, nicPassport } = entryData;

        if (type === 'Pre-registered' && nicPassport) {
            // Check for a matching scheduled meeting today
            const todayStr = new Date().toLocaleDateString('en-CA');

            const { data: meeting, error } = await this.client
                .from('scheduled_meetings')
                .select('id, visitor_name, meeting_with, start_time, end_time, status')
                .eq('meeting_date', todayStr)
                .in('status', ['Scheduled', 'Approved'])
                .ilike('visitor_name', `%${name}%`)
                .maybeSingle();

            if (error) {
                console.error('VisitorEntryAgent: database lookup failed:', error);
            }

            if (meeting) {
                return {
                    status: 'Auto-confirmed',
                    message: 'Pre-registered visitor match found.',
                    details: {
                        meetingId: meeting.id,
                        meetingWith: meeting.meeting_with,
                        timeSlot: `${meeting.start_time} - ${meeting.end_time}`,
                    },
                };
            }
        }

        return {
            status: 'Pending',
            message: 'Manual confirmation required for walk-in/non-matched visitor.',
        };
    }
}

// ─── Convenience exports (backward-compatible) ──────────────────────────────

const staffAgent = new StaffEntryAgent();
const visitorAgent = new VisitorEntryAgent();

/**
 * @deprecated Use `new StaffEntryAgent().validate()` instead.
 */
export const validateStaffEntry = (staffId) => staffAgent.validate({ staffId });

/**
 * @deprecated Use `new VisitorEntryAgent().validate()` instead.
 */
export const validateVisitorEntry = (visitorData) => visitorAgent.validate(visitorData);
