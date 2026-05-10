/**
 * Property-Based Tests for Patient ACL Service
 *
 * Verifies:
 * (a) a member with Admin permission passes all permission checks
 * (b) a member without a specific permission is denied
 * (c) ACL with no members denies all access
 * (d) permission evaluation is deterministic for the same inputs
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * @module access/__tests__/patientAcl.property.spec
 */

import fc from 'fast-check';
import {
  PatientPermission,
  type IPatientACL,
  type IPatientACLMemberPermissions,
} from '../patientAcl';
import { evaluatePatientAccess } from '../patientAclEvaluator';

jest.setTimeout(30000);

// --- Generators ---

const allPatientPermissions = Object.values(PatientPermission);

const nonAdminPatientPermissions = allPatientPermissions.filter(
  (p) => p !== PatientPermission.Admin,
);

const patientPermissionArb: fc.Arbitrary<PatientPermission> = fc.constantFrom(
  ...allPatientPermissions,
);

const memberIdArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z][a-z0-9-]{2,19}$/)
  .filter((s) => s.length >= 3);

/**
 * Build a minimal IPatientACL with the given patient members.
 * Pool-level fields are set to sensible defaults.
 */
function buildPatientACL(
  patientMembers: IPatientACLMemberPermissions<string>[],
): IPatientACL<string> {
  return {
    poolId: 'patient-pool',
    owner: 'owner-node',
    members: [],
    publicRead: false,
    publicWrite: false,
    approvalSignatures: [],
    version: 1,
    updatedAt: new Date(),
    patientMembers,
  };
}

// --- Property Tests ---

describe('Patient ACL - Property Tests', () => {
  /**
   * Property (a): A member with Admin permission passes all permission checks.
   *
   * **Validates: Requirements 7.1**
   */
  describe('Admin permission implies all other permissions', () => {
    it('a member with Admin passes every permission check', () => {
      fc.assert(
        fc.property(
          memberIdArb,
          patientPermissionArb,
          (memberId, requiredPermission) => {
            const acl = buildPatientACL([
              {
                memberId,
                patientPermissions: [PatientPermission.Admin],
              },
            ]);
            expect(
              evaluatePatientAccess(acl, memberId, requiredPermission),
            ).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('Admin among other permissions still grants all access', () => {
      fc.assert(
        fc.property(
          memberIdArb,
          fc.subarray(nonAdminPatientPermissions, { minLength: 0 }),
          patientPermissionArb,
          (memberId, extraPerms, requiredPermission) => {
            const acl = buildPatientACL([
              {
                memberId,
                patientPermissions: [PatientPermission.Admin, ...extraPerms],
              },
            ]);
            expect(
              evaluatePatientAccess(acl, memberId, requiredPermission),
            ).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (b): A member without a specific permission is denied.
   *
   * **Validates: Requirements 7.2**
   */
  describe('member without required permission is denied', () => {
    it('a member with only non-matching permissions is denied', () => {
      fc.assert(
        fc.property(
          memberIdArb,
          fc.constantFrom(...nonAdminPatientPermissions),
          (memberId, requiredPermission) => {
            // Give the member all permissions EXCEPT Admin and the required one
            const grantedPerms = nonAdminPatientPermissions.filter(
              (p) => p !== requiredPermission,
            );
            const acl = buildPatientACL([
              {
                memberId,
                patientPermissions: grantedPerms,
              },
            ]);
            expect(
              evaluatePatientAccess(acl, memberId, requiredPermission),
            ).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('a member not in patientMembers is denied', () => {
      fc.assert(
        fc.property(
          memberIdArb,
          memberIdArb,
          patientPermissionArb,
          (existingMember, requestingMember, requiredPermission) => {
            fc.pre(existingMember !== requestingMember);
            const acl = buildPatientACL([
              {
                memberId: existingMember,
                patientPermissions: allPatientPermissions,
              },
            ]);
            expect(
              evaluatePatientAccess(acl, requestingMember, requiredPermission),
            ).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (c): ACL with no members denies all access.
   *
   * **Validates: Requirements 7.3**
   */
  describe('empty ACL denies all access', () => {
    it('any member is denied on an ACL with no patientMembers', () => {
      fc.assert(
        fc.property(
          memberIdArb,
          patientPermissionArb,
          (memberId, requiredPermission) => {
            const acl = buildPatientACL([]);
            expect(
              evaluatePatientAccess(acl, memberId, requiredPermission),
            ).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (d): Permission evaluation is deterministic for the same inputs.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  describe('deterministic evaluation', () => {
    it('evaluating the same ACL, member, and permission twice yields the same result', () => {
      fc.assert(
        fc.property(
          memberIdArb,
          fc.subarray(allPatientPermissions, { minLength: 0 }),
          patientPermissionArb,
          (memberId, grantedPerms, requiredPermission) => {
            const acl = buildPatientACL([
              {
                memberId,
                patientPermissions: grantedPerms,
              },
            ]);
            const result1 = evaluatePatientAccess(
              acl,
              memberId,
              requiredPermission,
            );
            const result2 = evaluatePatientAccess(
              acl,
              memberId,
              requiredPermission,
            );
            expect(result1).toBe(result2);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
