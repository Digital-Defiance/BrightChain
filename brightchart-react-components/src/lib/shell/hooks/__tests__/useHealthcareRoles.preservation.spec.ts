/**
 * Preservation Property Tests — Authorized Access Paths Unchanged
 *
 * These tests capture the baseline behavior of permissionsForRole() on
 * UNFIXED code. They MUST PASS on the current code to confirm the
 * behavior we want to preserve through the bugfix.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6**
 */

import {
  ADMIN,
  BillingPermission,
  ClinicalPermission,
  DENTIST,
  DocumentPermission,
  EncounterPermission,
  MEDICAL_ASSISTANT,
  OrderPermission,
  PATIENT,
  PatientPermission,
  PHYSICIAN,
  REGISTERED_NURSE,
  SchedulingPermission,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
import fc from 'fast-check';
import { permissionsForRole } from '../useHealthcareRoles';

/**
 * The exact PATIENT_PERMISSIONS set as observed on unfixed code.
 * 4 read-only permissions for self-service portal access.
 */
const OBSERVED_PATIENT_PERMISSIONS: string[] = [
  PatientPermission.Read,
  ClinicalPermission.ClinicalRead,
  SchedulingPermission.SchedulingRead,
  BillingPermission.BillingRead,
];

/**
 * The exact ALL_PERMISSIONS set — 23 permissions covering every permission enum value.
 */
const OBSERVED_ALL_PERMISSIONS: string[] = [
  PatientPermission.Read,
  PatientPermission.Write,
  PatientPermission.Admin,
  ClinicalPermission.ClinicalRead,
  ClinicalPermission.ClinicalWrite,
  ClinicalPermission.ClinicalAdmin,
  EncounterPermission.EncounterRead,
  EncounterPermission.EncounterWrite,
  EncounterPermission.EncounterAdmin,
  DocumentPermission.DocumentRead,
  DocumentPermission.DocumentWrite,
  DocumentPermission.DocumentAdmin,
  OrderPermission.OrderRead,
  OrderPermission.OrderWrite,
  OrderPermission.OrderSign,
  OrderPermission.OrderAdmin,
  SchedulingPermission.SchedulingRead,
  SchedulingPermission.SchedulingWrite,
  SchedulingPermission.SchedulingAdmin,
  BillingPermission.BillingRead,
  BillingPermission.BillingWrite,
  BillingPermission.BillingSubmit,
  BillingPermission.BillingAdmin,
];

/** All known role code constants */
const ALL_KNOWN_ROLES: string[] = [
  PATIENT,
  ADMIN,
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
];

describe('Preservation: Authorized Access Paths Unchanged', () => {
  /**
   * Property: PATIENT role always returns exactly PATIENT_PERMISSIONS
   *
   * permissionsForRole(PATIENT) must return the 4 read-only permissions
   * regardless of how many times it is called.
   *
   * **Validates: Requirements 3.3, 3.5**
   */
  it('PATIENT role always returns exactly PATIENT_PERMISSIONS (4 read-only permissions)', () => {
    fc.assert(
      fc.property(fc.constant(PATIENT), (roleCode: string) => {
        const permissions = permissionsForRole(roleCode);

        // Exact length match
        if (permissions.length !== OBSERVED_PATIENT_PERMISSIONS.length)
          return false;

        // Every observed permission is present
        const allPresent = OBSERVED_PATIENT_PERMISSIONS.every((p) =>
          permissions.includes(p),
        );
        // No extra permissions beyond observed set
        const noExtras = permissions.every((p) =>
          OBSERVED_PATIENT_PERMISSIONS.includes(p),
        );

        return allPresent && noExtras;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: ADMIN role always returns exactly ALL_PERMISSIONS
   *
   * permissionsForRole(ADMIN) must return all 22 permissions.
   * This is correct behavior on unfixed code and must remain unchanged.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('ADMIN role always returns exactly ALL_PERMISSIONS (23 permissions)', () => {
    fc.assert(
      fc.property(fc.constant(ADMIN), (roleCode: string) => {
        const permissions = permissionsForRole(roleCode);

        // Exact length match
        if (permissions.length !== OBSERVED_ALL_PERMISSIONS.length)
          return false;

        // Every observed permission is present
        const allPresent = OBSERVED_ALL_PERMISSIONS.every((p) =>
          permissions.includes(p),
        );
        // No extra permissions beyond observed set
        const noExtras = permissions.every((p) =>
          OBSERVED_ALL_PERMISSIONS.includes(p),
        );

        return allPresent && noExtras;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any role code returns a subset of ALL_PERMISSIONS
   *
   * For any role code (known or unknown), permissionsForRole() never
   * returns a permission string that isn't in ALL_PERMISSIONS.
   * No invented permissions can leak through.
   *
   * **Validates: Requirements 3.5, 3.6**
   */
  it('any role code returns only permissions that exist in ALL_PERMISSIONS', () => {
    const roleArb = fc.oneof(
      fc.constantFrom(...ALL_KNOWN_ROLES),
      fc.string({ minLength: 1, maxLength: 20 }),
    );

    fc.assert(
      fc.property(roleArb, (roleCode: string) => {
        const permissions = permissionsForRole(roleCode);

        return permissions.every((p) => OBSERVED_ALL_PERMISSIONS.includes(p));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property: Returned permissions array has no duplicates
   *
   * For any role code, the permissions array returned by permissionsForRole()
   * must not contain duplicate entries.
   *
   * **Validates: Requirements 3.5, 3.6**
   */
  it('returned permissions array has no duplicates for any role code', () => {
    const roleArb = fc.oneof(
      fc.constantFrom(...ALL_KNOWN_ROLES),
      fc.string({ minLength: 1, maxLength: 20 }),
    );

    fc.assert(
      fc.property(roleArb, (roleCode: string) => {
        const permissions = permissionsForRole(roleCode);
        const unique = new Set(permissions);

        return unique.size === permissions.length;
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property: PATIENT_PERMISSIONS is a strict subset of ALL_PERMISSIONS
   *
   * Every permission in the PATIENT set must also exist in ALL_PERMISSIONS,
   * and PATIENT_PERMISSIONS must be smaller than ALL_PERMISSIONS.
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  it('PATIENT_PERMISSIONS is a strict subset of ALL_PERMISSIONS', () => {
    const patientPerms = permissionsForRole(PATIENT);
    const allPerms = permissionsForRole(ADMIN);

    // Strict subset: every patient perm is in all perms
    const isSubset = patientPerms.every((p) => allPerms.includes(p));
    expect(isSubset).toBe(true);

    // Strict: patient set is smaller
    expect(patientPerms.length).toBeLessThan(allPerms.length);
  });
});
