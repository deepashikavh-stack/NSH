import { BaseService } from './BaseService';

/**
 * VehicleService — Manages vehicle entry/exit tracking.
 * 
 * Encapsulates business logic for:
 *  - Vehicle entry registration
 *  - Vehicle exit recording
 *  - Overstay detection
 *  - Vehicle search and statistics
 */
export class VehicleService extends BaseService {
    constructor() {
        super('vehicle_entries');
    }

    /**
     * Register a vehicle entry.
     * @param {Object} vehicleData — { vehicle_number, vehicle_type, driver_name, purpose, ... }
     * @returns {Promise<Object>}
     */
    async registerEntry(vehicleData) {
        const record = {
            ...vehicleData,
            entry_time: new Date().toISOString(),
        };
        return this.create(record);
    }

    /**
     * Record a vehicle exit.
     * @param {string} vehicleId
     * @returns {Promise<Object>}
     */
    async recordExit(vehicleId) {
        return this.update(vehicleId, {
            exit_time: new Date().toISOString(),
        });
    }

    /**
     * Get all vehicles currently on premises (no exit time).
     * @returns {Promise<Array>}
     */
    async getActiveVehicles() {
        return this.query((qb) =>
            qb.select('id, vehicle_number, vehicle_type, entry_time, exit_time, driver_name, purpose')
                .is('exit_time', null)
                .order('entry_time', { ascending: false })
        );
    }

    /**
     * Find vehicles that have overstayed (> threshold hours without exit).
     * @param {number} [thresholdHours=4]
     * @returns {Promise<Array>}
     */
    async findOverstayedVehicles(thresholdHours = 4) {
        const activeVehicles = await this.getActiveVehicles();
        const now = new Date();

        return activeVehicles
            .map((v) => {
                const entryTime = new Date(v.entry_time);
                const hoursStayed = (now - entryTime) / (1000 * 60 * 60);
                return { ...v, hoursStayed: Math.round(hoursStayed * 10) / 10 };
            })
            .filter((v) => v.hoursStayed > thresholdHours);
    }

    /**
     * Search vehicles by plate number.
     * @param {string} plateNumber
     * @returns {Promise<Array>}
     */
    async searchByPlate(plateNumber) {
        return this.query((qb) =>
            qb.select('*')
                .ilike('vehicle_number', `%${plateNumber}%`)
                .order('entry_time', { ascending: false })
                .limit(50)
        );
    }

    /**
     * Get vehicle statistics for a date range.
     * @param {string} startDate
     * @param {string} endDate
     * @returns {Promise<Object>}
     */
    async getStats(startDate, endDate) {
        const vehicles = await this.query((qb) =>
            qb.select('id, vehicle_type, entry_time, exit_time')
                .gte('entry_time', startDate)
                .lte('entry_time', endDate)
        );

        const byType = {};
        vehicles.forEach((v) => {
            byType[v.vehicle_type] = (byType[v.vehicle_type] || 0) + 1;
        });

        return {
            total: vehicles.length,
            onPremises: vehicles.filter((v) => !v.exit_time).length,
            exited: vehicles.filter((v) => v.exit_time).length,
            byType,
        };
    }
}
