/**
 * Encounter ACL Interfaces
 *
 * Extends the BrightChain IPoolACL with encounter-specific permissions
 * and SMART on FHIR v2 scope mappings.
 *
 * @module encounter/access/encounterAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/**
 * Encounter-specific permission levels for access control.
 * EncounterAdmin implies both EncounterRead and EncounterWrite.
 */
export enum EncounterPermission {
  EncounterRead = 'encounter:read',
  EncounterWrite = 'encounter:write',
  EncounterAdmin = 'encounter:admin',
}

/**
 * Encounter ACL extending pool-level ACL with encounter-specific permissions.
 * Follows the IClinicalACL pattern from Module 2.
 */
export interface IEncounterACL<TID = string> extends IPoolACL<TID> {
  encounterPermissions: Array<{
    memberId: TID;
    permissions: EncounterPermission[];
  }>;
}

/**
 * Check if a member has a specific encounter permission.
 * EncounterAdmin implies both EncounterRead and EncounterWrite.
 */
export function hasEncounterPermission<TID>(
  acl: IEncounterACL<TID>,
  memberId: TID,
  permission: EncounterPermission,
): boolean {
  const entry = acl.encounterPermissions.find((e) => e.memberId === memberId);
  if (!entry) return false;
  if (entry.permissions.includes(EncounterPermission.EncounterAdmin))
    return true;
  return entry.permissions.includes(permission);
}

/** SMART on FHIR v2 scope to EncounterPermission mapping */
export interface ISmartEncounterScopeMapping {
  scope: string;
  permission: EncounterPermission;
}

/** Predefined SMART on FHIR v2 scope mappings for encounter resources */
export const SMART_ENCOUNTER_SCOPE_MAPPINGS: ISmartEncounterScopeMapping[] = [
  // Read scopes → EncounterRead
  { scope: 'user/Encounter.rs', permission: EncounterPermission.EncounterRead },
  // Write (create/update/delete/search) scopes → EncounterWrite
  {
    scope: 'user/Encounter.cuds',
    permission: EncounterPermission.EncounterWrite,
  },
  // System admin scope → EncounterAdmin
  { scope: 'system/*.*', permission: EncounterPermission.EncounterAdmin },
];
