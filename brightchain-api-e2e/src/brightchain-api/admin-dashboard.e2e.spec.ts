import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

/**
 * End-to-end integration tests for the Admin Dashboard API.
 *
 * Tests the GET /api/admin/dashboard endpoint against a running API server,
 * verifying auth enforcement and the full IAdminDashboardData response shape.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3, 6.1, 6.2,
 *               7.1, 8.1, 9.1, 9.2, 11.1, 12.1
 */

// ─── Constants ──────────────────────────────────────────────────

const JWT_SECRET =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

const DASHBOARD_URL = '/api/admin/dashboard';

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.admin.local`,
    password: `Adm1nT3st!${id}`,
  };
}

/** Register a user and return token + memberId. */
async function registerUser(prefix = 'adm') {
  const creds = uniqueUser(prefix);
  const res = await axios.post('/api/user/register', {
    username: creds.username,
    email: creds.email,
    password: creds.password,
  });
  return {
    creds,
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
  };
}

/** Create an axios config with Bearer auth header. */
function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Create an admin JWT token.
 *
 * The e2e server uses the known JWT_SECRET from global-setup.
 * We sign a token with `roles: ['admin']` so the requireAuthWithRoles
 * middleware grants access.
 */
function createAdminToken(memberId: string, username: string): string {
  return jwt.sign(
    {
      memberId,
      username,
      type: 'Admin',
      roles: ['admin'],
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Admin Dashboard E2E', () => {
  let regularToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Register a regular user for non-admin tests
    const user = await registerUser('dashreg');
    regularToken = user.token;

    // Create an admin token using the known JWT secret
    adminToken = createAdminToken(user.memberId, 'dashadmin');
  });

  // ─── Auth Enforcement ───────────────────────────────────────

  describe('Auth enforcement on GET /api/admin/dashboard', () => {
    /**
     * Requirement 1.1: Unauthenticated request returns 401
     */
    it('should return 401 for unauthenticated requests', async () => {
      try {
        await axios.get(DASHBOARD_URL);
        throw new Error('Expected 401 for unauthenticated request');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(401);
      }
    });

    /**
     * Requirement 1.2: Non-admin JWT returns 403
     */
    it('should return 403 for non-admin user', async () => {
      try {
        await axios.get(DASHBOARD_URL, authHeader(regularToken));
        throw new Error('Expected 403 for non-admin user');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(403);
      }
    });

    /**
     * Requirement 1.3: Admin JWT returns 200
     */
    it('should return 200 for admin user', async () => {
      const res = await axios.get(DASHBOARD_URL, authHeader(adminToken));
      expect(res.status).toBe(200);
    });
  });

  // ─── Response Structure Validation ────────────────────────────

  describe('Dashboard response structure', () => {
    let data: Record<string, unknown>;

    beforeAll(async () => {
      const res = await axios.get(DASHBOARD_URL, authHeader(adminToken));
      expect(res.status).toBe(200);
      data = res.data;
    });

    /**
     * Requirement 11.1: All top-level fields present
     */
    it('should contain all top-level fields', () => {
      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('lumenClientCount');
      expect(data).toHaveProperty('lumenClientSessions');
      expect(data).toHaveProperty('nodeConnectionCount');
      expect(data).toHaveProperty('connectedNodeIds');
      expect(data).toHaveProperty('system');
      expect(data).toHaveProperty('db');
      expect(data).toHaveProperty('brightTrust');
      expect(data).toHaveProperty('pools');
      expect(data).toHaveProperty('dependencies');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('hostname');
      expect(data).toHaveProperty('localNodeId');
      expect(data).toHaveProperty('nodeIdSource');
      expect(data).toHaveProperty('disconnectedPeers');
    });

    /**
     * Requirements 5.1, 5.2, 5.3: System metrics shape
     */
    it('should have correct system metrics shape', () => {
      const system = data['system'] as Record<string, unknown>;
      expect(system).toBeDefined();
      expect(typeof system['heapUsedBytes']).toBe('number');
      expect(typeof system['heapTotalBytes']).toBe('number');
      expect(typeof system['rssBytes']).toBe('number');
      expect(typeof system['externalBytes']).toBe('number');
      expect(system['heapUsedBytes']).toBeGreaterThanOrEqual(0);
      expect(system['heapTotalBytes']).toBeGreaterThanOrEqual(0);
      expect(system['rssBytes']).toBeGreaterThanOrEqual(0);
      expect(system['externalBytes']).toBeGreaterThanOrEqual(0);
      expect(typeof system['uptimeSeconds']).toBe('number');
      expect(system['uptimeSeconds']).toBeGreaterThanOrEqual(0);
      expect(typeof system['nodeVersion']).toBe('string');
      expect((system['nodeVersion'] as string).length).toBeGreaterThan(0);
      expect(typeof system['appVersion']).toBe('string');
      expect((system['appVersion'] as string).length).toBeGreaterThan(0);
    });

    /**
     * Requirements 6.1, 6.2: Database stats shape
     */
    it('should have correct database stats shape', () => {
      const db = data['db'] as Record<string, unknown>;
      expect(db).toBeDefined();
      // users and roles are numbers or null
      const usersVal = db['users'];
      expect(typeof usersVal === 'number' || usersVal === null).toBe(true);
      const rolesVal = db['roles'];
      expect(typeof rolesVal === 'number' || rolesVal === null).toBe(true);
      // error is string or undefined
      if (db['error'] !== undefined) {
        expect(typeof db['error']).toBe('string');
      }
    });

    /**
     * Requirement 12.1: User status breakdown
     */
    it('should have user status breakdown in db stats', () => {
      const db = data['db'] as Record<string, unknown>;
      const usersByStatus = db['usersByStatus'] as Record<
        string,
        unknown
      > | null;
      if (usersByStatus !== null) {
        expect(typeof usersByStatus['active']).toBe('number');
        expect(typeof usersByStatus['locked']).toBe('number');
        expect(typeof usersByStatus['pendingEmailVerification']).toBe('number');
      }
    });

    /**
     * Requirement 7.1: BrightTrust shape
     */
    it('should have correct BrightTrust shape', () => {
      const brightTrust = data['brightTrust'] as Record<string, unknown>;
      expect(brightTrust).toBeDefined();
      expect(typeof brightTrust['active']).toBe('boolean');
      expect(typeof brightTrust['memberCount']).toBe('number');
      expect(typeof brightTrust['threshold']).toBe('number');
      expect(Array.isArray(brightTrust['members'])).toBe(true);
    });

    /**
     * Requirements 9.1, 9.2: Dependencies shape
     */
    it('should have correct dependencies shape', () => {
      const deps = data['dependencies'] as Record<string, unknown>;
      expect(deps).toBeDefined();

      for (const key of ['blockStore', 'messageService', 'webSocketServer']) {
        const dep = deps[key] as Record<string, unknown>;
        expect(dep).toBeDefined();
        expect(dep).toHaveProperty('name');
        expect(dep).toHaveProperty('status');
        expect(dep).toHaveProperty('latencyMs');
        expect(typeof dep['latencyMs']).toBe('number');
      }
    });

    /**
     * Requirement 2.1: Nodes array — running server always reports itself
     */
    it('should have nodes as a non-empty array with the local node', () => {
      const nodes = data['nodes'] as Array<Record<string, unknown>>;
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      for (const node of nodes) {
        expect(node).toHaveProperty('nodeId');
        expect(node).toHaveProperty('status');
      }
    });

    /**
     * Requirement 11.1: Timestamp is valid ISO 8601
     */
    it('should have a valid ISO 8601 timestamp', () => {
      const timestamp = data['timestamp'] as string;
      expect(typeof timestamp).toBe('string');
      const parsed = new Date(timestamp);
      expect(parsed.toISOString()).toBe(timestamp);
    });

    /**
     * Service stats: blockStore, hub, chat, pass, mail
     */
    it('should have service stats objects', () => {
      // Block store stats
      const blockStore = data['blockStore'] as Record<string, unknown>;
      expect(blockStore).toBeDefined();
      expect(typeof blockStore['totalBlocks']).toBe('number');
      expect(typeof blockStore['totalSizeBytes']).toBe('number');
      expect(blockStore['countByDurability']).toBeDefined();

      // Hub stats
      const hub = data['hub'] as Record<string, unknown>;
      expect(hub).toBeDefined();
      expect(typeof hub['totalPosts']).toBe('number');
      expect(typeof hub['activeUsersLast30Days']).toBe('number');

      // Chat stats
      const chat = data['chat'] as Record<string, unknown>;
      expect(chat).toBeDefined();
      expect(typeof chat['totalConversations']).toBe('number');
      expect(typeof chat['totalMessages']).toBe('number');

      // Pass stats — only totalVaults and sharedVaults (no totalEntries)
      const pass = data['pass'] as Record<string, unknown>;
      expect(pass).toBeDefined();
      expect(typeof pass['totalVaults']).toBe('number');
      expect(typeof pass['sharedVaults']).toBe('number');
      expect(pass).not.toHaveProperty('totalEntries');

      // Mail stats
      const mail = data['mail'] as Record<string, unknown>;
      expect(mail).toBeDefined();
      expect(typeof mail['totalEmails']).toBe('number');
      expect(typeof mail['deliveryFailures']).toBe('number');
      expect(typeof mail['emailsLast24Hours']).toBe('number');
    });

    /**
     * Lumen client and node connection fields
     */
    it('should have lumen client and node connection fields', () => {
      expect(typeof data['lumenClientCount']).toBe('number');
      expect(Array.isArray(data['lumenClientSessions'])).toBe(true);
      expect(typeof data['nodeConnectionCount']).toBe('number');
      expect(Array.isArray(data['connectedNodeIds'])).toBe(true);
    });

    /**
     * Pool and server identity fields — localNodeId must be a non-empty string
     */
    it('should have pool and server identity fields', () => {
      expect(Array.isArray(data['pools'])).toBe(true);
      expect(typeof data['hostname']).toBe('string');
      expect(Array.isArray(data['disconnectedPeers'])).toBe(true);
      // localNodeId must be a non-empty string — the running server always identifies itself
      expect(typeof data['localNodeId']).toBe('string');
      expect((data['localNodeId'] as string).length).toBeGreaterThan(0);
      // nodeIdSource must be one of the known values
      expect([
        'availability_service',
        'system_identity',
        'environment',
        'generated',
      ]).toContain(data['nodeIdSource']);
    });
  });
});
