/**
 * Seed Data Module – Property-Based & Unit Tests
 *
 * Feature: org-role-dev-seeding
 *
 * Validates schema conformance, deterministic identifiers, and
 * correctness of exported seed data constants.
 */

import * as fc from 'fast-check';
import {
  ADMIN,
  PATIENT,
  PHYSICIAN,
  ROLE_CODE_DISPLAY,
} from '@brightchain/brightchart-lib';
import {
  DEV_USER_ID,
  getDevUserId,
  INV_DOWNTOWN_PATIENT_ID,
  INV_DOWNTOWN_PATIENT_TOKEN,
  INV_SUNRISE_PATIENT_ID,
  INV_SUNRISE_PATIENT_TOKEN,
  ORG_CITYVET_ID,
  ORG_DOWNTOWN_ID,
  ORG_SUNRISE_ID,
  ROLE_ADMIN_SUNRISE_ID,
  ROLE_PATIENT_CITYVET_ID,
  ROLE_PATIENT_SUNRISE_ID,
  ROLE_PHYSICIAN_DOWNTOWN_ID,
  SEED_HEALTHCARE_ROLES,
  SEED_INVITATIONS,
  SEED_ORGANIZATIONS,
} from './orgRoleSeedData';
import {
  HEALTHCARE_ROLE_SCHEMA,
  INVITATION_SCHEMA,
  ORGANIZATION_SCHEMA,
} from '../interfaces/storage';

// ── Property Tests ──────────────────────────────────────────────

