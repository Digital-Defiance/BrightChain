/**
 * PermissionGuardedRoute — Route wrapper that checks permissions.
 *
 * Renders children when the user has the required permissions,
 * otherwise renders the AccessDenied component.
 *
 * @module shell/components/PermissionGuardedRoute
 */

import React from 'react';
import { usePermissionContext } from '../contexts/PermissionContext';
import { AccessDenied } from './AccessDenied';

export interface PermissionGuardedRouteProps {
  /** Permission strings required to access this route */
  requiredPermissions: string[];
  /** If true (default), ALL permissions are required */
  requireAll?: boolean;
  children: React.ReactNode;
}

export const PermissionGuardedRoute: React.FC<PermissionGuardedRouteProps> = ({
  requiredPermissions,
  requireAll = true,
  children,
}) => {
  const { hasAllPermissions, hasAnyPermission } = usePermissionContext();

  const permitted = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  if (permitted) {
    return <>{children}</>;
  }

  return <AccessDenied />;
};
