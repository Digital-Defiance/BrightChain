/**
 * Property-Based Tests for OrganizationController
 *
 * Feature: organization-role-management
 *
 * Property 1: Organization creation produces a complete record with auto-admin
 * Property 2: Organization update preserves unchanged fields
 * Property 15: Organization listing returns only active orgs with search filtering
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 3.5, 8.1, 8.2, 8.3**
 */

import { ADMIN, ROLE_CODE_DISPLAY } from '@brightchain/brightchart-lib';
import {
  ApiErrorResponse,
  IApiMessageResponse,
} from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../../interfaces';
import { OrganizationController } from './organizationController';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgApiResponse = IApiMessageResponse | ApiErrorResponse;

interface OrgControllerHandlers {
  handlers: {
    createOrganization: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: OrgApiResponse }>;
    listOrganizations: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: OrgApiResponse }>;
    getOrganization: (
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
 * supporting basic find, findOne, insertOne, updateOne, countDocuments.
 */
function createInMemoryDb() {
  const collections: Record<string, Record<string, unknown>[]> = {};

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
        return (
          store.find((doc) => {
            for (const [key, value] of Object.entries(filter)) {
              if (key === '$or') continue; // skip complex queries for findOne
              if (doc[key] !== value) return false;
            }
            return true;
          }) ?? null
        );
      }),
      find: jest.fn((filter: Record<string, unknown>) => {
        let filtered = store.filter((doc) => {
          for (const [key, value] of Object.entries(filter)) {
            if (key === '$or') continue;
            if (key === 'name' && typeof value === 'object' && value !== null) {
              // Handle regex filter for search
              const regexFilter = value as {
                $regex?: string;
                $options?: string;
              };
              if (regexFilter.$regex) {
                const flags = regexFilter.$options ?? '';
                const regex = new RegExp(regexFilter.$regex, flags);
                if (!regex.test(doc[key] as string)) return false;
              }
              continue;
            }
            if (doc[key] !== value) return false;
          }
          return true;
        });

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
        return store.filter((doc) => {
          for (const [key, value] of Object.entries(filter)) {
            if (key === '$or') continue;
            if (key === 'name' && typeof value === 'object' && value !== null) {
              const regexFilter = value as {
                $regex?: string;
                $options?: string;
              };
              if (regexFilter.$regex) {
                const flags = regexFilter.$options ?? '';
                const regex = new RegExp(regexFilter.$regex, flags);
                if (!regex.test(doc[key] as string)) return false;
              }
              continue;
            }
            if (doc[key] !== value) return false;
          }
          return true;
        }).length;
      }),
      updateOne: jest.fn(
        async (
          filter: Record<string, unknown>,
          update: { $set: Record<string, unknown> },
        ) => {
          const idx = store.findIndex((doc) => {
            for (const [key, value] of Object.entries(filter)) {
              if (doc[key] !== value) return false;
            }
            return true;
          });
          if (idx >= 0 && update.$set) {
            store[idx] = { ...store[idx], ...update.$set };
            return { modifiedCount: 1 };
          }
          return { modifiedCount: 0 };
        },
      ),
      deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
    };
  }

  const mockDb = {
    collection: (name: string) => getCollection(name),
    _collections: collections,
  };

  return mockDb;
}

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

