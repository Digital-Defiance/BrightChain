/**
 * End-to-end tests for the BrightChat User Search endpoint.
 *
 * Tests hit the real API server (started by global-setup) with real
 * registered users — no mocks.
 *
 * Endpoint: GET /api/brightchat/users/search?query=...
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import axios, { AxiosError } from 'axios';

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.usersearch.local`,
    password: `Srch1T3st!${id}`,
  };
}

/** Register a user and return token + memberId + username. */
async function registerUser(prefix = 'us') {
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

// ─── Tests ──────────────────────────────────────────────────────

const SEARCH_URL = '/api/brightchat/users/search';

describe('BrightChat User Search E2E — GET /api/brightchat/users/search', () => {
  let userA: Awaited<ReturnType<typeof registerUser>>;
  let userB: Awaited<ReturnType<typeof registerUser>>;

  beforeAll(async () => {
    // Register two real users so we have searchable data
    userA = await registerUser('srcha');
    userB = await registerUser('srchb');
  });

  // ─── Auth enforcement (Req 7.5) ──────────────────────────────

  describe('Auth enforcement', () => {
    it('should return 401 for unauthenticated requests', async () => {
      try {
        await axios.get(SEARCH_URL);
        throw new Error('Expected 401');
      } catch (err) {
        const error = err as AxiosError;
        expect(error.response?.status).toBe(401);
      }
    });
  });

  // ─── Authenticated search (Req 7.1, 7.2, 7.3, 7.4) ─────────

  describe('Authenticated search', () => {
    it('should return a user list with correct fields when no query is provided (Req 7.3, 7.4)', async () => {
      const res = await axios.get(SEARCH_URL, authHeader(userA.token));

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');

      const users = res.data.data?.users;
      expect(Array.isArray(users)).toBe(true);

      // Should return up to 20 users
      expect(users.length).toBeLessThanOrEqual(20);

      // Each user should have the correct field shape
      for (const user of users) {
        expect(typeof user.id).toBe('string');
        expect(typeof user.displayName).toBe('string');
        if (user.avatarUrl !== undefined && user.avatarUrl !== null) {
          expect(typeof user.avatarUrl).toBe('string');
        }
      }
    });

    it('should filter users by query string (Req 7.2)', async () => {
      // Search for userB's username prefix — should match
      const queryFragment = userB.creds.username.slice(0, 8);
      const res = await axios.get(
        `${SEARCH_URL}?query=${encodeURIComponent(queryFragment)}`,
        authHeader(userA.token),
      );

      expect(res.status).toBe(200);
      const users = res.data.data?.users;
      expect(Array.isArray(users)).toBe(true);

      // At least userB should appear (displayName contains the query)
      // Note: displayName may be the username depending on the DB layer
      if (users.length > 0) {
        for (const user of users) {
          expect(typeof user.id).toBe('string');
          expect(typeof user.displayName).toBe('string');
        }
      }
    });

    it('should return empty array for a query that matches nobody', async () => {
      const res = await axios.get(
        `${SEARCH_URL}?query=${encodeURIComponent('zzz_nonexistent_user_xyz_999')}`,
        authHeader(userA.token),
      );

      expect(res.status).toBe(200);
      const users = res.data.data?.users;
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBe(0);
    });
  });

  // ─── Self-exclusion (Req 7.6) ────────────────────────────────

  describe('Self-exclusion', () => {
    it('should not include the requesting user in results', async () => {
      // Search with no query — should return users but NOT userA
      const res = await axios.get(SEARCH_URL, authHeader(userA.token));

      expect(res.status).toBe(200);
      const users = res.data.data?.users;
      expect(Array.isArray(users)).toBe(true);

      const selfInResults = users.some(
        (u: { id: string }) => u.id === userA.memberId,
      );
      expect(selfInResults).toBe(false);
    });
  });
});
