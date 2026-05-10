/**
 * Scheduling ACL Interfaces
 *
 * Extends the BrightChain IPoolACL with scheduling-specific permissions
 * and SMART on FHIR v2 scope mappings.
 *
 * @see Requirements 11.1, 11.2, 11.3, 11.4
 * @module scheduling/access/schedulingAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/**
 * Scheduling-specific permission levels for access control.
 * SchedulingAdmin implies both SchedulingRead and SchedulingWrite.
 *
 * @see Requirement 11.1
 */
export enum SchedulingPermission {
  SchedulingRead = 'scheduling:read',
  SchedulingWrite = 'scheduling:write',
  SchedulingAdmin = 'scheduling:admin',
}

/**
 * A member's scheduling-specific permissions within the ACL.
 *
 * @typeParam TID - Identifier type (defaults to string)
 */
export interface ISchedulingACLMemberPermissions<TID = string> {
  memberId: TID;
  schedulingPermissions: SchedulingPermission[];
}

/**
 * Scheduling ACL extending pool-level ACL with scheduling-specific permissions.
 * Follows the IEncounterACL pattern from Module 3.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 11.2
 */
export interface ISchedulingACL<TID = string> extends IPoolACL<TID> {
  schedulingMembers: ISchedulingACLMemberPermissions<TID>[];
}

/**
 * Check if a member has a specific scheduling permission.
 * SchedulingAdmin implies both SchedulingRead and SchedulingWrite.
 *
 * @see Requirement 11.3
 */
export function hasSchedulingPermission<TID>(
  acl: ISchedulingACL<TID>,
  memberId: TID,
  permission: SchedulingPermission,
): boolean {
  const entry = acl.schedulingMembers.find((e) => e.memberId === memberId);
  if (!entry) return false;
  if (
    entry.schedulingPermissions.includes(SchedulingPermission.SchedulingAdmin)
  )
    return true;
  return entry.schedulingPermissions.includes(permission);
}

/** SMART on FHIR v2 scope to SchedulingPermission mapping */
export interface ISmartSchedulingScopeMapping {
  scope: string;
  permission: SchedulingPermission;
}

/**
 * Predefined SMART on FHIR v2 scope mappings for scheduling resources (array form).
 *
 * @see Requirement 11.4
 */
export const SMART_SCHEDULING_SCOPE_MAPPINGS: ISmartSchedulingScopeMapping[] = [
  // Read scopes → SchedulingRead
  {
    scope: 'user/Appointment.rs',
    permission: SchedulingPermission.SchedulingRead,
  },
  {
    scope: 'user/Schedule.rs',
    permission: SchedulingPermission.SchedulingRead,
  },
  { scope: 'user/Slot.rs', permission: SchedulingPermission.SchedulingRead },
  // Write scopes → SchedulingWrite
  {
    scope: 'user/Appointment.cuds',
    permission: SchedulingPermission.SchedulingWrite,
  },
  {
    scope: 'user/Schedule.cuds',
    permission: SchedulingPermission.SchedulingWrite,
  },
  { scope: 'user/Slot.cuds', permission: SchedulingPermission.SchedulingWrite },
  // System admin scope → SchedulingAdmin
  { scope: 'system/*.*', permission: SchedulingPermission.SchedulingAdmin },
];

/**
 * SMART on FHIR v2 scope mappings for scheduling permissions (record form).
 * Maps each SchedulingPermission to its corresponding SMART scope string(s).
 *
 * @see Requirement 11.4
 */
export const SCHEDULING_SMART_SCOPES: Record<SchedulingPermission, string> = {
  [SchedulingPermission.SchedulingRead]:
    'user/Appointment.rs user/Schedule.rs user/Slot.rs',
  [SchedulingPermission.SchedulingWrite]:
    'user/Appointment.cuds user/Schedule.cuds user/Slot.cuds',
  [SchedulingPermission.SchedulingAdmin]:
    'user/Appointment.* user/Schedule.* user/Slot.*',
};
