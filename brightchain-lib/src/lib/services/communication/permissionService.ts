/**
 * PermissionService — centralized permission checking for Groups and Channels.
 *
 * Tracks member roles and mute status per context (group or channel ID).
 * Uses the DEFAULT_ROLE_PERMISSIONS map from brightchain-lib to resolve
 * whether a given role grants a specific permission.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import {
  DEFAULT_ROLE_PERMISSIONS,
  DefaultRole,
  Permission,
} from '../../enumerations/communication';

/**
 * Composite key for role and mute lookups: "memberId:contextId"
 */
function key(memberId: string, contextId: string): string {
  return `${memberId}:${contextId}`;
}

export class PermissionService {
  /** memberId:contextId → DefaultRole */
  private readonly roles = new Map<string, DefaultRole>();

  /** memberId:contextId → mute expiry timestamp (ms since epoch) */
  private readonly mutes = new Map<string, number>();

  /**
   * Check whether a member has a specific permission in a context.
   * Returns false if the member has no role in the context or is missing the permission.
   *
   * Requirement 7.1: check member permissions against role-based permission sets.
   */
  hasPermission(
    memberId: string,
    contextId: string,
    permission: Permission,
  ): boolean {
    const role = this.getMemberRole(memberId, contextId);
    if (role === null) {
      return false;
    }
    return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
  }

  /**
   * Assign (or update) a role for a member in a context.
   *
   * Requirement 7.2: assign and retrieve member roles per context.
   */
  assignRole(memberId: string, contextId: string, role: DefaultRole): void {
    this.roles.set(key(memberId, contextId), role);
  }

  /**
   * Get the role assigned to a member in a context, or null if none.
   */
  getMemberRole(memberId: string, contextId: string): DefaultRole | null {
    return this.roles.get(key(memberId, contextId)) ?? null;
  }

  /**
   * Check whether a member is currently muted in a context.
   * A mute is active when the stored expiry timestamp is in the future.
   *
   * Requirement 7.3, 7.4: track mute status with expiration, auto-clear on check.
   */
  isMuted(memberId: string, contextId: string): boolean {
    const expiry = this.mutes.get(key(memberId, contextId));
    if (expiry === undefined) {
      return false;
    }
    if (Date.now() >= expiry) {
      // Mute has expired — clean up
      this.mutes.delete(key(memberId, contextId));
      return false;
    }
    return true;
  }

  /**
   * Mute a member in a context for the given duration (milliseconds).
   *
   * Requirement 7.3: track member mute status with expiration.
   */
  muteMember(memberId: string, contextId: string, durationMs: number): void {
    this.mutes.set(key(memberId, contextId), Date.now() + durationMs);
  }
}
