import { supabase } from '../lib/supabase';

/**
 * BaseService — Abstract base class for all domain services.
 * 
 * Implements the Repository pattern providing standard CRUD operations
 * against a Supabase table. All domain services extend this class and
 * inherit shared query capabilities.
 * 
 * Design Patterns:
 *  - Repository:  Abstracts data persistence behind a clean API
 *  - Template Method: Subclasses override hooks for custom behavior
 *  - Singleton access: Shared supabase client instance
 */
export class BaseService {
    /**
     * @param {string} tableName — The Supabase table this service manages
     */
    constructor(tableName) {
        if (new.target === BaseService) {
            throw new Error('BaseService is abstract and cannot be instantiated directly.');
        }
        this.tableName = tableName;
        this.client = supabase;
    }

    /**
     * Fetch all rows, optionally filtered and ordered.
     * @param {Object} options
     * @param {string} [options.select='*'] — Column selection
     * @param {Object} [options.filters={}] — Key-value equality filters
     * @param {Object} [options.order] — { column, ascending }
     * @param {number} [options.limit] — Max rows to return
     * @returns {Promise<{ data: Array, error: Object|null }>}
     */
    async findAll({ select = '*', filters = {}, order = null, limit = null } = {}) {
        let query = this.client.from(this.tableName).select(select);

        for (const [key, value] of Object.entries(filters)) {
            if (value === null) {
                query = query.is(key, null);
            } else {
                query = query.eq(key, value);
            }
        }

        if (order) {
            query = query.order(order.column, { ascending: order.ascending ?? false });
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw this._handleError('findAll', error);
        return data || [];
    }

    /**
     * Fetch a single row by ID.
     * @param {string} id
     * @param {string} [select='*']
     * @returns {Promise<Object|null>}
     */
    async findById(id, select = '*') {
        const { data, error } = await this.client
            .from(this.tableName)
            .select(select)
            .eq('id', id)
            .maybeSingle();

        if (error) throw this._handleError('findById', error);
        return data;
    }

    /**
     * Insert a new row.
     * @param {Object} record
     * @returns {Promise<Object>}  The inserted row
     */
    async create(record) {
        const { data, error } = await this.client
            .from(this.tableName)
            .insert(record)
            .select()
            .single();

        if (error) throw this._handleError('create', error);
        return data;
    }

    /**
     * Update an existing row by ID.
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<Object>}  The updated row
     */
    async update(id, updates) {
        const { data, error } = await this.client
            .from(this.tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw this._handleError('update', error);
        return data;
    }

    /**
     * Delete a row by ID.
     * @param {string} id
     * @returns {Promise<void>}
     */
    async delete(id) {
        const { error } = await this.client
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) throw this._handleError('delete', error);
    }

    /**
     * Execute a raw query builder callback for complex queries.
     * @param {Function} builderFn — Receives the Supabase query builder
     * @returns {Promise<{ data: Array, error: Object|null }>}
     */
    async query(builderFn) {
        const queryBuilder = this.client.from(this.tableName);
        const { data, error } = await builderFn(queryBuilder);
        if (error) throw this._handleError('query', error);
        return data || [];
    }

    /**
     * Standardized error handling. Subclasses can override for domain-specific error mapping.
     * @param {string} operation
     * @param {Object} error
     * @returns {Error}
     */
    _handleError(operation, error) {
        const message = `[${this.constructor.name}] ${operation} failed on '${this.tableName}': ${error.message}`;
        console.error(message, error);
        return new Error(message);
    }
}
