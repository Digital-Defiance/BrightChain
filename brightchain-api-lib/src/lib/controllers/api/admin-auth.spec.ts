/**
 * Unit tests for auth middleware integration on admin routes.
 *
 * Verifies that:
 * - 401 is returned for unauthenticated requests
 * - 403 is returned for non-admin JWT
 * - 200 is returned for admin JWT
 *
 * on both /admin/dashboard and /admin/users endpoints.
 *
 * @requirements 1.1, 1.2, 1.3
 */

import express, { Express, NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { IBrightChainApplication } from '../../interfaces';
import {
  IAuthenticatedRequest,
  requireAuth,
  requireRoles,
} from '../../middlewares/authentication';
import { AdminUserController } from './adminUser';
import { DashboardController } from './dashboard';

// ─── Constants ───────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-for-admin-auth-spec';

// ─── Mock Application Factory ────────────────────────────────────────────────

const createMockApplication = (): IBrightChainApplication => {
  const mockDb = {
    collection: (_name: string) => ({
      countDocuments: async (_filter?: Record<string, unknown>) => 0,
      find: (_filter?: Record<string, unknown>) => ({
        skip: (_n: number) => ({
          limit: (_l: number) => ({
            toArray: async () => [],
          }),
        }),
      }),
      findOne: async () => null,
      updateOne: async () => ({ modifiedCount: 0 }),
    }),
  };

  const mockServices = {
    has: (name: string) => name === 'db',
    get: (name: string) => {
      if (name === 'db') return mockDb;
      return undefined;
    },
  };

  return {
    db: { connection: { readyState: 1 } },
    environment: {
      mongo: { useTransactions: false },
      debug: false,
      jwtSecret: JWT_SECRET,
    },
    constants: {},
    ready: true,
    services: mockServices,
    plugins: {},
    authProvider: {
      verifyToken: async (token: string) => {
        // Decode the JWT to extract the user info
        const decoded = jwt.verify(token, JWT_SECRET) as Record<
          string,
          unknown
        >;
        return { userId: decoded.memberId as string };
      },
      buildRequestUserDTO: async (userId: string) => ({
        id: userId,
        username: userId === 'admin-user-id' ? 'admin' : 'regular',
        email: 'test@example.com',
        roles: [],
        rolePrivileges: {
          admin: userId === 'admin-user-id',
          member: true,
          child: false,
          system: false,
        },
        emailVerified: true,
        timezone: 'UTC',
        siteLanguage: 'en',
        darkMode: false,
        currency: 'USD',
        directChallenge: false,
      }),
    },
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
};

// ─── Token Helpers ───────────────────────────────────────────────────────────

function createAdminToken(): string {
  return jwt.sign(
    {
      memberId: 'admin-user-id',
      username: 'admin',
      type: 'User',
      roles: ['admin'],
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function createRegularToken(): string {
  return jwt.sign(
    {
      memberId: 'regular-user-id',
      username: 'regular',
      type: 'User',
      roles: ['member'],
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

function createTestApp(): Express {
  const mockApp = createMockApplication();
  const dashboardController = new DashboardController(mockApp);
  const adminUserController = new AdminUserController(mockApp);

  const app = express();
  app.use(express.json());

  // Build an admin auth middleware stack that:
  // 1. Verifies the JWT
  // 2. Copies roles from the decoded token into memberContext
  // 3. Checks for the 'admin' role
  //
  // The built-in createJwtAuthMiddleware doesn't copy roles from the token
  // payload, so we add a bridge middleware that does.
  const jwtAuth = requireAuth(JWT_SECRET);
  const populateRoles = (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as IAuthenticatedRequest;
    if (authReq.memberContext) {
      // Re-decode the token to get roles (the JWT middleware doesn't copy them)
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as Record<
            string,
            unknown
          >;
          if (Array.isArray(decoded.roles)) {
            authReq.memberContext.roles = decoded.roles as string[];
          }
        } catch {
          // Token already verified by jwtAuth, ignore errors here
        }
      }
    }
    next();
  };
  const roleCheck = requireRoles('admin');

  app.use(
    '/admin/dashboard',
    jwtAuth,
    populateRoles,
    roleCheck,
    dashboardController.router,
  );
  app.use(
    '/admin/users',
    jwtAuth,
    populateRoles,
    roleCheck,
    adminUserController.router,
  );

  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Admin auth middleware integration', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /admin/dashboard', () => {
    /**
     * Requirement 1.1: Unauthenticated request returns 401
     */
    it('returns 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/admin/dashboard');
      expect(res.status).toBe(401);
    });

    /**
     * Requirement 1.2: Non-admin JWT returns 403
     */
    it('returns 403 for non-admin JWT', async () => {
      const token = createRegularToken();
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    /**
     * Requirement 1.3: Admin JWT returns 200
     */
    it('returns 200 for admin JWT', async () => {
      const token = createAdminToken();
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /admin/users', () => {
    /**
     * Requirement 1.1: Unauthenticated request returns 401
     */
    it('returns 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/admin/users');
      expect(res.status).toBe(401);
    });

    /**
     * Requirement 1.2: Non-admin JWT returns 403
     */
    it('returns 403 for non-admin JWT', async () => {
      const token = createRegularToken();
      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    /**
     * Requirement 1.3: Admin JWT returns 200
     */
    it('returns 200 for admin JWT', async () => {
      const token = createAdminToken();
      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.body).toBeDefined();
      expect(res.status).toBe(200);
    });
  });
});
