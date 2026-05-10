/**
 * PermissionContext — React context provider for permission evaluation.
 *
 * Resolves the user's effective permissions from healthcare role,
 * SMART scopes, and pool ACL permissions. Exposes hasPermission,
 * hasAnyPermission, hasAllPermissions.
 *
 * @module shell/contexts/PermissionContext
 */

import type { IHealthcareRole, SmartScope } from '@brightchain/brightchart-lib';
import React, { createContext, useContext, useMemo } from 'react';

export interface PermissionContextValue {
  /** Check if the user has a single permission */
  hasPermission(permission: string): boolean;
  /** Check if the user has at least one of the given permissions */
  hasAnyPermission(permissions: string[]): boolean;
  /** Check if the user has all of the given permissions */
  hasAllPermissions(permissions: string[]): boolean;
  /** The full set of resolved permissions */
  permissions: Set<string>;
  /** The active healthcare role */
  role: IHealthcareRole;
  /** The user's SMART scopes */
  scopes: SmartScope[];
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export interface PermissionContextProviderProps {
  /** The active healthcare role */
  role: IHealthcareRole;
  /** SMART on FHIR v2 scopes granted to the user */
  scopes: SmartScope[];
  /** Resolved permission strings from all ACLs */
  resolvedPermissions: string[];
  children: React.ReactNode;
}

export const PermissionContextProvider: React.FC<
  PermissionContextProviderProps
> = ({ role, scopes, resolvedPermissions, children }) => {
  const value = useMemo<PermissionContextValue>(() => {
    const permSet = new Set(resolvedPermissions);

    return {
      hasPermission: (permission: string) => permSet.has(permission),
      hasAnyPermission: (permissions: string[]) =>
        permissions.some((p) => permSet.has(p)),
      hasAllPermissions: (permissions: string[]) =>
        permissions.every((p) => permSet.has(p)),
      permissions: permSet,
      role,
      scopes,
    };
  }, [role, scopes, resolvedPermissions]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Hook to consume the PermissionContext.
 * Throws if used outside of PermissionContextProvider.
 */
export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error(
      'usePermissionContext must be used within a PermissionContextProvider',
    );
  }
  return ctx;
}

export { PermissionContext };
