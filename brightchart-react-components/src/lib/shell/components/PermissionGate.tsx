/**
 * PermissionGate — Declarative permission-based rendering.
 *
 * Wraps children and only renders them when the user has the required
 * permissions. Renders an optional fallback when denied.
 *
 * @module shell/components/PermissionGate
 */

import React from 'react';
import { usePermissionContext } from '../contexts/PermissionContext';

export interface PermissionGateProps {
  /** Permission strings required to render children */
  requiredPermissions: string[];
  /** If true (default), ALL permissions are required. If false, ANY suffices. */
  requireAll?: boolean;
  /** Optional fallback to render when permission is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  requiredPermissions,
  requireAll = true,
  fallback = null,
  children,
}) => {
  const { hasAllPermissions, hasAnyPermission } = usePermissionContext();

  const permitted = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  if (permitted) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
