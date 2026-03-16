/**
 * RBACManager — Centralized Role-Based Access Control module.
 * 
 * Consolidates all authorization logic into a single class with
 * clear interfaces for route protection, feature gating, and
 * role hierarchy management.
 * 
 * Design Pattern: Singleton-like module — Single source of truth
 * for all permission checks across the application.
 */

/**
 * All system roles, ordered by privilege level (highest first).
 */
export const ROLES = Object.freeze({
    ADMIN: 'Admin',
    SECURITY_HOD: 'Security HOD',
    SCHOOL_MANAGEMENT: 'School Management',
    SCHOOL_OPERATIONS: 'School Operations',
    SECURITY_OFFICER: 'Security Officer',
});

/**
 * Route-to-Role permission map.
 * Each key is a route path, value is an array of roles allowed.
 * Routes not listed are accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS = {
    '/dashboard': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD, ROLES.SCHOOL_MANAGEMENT, ROLES.SCHOOL_OPERATIONS],
    '/scheduled-meetings': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD, ROLES.SCHOOL_OPERATIONS],
    '/vehicles': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD],
    '/reports': [ROLES.ADMIN, ROLES.SECURITY_HOD, ROLES.SCHOOL_MANAGEMENT],
    '/audit-trail': [ROLES.ADMIN, ROLES.SECURITY_HOD],
    '/user-management': [ROLES.ADMIN],
    '/settings': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD, ROLES.SCHOOL_MANAGEMENT, ROLES.SCHOOL_OPERATIONS],
    '/alerts': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD],
};

/**
 * Feature-level permission map.
 * Defines which roles can access specific features/operations.
 */
export const FEATURE_PERMISSIONS = {
    'alerts.view': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD],
    'alerts.manage': [ROLES.ADMIN, ROLES.SECURITY_HOD],
    'users.manage': [ROLES.ADMIN],
    'reports.export': [ROLES.ADMIN, ROLES.SECURITY_HOD, ROLES.SCHOOL_MANAGEMENT],
    'meetings.approve': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD],
    'vehicles.manage': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD],
    'settings.edit': [ROLES.ADMIN, ROLES.SECURITY_OFFICER, ROLES.SECURITY_HOD, ROLES.SCHOOL_MANAGEMENT, ROLES.SCHOOL_OPERATIONS],
    'audit.view': [ROLES.ADMIN, ROLES.SECURITY_HOD],
};

/**
 * Check if a role has permission to access a given route path.
 * @param {string} role — User's role
 * @param {string} path — Route path (e.g., '/dashboard')
 * @returns {boolean}
 */
export const hasPermission = (role, path) => {
    const allowedRoles = ROUTE_PERMISSIONS[path];
    if (!allowedRoles) return true; // If not explicitly restricted, allow all
    return allowedRoles.includes(role);
};

/**
 * Check if a role has permission for a specific feature.
 * @param {string} role — User's role
 * @param {string} feature — Feature key (e.g., 'alerts.manage')
 * @returns {boolean}
 */
export const hasFeatureAccess = (role, feature) => {
    const allowedRoles = FEATURE_PERMISSIONS[feature];
    if (!allowedRoles) return false; // Unknown features are denied by default
    return allowedRoles.includes(role);
};

/**
 * Get all accessible routes for a given role.
 * @param {string} role
 * @returns {string[]} Array of accessible route paths
 */
export const getAccessibleRoutes = (role) => {
    return Object.entries(ROUTE_PERMISSIONS)
        .filter(([, roles]) => roles.includes(role))
        .map(([path]) => path);
};

/**
 * Get all features accessible to a given role.
 * @param {string} role
 * @returns {string[]} Array of accessible feature keys
 */
export const getAccessibleFeatures = (role) => {
    return Object.entries(FEATURE_PERMISSIONS)
        .filter(([, roles]) => roles.includes(role))
        .map(([feature]) => feature);
};
