import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

/**
 * End-to-end integration tests for the Admin Block Explorer API.
 *
 * Tests GET /api/admin/blocks, GET /api/admin/blocks/:blockId,
 * and DELETE /api/admin/blocks/:blockId against a running API server.
 *
 * Requirements: 13.1, 13.2, 13.4, 13.5
 */

// ─── Constants ──────────────────────────────────────────────────

const JWT_SECRET =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

const BLOCKS_URL = '/api/admin/blocks';

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.adminblock.local`,
    password: `Bl0ckT3st!${id}`,
  };
}

/** Register a user and return token + memberId. */
async function registerUser(prefix = 'ab') {
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
 * Create an admin JWT token using the known e2e JWT secret.
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

describe('Admin Block Explorer E2E', () => {
  let regularToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const user = await registerUser('blkreg');
    regularToken = user.token;
    adminToken = createAdminToken(user.memberId, 'blkadmin');
  });

  // ─── Auth Enforcement ───────────────────────────────────────

  describe('Auth on /admin/blocks', () => {
    it('should return 401 for unauthenticated requests', async () => {
      try {
        await axios.get(BLOCKS_URL);
        throw new Error('Expected 401');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(401);
      }
    });

    it('should return 403 for non-admin user', async () => {
      try {
        await axios.get(BLOCKS_URL, authHeader(regularToken));
        throw new Error('Expected 403');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(403);
      }
    });

    it('should return 200 for admin user', async () => {
      const res = await axios.get(BLOCKS_URL, authHeader(adminToken));
      expect(res.status).toBe(200);
    });
  });

  // ─── List Blocks ────────────────────────────────────────────

  describe('GET /api/admin/blocks', () => {
    it('should return paginated block list', async () => {
      const res = await axios.get(BLOCKS_URL, authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('blocks');
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('page');
      expect(res.data).toHaveProperty('limit');
      expect(Array.isArray(res.data.blocks)).toBe(true);
      expect(typeof res.data.total).toBe('number');
    });

    it('should support durabilityLevel filter', async () => {
      const res = await axios.get(
        `${BLOCKS_URL}?durabilityLevel=standard`,
        authHeader(adminToken),
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.blocks)).toBe(true);
    });
  });

  // ─── Get Block Metadata ─────────────────────────────────────

  describe('GET /api/admin/blocks/:blockId', () => {
    it('should return 404 for non-existent block', async () => {
      const fakeBlockId = '00000000-0000-0000-0000-000000000000';
      try {
        await axios.get(`${BLOCKS_URL}/${fakeBlockId}`, authHeader(adminToken));
        throw new Error('Expected 404 for non-existent block');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(404);
      }
    });

    it('should return block metadata if blocks exist', async () => {
      // First list blocks to find an existing one
      const listRes = await axios.get(BLOCKS_URL, authHeader(adminToken));
      const blocks = listRes.data.blocks as Array<Record<string, unknown>>;

      if (blocks.length > 0) {
        const blockId =
          blocks[0]['blockId'] ?? blocks[0]['id'] ?? blocks[0]['_id'];
        const res = await axios.get(
          `${BLOCKS_URL}/${blockId}`,
          authHeader(adminToken),
        );

        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('block');
      } else {
        // No blocks in the store — skip this assertion
        console.warn('No blocks in store — skipping metadata retrieval test');
      }
    });
  });

  // ─── Delete Block ───────────────────────────────────────────

  describe('DELETE /api/admin/blocks/:blockId', () => {
    it('should return 404 when deleting non-existent block', async () => {
      const fakeBlockId = '00000000-0000-0000-0000-000000000000';
      try {
        await axios.delete(
          `${BLOCKS_URL}/${fakeBlockId}`,
          authHeader(adminToken),
        );
        throw new Error('Expected 404 for non-existent block');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(404);
      }
    });
  });
});
