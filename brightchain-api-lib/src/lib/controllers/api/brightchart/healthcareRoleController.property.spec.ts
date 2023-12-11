/**
 * Property-Based Tests for HealthcareRoleController
 *
 * Feature: organization-role-management
 *
 * Property 4: Enrollment mode governs patient self-registration
 * Property 5: Inactive organizations reject new role assignments
 * Property 6: Staff role creation with valid SNOMED CT codes
 * Property 7: Duplicate role detection
 * Property 8: Staff-initiated patient registration bypasses enrollment mode
 * Property 12: Healthcare role retrieval returns active roles with populated org names
 * Property 13: Role soft-delete sets period.end
 * Property 14: Last admin guard
 * Property 16: Multi-organization and multi-role coexistence
 * Property 17: Organization members listing grouped by role code
 *
 * **Validates: Requirements 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 3.5, 4.1, 4.3, 4.4, 4.5,
 *              6.1, 6.2, 6.4, 7.1, 7.4, 8.4, 9.1, 9.2**
 */

import {
  ADMIN,
  DENTIST,
  MEDICAL_ASSISTANT,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  ROLE_CODE_DISPLAY,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
import {
  ApiErrorResponse,
  IApiMessageResponse,
} from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../../interfaces';
import { HealthcareRoleController } from './healthcareRoleController';
import { OrganizationController } from './organizationController';

// ─── Types ───────────────────────────────────────────────────────────────────

type RoleApiResponse = IApiMessageResponse | ApiErrorResponse;
type OrgApiResponse = IApiMessageResponse | ApiErrorResponse;

interface RoleControllerHandlers {
  handlers: {
    getMyRoles: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: RoleApiResponse }>;
    assignStaff: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: RoleApiResponse }>;
    registerPatient: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: RoleApiResponse }>;
    removeRole: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: RoleApiResponse }>;
  };
}

interface OrgControllerHandlers {
  handlers: {
    createOrganization: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: OrgApiResponse }>;
    updateOrganization: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: OrgApiResponse }>;
    listOrgMembers: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: OrgApiResponse }>;
  };
}

// ─── In-Memory DB Mock ───────────────────────────────────────────────────────

/**
 * Creates an in-memory mock of BrightDb that stores documents in Maps,
 * supporting find, findOne, insertOne, updateOne, countDocuments.
 *
 * Handles:
 * - $or conditions for period.end filtering
 * - $ne operator for isStaffAtOrg check
 * - $exists operator
 * - $gt operator for date comparisons
 * - $regex/$options for name search
 * - find().skip().limit().toArray() and find().toArray()
 */
