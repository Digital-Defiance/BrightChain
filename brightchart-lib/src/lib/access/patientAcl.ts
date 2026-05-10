/**
 * Patient ACL - Healthcare-specific access control extending BrightChain's IPoolACL.
 *
 * Defines PatientPermission enum with healthcare-specific permission levels
 * and IPatientACL interface extending IPoolACL with patient permissions per member.
 *
 * @module access/patientAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/**
 * Healthcare-specific permission levels for patient data access.
 */
export enum PatientPermission {
  Read = 'patient:read',
  Write = 'patient:write',
  Merge = 'patient:merge',
  Search = 'patient:search',
  Admin = 'patient:admin',
}

/**
 * A member's patient-specific permissions within the ACL.
 */
export interface IPatientACLMemberPermissions<TID = string> {
  memberId: TID;
  patientPermissions: PatientPermission[];
}

/**
 * Patient ACL extending IPoolACL with healthcare-specific permission levels.
 *
 * Adds a `patientMembers` array that maps member IDs to their patient-specific
 * permissions, layered on top of the base pool ACL.
 */
export interface IPatientACL<TID = string> extends IPoolACL<TID> {
  patientMembers: IPatientACLMemberPermissions<TID>[];
}
