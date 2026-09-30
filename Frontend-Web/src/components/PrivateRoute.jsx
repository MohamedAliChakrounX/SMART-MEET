import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Protects routes: redirects to /login if no JWT token is found.
 * Supports optional permission check.
 */
export default function PrivateRoute({
    children,
    requiredPermission,
    requiredPermissions = [],
}) {
    const token = localStorage.getItem('access_token');
    const userDataStr = localStorage.getItem('user_data');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const permissionsToCheck = requiredPermission
        ? [requiredPermission]
        : requiredPermissions;

    if (permissionsToCheck.length > 0 && userDataStr) {
        const user = JSON.parse(userDataStr);
        
        // Admin bypass
        if (user.roles?.includes('ROLE_ADMIN')) {
            return children;
        }

        const hasPermission = permissionsToCheck.some((perm) =>
            user.permissions?.includes(perm)
        );
        if (!hasPermission) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
}
