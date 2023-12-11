import { BrightDbAuthenticationProvider } from '../bright-db-authentication-provider';

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

describe('BrightDbAuthenticationProvider – RBAC role lookup', () => {
  const JWT_SECRET = 'test-jwt-secret';

  const activeUser = {
    _id: 'user-1',
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

  it('returns admin: true when user has Admin role in RBAC tables', async () => {
    const mockDb = createMockDb();
    mockDb.seed('users', [activeUser]);
    mockDb.seed('roles', [adminRole]);
    mockDb.seed('user_roles', [
      { _id: 'ur-1', userId: 'user-1', roleId: 'role-admin' },
    ]);

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO('user-1');

    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(true);
    expect(result!.roles).toHaveLength(1);
    expect(result!.roles[0].admin).toBe(true);
  });

  it('returns admin: false when user has Member role', async () => {
    const mockDb = createMockDb();
    mockDb.seed('users', [activeUser]);
    mockDb.seed('roles', [memberRole]);
    mockDb.seed('user_roles', [
      { _id: 'ur-1', userId: 'user-1', roleId: 'role-member' },
    ]);

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO('user-1');

    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(false);
    expect(result!.rolePrivileges.member).toBe(true);
  });

  it('returns default member privileges when no user_roles entry exists', async () => {
    const mockDb = createMockDb();
    mockDb.seed('users', [activeUser]);
    // No user_roles or roles seeded

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO('user-1');

    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(false);
    expect(result!.rolePrivileges.member).toBe(true);
    expect(result!.roles).toEqual([]);
  });

  it('returns null when user does not exist', async () => {
    const mockDb = createMockDb();
    // No users seeded

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO('nonexistent');

    expect(result).toBeNull();
  });

  it('finds role when userId is stored as a plain string (not hex-formatted)', async () => {
    // Scenario: the admin panel stores user_roles.userId as a plain hex
    // string like "26ff698d65614892adcd9f8ea7af0446" (no dashes, no Buffer).
    // The base class does a single `{ userId }` lookup which should match
    // the raw string directly.
    const plainHexId = '26ff698d65614892adcd9f8ea7af0446';
    const user = {
      _id: plainHexId,
      username: 'admin-user',
      email: 'admin@test.com',
      accountStatus: 'Active',
    };

    const mockDb = createMockDb();
    mockDb.seed('users', [user]);
    mockDb.seed('roles', [adminRole]);
    mockDb.seed('user_roles', [
      { _id: 'ur-plain', userId: plainHexId, roleId: 'role-admin' },
    ]);

    const provider = new BrightDbAuthenticationProvider(
      mockDb as any,
      JWT_SECRET,
    );
    const result = await provider.buildRequestUserDTO(plainHexId);

    expect(result).not.toBeNull();
    expect(result!.rolePrivileges.admin).toBe(true);
    expect(result!.roles).toHaveLength(1);
    expect(result!.roles[0].name).toBe('Admin');
  });
});
