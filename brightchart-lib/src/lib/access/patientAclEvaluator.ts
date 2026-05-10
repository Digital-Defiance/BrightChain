/**
 * Patient ACL Evaluator - checks member permissions against the Patient ACL.
 *
 * Admin permission implies all other patient permissions.
 *
 * @module access/patientAclEvaluator
 */

import type { IPatientACL } from './patientAcl';
import { PatientPermission } from './patientAcl';

/**
 * Evaluate whether a member has the required patient permission in the ACL.
 *
 * Rules:
 * - If the member is not found in `patientMembers`, access is denied.
 * - If the member has `PatientPermission.Admin`, all permissions are granted.
 * - Otherwise, the member must have the exact required permission.
 *
 * @param acl - The patient ACL to evaluate against
 * @param memberId - The member requesting access
 * @param requiredPermission - The permission required for the operation
 * @returns true if the member has the required permission, false otherwise
 */
export function evaluatePatientAccess<TID = string>(
  acl: IPatientACL<TID>,
  memberId: TID,
  requiredPermission: PatientPermission,
): boolean {
  const member = acl.patientMembers.find((m) => m.memberId === memberId);
  if (!member) {
    return false;
  }
  if (member.patientPermissions.includes(PatientPermission.Admin)) {
    return true;
  }
  return member.patientPermissions.includes(requiredPermission);
}
