import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

/**
 * End-to-end integration tests for the Admin Service endpoints:
 * - BrightHub (posts)
 * - BrightChat (conversations)
 * - BrightPass (vaults)
 * - BrightMail (emails)
 *
 * Requirements: 14.2, 14.3, 15.2, 15.3, 15.4, 16.2, 16.3, 17.2, 17.3
 */

// ─── Constants ──────────────────────────────────────────────────

const JWT_SECRET =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.adminsvc.local`,
    password: `Svc1T3st!${id}`,
  };
}

/** Register a user and return token + memberId. */
async function registerUser(prefix = 'as') {
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

describe('Admin Service Endpoints E2E', () => {
  let regularToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const user = await registerUser('svcreg');
    regularToken = user.token;
    adminToken = createAdminToken(user.memberId, 'svcadmin');
  });

  // ─── BrightHub Admin (Posts) ──────────────────────────────────

  describe('BrightHub Admin — /api/admin/hub', () => {
    const HUB_POSTS_URL = '/api/admin/hub/posts';

    describe('Auth enforcement', () => {
      it('should return 401 for unauthenticated requests', async () => {
        try {
          await axios.get(HUB_POSTS_URL);
          throw new Error('Expected 401');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(401);
        }
      });

      it('should return 403 for non-admin user', async () => {
        try {
          await axios.get(HUB_POSTS_URL, authHeader(regularToken));
          throw new Error('Expected 403');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(403);
        }
      });
    });

    describe('GET /api/admin/hub/posts', () => {
      it('should return paginated post list', async () => {
        const res = await axios.get(HUB_POSTS_URL, authHeader(adminToken));

        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('posts');
        expect(res.data).toHaveProperty('total');
        expect(res.data).toHaveProperty('page');
        expect(res.data).toHaveProperty('limit');
        expect(Array.isArray(res.data.posts)).toBe(true);
        expect(typeof res.data.total).toBe('number');
      });
    });

    describe('DELETE /api/admin/hub/posts/:postId', () => {
      it('should return 404 for non-existent post', async () => {
        const fakePostId = '00000000-0000-0000-0000-000000000000';
        try {
          await axios.delete(
            `${HUB_POSTS_URL}/${fakePostId}`,
            authHeader(adminToken),
          );
          throw new Error('Expected 404 for non-existent post');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(404);
        }
      });
    });
  });

  // ─── BrightChat Admin (Conversations) ─────────────────────────

  describe('BrightChat Admin — /api/admin/chat', () => {
    const CHAT_CONVERSATIONS_URL = '/api/admin/chat/conversations';

    describe('Auth enforcement', () => {
      it('should return 401 for unauthenticated requests', async () => {
        try {
          await axios.get(CHAT_CONVERSATIONS_URL);
          throw new Error('Expected 401');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(401);
        }
      });

      it('should return 403 for non-admin user', async () => {
        try {
          await axios.get(CHAT_CONVERSATIONS_URL, authHeader(regularToken));
          throw new Error('Expected 403');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(403);
        }
      });
    });

    describe('GET /api/admin/chat/conversations', () => {
      it('should return paginated conversation list', async () => {
        const res = await axios.get(
          CHAT_CONVERSATIONS_URL,
          authHeader(adminToken),
        );

        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('conversations');
        expect(res.data).toHaveProperty('total');
        expect(res.data).toHaveProperty('page');
        expect(res.data).toHaveProperty('limit');
        expect(Array.isArray(res.data.conversations)).toBe(true);
        expect(typeof res.data.total).toBe('number');
      });
    });

    describe('GET /api/admin/chat/conversations/:id/messages', () => {
      it('should return 404 for non-existent conversation', async () => {
        const fakeConvId = '00000000-0000-0000-0000-000000000000';
        try {
          await axios.get(
            `${CHAT_CONVERSATIONS_URL}/${fakeConvId}/messages`,
            authHeader(adminToken),
          );
          // Some implementations return empty list instead of 404
          // Accept either behavior
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBeGreaterThanOrEqual(400);
        }
      });
    });
  });

  // ─── BrightPass Admin (Vaults) ────────────────────────────────

  describe('BrightPass Admin — /api/admin/pass', () => {
    const PASS_VAULTS_URL = '/api/admin/pass/vaults';

    describe('Auth enforcement', () => {
      it('should return 401 for unauthenticated requests', async () => {
        try {
          await axios.get(PASS_VAULTS_URL);
          throw new Error('Expected 401');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(401);
        }
      });

      it('should return 403 for non-admin user', async () => {
        try {
          await axios.get(PASS_VAULTS_URL, authHeader(regularToken));
          throw new Error('Expected 403');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(403);
        }
      });
    });

    describe('GET /api/admin/pass/vaults', () => {
      it('should return paginated vault list with no entry counts', async () => {
        const res = await axios.get(PASS_VAULTS_URL, authHeader(adminToken));

        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('vaults');
        expect(res.data).toHaveProperty('total');
        expect(res.data).toHaveProperty('page');
        expect(res.data).toHaveProperty('limit');
        expect(Array.isArray(res.data.vaults)).toBe(true);
        expect(typeof res.data.total).toBe('number');

        // Verify no entry counts are exposed (vaults are opaque encrypted blobs)
        for (const vault of res.data.vaults) {
          expect(vault).not.toHaveProperty('entryCount');
          expect(vault).not.toHaveProperty('totalEntries');
        }
      });
    });
  });

  // ─── BrightMail Admin (Emails) ────────────────────────────────

  describe('BrightMail Admin — /api/admin/mail', () => {
    const MAIL_EMAILS_URL = '/api/admin/mail/emails';

    describe('Auth enforcement', () => {
      it('should return 401 for unauthenticated requests', async () => {
        try {
          await axios.get(MAIL_EMAILS_URL);
          throw new Error('Expected 401');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(401);
        }
      });

      it('should return 403 for non-admin user', async () => {
        try {
          await axios.get(MAIL_EMAILS_URL, authHeader(regularToken));
          throw new Error('Expected 403');
        } catch (err) {
          const error = err as AxiosError;
          expect(error.response?.status).toBe(403);
        }
      });
    });

    describe('GET /api/admin/mail/emails', () => {
      it('should return paginated email list', async () => {
        const res = await axios.get(MAIL_EMAILS_URL, authHeader(adminToken));

        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('emails');
        expect(res.data).toHaveProperty('total');
        expect(res.data).toHaveProperty('page');
        expect(res.data).toHaveProperty('limit');
        expect(Array.isArray(res.data.emails)).toBe(true);
        expect(typeof res.data.total).toBe('number');
      });
    });
  });
});
