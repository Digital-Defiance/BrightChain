/**
 * Clinical ACL Interfaces
 *
 * Extends the BrightChain IPoolACL with clinical-specific permissions
 * and SMART on FHIR v2 scope mappings.
 *
 * @module clinical/access/clinicalAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/** Clinical-specific permission levels */
export enum ClinicalPermission {
  ClinicalRead = 'clinical:read',
  ClinicalWrite = 'clinical:write',
  ClinicalAdmin = 'clinical:admin',
}

/** Clinical ACL extending pool-level ACL with clinical permissions */
export interface IClinicalACL<TID = string> extends IPoolACL<TID> {
  clinicalPermissions: Array<{
    memberId: TID;
    permissions: ClinicalPermission[];
  }>;
}

/**
 * Check if a member has a specific clinical permission.
 * ClinicalAdmin implies both ClinicalRead and ClinicalWrite.
 */
export function hasClinicalPermission<TID>(
  acl: IClinicalACL<TID>,
  memberId: TID,
  permission: ClinicalPermission,
): boolean {
  const entry = acl.clinicalPermissions.find((e) => e.memberId === memberId);
  if (!entry) return false;
  if (entry.permissions.includes(ClinicalPermission.ClinicalAdmin)) return true;
  return entry.permissions.includes(permission);
}

/** SMART on FHIR v2 scope to ClinicalPermission mapping */
export interface ISmartScopeMapping {
  scope: string;
  permission: ClinicalPermission;
}

/** Predefined SMART scope mappings for clinical resources */
export const SMART_CLINICAL_SCOPE_MAPPINGS: ISmartScopeMapping[] = [
  // Read scopes
  { scope: 'user/Observation.rs', permission: ClinicalPermission.ClinicalRead },
  { scope: 'user/Condition.rs', permission: ClinicalPermission.ClinicalRead },
  {
    scope: 'user/AllergyIntolerance.rs',
    permission: ClinicalPermission.ClinicalRead,
  },
  { scope: 'user/Medication.rs', permission: ClinicalPermission.ClinicalRead },
  {
    scope: 'user/MedicationStatement.rs',
    permission: ClinicalPermission.ClinicalRead,
  },
  { scope: 'user/Procedure.rs', permission: ClinicalPermission.ClinicalRead },
  // Write scopes
  {
    scope: 'user/Observation.cuds',
    permission: ClinicalPermission.ClinicalWrite,
  },
  {
    scope: 'user/Condition.cuds',
    permission: ClinicalPermission.ClinicalWrite,
  },
  {
    scope: 'user/AllergyIntolerance.cuds',
    permission: ClinicalPermission.ClinicalWrite,
  },
  {
    scope: 'user/Medication.cuds',
    permission: ClinicalPermission.ClinicalWrite,
  },
  {
    scope: 'user/MedicationStatement.cuds',
    permission: ClinicalPermission.ClinicalWrite,
  },
  {
    scope: 'user/Procedure.cuds',
    permission: ClinicalPermission.ClinicalWrite,
  },
  // Admin scope
  { scope: 'system/*.*', permission: ClinicalPermission.ClinicalAdmin },
];