function createInMemoryDb() {
  const collections: Record<string, Record<string, unknown>[]> = {};

  /**
   * Evaluate whether a single document matches a filter, including
   * $or, $ne, $exists, $gt, and nested dot-notation keys like 'period.end'.
   */
  function matchesFilter(
    doc: Record<string, unknown>,
    filter: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$or') {
        const orConditions = value as Record<string, unknown>[];
        const anyMatch = orConditions.some((cond) =>
          matchesSingleCondition(doc, cond),
        );
        if (!anyMatch) return false;
        continue;
      }

      // Handle dot-notation keys like 'period.end'
      const docValue = getNestedValue(doc, key);

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        const opObj = value as Record<string, unknown>;
        if ('$ne' in opObj) {
          if (docValue === opObj['$ne']) return false;
          continue;
        }
        if ('$exists' in opObj) {
          if (opObj['$exists'] === false && docValue !== undefined)
            return false;
          if (opObj['$exists'] === true && docValue === undefined) return false;
          continue;
        }
        if ('$gt' in opObj) {
          if (docValue === undefined || docValue === null) return false;
          if (!(docValue > (opObj['$gt'] as string))) return false;
          continue;
        }
        if ('$regex' in opObj) {
          const flags = (opObj['$options'] as string) ?? '';
          const regex = new RegExp(opObj['$regex'] as string, flags);
          if (!regex.test(docValue as string)) return false;
          continue;
        }
      }

      if (docValue !== value) return false;
    }
    return true;
  }

  function matchesSingleCondition(
    doc: Record<string, unknown>,
    cond: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(cond)) {
      const docValue = getNestedValue(doc, key);

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        const opObj = value as Record<string, unknown>;
        if ('$exists' in opObj) {
          if (opObj['$exists'] === false) return docValue === undefined;
          if (opObj['$exists'] === true) return docValue !== undefined;
        }
        if ('$gt' in opObj) {
          if (docValue === undefined || docValue === null) return false;
          return docValue > (opObj['$gt'] as string);
        }
      }

      // Direct equality (including null)
      if (docValue !== value) return false;
    }
    return true;
  }

  function getNestedValue(doc: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = doc;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  function getCollection(name: string) {
    if (!collections[name]) {
      collections[name] = [];
    }
    const store = collections[name];

    return {
      insertOne: jest.fn(async (doc: Record<string, unknown>) => {
        store.push({ ...doc });
        return { insertedId: doc['_id'] };
      }),
      findOne: jest.fn(async (filter: Record<string, unknown>) => {
        return store.find((doc) => matchesFilter(doc, filter)) ?? null;
      }),
      find: jest.fn((filter: Record<string, unknown>) => {
        const filtered = store.filter((doc) => matchesFilter(doc, filter));
        return {
          skip: (n: number) => ({
            limit: (l: number) => ({
              toArray: async () => filtered.slice(n, n + l),
            }),
          }),
          toArray: async () => filtered,
        };
      }),
      countDocuments: jest.fn(async (filter: Record<string, unknown>) => {
        return store.filter((doc) => matchesFilter(doc, filter)).length;
      }),
      updateOne: jest.fn(
        async (
          filter: Record<string, unknown>,
          update: { $set: Record<string, unknown> },
        ) => {
          const idx = store.findIndex((doc) => matchesFilter(doc, filter));
          if (idx >= 0 && update.$set) {
            // Handle dot-notation in $set (e.g. 'period.end')
            for (const [key, val] of Object.entries(update.$set)) {
              if (key.includes('.')) {
                const parts = key.split('.');
                let target: Record<string, unknown> = store[idx];
                for (let i = 0; i < parts.length - 1; i++) {
                  if (
                    !target[parts[i]] ||
                    typeof target[parts[i]] !== 'object'
                  ) {
                    target[parts[i]] = {};
                  }
                  target = target[parts[i]] as Record<string, unknown>;
                }
                target[parts[parts.length - 1]] = val;
              } else {
                store[idx][key] = val;
              }
            }
            return { modifiedCount: 1 };
          }
          return { modifiedCount: 0 };
        },
      ),
    };
  }

  const mockDb = {
    collection: (name: string) => getCollection(name),
    _collections: collections,
  };

  return mockDb;
}

// ─── Application & Controller Factories ──────────────────────────────────────

function createMockApplication(
  mockDb: ReturnType<typeof createInMemoryDb>,
): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: {
      has: (name: string) => name === 'db',
      get: (name: string) => (name === 'db' ? mockDb : undefined),
    },
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
}

