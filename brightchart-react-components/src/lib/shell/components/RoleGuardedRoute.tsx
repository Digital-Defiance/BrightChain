/**
 * RoleGuardedRoute — Route wrapper that checks the user's active role.
 *
 * Renders children when the user's active role code is in the allowed list,
 * otherwise renders the AccessDenied component.
 *
 * @module shell/components/RoleGuardedRoute
 */

import React from 'react';
import { useActiveContext } from '../contexts/ActiveContext';
import { AccessDenied } from './AccessDenied';

export interface RoleGuardedRouteProps {
  /** Role codes that are allowed to access this route */
  allowedRoles: string[];
  children: React.ReactNode;
}

export const RoleGuardedRoute: React.FC<RoleGuardedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { activeRole } = useActiveContext();

  if (allowedRoles.includes(activeRole.roleCode)) {
    return <>{children}</>;
  }

  return <AccessDenied />;
};
