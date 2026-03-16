import { supabase } from '../lib/supabase';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/passwordUtils';

/**
 * AuthService — Manages authentication and session lifecycle.
 * 
 * Encapsulates:
 *  - User login with bcrypt password verification
 *  - Session persistence (localStorage)
 *  - Password management (hash, verify, validate strength)
 *  - Session integrity validation
 * 
 * Design Pattern: Singleton — Single auth state across the application
 */
export class AuthService {
    /** Key used for localStorage session persistence */
    static SESSION_KEY = 'ngs_user';

    constructor() {
        this.client = supabase;
    }

    /**
     * Authenticate a user with username and password.
     * @param {string} username
     * @param {string} password
     * @returns {Promise<Object>} Authenticated user data
     * @throws {Error} On invalid credentials
     */
    async login(username, password) {
        const { data: user, error } = await this.client
            .from('users')
            .select('id, username, full_name, email, role, password_hash, avatar_url')
            .eq('username', username)
            .maybeSingle();

        if (error) throw new Error('Authentication service error');
        if (!user) throw new Error('Invalid username or password');

        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) throw new Error('Invalid username or password');

        // Strip password_hash before returning / storing
        const { password_hash, ...safeUser } = user;
        return safeUser;
    }

    /**
     * Persist user session to localStorage.
     * @param {Object} user
     */
    saveSession(user) {
        localStorage.setItem(AuthService.SESSION_KEY, JSON.stringify(user));
    }

    /**
     * Retrieve the current session from localStorage.
     * @returns {Object|null}
     */
    getSession() {
        try {
            const saved = localStorage.getItem(AuthService.SESSION_KEY);
            if (!saved) return null;

            const parsed = JSON.parse(saved);
            if (!parsed || !parsed.role || !parsed.username) {
                this.clearSession();
                return null;
            }
            return parsed;
        } catch {
            this.clearSession();
            return null;
        }
    }

    /**
     * Clear the current session.
     */
    clearSession() {
        localStorage.removeItem(AuthService.SESSION_KEY);
    }

    /**
     * Change the password for a user.
     * @param {string} userId
     * @param {string} currentPassword
     * @param {string} newPassword
     * @returns {Promise<void>}
     */
    async changePassword(userId, currentPassword, newPassword) {
        // Validate new password strength
        const strength = validatePasswordStrength(newPassword);
        if (!strength.valid) {
            throw new Error(`Password too weak: ${strength.errors.join(', ')}`);
        }

        // Verify current password
        const { data: user, error: fetchError } = await this.client
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .maybeSingle();

        if (fetchError || !user) throw new Error('User not found');

        const currentValid = await verifyPassword(currentPassword, user.password_hash);
        if (!currentValid) throw new Error('Current password is incorrect');

        // Hash and store new password
        const newHash = await hashPassword(newPassword);
        const { error: updateError } = await this.client
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', userId);

        if (updateError) throw new Error('Failed to update password');
    }

    /**
     * Update user profile fields.
     * @param {string} userId
     * @param {Object} profileData — { full_name, email, avatar_url, ... }
     * @returns {Promise<Object>} Updated user
     */
    async updateProfile(userId, profileData) {
        const { data, error } = await this.client
            .from('users')
            .update(profileData)
            .eq('id', userId)
            .select('id, username, full_name, email, role, avatar_url')
            .single();

        if (error) throw new Error('Failed to update profile');
        return data;
    }
}
