/**
 * Access control module - Patient ACL and permission evaluation.
 *
 * @module access
 */

export {
  PatientPermission,
  type IPatientACL,
  type IPatientACLMemberPermissions,
} from './patientAcl';
export { evaluatePatientAccess } from './patientAclEvaluator';
