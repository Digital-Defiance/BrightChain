/**
 * Shared integration test helpers for cross-controller property tests.
 *
 * Consolidates the in-memory DB mock, controller factories, typed handler
 * interfaces, helper functions, and fast-check arbitraries that were
 * previously duplicated across the three individual property spec files.
 */

import {
  ADMIN,
  DENTIST,
  MEDICAL_ASSISTANT,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
import {
  ApiErrorResponse,
  IApiMessageResponse,
} from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../../interfaces';
import { HealthcareRoleController } from './healthcareRoleController';
import { InvitationController } from './invitationController';
import { OrganizationController } from './organizationController';

// ─── Response Types ──────────────────────────────────────────────────────────

type ApiResponse = IApiMessageResponse | ApiErrorResponse;

// ─── Handler Interfaces ──────────────────────────────────────────────────────

export interface OrgHandlers {
  createOrganization: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
  updateOrganization: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
  listOrgMembers: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
}

export interface RoleHandlers {
  getMyRoles: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
  assignStaff: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
  registerPatient: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
  removeRole: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
}

export interface InvHandlers {
  createInvitation: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
  redeemInvitation: (
    req: unknown,
  ) => Promise<{ statusCode: number; response: ApiResponse }>;
}

// ─── In-Memory DB Type ───────────────────────────────────────────────────────

export type InMemoryDb = ReturnType<typeof createInMemoryDb>;

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
 * - dot-notation keys like 'period.end'
 * - find().skip().limit().toArray() and find().toArray()
 */
export function createInMemoryDb() {
  const collections: Record<string, Record<string, unknown>[]> = {};

  function getNestedValue(doc: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = doc;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
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

  /**
   * Evaluate whether a single document matches a filter, including
   * $or, $ne, $exists, $gt, $regex/$options, and nested dot-notation keys.
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

/** Creates a mock IBrightChainApplication wired to the given in-memory DB */
export function createMockApplication(
  db: InMemoryDb,
): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: {
      has: (name: string) => name === 'db',
      get: (name: string) => (name === 'db' ? db : undefined),
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

/**
 * Instantiates all three controllers against a single shared DB.
 * Returns the DB and typed handler accessors for each controller.
 */
export function createIntegrationControllers(db?: InMemoryDb) {
  const sharedDb = db ?? createInMemoryDb();
  const app = createMockApplication(sharedDb);

  const orgController = new OrganizationController(app);
  const roleController = new HealthcareRoleController(app);
  const invController = new InvitationController(app);

  return {
    db: sharedDb,
    orgHandlers: (
      orgController as unknown as { handlers: OrgHandlers }
    ).handlers,
    roleHandlers: (
      roleController as unknown as { handlers: RoleHandlers }
    ).handlers,
    invHandlers: (
      invController as unknown as { handlers: InvHandlers }
    ).handlers,
  };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Create an org and return its ID. The creating member gets auto-admin. */
export async function createOrg(
  orgHandlers: OrgHandlers,
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
export async function setEnrollmentMode(
  orgHandlers: OrgHandlers,
  orgId: string,
  memberId: string,
  mode: 'open' | 'invite-only',
): Promise<void> {
  await orgHandlers.updateOrganization({
    params: { id: orgId },
    body: { enrollmentMode: mode },
    memberContext: { memberId },
  });
}

/** Assign a staff role and return the role doc. */
export async function assignStaff(
  roleHandlers: RoleHandlers,
  adminId: string,
  targetId: string,
  roleCode: string,
  orgId: string,
): Promise<Record<string, unknown>> {
  const result = await roleHandlers.assignStaff({
    body: {
      memberId: targetId,
      roleCode,
      organizationId: orgId,
    },
    memberContext: { memberId: adminId },
  });
  const body = result.response as unknown as {
    data: Record<string, unknown>;
  };
  return body.data;
}

/** Register a patient and return the role doc. */
export async function registerPatient(
  roleHandlers: RoleHandlers,
  memberId: string,
  orgId: string,
  opts?: { targetMemberId?: string; invitationToken?: string },
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = { organizationId: orgId };
  if (opts?.targetMemberId) {
    body['targetMemberId'] = opts.targetMemberId;
  }
  if (opts?.invitationToken) {
    body['invitationToken'] = opts.invitationToken;
  }
  const result = await roleHandlers.registerPatient({
    body,
    memberContext: { memberId },
  });
  const resp = result.response as unknown as {
    data: Record<string, unknown>;
  };
  return resp.data;
}

/** Create an invitation and return the token. */
export async function createInvitation(
  invHandlers: InvHandlers,
  adminId: string,
  orgId: string,
  roleCode: string,
): Promise<string> {
  const result = await invHandlers.createInvitation({
    body: { organizationId: orgId, roleCode },
    memberContext: { memberId: adminId },
  });
  const body = result.response as unknown as {
    data: Record<string, unknown>;
  };
  return body.data['token'] as string;
}

/** Redeem an invitation and return the raw result. */
export async function redeemInvitation(
  invHandlers: InvHandlers,
  memberId: string,
  token: string,
): Promise<{ statusCode: number; response: unknown }> {
  return invHandlers.redeemInvitation({
    body: { token },
    memberContext: { memberId },
  });
}

/** GET roles for a member. */
export async function getMyRoles(
  roleHandlers: RoleHandlers,
  memberId: string,
): Promise<Array<Record<string, unknown>>> {
  const result = await roleHandlers.getMyRoles({
    memberContext: { memberId },
  });
  const body = result.response as unknown as {
    data: Array<Record<string, unknown>>;
  };
  return body.data;
}

// ─── fast-check Arbitraries ──────────────────────────────────────────────────

export const memberIdArb = fc.uuid();

export const orgNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

export const validPractitionerCodeArb = fc.constantFrom(
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
  ADMIN,
);

export const validInvitationRoleCodeArb = fc.constantFrom(
  PHYSICIAN,
  REGISTERED_NURSE,
  MEDICAL_ASSISTANT,
  DENTIST,
  VETERINARIAN,
  ADMIN,
  PATIENT,
);

export const enrollmentModeArb = fc.constantFrom(
  'open' as const,
  'invite-only' as const,
);
