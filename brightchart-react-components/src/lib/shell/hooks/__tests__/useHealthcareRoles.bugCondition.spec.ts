/**
 * Bug Condition Exploration Tests — Role Permission Over-Grant
 *
 * These tests encode the EXPECTED (correct) behavior for permissionsForRole().
 * On UNFIXED code they MUST FAIL, confirming the bug exists.
 * After the fix is applied they should PASS, confirming the fix works.
 *
 * **Validates: Requirements 1.1, 2.1**
 */

import {
  BillingPermission,
  ClinicalPermission,
  DENTIST,
  DocumentPermission,
  EncounterPermission,
  MEDICAL_ASSISTANT,
  OrderPermission,
  PatientPermission,
  PHYSICIAN,
  REGISTERED_NURSE,
  SchedulingPermission,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
import fc from 'fast-check';
import { permissionsForRole } from '../useHealthcareRoles';

/**
 * All Admin-level permissions that non-admin clinical roles should NOT have.
 */
const ADMIN_LEVEL_PERMISSIONS: string[] = [
  PatientPermission.Admin,
  ClinicalPermission.ClinicalAdmin,
  EncounterPermission.EncounterAdmin,
  DocumentPermission.DocumentAdmin,
  OrderPermission.OrderAdmin,
  SchedulingPermission.SchedulingAdmin,
  BillingPermission.BillingAdmin,
];

/**
 * Clinical roles that should NOT receive Admin-level permissions.
 */
const CLINICAL_NON_ADMIN_ROLES: string[] = [
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
];

describe('Bug Condition Exploration: Role Permission Over-Grant', () => {
  /**
   * Property 1: Bug Condition — No Admin-Level Permissions for Clinical Roles
   *
   * For all role codes in [PHYSICIAN, REGISTERED_NURSE, MEDICAL_ASSISTANT,
   * DENTIST, VETERINARIAN], permissionsForRole(roleCode) does NOT contain
   * any Admin-level permission.
   *
   * On UNFIXED code this FAILS because the default branch returns ALL_PERMISSIONS
   * which includes every Admin-level permission.
   *
   * **Validates: Requirements 1.1, 2.1**
   */
  it('Property 1: Clinical roles must not receive Admin-level permissions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CLINICAL_NON_ADMIN_ROLES),
        (roleCode: string) => {
          const permissions = permissionsForRole(roleCode);
          const foundAdminPerms = permissions.filter((p) =>
            ADMIN_LEVEL_PERMISSIONS.includes(p),
          );

          // The role should have ZERO admin-level permissions
          return foundAdminPerms.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
