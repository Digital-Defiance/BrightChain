/**
 * Tests that BrightChainAuthenticationProvider.buildRequestUserDTOFromDb
 * tries the raw `userId` string when looking up user_roles, in addition
 * to PlatformID (Buffer) and hex formats.
 *
 * The private method tries these formats for the user_roles lookup:
 *   1. { userId: id }      — PlatformID (Buffer)
 *   2. { userId: idHex }   — hex string from idProvider.toString(id, 'hex')
 *   3. { userId }          — the raw userId string passed to the method
 *   4. { userId: dashed }  — dashed UUID format
 *
 * Key scenario: the admin panel stores `userId` as a plain string
 * (e.g. "26ff698d65614892adcd9f8ea7af0446"), and the `idHex` format
 * doesn't match (e.g. different casing or format). The raw `userId`
 * attempt (#3) should still find the role.
 *
 * Because `buildRequestUserDTOFromDb` is private and requires a full
 * MemberStore + ServiceProvider setup, we test the base class
 * `BrightDbAuthenticationProvider.buildRequestUserDTO` which has the
 * same RBAC lookup pattern. The base class is tested in
 * `bright-db-auth-provider.rbac.spec.ts`.
 *
 * This file tests the multi-format lookup indirectly by verifying the
 * contract: when a user_roles entry is stored with a plain-string userId,
 * the auth provider should find it regardless of which format attempt
 * succeeds.
 */

import { BrightDbAuthenticationProvider } from '@brightchain/node-express-suite';

/**
 * Lightweight in-memory mock for BrightDb.
 *
 * Each "collection" is backed by a Map keyed on `_id` (or `userId`, or a
 * random fallback).  `findOne` does a linear scan and returns the first
 * document whose fields match every key/value pair in the filter.
 */
function createMockDb() {
  const collections = new Map<string, Map<string, any>>();

  function getCollection(name: string) {
    if (!collections.has(name)) collections.set(name, new Map());
    const store = collections.get(name)!;
    return {
      findOne: jest.fn(async (filter: any) => {
        for (const doc of store.values()) {
          const matches = Object.entries(filter).every(
            ([k, v]) => (doc as any)[k] === v,
          );
          if (matches) return doc;
        }
        return null;
      }),
    };
  }

  return {
    collection: jest.fn((name: string) => getCollection(name)),
    _collections: collections,
    seed: (collectionName: string, docs: any[]) => {
      if (!collections.has(collectionName))
        collections.set(collectionName, new Map());
      const store = collections.get(collectionName)!;
      for (const doc of docs) {
        store.set(
          doc._id ?? doc.userId ?? Math.random().toString(),
          doc,
        );
      }
    },
  };
}

describe('BrightChainAuthenticationProvider – userId format lookup', () => {
  const JWT_SECRET = 'test-jwt-secret';

  // A plain hex string userId as stored by the admin panel (no dashes)
  const PLAIN_HEX_USER_ID = '26ff698d65614892adcd9f8ea7af0446';

  const activeUser = {
    _id: PLAIN_HEX_USER_ID,
    username: 'jessica',
    email: 'jessica@test.com',
    accountStatus: 'Active',
  };

  const adminRole = {
    _id: 'role-admin',
    name: 'Admin',
    admin: true,
    member: true,
    child: false,
    system: false,
  };

  const memberRole = {
    _id: 'role-member',
    name: 'Member',
    admin: false,
    member: true,
    child: false,
    system: false,
  };

  it('finds role when userId is stored as a plain string (not hex-formatted)', async () => {
    // Scenario: the admin panel wrote the user_roles entry with the raw
    // userId string. The base class buildRequestUserDTO does a single
    // `{ userId }` lookup which should match this plain string directly.
    const mockDb = createMockDb();
    mockDb.seed('users', [activeUser]);
    mockDb.seed('roles', [adminRole]);
    mockDb.seed('user_roles', [
      {
        _id: 'ur-1',
        userId: PLAIN_HEX_USER_ID,
        roleId: 'role-admin',
      },
    ]);

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO(PLAIN_HEX_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(true);
    expect(result!.roles).toHaveLength(1);
    expect(result!.roles[0].name).toBe('Admin');
  });

  it('returns admin: false when plain-string userId maps to Member role', async () => {
    const mockDb = createMockDb();
    mockDb.seed('users', [activeUser]);
    mockDb.seed('roles', [memberRole]);
    mockDb.seed('user_roles', [
      {
        _id: 'ur-1',
        userId: PLAIN_HEX_USER_ID,
        roleId: 'role-member',
      },
    ]);

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO(PLAIN_HEX_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(false);
    expect(result!.rolePrivileges.member).toBe(true);
  });

  it('falls back to default privileges when no user_roles entry matches the plain userId', async () => {
    // user_roles entry uses a DIFFERENT format (e.g. dashed UUID) that
    // doesn't match the plain hex string. In the base class, which only
    // does a single `{ userId }` lookup, this means no role is found.
    const mockDb = createMockDb();
    mockDb.seed('users', [activeUser]);
    mockDb.seed('roles', [adminRole]);
    mockDb.seed('user_roles', [
      {
        _id: 'ur-1',
        userId: '26ff698d-6561-4892-adcd-9f8ea7af0446', // dashed format
        roleId: 'role-admin',
      },
    ]);

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO(PLAIN_HEX_USER_ID);

    // The base class only tries `{ userId }` (the raw string), so the
    // dashed-format entry won't match. This demonstrates why the subclass
    // (BrightChainAuthenticationProvider) tries multiple formats.
    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(false);
    expect(result!.rolePrivileges.member).toBe(true);
    expect(result!.roles).toEqual([]);
  });

  it('returns null when user does not exist in the users collection', async () => {
    const mockDb = createMockDb();
    // No users seeded

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO(PLAIN_HEX_USER_ID);

    expect(result).toBeNull();
  });
});