function createTestController(mockDb?: ReturnType<typeof createInMemoryDb>) {
  const db = mockDb ?? createInMemoryDb();
  const app = createMockApplication(db);
  const controller = new OrganizationController(app);
  return {
    controller,
    db,
    handlers: (controller as unknown as OrgControllerHandlers).handlers,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generates a non-empty trimmed org name */
const orgNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** Generates a UUID-like member ID */
const memberIdArb = fc.uuid();

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('OrganizationController Property Tests', () => {
  describe('Property 1: Organization creation produces complete record with auto-admin', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.4, 3.5**
     *
     * For any valid org creation payload, the stored document has generated _id,
     * matching name, active=true, enrollmentMode='open', timestamps,
     * AND a corresponding ADMIN healthcare role (394572006) for the creating member.
     */
    it('creates org with all required fields and auto-admin role', async () => {
      await fc.assert(
        fc.asyncProperty(orgNameArb, memberIdArb, async (name, memberId) => {
          // Feature: organization-role-management, Property 1: Organization creation produces a complete record with auto-admin
          const { handlers, db } = createTestController();

          const result = await handlers.createOrganization({
            body: { name },
            memberContext: { memberId },
          });

          // Should succeed with 201
          expect(result.statusCode).toBe(201);

          const body = result.response as unknown as {
            success: boolean;
            data: Record<string, unknown>;
          };
          expect(body.success).toBe(true);

          const org = body.data;

          // Verify generated _id
          expect(typeof org['_id']).toBe('string');
          expect((org['_id'] as string).length).toBeGreaterThan(0);

          // Verify name matches
          expect(org['name']).toBe(name);

          // Verify defaults
          expect(org['active']).toBe(true);
          expect(org['enrollmentMode']).toBe('open');

          // Verify timestamps
          expect(typeof org['createdAt']).toBe('string');
          expect(typeof org['updatedAt']).toBe('string');
          expect(new Date(org['createdAt'] as string).toString()).not.toBe(
            'Invalid Date',
          );
          expect(new Date(org['updatedAt'] as string).toString()).not.toBe(
            'Invalid Date',
          );

          // Verify createdBy
          expect(org['createdBy']).toBe(memberId);

          // Verify auto-admin healthcare role was created
          const roles = db._collections['healthcare_roles'] ?? [];
          const adminRole = roles.find(
            (r) =>
              r['organizationId'] === org['_id'] &&
              r['memberId'] === memberId &&
              r['roleCode'] === ADMIN,
          );
          expect(adminRole).toBeDefined();
          expect(adminRole!['roleDisplay']).toBe(ROLE_CODE_DISPLAY[ADMIN]);
          expect(adminRole!['practitionerRef']).toBe(memberId);
          expect(
            (adminRole!['period'] as { start: string }).start,
          ).toBeDefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Organization update preserves unchanged fields', () => {
    /**
     * **Validates: Requirements 2.1**
     *
     * For any existing org and valid partial update, only specified fields change,
     * others preserved, updatedAt advances.
     */
    it('partial update changes only specified fields, preserves others, advances updatedAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          fc.record({
            name: fc.option(orgNameArb, { nil: undefined }),
            active: fc.option(fc.boolean(), { nil: undefined }),
            enrollmentMode: fc.option(
              fc.constantFrom('open' as const, 'invite-only' as const),
              { nil: undefined },
            ),
          }),
          async (originalName, memberId, partialUpdate) => {
            // Feature: organization-role-management, Property 2: Organization update preserves unchanged fields
            const db = createInMemoryDb();
            const { handlers } = createTestController(db);

            // Create the org first
            const createResult = await handlers.createOrganization({
              body: { name: originalName },
              memberContext: { memberId },
            });
            expect(createResult.statusCode).toBe(201);

            const created = (
              createResult.response as unknown as {
                data: Record<string, unknown>;
              }
            ).data;
            const orgId = created['_id'] as string;
            const originalCreatedAt = created['createdAt'] as string;
            const originalUpdatedAt = created['updatedAt'] as string;

            // Build update body with only defined fields
            const updateBody: Record<string, unknown> = {};
            if (partialUpdate.name !== undefined)
              updateBody['name'] = partialUpdate.name;
            if (partialUpdate.active !== undefined)
              updateBody['active'] = partialUpdate.active;
            if (partialUpdate.enrollmentMode !== undefined)
              updateBody['enrollmentMode'] = partialUpdate.enrollmentMode;

            // Small delay to ensure updatedAt advances
            await new Promise((resolve) => setTimeout(resolve, 2));

            const updateResult = await handlers.updateOrganization({
              params: { id: orgId },
              body: updateBody,
              memberContext: { memberId },
            });

            expect(updateResult.statusCode).toBe(200);

            const updated = (
              updateResult.response as unknown as {
                success: boolean;
                data: Record<string, unknown>;
              }
            ).data;

            // Verify specified fields changed
            if (partialUpdate.name !== undefined) {
              expect(updated['name']).toBe(partialUpdate.name);
            } else {
              expect(updated['name']).toBe(originalName);
            }

            if (partialUpdate.active !== undefined) {
              expect(updated['active']).toBe(partialUpdate.active);
            } else {
              expect(updated['active']).toBe(true);
            }

            if (partialUpdate.enrollmentMode !== undefined) {
              expect(updated['enrollmentMode']).toBe(
                partialUpdate.enrollmentMode,
              );
            } else {
              expect(updated['enrollmentMode']).toBe('open');
            }

            // createdAt should be preserved
            expect(updated['createdAt']).toBe(originalCreatedAt);

            // updatedAt should advance
            expect(updated['updatedAt']).not.toBe(originalUpdatedAt);
            expect(
              new Date(updated['updatedAt'] as string).getTime(),
            ).toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());

            // createdBy should be preserved
            expect(updated['createdBy']).toBe(memberId);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 15: Organization listing returns only active orgs with search filtering', () => {
    /**
     * **Validates: Requirements 8.1, 8.2, 8.3**
     *
     * For any set of orgs (active/inactive) and search query,
     * GET returns only active orgs whose name contains the query (case-insensitive).
     */
    it('returns only active orgs matching search query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: orgNameArb,
              active: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          memberIdArb,
          fc.string({ minLength: 0, maxLength: 20 }),
          async (orgSpecs, memberId, searchQuery) => {
            // Feature: organization-role-management, Property 15: Organization listing returns only active orgs with search filtering
            const db = createInMemoryDb();
            const { handlers } = createTestController(db);

            // Create all orgs
            for (const spec of orgSpecs) {
              const createResult = await handlers.createOrganization({
                body: { name: spec.name },
                memberContext: { memberId },
              });
              expect(createResult.statusCode).toBe(201);

              // If org should be inactive, update it
              if (!spec.active) {
                const created = (
                  createResult.response as unknown as {
                    data: Record<string, unknown>;
                  }
                ).data;
                const orgId = created['_id'] as string;
                await handlers.updateOrganization({
                  params: { id: orgId },
                  body: { active: false },
                  memberContext: { memberId },
                });
              }
            }

            // List with search
            const trimmedSearch = searchQuery.trim();
            const listResult = await handlers.listOrganizations({
              query: {
                search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
                limit: '100',
              },
            });

            expect(listResult.statusCode).toBe(200);

            const body = listResult.response as unknown as {
              success: boolean;
              data: Record<string, unknown>[];
            };
            expect(body.success).toBe(true);

            // All returned orgs should be active
            for (const org of body.data) {
              expect(org['active']).toBe(true);
            }

            // All returned orgs should match search (case-insensitive)
            if (trimmedSearch.length > 0) {
              const lowerSearch = trimmedSearch.toLowerCase();
              for (const org of body.data) {
                expect((org['name'] as string).toLowerCase()).toContain(
                  lowerSearch,
                );
              }
            }

            // Each returned org should have enrollmentMode
            for (const org of body.data) {
              expect(org['enrollmentMode']).toBeDefined();
              expect(['open', 'invite-only']).toContain(org['enrollmentMode']);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
