import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/routeConfig';
import { ShieldX } from 'lucide-react';

/**
 * ProtectedRoute — wraps a route to enforce authentication and role-based access.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The child component to render if authorized
 * @param {Object|null} props.user - The current user object (null if not logged in)
 * @param {string[]} [props.allowedRoles] - Optional override for allowed roles
 */
const ProtectedRoute = ({ children, user, allowedRoles }) => {
    const location = useLocation();

    // 1. Check authentication
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Check role-based authorization
    const isAllowed = allowedRoles
        ? allowedRoles.includes(user.role)
        : hasPermission(user.role, location.pathname);

    if (!isAllowed) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: '1.5rem',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <ShieldX size={40} color="#ef4444" />
                </div>
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em'
                }}>
                    Access Denied
                </h2>
                <p style={{
                    color: 'var(--text-muted)',
                    maxWidth: '400px',
                    lineHeight: 1.6
                }}>
                    You don't have permission to access this page.
                    <br />
                    Your role: <strong style={{ color: 'var(--primary)' }}>{user.role}</strong>
                </p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