function createTestControllers(db?: ReturnType<typeof createInMemoryDb>) {
  const mockDb = db ?? createInMemoryDb();
  const app = createMockApplication(mockDb);
  const roleController = new HealthcareRoleController(app);
  const orgController = new OrganizationController(app);
  return {
    db: mockDb,
    roleHandlers: (roleController as unknown as RoleControllerHandlers)
      .handlers,
    orgHandlers: (orgController as unknown as OrgControllerHandlers).handlers,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create an org and return its ID. The creating member gets auto-admin. */
async function createOrg(
  orgHandlers: OrgControllerHandlers['handlers'],
  memberId: string,
  name: string,
): Promise<string> {
  const result = await orgHandlers.createOrganization({
    body: { name },
    memberContext: { memberId },
  });
  const data = (result.response as unknown as { data: Record<string, unknown> })
    .data;
  return data['_id'] as string;
}

/** Set enrollment mode on an org (caller must be admin). */
async function setEnrollmentMode(
  orgHandlers: OrgControllerHandlers['handlers'],
  orgId: string,
  memberId: string,
  mode: 'open' | 'invite-only',
) {
  await orgHandlers.updateOrganization({
    params: { id: orgId },
    body: { enrollmentMode: mode },
    memberContext: { memberId },
  });
}

/** Deactivate an org (caller must be admin). */
async function deactivateOrg(
  orgHandlers: OrgControllerHandlers['handlers'],
  orgId: string,
  memberId: string,
) {
  await orgHandlers.updateOrganization({
    params: { id: orgId },
    body: { active: false },
    memberContext: { memberId },
  });
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const memberIdArb = fc.uuid();
const orgNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

const VALID_PRACTITIONER_CODES = [
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
  ADMIN,
];

const validPractitionerCodeArb = fc.constantFrom(...VALID_PRACTITIONER_CODES);

const invalidRoleCodeArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => !VALID_PRACTITIONER_CODES.includes(s) && s !== PATIENT);

const enrollmentModeArb = fc.constantFrom(
  'open' as const,
  'invite-only' as const,
);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('HealthcareRoleController Property Tests', () => {
  // ── Property 4 ─────────────────────────────────────────────────────────────

  describe('Property 4: Enrollment mode governs patient self-registration', () => {
    /**
     * **Validates: Requirements 2.2, 2.3, 4.1, 4.3**
     *
     * For any org with enrollmentMode='open', patient self-registration succeeds.
     * For any org with enrollmentMode='invite-only', self-registration without token returns 403.
     */
    it('open enrollment allows self-registration; invite-only without token returns 403', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          enrollmentModeArb,
          async (orgName, adminId, patientId, mode) => {
            fc.pre(adminId !== patientId);

            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);
            await setEnrollmentMode(orgHandlers, orgId, adminId, mode);

            const result = await roleHandlers.registerPatient({
              body: { organizationId: orgId },
              memberContext: { memberId: patientId },
            });

            if (mode === 'open') {
              expect(result.statusCode).toBe(201);
              const body = result.response as unknown as {
                success: boolean;
                data: Record<string, unknown>;
              };
              expect(body.success).toBe(true);
              expect(body.data['roleCode']).toBe(PATIENT);
              expect(body.data['organizationId']).toBe(orgId);
              expect(body.data['patientRef']).toBe(patientId);
            } else {
              expect(result.statusCode).toBe(403);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 5 ─────────────────────────────────────────────────────────────

  describe('Property 5: Inactive organizations reject new role assignments', () => {
    /**
     * **Validates: Requirements 2.5**
     *
     * For any org with active=false, staff assignment returns 400.
     */
    it('staff assignment to inactive org returns 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgName, adminId, targetId, roleCode) => {
            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);
            await deactivateOrg(orgHandlers, orgId, adminId);

            const result = await roleHandlers.assignStaff({
              body: {
                memberId: targetId,
                roleCode,
                organizationId: orgId,
              },
              memberContext: { memberId: adminId },
            });

            expect(result.statusCode).toBe(400);
            const body = result.response as unknown as {
              success: boolean;
              error: { code: string };
            };
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('INACTIVE_ORGANIZATION');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 6 ─────────────────────────────────────────────────────────────

  describe('Property 6: Staff role creation with valid SNOMED CT codes', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.5**
     *
     * For any valid SNOMED CT practitioner code, staff assignment succeeds with
     * correct roleCode, roleDisplay, practitionerRef, organizationId, period.start.
     * For any invalid code, returns 400.
     */
    it('valid practitioner code creates role with correct fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgName, adminId, targetId, roleCode) => {
            fc.pre(adminId !== targetId);

            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            const result = await roleHandlers.assignStaff({
              body: {
                memberId: targetId,
                roleCode,
                organizationId: orgId,
              },
              memberContext: { memberId: adminId },
            });

            // If roleCode is ADMIN and targetId === adminId, it would be a duplicate
            // since auto-admin was already created. But we pre-filtered adminId !== targetId.
            expect(result.statusCode).toBe(201);

            const body = result.response as unknown as {
              success: boolean;
              data: Record<string, unknown>;
            };
            expect(body.success).toBe(true);
            expect(body.data['roleCode']).toBe(roleCode);
            expect(body.data['roleDisplay']).toBe(ROLE_CODE_DISPLAY[roleCode]);
            expect(body.data['practitionerRef']).toBe(targetId);
            expect(body.data['organizationId']).toBe(orgId);
            expect(
              (body.data['period'] as { start: string }).start,
            ).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('invalid role code returns 400', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          invalidRoleCodeArb,
          async (orgName, adminId, targetId, badCode) => {
            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            const result = await roleHandlers.assignStaff({
              body: {
                memberId: targetId,
                roleCode: badCode,
                organizationId: orgId,
              },
              memberContext: { memberId: adminId },
            });

            expect(result.statusCode).toBe(400);
            const body = result.response as unknown as {
              success: boolean;
              error: { code: string };
            };
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('INVALID_ROLE_CODE');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 7 ─────────────────────────────────────────────────────────────

  describe('Property 7: Duplicate role detection', () => {
    /**
     * **Validates: Requirements 3.3, 4.5**
     *
     * For any (memberId, roleCode, organizationId) that already has an active role,
     * creating another returns 409.
     */
    it('duplicate staff role returns 409', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgName, adminId, targetId, roleCode) => {
            fc.pre(adminId !== targetId);

            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // First assignment succeeds
            const first = await roleHandlers.assignStaff({
              body: { memberId: targetId, roleCode, organizationId: orgId },
              memberContext: { memberId: adminId },
            });
            expect(first.statusCode).toBe(201);

            // Second assignment with same tuple returns 409
            const second = await roleHandlers.assignStaff({
              body: { memberId: targetId, roleCode, organizationId: orgId },
              memberContext: { memberId: adminId },
            });
            expect(second.statusCode).toBe(409);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('duplicate patient role returns 409', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          async (orgName, adminId, patientId) => {
            fc.pre(adminId !== patientId);

            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // First patient registration succeeds (open enrollment by default)
            const first = await roleHandlers.registerPatient({
              body: { organizationId: orgId },
              memberContext: { memberId: patientId },
            });
            expect(first.statusCode).toBe(201);

            // Second returns 409
            const second = await roleHandlers.registerPatient({
              body: { organizationId: orgId },
              memberContext: { memberId: patientId },
            });
            expect(second.statusCode).toBe(409);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 8 ─────────────────────────────────────────────────────────────

  describe('Property 8: Staff-initiated patient registration bypasses enrollment mode', () => {
    /**
     * **Validates: Requirements 4.4**
     *
     * For any org (regardless of enrollmentMode) and authorized staff,
     * staff-initiated patient registration succeeds.
     */
    it('staff-initiated registration succeeds regardless of enrollment mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          enrollmentModeArb,
          async (orgName, adminId, patientId, mode) => {
            fc.pre(adminId !== patientId);

            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);
            await setEnrollmentMode(orgHandlers, orgId, adminId, mode);

            // Staff-initiated: admin registers patient on behalf
            const result = await roleHandlers.registerPatient({
              body: {
                organizationId: orgId,
                targetMemberId: patientId,
              },
              memberContext: { memberId: adminId },
            });

            expect(result.statusCode).toBe(201);
            const body = result.response as unknown as {
              success: boolean;
              data: Record<string, unknown>;
            };
            expect(body.success).toBe(true);
            expect(body.data['roleCode']).toBe(PATIENT);
            expect(body.data['patientRef']).toBe(patientId);
            expect(body.data['memberId']).toBe(patientId);
            expect(body.data['organizationId']).toBe(orgId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 12 ────────────────────────────────────────────────────────────

  describe('Property 12: Healthcare role retrieval returns active roles with populated org names', () => {
    /**
     * **Validates: Requirements 6.1, 6.2, 6.4**
     *
     * For any member with N active roles, GET returns exactly N roles with
     * organization.display populated. Expired roles (period.end in past) are excluded.
     */
    it('returns active roles with org names, excludes expired roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          fc.integer({ min: 1, max: 4 }),
          async (orgName, adminId, targetId, extraRoleCount) => {
            fc.pre(adminId !== targetId);

            const db = createInMemoryDb();
            const { roleHandlers, orgHandlers } = createTestControllers(db);

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // Assign some staff roles to targetId
            const codesToAssign = VALID_PRACTITIONER_CODES.slice(
              0,
              extraRoleCount,
            );
            for (const code of codesToAssign) {
              await roleHandlers.assignStaff({
                body: {
                  memberId: targetId,
                  roleCode: code,
                  organizationId: orgId,
                },
                memberContext: { memberId: adminId },
              });
            }

            // Manually insert an expired role directly into the DB
            const pastDate = new Date(Date.now() - 86400000).toISOString();
            const now = new Date().toISOString();
            db._collections['healthcare_roles'].push({
              _id: crypto.randomUUID(),
              memberId: targetId,
              roleCode: 'EXPIRED_CODE',
              roleDisplay: 'Expired Role',
              organizationId: orgId,
              practitionerRef: targetId,
              period: { start: now, end: pastDate },
              createdBy: adminId,
              createdAt: now,
              updatedAt: now,
            });

            // GET roles for targetId
            const result = await roleHandlers.getMyRoles({
              memberContext: { memberId: targetId },
            });

            expect(result.statusCode).toBe(200);
            const body = result.response as unknown as {
              success: boolean;
              data: Array<{
                roleCode: string;
                organization: { display: string };
              }>;
            };
            expect(body.success).toBe(true);

            // Should have exactly the active roles we created (not the expired one)
            expect(body.data.length).toBe(codesToAssign.length);

            // Each role should have organization.display populated
            for (const role of body.data) {
              expect(role.organization.display).toBe(orgName);
            }

            // No expired role should appear
            const expiredInResult = body.data.find(
              (r) => r.roleCode === 'EXPIRED_CODE',
            );
            expect(expiredInResult).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 13 ────────────────────────────────────────────────────────────

  describe('Property 13: Role soft-delete sets period.end', () => {
    /**
     * **Validates: Requirements 7.1**
     *
     * For any active role, removing it sets period.end to approximately current
     * timestamp. The role no longer appears in GET /healthcare-roles responses.
     */
    it('soft-delete sets period.end and hides role from GET', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          async (orgName, adminId, targetId) => {
            fc.pre(adminId !== targetId);

            const db = createInMemoryDb();
            const { roleHandlers, orgHandlers } = createTestControllers(db);

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // Assign a PHYSICIAN role to targetId
            const assignResult = await roleHandlers.assignStaff({
              body: {
                memberId: targetId,
                roleCode: PHYSICIAN,
                organizationId: orgId,
              },
              memberContext: { memberId: adminId },
            });
            expect(assignResult.statusCode).toBe(201);
            const roleId = (
              assignResult.response as unknown as {
                data: Record<string, unknown>;
              }
            ).data['_id'] as string;

            const beforeDelete = Date.now();

            // Remove the role
            const removeResult = await roleHandlers.removeRole({
              params: { id: roleId },
              memberContext: { memberId: adminId },
            });

            const afterDelete = Date.now();

            expect(removeResult.statusCode).toBe(200);
            const removeBody = removeResult.response as unknown as {
              success: boolean;
              data: Record<string, unknown>;
            };
            expect(removeBody.success).toBe(true);

            // Verify period.end was set to approximately now
            const periodEnd = removeBody.data['period.end'] as string;
            expect(periodEnd).toBeDefined();
            const endTime = new Date(periodEnd).getTime();
            expect(endTime).toBeGreaterThanOrEqual(beforeDelete - 1000);
            expect(endTime).toBeLessThanOrEqual(afterDelete + 1000);

            // Verify role no longer appears in GET
            const getResult = await roleHandlers.getMyRoles({
              memberContext: { memberId: targetId },
            });
            expect(getResult.statusCode).toBe(200);
            const roles = (
              getResult.response as unknown as {
                data: Array<{ roleCode: string }>;
              }
            ).data;
            const found = roles.find((r) => r.roleCode === PHYSICIAN);
            expect(found).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 14 ────────────────────────────────────────────────────────────

  describe('Property 14: Last admin guard', () => {
    /**
     * **Validates: Requirements 7.4**
     *
     * For any org with exactly one active ADMIN role, attempting to remove it
     * returns 400.
     */
    it('cannot remove the last admin role at an org', async () => {
      await fc.assert(
        fc.asyncProperty(orgNameArb, memberIdArb, async (orgName, adminId) => {
          const db = createInMemoryDb();
          const { roleHandlers, orgHandlers } = createTestControllers(db);

          const orgId = await createOrg(orgHandlers, adminId, orgName);

          // Find the auto-created admin role
          const adminRole = db._collections['healthcare_roles'].find(
            (r) =>
              r['organizationId'] === orgId &&
              r['memberId'] === adminId &&
              r['roleCode'] === ADMIN,
          );
          expect(adminRole).toBeDefined();
          const adminRoleId = adminRole!['_id'] as string;

          // Attempt to remove the last admin
          const result = await roleHandlers.removeRole({
            params: { id: adminRoleId },
            memberContext: { memberId: adminId },
          });

          expect(result.statusCode).toBe(400);
          const body = result.response as unknown as {
            success: boolean;
            error: { code: string };
          };
          expect(body.success).toBe(false);
          expect(body.error.code).toBe('LAST_ADMIN');
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 16 ────────────────────────────────────────────────────────────

  describe('Property 16: Multi-organization and multi-role coexistence', () => {
    /**
     * **Validates: Requirements 9.1, 9.2**
     *
     * For any member, creating roles at multiple orgs AND multiple role codes
     * at same org all succeed. All roles retrievable via GET /.
     */
    it('member can hold roles at multiple orgs and multiple codes at same org', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          memberIdArb,
          fc.integer({ min: 2, max: 3 }),
          async (adminId, targetId, orgCount) => {
            fc.pre(adminId !== targetId);

            const { roleHandlers, orgHandlers } = createTestControllers();

            const orgIds: string[] = [];
            let totalExpectedRoles = 0;

            // Create multiple orgs and assign roles
            for (let i = 0; i < orgCount; i++) {
              const orgId = await createOrg(orgHandlers, adminId, `Org-${i}`);
              orgIds.push(orgId);

              // Assign PHYSICIAN at each org
              const r1 = await roleHandlers.assignStaff({
                body: {
                  memberId: targetId,
                  roleCode: PHYSICIAN,
                  organizationId: orgId,
                },
                memberContext: { memberId: adminId },
              });
              expect(r1.statusCode).toBe(201);
              totalExpectedRoles++;

              // Also assign REGISTERED_NURSE at same org (multi-role at same org)
              const r2 = await roleHandlers.assignStaff({
                body: {
                  memberId: targetId,
                  roleCode: REGISTERED_NURSE,
                  organizationId: orgId,
                },
                memberContext: { memberId: adminId },
              });
              expect(r2.statusCode).toBe(201);
              totalExpectedRoles++;
            }

            // GET all roles for targetId
            const result = await roleHandlers.getMyRoles({
              memberContext: { memberId: targetId },
            });

            expect(result.statusCode).toBe(200);
            const body = result.response as unknown as {
              success: boolean;
              data: Array<{
                roleCode: string;
                organization: { reference: string };
              }>;
            };
            expect(body.success).toBe(true);
            expect(body.data.length).toBe(totalExpectedRoles);

            // Verify roles span multiple orgs
            const orgRefs = new Set(
              body.data.map((r) => r.organization.reference),
            );
            expect(orgRefs.size).toBe(orgCount);

            // Verify multiple role codes at each org
            for (const orgId of orgIds) {
              const rolesAtOrg = body.data.filter(
                (r) => r.organization.reference === `Organization/${orgId}`,
              );
              expect(rolesAtOrg.length).toBe(2);
              const codes = new Set(rolesAtOrg.map((r) => r.roleCode));
              expect(codes.has(PHYSICIAN)).toBe(true);
              expect(codes.has(REGISTERED_NURSE)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 17 ────────────────────────────────────────────────────────────

  describe('Property 17: Organization members listing grouped by role code', () => {
    /**
     * **Validates: Requirements 8.4**
     *
     * For any org with active roles, GET /:id/members returns all active roles
     * grouped by roleCode. No expired roles included.
     */
    it('returns active roles grouped by roleCode, excludes expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          async (orgName, adminId, staffId, patientId) => {
            fc.pre(
              adminId !== staffId &&
                adminId !== patientId &&
                staffId !== patientId,
            );

            const db = createInMemoryDb();
            const { roleHandlers, orgHandlers } = createTestControllers(db);

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // Assign PHYSICIAN to staffId
            const staffResult = await roleHandlers.assignStaff({
              body: {
                memberId: staffId,
                roleCode: PHYSICIAN,
                organizationId: orgId,
              },
              memberContext: { memberId: adminId },
            });
            expect(staffResult.statusCode).toBe(201);

            // Register patientId as patient (open enrollment)
            const patientResult = await roleHandlers.registerPatient({
              body: { organizationId: orgId },
              memberContext: { memberId: patientId },
            });
            expect(patientResult.statusCode).toBe(201);

            // Insert an expired role directly
            const pastDate = new Date(Date.now() - 86400000).toISOString();
            const now = new Date().toISOString();
            db._collections['healthcare_roles'].push({
              _id: crypto.randomUUID(),
              memberId: 'expired-member',
              roleCode: PHYSICIAN,
              roleDisplay: ROLE_CODE_DISPLAY[PHYSICIAN],
              organizationId: orgId,
              practitionerRef: 'expired-member',
              period: { start: now, end: pastDate },
              createdBy: adminId,
              createdAt: now,
              updatedAt: now,
            });

            // GET /:id/members (admin only)
            const membersResult = await orgHandlers.listOrgMembers({
              params: { id: orgId },
              memberContext: { memberId: adminId },
            });

            expect(membersResult.statusCode).toBe(200);
            const body = membersResult.response as unknown as {
              success: boolean;
              data: Record<string, Record<string, unknown>[]>;
            };
            expect(body.success).toBe(true);

            // Should be grouped by roleCode
            const grouped = body.data;

            // ADMIN group should have adminId
            expect(grouped[ADMIN]).toBeDefined();
            expect(grouped[ADMIN].length).toBeGreaterThanOrEqual(1);

            // PHYSICIAN group should have staffId but NOT expired-member
            expect(grouped[PHYSICIAN]).toBeDefined();
            const physicianMembers = grouped[PHYSICIAN].map(
              (r) => r['memberId'],
            );
            expect(physicianMembers).toContain(staffId);
            expect(physicianMembers).not.toContain('expired-member');

            // PATIENT group should have patientId
            expect(grouped[PATIENT]).toBeDefined();
            expect(
              grouped[PATIENT].some((r) => r['memberId'] === patientId),
            ).toBe(true);

            // No expired roles in any group
            for (const roles of Object.values(grouped)) {
              for (const role of roles) {
                const period = role['period'] as { end?: string };
                if (period.end) {
                  expect(new Date(period.end).getTime()).toBeGreaterThan(
                    Date.now(),
                  );
                }
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