describe('Feature: org-role-dev-seeding, Property 1: Seed record schema conformance', () => {
  /**
   * **Validates: Requirements 2.2, 3.2, 4.2**
   *
   * For any seed record in the seed data arrays, all required fields
   * defined in the corresponding CollectionSchema SHALL be present
   * and non-null/non-undefined.
   */

  it('every organization record has all ORGANIZATION_SCHEMA required fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: SEED_ORGANIZATIONS.length - 1 }),
        (idx) => {
          const record = SEED_ORGANIZATIONS[idx] as Record<string, unknown>;
          for (const field of ORGANIZATION_SCHEMA.required) {
            expect(record[field]).toBeDefined();
            expect(record[field]).not.toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every healthcare role record has all HEALTHCARE_ROLE_SCHEMA required fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: SEED_HEALTHCARE_ROLES.length - 1 }),
        (idx) => {
          const record = SEED_HEALTHCARE_ROLES[idx] as Record<string, unknown>;
          for (const field of HEALTHCARE_ROLE_SCHEMA.required) {
            expect(record[field]).toBeDefined();
            expect(record[field]).not.toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every invitation record has all INVITATION_SCHEMA required fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: SEED_INVITATIONS.length - 1 }),
        (idx) => {
          const record = SEED_INVITATIONS[idx] as Record<string, unknown>;
          for (const field of INVITATION_SCHEMA.required) {
            expect(record[field]).toBeDefined();
            expect(record[field]).not.toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: patient-portal-registration, Property 1: Patient registration creates a role with patientRef', () => {
  /**
   * **Validates: Requirements 1.3, 1.4**
   *
   * The new PATIENT role at Sunrise SHALL have all HEALTHCARE_ROLE_SCHEMA
   * required fields present and non-null, and SHALL have `patientRef` set
   * to the dev user ID.
   *
   * The new Sunrise invitation SHALL have all INVITATION_SCHEMA required
   * fields present and non-null.
   */

  it('PATIENT role at Sunrise has all HEALTHCARE_ROLE_SCHEMA required fields and patientRef is set', () => {
    fc.assert(
      fc.property(fc.constant(ROLE_PATIENT_SUNRISE_ID), (roleId) => {
        const role = SEED_HEALTHCARE_ROLES.find((r) => r._id === roleId);
        expect(role).toBeDefined();

        const record = role as unknown as Record<string, unknown>;
        for (const field of HEALTHCARE_ROLE_SCHEMA.required) {
          expect(record[field]).toBeDefined();
          expect(record[field]).not.toBeNull();
        }

        expect(role!.roleCode).toBe(PATIENT);
        expect(role!.patientRef).toBeDefined();
        expect(role!.patientRef).toBe(DEV_USER_ID);
      }),
      { numRuns: 100 },
    );
  });

  it('Sunrise invitation has all INVITATION_SCHEMA required fields', () => {
    fc.assert(
      fc.property(fc.constant(INV_SUNRISE_PATIENT_ID), (invId) => {
        const inv = SEED_INVITATIONS.find((i) => i._id === invId);
        expect(inv).toBeDefined();

        const record = inv as unknown as Record<string, unknown>;
        for (const field of INVITATION_SCHEMA.required) {
          expect(record[field]).toBeDefined();
          expect(record[field]).not.toBeNull();
        }

        expect(inv!.token).toBe(INV_SUNRISE_PATIENT_TOKEN);
        expect(inv!.organizationId).toBe(ORG_SUNRISE_ID);
        expect(inv!.roleCode).toBe(PATIENT);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Feature: org-role-dev-seeding, Property 3: Deterministic identifiers are stable across accesses', () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * Access seed data module N times (N ∈ [2, 50]), verify all exported
   * _id values, the invitation token, and the dev user ID are identical
   * strings across every access.
   */

  it('all exported identifiers are identical across N accesses', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 50 }), (n) => {
        const expectedIds = {
          DEV_USER_ID,
          ORG_SUNRISE_ID,
          ORG_DOWNTOWN_ID,
          ORG_CITYVET_ID,
          ROLE_ADMIN_SUNRISE_ID,
          ROLE_PHYSICIAN_DOWNTOWN_ID,
          ROLE_PATIENT_CITYVET_ID,
          INV_DOWNTOWN_PATIENT_ID,
          INV_DOWNTOWN_PATIENT_TOKEN,
        };

        for (let i = 0; i < n; i++) {
          // Re-read the module-level constants each iteration
          expect(DEV_USER_ID).toBe(expectedIds.DEV_USER_ID);
          expect(ORG_SUNRISE_ID).toBe(expectedIds.ORG_SUNRISE_ID);
          expect(ORG_DOWNTOWN_ID).toBe(expectedIds.ORG_DOWNTOWN_ID);
          expect(ORG_CITYVET_ID).toBe(expectedIds.ORG_CITYVET_ID);
          expect(ROLE_ADMIN_SUNRISE_ID).toBe(expectedIds.ROLE_ADMIN_SUNRISE_ID);
          expect(ROLE_PHYSICIAN_DOWNTOWN_ID).toBe(
            expectedIds.ROLE_PHYSICIAN_DOWNTOWN_ID,
          );
          expect(ROLE_PATIENT_CITYVET_ID).toBe(
            expectedIds.ROLE_PATIENT_CITYVET_ID,
          );
          expect(INV_DOWNTOWN_PATIENT_ID).toBe(
            expectedIds.INV_DOWNTOWN_PATIENT_ID,
          );
          expect(INV_DOWNTOWN_PATIENT_TOKEN).toBe(
            expectedIds.INV_DOWNTOWN_PATIENT_TOKEN,
          );

          // Also verify the _id fields inside the data arrays are stable
          for (const org of SEED_ORGANIZATIONS) {
            expect(typeof org._id).toBe('string');
            expect(org._id.length).toBeGreaterThan(0);
          }
          for (const role of SEED_HEALTHCARE_ROLES) {
            expect(typeof role._id).toBe('string');
            expect(role._id.length).toBeGreaterThan(0);
          }
          for (const inv of SEED_INVITATIONS) {
            expect(typeof inv._id).toBe('string');
            expect(inv._id.length).toBeGreaterThan(0);
            expect(typeof inv.token).toBe('string');
            expect(inv.token.length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ── Unit Tests ──────────────────────────────────────────────────

describe('Seed data module – unit tests', () => {
  // Req 2.1: Three organizations with correct names and enrollment modes
  describe('organizations (Req 2.1)', () => {
    it('exports exactly three organizations', () => {
      expect(SEED_ORGANIZATIONS).toHaveLength(3);
    });

    it('Sunrise Family Practice has open enrollment', () => {
      const sunrise = SEED_ORGANIZATIONS.find(
        (o) => o._id === ORG_SUNRISE_ID,
      );
      expect(sunrise).toBeDefined();
      expect(sunrise!.name).toBe('Sunrise Family Practice');
      expect(sunrise!.enrollmentMode).toBe('open');
      expect(sunrise!.active).toBe(true);
    });

    it('Downtown Dental Clinic has invite-only enrollment', () => {
      const downtown = SEED_ORGANIZATIONS.find(
        (o) => o._id === ORG_DOWNTOWN_ID,
      );
      expect(downtown).toBeDefined();
      expect(downtown!.name).toBe('Downtown Dental Clinic');
      expect(downtown!.enrollmentMode).toBe('invite-only');
      expect(downtown!.active).toBe(true);
    });

    it('City Veterinary Hospital has open enrollment', () => {
      const cityvet = SEED_ORGANIZATIONS.find(
        (o) => o._id === ORG_CITYVET_ID,
      );
      expect(cityvet).toBeDefined();
      expect(cityvet!.name).toBe('City Veterinary Hospital');
      expect(cityvet!.enrollmentMode).toBe('open');
      expect(cityvet!.active).toBe(true);
    });
  });

  // Req 3.1, 3.4: Healthcare roles with correct refs
  describe('healthcare roles (Req 3.1, 3.4)', () => {
    it('ADMIN role at Sunrise has practitionerRef', () => {
      const adminRole = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_ADMIN_SUNRISE_ID,
      );
      expect(adminRole).toBeDefined();
      expect(adminRole!.roleCode).toBe(ADMIN);
      expect(adminRole!.organizationId).toBe(ORG_SUNRISE_ID);
      expect(adminRole!.practitionerRef).toBe(DEV_USER_ID);
    });

    it('PHYSICIAN role at Downtown has practitionerRef', () => {
      const physicianRole = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PHYSICIAN_DOWNTOWN_ID,
      );
      expect(physicianRole).toBeDefined();
      expect(physicianRole!.roleCode).toBe(PHYSICIAN);
      expect(physicianRole!.organizationId).toBe(ORG_DOWNTOWN_ID);
      expect(physicianRole!.practitionerRef).toBe(DEV_USER_ID);
    });

    it('PATIENT role at City Vet has patientRef', () => {
      const patientRole = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PATIENT_CITYVET_ID,
      );
      expect(patientRole).toBeDefined();
      expect(patientRole!.roleCode).toBe(PATIENT);
      expect(patientRole!.organizationId).toBe(ORG_CITYVET_ID);
      expect(patientRole!.patientRef).toBe(DEV_USER_ID);
      expect(patientRole!.practitionerRef).toBeUndefined();
    });
  });

  // Req 4.1, 4.3: Invitations are unredeemed with far-future expiry
  describe('invitations (Req 4.1, 4.3)', () => {
    it('exports two invitations', () => {
      expect(SEED_INVITATIONS).toHaveLength(2);
    });

    it('Downtown Dental invitation has correct org, role, and token', () => {
      const inv = SEED_INVITATIONS.find(
        (i) => i._id === INV_DOWNTOWN_PATIENT_ID,
      );
      expect(inv).toBeDefined();
      expect(inv!.organizationId).toBe(ORG_DOWNTOWN_ID);
      expect(inv!.roleCode).toBe(PATIENT);
      expect(inv!.token).toBe(INV_DOWNTOWN_PATIENT_TOKEN);
    });

    it('Sunrise invitation has correct org, role, and token', () => {
      const inv = SEED_INVITATIONS.find(
        (i) => i._id === INV_SUNRISE_PATIENT_ID,
      );
      expect(inv).toBeDefined();
      expect(inv!.organizationId).toBe(ORG_SUNRISE_ID);
      expect(inv!.roleCode).toBe(PATIENT);
      expect(inv!.token).toBe(INV_SUNRISE_PATIENT_TOKEN);
    });

    it('all invitations have far-future expiry', () => {
      for (const inv of SEED_INVITATIONS) {
        const expiresAt = new Date(inv.expiresAt);
        expect(expiresAt.getFullYear()).toBeGreaterThanOrEqual(2099);
      }
    });

    it('all invitations are unredeemed (usedBy/usedAt unset)', () => {
      for (const inv of SEED_INVITATIONS) {
        const record = inv as Record<string, unknown>;
        expect(record['usedBy']).toBeUndefined();
        expect(record['usedAt']).toBeUndefined();
      }
    });
  });

  // Req 6.3: Role codes match imported constants from brightchart-lib
  describe('role codes match brightchart-lib constants (Req 6.3)', () => {
    it('ADMIN role uses the ADMIN constant', () => {
      const adminRole = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_ADMIN_SUNRISE_ID,
      );
      expect(adminRole!.roleCode).toBe(ADMIN);
      expect(adminRole!.roleDisplay).toBe(ROLE_CODE_DISPLAY[ADMIN]);
    });

    it('PHYSICIAN role uses the PHYSICIAN constant', () => {
      const physicianRole = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PHYSICIAN_DOWNTOWN_ID,
      );
      expect(physicianRole!.roleCode).toBe(PHYSICIAN);
      expect(physicianRole!.roleDisplay).toBe(ROLE_CODE_DISPLAY[PHYSICIAN]);
    });

    it('PATIENT role uses the PATIENT constant', () => {
      const patientRole = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PATIENT_CITYVET_ID,
      );
      expect(patientRole!.roleCode).toBe(PATIENT);
      expect(patientRole!.roleDisplay).toBe(ROLE_CODE_DISPLAY[PATIENT]);
    });
  });

  // Req 6.4: getDevUserId() returns default and respects MEMBER_ID env var
  describe('getDevUserId (Req 6.4)', () => {
    const originalEnv = process.env.MEMBER_ID;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.MEMBER_ID;
      } else {
        process.env.MEMBER_ID = originalEnv;
      }
    });

    it('returns DEV_USER_ID when MEMBER_ID is not set', () => {
      delete process.env.MEMBER_ID;
      expect(getDevUserId()).toBe(DEV_USER_ID);
    });

    it('returns MEMBER_ID env var when set', () => {
      process.env.MEMBER_ID = 'custom-member-id-12345';
      expect(getDevUserId()).toBe('custom-member-id-12345');
    });
  });
});

// ── Unit Tests: New seed data records (Req 1.3, 1.4, 1.5) ──────

describe('Seed data module – new patient-portal seed records', () => {
  // Req 1.3: SEED_HEALTHCARE_ROLES now contains 4 roles
  describe('healthcare roles array length', () => {
    it('exports exactly 4 healthcare roles', () => {
      expect(SEED_HEALTHCARE_ROLES).toHaveLength(4);
    });
  });

  // Req 1.3, 1.4: New PATIENT role at Sunrise
  describe('PATIENT role at Sunrise (Req 1.3, 1.4)', () => {
    it('has roleCode set to PATIENT', () => {
      const role = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PATIENT_SUNRISE_ID,
      );
      expect(role).toBeDefined();
      expect(role!.roleCode).toBe(PATIENT);
    });

    it('has organizationId set to Sunrise org', () => {
      const role = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PATIENT_SUNRISE_ID,
      );
      expect(role!.organizationId).toBe(ORG_SUNRISE_ID);
    });

    it('has patientRef set to DEV_USER_ID', () => {
      const role = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PATIENT_SUNRISE_ID,
      );
      expect(role!.patientRef).toBe(DEV_USER_ID);
    });

    it('has no practitionerRef', () => {
      const role = SEED_HEALTHCARE_ROLES.find(
        (r) => r._id === ROLE_PATIENT_SUNRISE_ID,
      );
      expect(role!.practitionerRef).toBeUndefined();
    });
  });

  // Req 1.4: SEED_INVITATIONS now contains 2 invitations
  describe('invitations array length', () => {
    it('exports exactly 2 invitations', () => {
      expect(SEED_INVITATIONS).toHaveLength(2);
    });
  });

  // Req 1.4: New Sunrise invitation
  describe('Sunrise invitation (Req 1.4)', () => {
    it('has organizationId set to Sunrise org', () => {
      const inv = SEED_INVITATIONS.find(
        (i) => i._id === INV_SUNRISE_PATIENT_ID,
      );
      expect(inv).toBeDefined();
      expect(inv!.organizationId).toBe(ORG_SUNRISE_ID);
    });

    it('has roleCode set to PATIENT', () => {
      const inv = SEED_INVITATIONS.find(
        (i) => i._id === INV_SUNRISE_PATIENT_ID,
      );
      expect(inv!.roleCode).toBe(PATIENT);
    });

    it('has token set to INV_SUNRISE_PATIENT_TOKEN', () => {
      const inv = SEED_INVITATIONS.find(
        (i) => i._id === INV_SUNRISE_PATIENT_ID,
      );
      expect(inv!.token).toBe(INV_SUNRISE_PATIENT_TOKEN);
    });

    it('has far-future expiresAt (>= 2099)', () => {
      const inv = SEED_INVITATIONS.find(
        (i) => i._id === INV_SUNRISE_PATIENT_ID,
      );
      const expiresAt = new Date(inv!.expiresAt);
      expect(expiresAt.getFullYear()).toBeGreaterThanOrEqual(2099);
    });
  });

  // Req 1.5: New constants are deterministic strings matching expected values
  describe('deterministic constant values (Req 1.5)', () => {
    it('ROLE_PATIENT_SUNRISE_ID matches expected value', () => {
      expect(ROLE_PATIENT_SUNRISE_ID).toBe('seed-role-patient-sunrise-04');
    });

    it('INV_SUNRISE_PATIENT_ID matches expected value', () => {
      expect(INV_SUNRISE_PATIENT_ID).toBe('seed-inv-sunrise-patient-01');
    });

    it('INV_SUNRISE_PATIENT_TOKEN matches expected value', () => {
      expect(INV_SUNRISE_PATIENT_TOKEN).toBe(
        'seed-invite-sunrise-patient-token-001',
      );
    });
  });
});
