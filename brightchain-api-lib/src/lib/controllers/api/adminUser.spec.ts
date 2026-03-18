/**
 * Unit tests for AdminUserController.
 *
 * Tests the handler-level behavior of listUsers and updateUserStatus
 * by mocking the BrightDB service.
 *
 * @requirements 12.2, 12.3, 12.4, 12.5
 */

import {
  ApiErrorResponse,
  IApiMessageResponse,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces';
import { AdminUserController } from './adminUser';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUserControllerHandlers {
  handlers: {
    listUsers: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    updateUserStatus: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockUsers = [
  {
    _id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    accountStatus: 'Active',
    emailVerified: true,
    lastLogin: '2025-01-01T00:00:00Z',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    _id: 'user-2',
    username: 'bob',
    email: 'bob@example.com',
    accountStatus: 'AdminLock',
    emailVerified: true,
    lastLogin: '2025-01-02T00:00:00Z',
    createdAt: '2024-07-01T00:00:00Z',
  },
  {
    _id: 'user-3',
    username: 'carol',
    email: 'carol@example.com',
    accountStatus: 'PendingEmailVerification',
    emailVerified: false,
    lastLogin: null,
    createdAt: '2025-01-10T00:00:00Z',
  },
];

// ─── Mock Factory ────────────────────────────────────────────────────────────

function createMockUsersCollection(users: typeof mockUsers = mockUsers) {
  return {
    countDocuments: jest.fn(async (filter?: Record<string, unknown>) => {
      if (!filter || Object.keys(filter).length === 0) return users.length;
      return users.filter((u) => {
        for (const [key, value] of Object.entries(filter)) {
          if ((u as Record<string, unknown>)[key] !== value) return false;
        }
        return true;
      }).length;
    }),
    find: jest.fn((filter?: Record<string, unknown>) => {
      let filtered = [...users];
      if (filter && Object.keys(filter).length > 0) {
        filtered = users.filter((u) => {
          for (const [key, value] of Object.entries(filter)) {
            if ((u as Record<string, unknown>)[key] !== value) return false;
          }
          return true;
        });
      }
      return {
        skip: (n: number) => ({
          limit: (l: number) => ({
            toArray: async () => filtered.slice(n, n + l),
          }),
        }),
      };
    }),
    findOne: jest.fn(async (filter: Record<string, unknown>) => {
      return users.find((u) => u._id === filter['_id']) ?? null;
    }),
    updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
  };
}

function createMockApplication(
  usersCollection: ReturnType<typeof createMockUsersCollection>,
): IBrightChainApplication {
  const mockDb = {
    collection: (name: string) => {
      if (name === 'users') return usersCollection;
      return { countDocuments: async () => 0 };
    },
  };

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

function createController(users?: typeof mockUsers) {
  const collection = createMockUsersCollection(users);
  const app = createMockApplication(collection);
  const controller = new AdminUserController(app);
  return {
    controller,
    collection,
    handlers: (controller as unknown as AdminUserControllerHandlers).handlers,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminUserController', () => {
  describe('listUsers', () => {
    /**
     * Requirement 12.2: GET /api/admin/users returns paginated user list
     */
    it('returns paginated user list with correct fields', async () => {
      const { handlers } = createController();
      const result = await handlers.listUsers({ query: {} });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        users: Array<Record<string, unknown>>;
        total: number;
        page: number;
        limit: number;
      };
      expect(body.message).toBe('OK');
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
      expect(body.users).toHaveLength(3);

      // Verify each user has the expected fields
      for (const user of body.users) {
        expect(user).toHaveProperty('_id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('accountStatus');
        expect(user).toHaveProperty('emailVerified');
        expect(user).toHaveProperty('lastLogin');
        expect(user).toHaveProperty('createdAt');
      }
    });

    /**
     * Requirement 12.5: GET /api/admin/users?status=AdminLock returns only matching users
     */
    it('returns only matching users when status filter is applied', async () => {
      const { handlers } = createController();
      const result = await handlers.listUsers({
        query: { status: 'AdminLock' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        users: Array<Record<string, unknown>>;
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.users).toHaveLength(1);
      expect(body.users[0].username).toBe('bob');
      expect(body.users[0].accountStatus).toBe('AdminLock');
    });
  });

  describe('updateUserStatus', () => {
    /**
     * Requirement 12.3, 12.4: PUT sets accountStatus to AdminLock
     */
    it('sets accountStatus to AdminLock (lock user)', async () => {
      const { handlers, collection } = createController();
      const result = await handlers.updateUserStatus({
        params: { userId: 'user-1' },
        body: { status: 'AdminLock' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        user: Record<string, unknown>;
      };
      expect(body.user.accountStatus).toBe('AdminLock');
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: 'user-1' },
        { $set: { accountStatus: 'AdminLock' } },
      );
    });

    /**
     * Requirement 12.3: PUT sets accountStatus back to Active (unlock)
     */
    it('sets accountStatus back to Active (unlock user)', async () => {
      const { handlers, collection } = createController();
      const result = await handlers.updateUserStatus({
        params: { userId: 'user-2' },
        body: { status: 'Active' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        user: Record<string, unknown>;
      };
      expect(body.user.accountStatus).toBe('Active');
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: 'user-2' },
        { $set: { accountStatus: 'Active' } },
      );
    });

    /**
     * Requirement 12.3: PendingEmailVerification is rejected as invalid target status
     */
    it('rejects PendingEmailVerification as invalid target status', async () => {
      const { handlers } = createController();
      const result = await handlers.updateUserStatus({
        params: { userId: 'user-1' },
        body: { status: 'PendingEmailVerification' },
      });

      expect(result.statusCode).toBe(400);
    });

    /**
     * Requirement 12.3: returns 404 for non-existent userId
     */
    it('returns 404 for non-existent userId', async () => {
      const { handlers } = createController();
      const result = await handlers.updateUserStatus({
        params: { userId: 'nonexistent-user' },
        body: { status: 'AdminLock' },
      });

      expect(result.statusCode).toBe(404);
    });
  });
});
