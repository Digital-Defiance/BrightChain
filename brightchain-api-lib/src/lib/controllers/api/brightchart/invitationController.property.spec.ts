/**
 * Property-Based Tests for InvitationController
 *
 * Feature: organization-role-management
 *
 * Property 9: Invitation creation invariants
 * Property 10: Invitation redemption marks as used
 * Property 11: Used or expired invitations are rejected
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
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
import { InvitationController } from './invitationController';
import { OrganizationController } from './organizationController';

// ─── Types ───────────────────────────────────────────────────────────────────

type InvApiResponse = IApiMessageResponse | ApiErrorResponse;
type OrgApiResponse = IApiMessageResponse | ApiErrorResponse;

interface InvControllerHandlers {
  handlers: {
    createInvitation: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: InvApiResponse }>;
    redeemInvitation: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: InvApiResponse }>;
  };
}

interface OrgControllerHandlers {
  handlers: {
    createOrganization: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: OrgApiResponse }>;
  };
}

// ─── In-Memory DB Mock ───────────────────────────────────────────────────────

/**
 * Creates an in-memory mock of BrightDb that stores documents in Maps,
 * supporting find, findOne, insertOne, updateOne, countDocuments.
 */
function createInMemoryDb() {
  const collections: Record<string, Record<string, unknown>[]> = {};

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
  const invController = new InvitationController(app);
  const orgController = new OrganizationController(app);
  return {
    db: mockDb,
    invHandlers: (invController as unknown as InvControllerHandlers).handlers,
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

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const memberIdArb = fc.uuid();
const orgNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

const ALL_VALID_INVITATION_CODES = [
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
  ADMIN,
  PATIENT,
];

const validInvitationRoleCodeArb = fc.constantFrom(
  ...ALL_VALID_INVITATION_CODES,
);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('InvitationController Property Tests', () => {
  // ── Property 9 ─────────────────────────────────────────────────────────────

  describe('Property 9: Invitation creation invariants', () => {
    /**
     * **Validates: Requirements 5.1, 5.2**
     *
     * For any invitation creation with valid role code, produces invitation with
     * unique token, correct orgId and roleCode, expiresAt ~7 days after createdAt.
     */
    it('creates invitation with unique token, correct orgId/roleCode, and ~7-day expiry', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, roleCode) => {
            const { invHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            const result = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode },
              memberContext: { memberId: adminId },
            });

            expect(result.statusCode).toBe(201);
            const body = result.response as unknown as {
              success: boolean;
              data: Record<string, unknown>;
            };
            expect(body.success).toBe(true);

            const inv = body.data;

            // Token is a non-empty string
            expect(typeof inv['token']).toBe('string');
            expect((inv['token'] as string).length).toBeGreaterThan(0);

            // Correct orgId and roleCode
            expect(inv['organizationId']).toBe(orgId);
            expect(inv['roleCode']).toBe(roleCode);

            // createdBy is the caller
            expect(inv['createdBy']).toBe(adminId);

            // expiresAt is approximately 7 days after createdAt
            const createdAt = new Date(inv['createdAt'] as string).getTime();
            const expiresAt = new Date(inv['expiresAt'] as string).getTime();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const diff = expiresAt - createdAt;

            // Allow 5 seconds tolerance for execution time
            expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 5000);
            expect(diff).toBeLessThanOrEqual(sevenDaysMs + 5000);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('each invitation gets a unique token', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, roleCode) => {
            const { invHandlers, orgHandlers } = createTestControllers();

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            const result1 = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode },
              memberContext: { memberId: adminId },
            });
            const result2 = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode },
              memberContext: { memberId: adminId },
            });

            expect(result1.statusCode).toBe(201);
            expect(result2.statusCode).toBe(201);

            const token1 = (
              result1.response as unknown as { data: Record<string, unknown> }
            ).data['token'];
            const token2 = (
              result2.response as unknown as { data: Record<string, unknown> }
            ).data['token'];

            expect(token1).not.toBe(token2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 10 ────────────────────────────────────────────────────────────

  describe('Property 10: Invitation redemption marks as used', () => {
    /**
     * **Validates: Requirements 5.3**
     *
     * For any valid, unexpired, unused invitation, redeeming sets usedBy and usedAt,
     * creates corresponding healthcare role.
     */
    it('redeeming a valid invitation sets usedBy/usedAt and creates role', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, redeemerId, roleCode) => {
            fc.pre(adminId !== redeemerId);

            const db = createInMemoryDb();
            const { invHandlers, orgHandlers } = createTestControllers(db);

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // Create invitation
            const createResult = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode },
              memberContext: { memberId: adminId },
            });
            expect(createResult.statusCode).toBe(201);
            const token = (
              createResult.response as unknown as {
                data: Record<string, unknown>;
              }
            ).data['token'] as string;

            const beforeRedeem = Date.now();

            // Redeem invitation
            const redeemResult = await invHandlers.redeemInvitation({
              body: { token },
              memberContext: { memberId: redeemerId },
            });

            const afterRedeem = Date.now();

            expect(redeemResult.statusCode).toBe(201);
            const redeemBody = redeemResult.response as unknown as {
              success: boolean;
              data: {
                invitation: Record<string, unknown>;
                role: Record<string, unknown>;
              };
            };
            expect(redeemBody.success).toBe(true);

            // Verify invitation is marked as used in the DB
            const invInDb = db._collections['invitations']?.find(
              (d) => d['token'] === token,
            );
            expect(invInDb).toBeDefined();
            expect(invInDb!['usedBy']).toBe(redeemerId);
            expect(invInDb!['usedAt']).toBeDefined();
            const usedAtTime = new Date(invInDb!['usedAt'] as string).getTime();
            expect(usedAtTime).toBeGreaterThanOrEqual(beforeRedeem - 1000);
            expect(usedAtTime).toBeLessThanOrEqual(afterRedeem + 1000);

            // Verify healthcare role was created
            const role = redeemBody.data.role;
            expect(role['memberId']).toBe(redeemerId);
            expect(role['roleCode']).toBe(roleCode);
            expect(role['roleDisplay']).toBe(ROLE_CODE_DISPLAY[roleCode]);
            expect(role['organizationId']).toBe(orgId);

            // Verify correct ref type based on role
            if (roleCode === PATIENT) {
              expect(role['patientRef']).toBe(redeemerId);
            } else {
              expect(role['practitionerRef']).toBe(redeemerId);
            }

            // Verify role exists in DB
            const roleInDb = db._collections['healthcare_roles']?.find(
              (d) => d['_id'] === role['_id'],
            );
            expect(roleInDb).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 11 ────────────────────────────────────────────────────────────

  describe('Property 11: Used or expired invitations are rejected', () => {
    /**
     * **Validates: Requirements 5.4, 5.5**
     *
     * For any already-redeemed or expired invitation, attempting to redeem
     * returns 410 and creates no new role.
     */
    it('already-redeemed invitation returns 410', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, firstRedeemer, secondRedeemer, roleCode) => {
            fc.pre(
              adminId !== firstRedeemer &&
                adminId !== secondRedeemer &&
                firstRedeemer !== secondRedeemer,
            );

            const db = createInMemoryDb();
            const { invHandlers, orgHandlers } = createTestControllers(db);

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // Create invitation
            const createResult = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode },
              memberContext: { memberId: adminId },
            });
            const token = (
              createResult.response as unknown as {
                data: Record<string, unknown>;
              }
            ).data['token'] as string;

            // First redemption succeeds
            const first = await invHandlers.redeemInvitation({
              body: { token },
              memberContext: { memberId: firstRedeemer },
            });
            expect(first.statusCode).toBe(201);

            const rolesBeforeSecond =
              db._collections['healthcare_roles']?.length ?? 0;

            // Second redemption returns 410
            const second = await invHandlers.redeemInvitation({
              body: { token },
              memberContext: { memberId: secondRedeemer },
            });
            expect(second.statusCode).toBe(410);
            const errBody = second.response as unknown as {
              success: boolean;
              error: { code: string };
            };
            expect(errBody.success).toBe(false);
            expect(errBody.error.code).toBe('GONE');

            // No new role was created
            const rolesAfterSecond =
              db._collections['healthcare_roles']?.length ?? 0;
            expect(rolesAfterSecond).toBe(rolesBeforeSecond);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('expired invitation returns 410', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, redeemerId, roleCode) => {
            fc.pre(adminId !== redeemerId);

            const db = createInMemoryDb();
            const { invHandlers, orgHandlers } = createTestControllers(db);

            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // Create invitation
            const createResult = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode },
              memberContext: { memberId: adminId },
            });
            const token = (
              createResult.response as unknown as {
                data: Record<string, unknown>;
              }
            ).data['token'] as string;

            // Manually expire the invitation in the DB
            const inv = db._collections['invitations']?.find(
              (d) => d['token'] === token,
            );
            expect(inv).toBeDefined();
            inv!['expiresAt'] = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

            const rolesBefore =
              db._collections['healthcare_roles']?.length ?? 0;

            // Attempt to redeem expired invitation
            const result = await invHandlers.redeemInvitation({
              body: { token },
              memberContext: { memberId: redeemerId },
            });

            expect(result.statusCode).toBe(410);
            const errBody = result.response as unknown as {
              success: boolean;
              error: { code: string };
            };
            expect(errBody.success).toBe(false);
            expect(errBody.error.code).toBe('GONE');

            // No new role was created
            const rolesAfter = db._collections['healthcare_roles']?.length ?? 0;
            expect(rolesAfter).toBe(rolesBefore);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
