import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

/**
 * End-to-end integration tests for the Admin Block Explorer API.
 *
 * Tests cursor-based block listing, pool enumeration, local search,
 * network search, block metadata, and block deletion.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

const JWT_SECRET =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

const BLOCKS_URL = '/api/admin/blocks';

function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.adminblock.local`,
    password: `Bl0ckT3st!${id}`,
  };
}

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

function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function createAdminToken(memberId: string, username: string): string {
  return jwt.sign(
    { memberId, username, type: 'Admin', roles: ['admin'] },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

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
        expect((err as AxiosError).response?.status).toBe(401);
      }
    });

    it('should return 403 for non-admin user', async () => {
      try {
        await axios.get(BLOCKS_URL, authHeader(regularToken));
        throw new Error('Expected 403');
      } catch (err) {
        expect((err as AxiosError).response?.status).toBe(403);
      }
    });

    it('should return 200 for admin user', async () => {
      const res = await axios.get(BLOCKS_URL, authHeader(adminToken));
      expect(res.status).toBe(200);
    });
  });

  // ─── List Pools ─────────────────────────────────────────────

  describe('GET /api/admin/blocks/pools', () => {
    it('should return pools array with stats', async () => {
      const res = await axios.get(
        `${BLOCKS_URL}/pools`,
        authHeader(adminToken),
      );
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('pools');
      expect(Array.isArray(res.data.pools)).toBe(true);
      // Each pool should have at least poolId and blockCount
      for (const pool of res.data.pools) {
        expect(pool).toHaveProperty('poolId');
        expect(typeof pool.blockCount).toBe('number');
      }
    });
  });

  // ─── List Blocks (cursor-based) ─────────────────────────────

  describe('GET /api/admin/blocks', () => {
    it('should return cursor-paginated block list', async () => {
      const res = await axios.get(BLOCKS_URL, authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('blocks');
      expect(res.data).toHaveProperty('poolTotal');
      expect(res.data).toHaveProperty('nextCursor');
      expect(res.data).toHaveProperty('limit');
      expect(Array.isArray(res.data.blocks)).toBe(true);
      expect(typeof res.data.poolTotal).toBe('number');
    });

    it('should support pool filter', async () => {
      // First get available pools
      const poolsRes = await axios.get(
        `${BLOCKS_URL}/pools`,
        authHeader(adminToken),
      );
      const pools = poolsRes.data.pools as Array<{ poolId: string }>;
      if (pools.length > 0) {
        const res = await axios.get(
          `${BLOCKS_URL}?pool=${pools[0].poolId}`,
          authHeader(adminToken),
        );
        expect(res.status).toBe(200);
        expect(res.data.pool).toBe(pools[0].poolId);
      }
    });

    it('should support limit parameter', async () => {
      const res = await axios.get(
        `${BLOCKS_URL}?limit=5`,
        authHeader(adminToken),
      );
      expect(res.status).toBe(200);
      expect(res.data.limit).toBe(5);
      expect(res.data.blocks.length).toBeLessThanOrEqual(5);
    });
  });

  // ─── Search Blocks (local) ──────────────────────────────────

  describe('GET /api/admin/blocks/search', () => {
    it('should return 400 without query parameter', async () => {
      try {
        await axios.get(`${BLOCKS_URL}/search`, authHeader(adminToken));
        throw new Error('Expected 400');
      } catch (err) {
        expect((err as AxiosError).response?.status).toBe(400);
      }
    });

    it('should return search results for a hash prefix', async () => {
      // Get a block hash to search for
      const listRes = await axios.get(BLOCKS_URL, authHeader(adminToken));
      const blocks = listRes.data.blocks as Array<{ hash: string }>;
      if (blocks.length > 0) {
        const prefix = blocks[0].hash.substring(0, 6);
        const res = await axios.get(
          `${BLOCKS_URL}/search?q=${prefix}`,
          authHeader(adminToken),
        );
        expect(res.status).toBe(200);
        expect(res.data.source).toBe('local');
        expect(Array.isArray(res.data.blocks)).toBe(true);
        expect(res.data.blocks.length).toBeGreaterThan(0);
      }
    });

    it('should return empty results for non-matching prefix', async () => {
      const res = await axios.get(
        `${BLOCKS_URL}/search?q=zzzzzzzzzzzz`,
        authHeader(adminToken),
      );
      expect(res.status).toBe(200);
      expect(res.data.blocks).toHaveLength(0);
    });
  });

  // ─── Network Search ─────────────────────────────────────────

  describe('POST /api/admin/blocks/network-search', () => {
    it('should return 400 without any search criteria', async () => {
      try {
        await axios.post(
          `${BLOCKS_URL}/network-search`,
          {},
          authHeader(adminToken),
        );
        throw new Error('Expected 400');
      } catch (err) {
        expect((err as AxiosError).response?.status).toBe(400);
      }
    });

    it('should accept blockId for network discovery', async () => {
      const res = await axios.post(
        `${BLOCKS_URL}/network-search`,
        { blockId: 'abc123' },
        authHeader(adminToken),
      );
      expect(res.status).toBe(200);
      expect(res.data.source).toBe('network');
      expect(res.data).toHaveProperty('found');
      expect(res.data).toHaveProperty('locations');
    });

    it('should accept fileName for CBL metadata search', async () => {
      const res = await axios.post(
        `${BLOCKS_URL}/network-search`,
        { fileName: 'test' },
        authHeader(adminToken),
      );
      expect(res.status).toBe(200);
      expect(res.data.source).toBe('network');
      expect(res.data).toHaveProperty('hits');
    });
  });

  // ─── Get Block Metadata ─────────────────────────────────────

  describe('GET /api/admin/blocks/:blockId', () => {
    it('should return 404 for non-existent block', async () => {
      const fakeBlockId = '00000000-0000-0000-0000-000000000000';
      try {
        await axios.get(`${BLOCKS_URL}/${fakeBlockId}`, authHeader(adminToken));
        throw new Error('Expected 404');
      } catch (err) {
        expect((err as AxiosError).response?.status).toBe(404);
      }
    });

    it('should return block metadata if blocks exist', async () => {
      const listRes = await axios.get(BLOCKS_URL, authHeader(adminToken));
      const blocks = listRes.data.blocks as Array<{ hash: string }>;

      if (blocks.length > 0) {
        const res = await axios.get(
          `${BLOCKS_URL}/${blocks[0].hash}`,
          authHeader(adminToken),
        );
        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('block');
        expect(res.data.block.blockId).toBe(blocks[0].hash);
      } else {
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
        throw new Error('Expected 404');
      } catch (err) {
        expect((err as AxiosError).response?.status).toBe(404);
      }
    });
  });
});
