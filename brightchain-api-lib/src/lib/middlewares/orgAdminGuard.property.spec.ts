/**
 * Property-Based Tests for orgAdminGuard
 *
 * Feature: organization-role-management
 *
 * Property 3: Org-scoped mutation authorization
 *
 * **Validates: Requirements 2.4, 3.4, 5.6, 7.2**
 */

import { ADMIN, ROLE_CODE_DISPLAY } from '@brightchain/brightchart-lib';
import * as fc from 'fast-check';
import { orgAdminGuard } from './orgAdminGuard';

// ─── In-Memory DB Mock ───────────────────────────────────────────────────────

/**
 * Creates an in-memory mock of BrightDb that stores documents in Maps,
 * supporting the findOne query used by orgAdminGuard.
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
              if (key === '$or') {
                // Evaluate $or conditions for period.end
                const orConditions = value as Record<string, unknown>[];
                const periodEnd = (
                  doc['period'] as { end?: string } | undefined
                )?.end;
                const anyMatch = orConditions.some((cond) => {
                  if ('period.end' in cond) {
                    const condValue = cond['period.end'];
                    if (
                      condValue !== null &&
                      typeof condValue === 'object' &&
                      condValue !== undefined
                    ) {
                      const condObj = condValue as Record<string, unknown>;
                      if (
                        '$exists' in condObj &&
                        condObj['$exists'] === false
                      ) {
                        return periodEnd === undefined;
                      }
                      if ('$gt' in condObj) {
                        if (periodEnd === undefined || periodEnd === null)
                          return false;
                        return periodEnd > (condObj['$gt'] as string);
                      }
                    }
                    // period.end: null
                    if (condValue === null) {
                      return periodEnd === null || periodEnd === undefined;
                    }
                  }
                  return false;
                });
                if (!anyMatch) return false;
                continue;
              }
              if (doc[key] !== value) return false;
            }
            return true;
          }) ?? null
        );
      }),
    };
  }

  const mockDb = {
    collection: (name: string) => getCollection(name),
    _collections: collections,
  };

  return mockDb;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function insertAdminRole(
  db: ReturnType<typeof createInMemoryDb>,
  memberId: string,
  organizationId: string,
  periodEnd?: string | null,
) {
  if (!db._collections['healthcare_roles']) {
    db._collections['healthcare_roles'] = [];
  }
  const now = new Date().toISOString();
  const role: Record<string, unknown> = {
    _id: crypto.randomUUID(),
    memberId,
    organizationId,
    roleCode: ADMIN,
    roleDisplay: ROLE_CODE_DISPLAY[ADMIN] ?? 'Clinical Administrator',
    practitionerRef: memberId,
    period: {
      start: now,
      ...(periodEnd !== undefined ? { end: periodEnd } : {}),
    },
    createdBy: memberId,
    createdAt: now,
    updatedAt: now,
  };
  db._collections['healthcare_roles'].push(role);
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const memberIdArb = fc.uuid();
const orgIdArb = fc.uuid();

/** Generates a date string in the future (1 hour to 365 days from now) */
const futureDateArb = fc
  .integer({ min: 3600_000, max: 365 * 24 * 3600_000 })
  .map((ms) => new Date(Date.now() + ms).toISOString());

/** Generates a date string in the past (1 hour to 365 days ago) */
const pastDateArb = fc
  .integer({ min: 3600_000, max: 365 * 24 * 3600_000 })
  .map((ms) => new Date(Date.now() - ms).toISOString());

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('orgAdminGuard Property Tests', () => {
  describe('Property 3: Org-scoped mutation authorization', () => {
    /**
     * **Validates: Requirements 2.4, 3.4, 5.6, 7.2**
     *
     * For any org-scoped mutation and any member who does NOT hold an active
     * ADMIN healthcare role at the target organization, the API SHALL return
     * 403 and leave data unchanged.
     *
     * For any member who DOES hold an active ADMIN role, the guard should
     * pass (not return 403).
     */
    it('returns false for members without an active ADMIN role at the org', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          orgIdArb,
          async (memberId, organizationId) => {
            // Feature: organization-role-management, Property 3: Org-scoped mutation authorization
            const db = createInMemoryDb();

            // No roles inserted — member has no ADMIN role
            const result = await orgAdminGuard(
              db as never,
              memberId,
              organizationId,
            );

            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns false when member has ADMIN role at a DIFFERENT org', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          orgIdArb,
          orgIdArb,
          async (memberId, targetOrgId, otherOrgId) => {
            // Skip when both org IDs happen to be the same
            fc.pre(targetOrgId !== otherOrgId);

            const db = createInMemoryDb();
            // Insert admin role at a different org
            insertAdminRole(db, memberId, otherOrgId);

            const result = await orgAdminGuard(
              db as never,
              memberId,
              targetOrgId,
            );

            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns false when member has an expired ADMIN role (period.end in the past)', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          orgIdArb,
          pastDateArb,
          async (memberId, organizationId, pastEnd) => {
            const db = createInMemoryDb();
            insertAdminRole(db, memberId, organizationId, pastEnd);

            const result = await orgAdminGuard(
              db as never,
              memberId,
              organizationId,
            );

            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns true when member has an active ADMIN role (no period.end)', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          orgIdArb,
          async (memberId, organizationId) => {
            const db = createInMemoryDb();
            // Insert active admin role with no period.end
            insertAdminRole(db, memberId, organizationId);

            const result = await orgAdminGuard(
              db as never,
              memberId,
              organizationId,
            );

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns true when member has an active ADMIN role (period.end is null)', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          orgIdArb,
          async (memberId, organizationId) => {
            const db = createInMemoryDb();
            // Insert active admin role with period.end = null
            insertAdminRole(db, memberId, organizationId, null);

            const result = await orgAdminGuard(
              db as never,
              memberId,
              organizationId,
            );

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns true when member has an active ADMIN role (period.end in the future)', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          orgIdArb,
          futureDateArb,
          async (memberId, organizationId, futureEnd) => {
            const db = createInMemoryDb();
            insertAdminRole(db, memberId, organizationId, futureEnd);

            const result = await orgAdminGuard(
              db as never,
              memberId,
              organizationId,
            );

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
