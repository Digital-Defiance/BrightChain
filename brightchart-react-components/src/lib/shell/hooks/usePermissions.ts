/**
 * usePermissions — Convenience hook for permission checks.
 *
 * Re-exports the PermissionContext value with a friendlier name.
 *
 * @module shell/hooks/usePermissions
 */

import {
  usePermissionContext,
  type PermissionContextValue,
} from '../contexts/PermissionContext';

export type UsePermissionsResult = PermissionContextValue;

/**
 * Hook returning permission check functions and the current user's
 * resolved permission set, role, and scopes.
 */
export function usePermissions(): UsePermissionsResult {
  return usePermissionContext();
}
