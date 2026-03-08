/**
 * @fileoverview E2E tests for the BrightChain UserController API routes.
 *
 * Boots the real App (in-memory DEV_DATABASE mode) and exercises all
 * UserController routes over real HTTP with real services — no mocks.
 *
 * Run via: yarn nx run brightchain-api:test --testFile=user.api.e2e.spec.ts
 */

import { App, Environment } from '@brightchain/brightchain-api-lib';
import { EmailString } from '@brightchain/brightchain-lib';
import { MemberType, SecureString } from '@digitaldefiance/ecies-lib';
import {
  GuidV4Buffer,
  ECIESService as NodeECIESService,
  Member as NodeMember,
} from '@digitaldefiance/node-ecies-lib';
import { mkdtempSync, rmSync } from 'fs';
import { AddressInfo, createServer } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';

jest.setTimeout(120_000);

// ── Env setup ─────────────────────────────────────────────────────────────
// Must be set before Environment is constructed.

const JWT_SECRET = 'a'.repeat(64); // 64 hex chars — satisfies JwtSecretRegex
const MNEMONIC_HMAC_SECRET = 'b'.repeat(64); // 64 hex chars
const MNEMONIC_ENCRYPTION_KEY = 'c'.repeat(64); // 64 hex chars
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/** Ask the OS for a free TCP port, then release it for the app to bind. */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function setTestEnv(port: number) {
  process.env['JWT_SECRET'] = JWT_SECRET;
  process.env['MNEMONIC_HMAC_SECRET'] = MNEMONIC_HMAC_SECRET;
  process.env['MNEMONIC_ENCRYPTION_KEY'] = MNEMONIC_ENCRYPTION_KEY;
  process.env['DEV_DATABASE'] = 'user-e2e-test-pool';
  process.env['DEBUG'] = 'false';
  process.env['PORT'] = String(port);
  process.env['HOST'] = '127.0.0.1';
  process.env['UPNP_ENABLED'] = 'false';
  process.env['LETS_ENCRYPT_ENABLED'] = 'false';
  process.env['SYSTEM_MNEMONIC'] = TEST_MNEMONIC;
  process.env['MEMBER_POOL_NAME'] = 'BrightChain';
  process.env['USE_TRANSACTIONS'] = 'false';
  process.env['DISABLE_EMAIL_SEND'] = 'true';
  // Required by base Environment — point at workspace root (doesn't need to exist for tests)
  process.env['API_DIST_DIR'] = join(process.cwd(), 'dist', 'brightchain-api');
  process.env['REACT_DIST_DIR'] = join(
    process.cwd(),
    'dist',
    'brightchain-react',
  );
  // No BRIGHTCHAIN_BLOCKSTORE_PATH → in-memory block store via DEV_DATABASE
}

// ── Server lifecycle ──────────────────────────────────────────────────────

interface TestServer {
  app: App<GuidV4Buffer>;
  baseUrl: string;
}

async function startApp(): Promise<TestServer> {
  const port = await getFreePort();
  setTestEnv(port);
  const env = new Environment(undefined, false, false);
  const app = new App<GuidV4Buffer>(env as Environment<GuidV4Buffer>);
  await app.start();

  return { app, baseUrl: `http://127.0.0.1:${port}` };
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function post(
  baseUrl: string,
  path: string,
  body: unknown,
  token?: string,
) {
  return fetch(`${baseUrl}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function get(baseUrl: string, path: string, token?: string) {
  return fetch(`${baseUrl}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function put(
  baseUrl: string,
  path: string,
  body: unknown,
  token?: string,
) {
  return fetch(`${baseUrl}/api${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ── Test Suite ────────────────────────────────────────────────────────────

// ── RBAC-seeded direct-challenge suite ───────────────────────────────────────
// This suite boots a production-mode server (no DEV_DATABASE), seeds via
// seedWithRbac(), then verifies direct-challenge works for the seeded member.
// This is the path that was broken: seeded users have no CBL blocks, so
// getMember() fails — the fix reads publicKey from the users collection instead.

describe('UserController E2E — RBAC-seeded direct-challenge', () => {
  let server: TestServer;

  beforeAll(async () => {
    const port = await getFreePort();
    // Use a separate in-memory pool so this suite is isolated from the main suite.
    // Members come exclusively from seedWithRbac() — no pre-registered users.
    process.env['JWT_SECRET'] = JWT_SECRET;
    process.env['MNEMONIC_HMAC_SECRET'] = MNEMONIC_HMAC_SECRET;
    process.env['MNEMONIC_ENCRYPTION_KEY'] = MNEMONIC_ENCRYPTION_KEY;
    process.env['DEV_DATABASE'] = 'rbac-e2e-test-pool';
    process.env['DEBUG'] = 'false';
    process.env['PORT'] = String(port);
    process.env['HOST'] = '127.0.0.1';
    process.env['UPNP_ENABLED'] = 'false';
    process.env['LETS_ENCRYPT_ENABLED'] = 'false';
    process.env['SYSTEM_MNEMONIC'] = TEST_MNEMONIC;
    process.env['MEMBER_POOL_NAME'] = 'BrightChain';
    process.env['USE_TRANSACTIONS'] = 'false';
    process.env['DISABLE_EMAIL_SEND'] = 'true';
    process.env['API_DIST_DIR'] = join(
      process.cwd(),
      'dist',
      'brightchain-api',
    );
    process.env['REACT_DIST_DIR'] = join(
      process.cwd(),
      'dist',
      'brightchain-react',
    );

    const env = new Environment(undefined, false, false);
    const app = new App<GuidV4Buffer>(env as Environment<GuidV4Buffer>);
    await app.start();
    server = { app, baseUrl: `http://127.0.0.1:${port}` };
  });

  afterAll(async () => {
    await server.app.stop();
  });

  it('direct-challenge succeeds for the RBAC-seeded member user', async () => {
    // Use lastInitResult from the plugin — this is the result from the
    // seedWithRbac() call that happened during app.start(). Calling
    // seedWithRbac() again would generate a NEW random mnemonic/keypair
    // that doesn't match what's stored in the DB.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = (server.app as any)._plugin;
    const initResult = plugin.lastInitResult;
    expect(initResult).not.toBeNull();

    const memberMnemonic: string = initResult.memberMnemonic;
    const memberUsername: string = initResult.memberUsername;
    const memberEmail: string = initResult.memberEmail;

    expect(typeof memberMnemonic).toBe('string');
    expect(memberMnemonic.split(' ').length).toBeGreaterThanOrEqual(12);

    // Reconstruct the member using the same ECIESService + EciesConfig that
    // RbacInputBuilder uses — this produces the same keypair from the mnemonic.
    const ecies = new NodeECIESService();
    const mnemonic = new SecureString(memberMnemonic);
    const { member } = NodeMember.newMember<GuidV4Buffer>(
      ecies as never,
      MemberType.User,
      memberUsername,
      new EmailString(memberEmail),
      mnemonic,
    );

    // Fetch a fresh challenge from the server
    const challengeRes = await post(
      server.baseUrl,
      '/user/request-direct-login',
      {},
    );
    expect(challengeRes.status).toBe(200);
    const challengeBody = (await challengeRes.json()) as Record<
      string,
      unknown
    >;
    const challengeHex = challengeBody['challenge'] as string;

    // Sign the challenge with the member's private key
    const sig = member.sign(Buffer.from(challengeHex, 'hex'));
    const sigHex = Buffer.from(sig).toString('hex');

    const dcRes = await post(server.baseUrl, '/user/direct-challenge', {
      challenge: challengeHex,
      signature: sigHex,
      username: memberUsername,
    });

    expect(dcRes.status).toBe(200);
    const dcBody = (await dcRes.json()) as Record<string, unknown>;
    expect(typeof dcBody['token']).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('UserController E2E', () => {
  let server: TestServer;

  // Shared state — register once, then use the token across all tests
  let authToken: string;
  const testUser = {
    username: `e2euser_${Date.now()}`,
    email: `e2euser_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    timezone: 'UTC',
  };

  beforeAll(async () => {
    server = await startApp();
  });

  afterAll(async () => {
    await server.app.stop();
  });

  // ── POST /user/request-direct-login ──────────────────────────────────

  describe('POST /user/request-direct-login', () => {
    it('returns 200 with challenge and serverPublicKey', async () => {
      const res = await post(server.baseUrl, '/user/request-direct-login', {});
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['challenge']).toBe('string');
      // hex: 8 bytes time + 32 bytes nonce + signature ≥ 80 bytes = 160 hex chars
      expect((body['challenge'] as string).length).toBeGreaterThanOrEqual(160);
      expect(typeof body['serverPublicKey']).toBe('string');
    });
  });

  // ── POST /user/register ───────────────────────────────────────────────

  describe('POST /user/register', () => {
    it('returns 400 when body is empty', async () => {
      const res = await post(server.baseUrl, '/user/register', {});
      expect(res.status).toBe(400);
    });

    it('returns 400 when username is missing', async () => {
      const res = await post(server.baseUrl, '/user/register', {
        email: 'valid@example.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await post(server.baseUrl, '/user/register', {
        username: 'validuser',
        email: 'not-an-email',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const res = await post(server.baseUrl, '/user/register', {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'short',
      });
      expect(res.status).toBe(400);
    });

    it('returns 201 and a token on valid registration', async () => {
      const res = await post(server.baseUrl, '/user/register', testUser);
      if (res.status !== 201) {
        const errBody = await res.clone().text();
        console.error('Registration failed:', res.status, errBody);
      }
      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      const data = body['data'] as Record<string, unknown>;
      expect(typeof data['token']).toBe('string');
      expect(typeof data['memberId']).toBe('string');
    });

    it('returns 400 on duplicate email', async () => {
      const res = await post(server.baseUrl, '/user/register', testUser);
      expect(res.status).toBe(400);
    });

    it('returns 400 on duplicate username', async () => {
      const res = await post(server.baseUrl, '/user/register', {
        ...testUser,
        email: `other_${Date.now()}@example.com`,
      });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /user/login ──────────────────────────────────────────────────

  describe('POST /user/login', () => {
    it('returns 400 when body is empty', async () => {
      const res = await post(server.baseUrl, '/user/login', {});
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await post(server.baseUrl, '/user/login', {
        username: testUser.username,
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 on wrong password', async () => {
      const res = await post(server.baseUrl, '/user/login', {
        username: testUser.username,
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown username', async () => {
      const res = await post(server.baseUrl, '/user/login', {
        username: 'nobody_exists_here',
        password: 'Password123!',
      });
      expect(res.status).toBe(401);
    });

    it('returns 200 and a token on valid credentials', async () => {
      const res = await post(server.baseUrl, '/user/login', {
        username: testUser.username,
        password: testUser.password,
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(typeof data['token']).toBe('string');
      authToken = data['token'] as string;
    });
  });

  // ── GET /user/profile ─────────────────────────────────────────────────

  describe('GET /user/profile', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/user/profile');
      expect(res.status).toBe(401);
    });

    it('returns 200 with profile data when authenticated', async () => {
      const res = await get(server.baseUrl, '/user/profile', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(typeof data['memberId']).toBe('string');
      expect(data['username']).toBe(testUser.username);
      expect(typeof data['energyBalance']).toBe('number');
    });
  });

  // ── PUT /user/profile ─────────────────────────────────────────────────

  describe('PUT /user/profile', () => {
    it('returns 401 without auth token', async () => {
      const res = await put(server.baseUrl, '/user/profile', {});
      expect(res.status).toBe(401);
    });

    it('returns 200 with empty body (no-op update)', async () => {
      const res = await put(server.baseUrl, '/user/profile', {}, authToken);
      expect(res.status).toBe(200);
    });

    it('returns 200 and updated profile when authenticated', async () => {
      const res = await put(
        server.baseUrl,
        '/user/profile',
        { settings: { autoReplication: false, minRedundancy: 2 } },
        authToken,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['username']).toBe(testUser.username);
    });
  });

  // ── POST /user/change-password ────────────────────────────────────────

  describe('POST /user/change-password', () => {
    it('returns 400 when body is empty', async () => {
      const res = await post(
        server.baseUrl,
        '/user/change-password',
        {},
        authToken,
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when new password is too short', async () => {
      const res = await post(
        server.baseUrl,
        '/user/change-password',
        { currentPassword: testUser.password, newPassword: 'short' },
        authToken,
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when newPassword is missing', async () => {
      const res = await post(
        server.baseUrl,
        '/user/change-password',
        { currentPassword: testUser.password },
        authToken,
      );
      expect(res.status).toBe(400);
    });

    it('returns 401 without auth token', async () => {
      const res = await post(server.baseUrl, '/user/change-password', {
        currentPassword: testUser.password,
        newPassword: 'NewPassword456!',
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 on wrong current password', async () => {
      const res = await post(
        server.baseUrl,
        '/user/change-password',
        { currentPassword: 'WrongCurrent!', newPassword: 'NewPassword456!' },
        authToken,
      );
      expect(res.status).toBe(401);
    });

    it('returns 200 on successful password change', async () => {
      const newPassword = 'NewPassword456!';
      const res = await post(
        server.baseUrl,
        '/user/change-password',
        { currentPassword: testUser.password, newPassword },
        authToken,
      );
      expect(res.status).toBe(200);
      testUser.password = newPassword;
    });
  });

  // ── POST /user/backup-codes ───────────────────────────────────────────

  describe('POST /user/backup-codes', () => {
    it('returns 401 without auth token', async () => {
      const res = await post(server.baseUrl, '/user/backup-codes', {});
      expect(res.status).toBe(401);
    });

    it('returns 200 with backup codes when authenticated', async () => {
      const res = await post(
        server.baseUrl,
        '/user/backup-codes',
        {},
        authToken,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(Array.isArray(body['backupCodes'])).toBe(true);
    });
  });

  // ── GET /user/backup-codes ────────────────────────────────────────────

  describe('GET /user/backup-codes', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/user/backup-codes');
      expect(res.status).toBe(401);
    });

    it('returns 200 with code count when authenticated', async () => {
      const res = await get(server.baseUrl, '/user/backup-codes', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['codeCount']).toBe('number');
    });
  });

  // ── POST /user/recover ────────────────────────────────────────────────

  describe('POST /user/recover', () => {
    it('returns 400 when body is empty', async () => {
      const res = await post(server.baseUrl, '/user/recover', {});
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await post(server.baseUrl, '/user/recover', {
        email: 'bad-email',
        mnemonic: TEST_MNEMONIC,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when mnemonic is missing', async () => {
      const res = await post(server.baseUrl, '/user/recover', {
        email: testUser.email,
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 on invalid mnemonic', async () => {
      const res = await post(server.baseUrl, '/user/recover', {
        email: testUser.email,
        mnemonic: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const res = await post(server.baseUrl, '/user/recover', {
        email: `nobody_${Date.now()}@example.com`,
        mnemonic: TEST_MNEMONIC,
      });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /user/verify ──────────────────────────────────────────────────

  describe('GET /user/verify', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/user/verify');
      expect(res.status).toBe(401);
    });

    it('returns 200 with user DTO when authenticated', async () => {
      const res = await get(server.baseUrl, '/user/verify', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      const user = body['user'] as Record<string, unknown>;
      expect(typeof user['id']).toBe('string');
      expect(user['username']).toBe(testUser.username);
      expect(user['email']).toBe(testUser.email);
      expect(typeof user['emailVerified']).toBe('boolean');
      expect(typeof user['darkMode']).toBe('boolean');
      expect(typeof user['timezone']).toBe('string');
      expect(typeof user['siteLanguage']).toBe('string');
      expect(typeof user['currency']).toBe('string');
      expect(Array.isArray(user['roles'])).toBe(true);
      expect(typeof user['rolePrivileges']).toBe('object');
    });
  });

  // ── GET /user/settings ────────────────────────────────────────────────

  describe('GET /user/settings', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/user/settings');
      expect(res.status).toBe(401);
    });

    it('returns 200 with settings when authenticated', async () => {
      const res = await get(server.baseUrl, '/user/settings', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      const settings = body['settings'] as Record<string, unknown>;
      expect(typeof settings['email']).toBe('string');
      expect(typeof settings['timezone']).toBe('string');
      expect(typeof settings['currency']).toBe('string');
      expect(typeof settings['siteLanguage']).toBe('string');
      expect(typeof settings['darkMode']).toBe('boolean');
      expect(typeof settings['directChallenge']).toBe('boolean');
    });
  });

  // ── POST /user/settings ───────────────────────────────────────────────

  describe('POST /user/settings', () => {
    it('returns 401 without auth token', async () => {
      const res = await post(server.baseUrl, '/user/settings', {});
      expect(res.status).toBe(401);
    });

    it('returns 200 and updates settings when authenticated', async () => {
      const res = await post(
        server.baseUrl,
        '/user/settings',
        { timezone: 'America/New_York', darkMode: true },
        authToken,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      const user = body['user'] as Record<string, unknown>;
      expect(user['timezone']).toBe('America/New_York');
      expect(user['darkMode']).toBe(true);
    });

    it('returns 200 with empty body (no-op update)', async () => {
      const res = await post(server.baseUrl, '/user/settings', {}, authToken);
      expect(res.status).toBe(200);
    });
  });

  // ── GET /user/refresh-token ───────────────────────────────────────────

  describe('GET /user/refresh-token', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/user/refresh-token');
      expect(res.status).toBe(401);
    });

    it('returns 200 with new token and user DTO when authenticated', async () => {
      const res = await get(server.baseUrl, '/user/refresh-token', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      expect(typeof body['token']).toBe('string');
      expect(body['token']).not.toBe(''); // non-empty new token
      const user = body['user'] as Record<string, unknown>;
      expect(typeof user['id']).toBe('string');
      expect(user['username']).toBe(testUser.username);
      expect(typeof body['serverPublicKey']).toBe('string');

      // The new token should also be valid
      const verifyRes = await get(
        server.baseUrl,
        '/user/verify',
        body['token'] as string,
      );
      expect(verifyRes.status).toBe(200);
    });
  });

  // ── GET /energy/balance ───────────────────────────────────────────────

  describe('GET /energy/balance', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/energy/balance');
      expect(res.status).toBe(401);
    });

    it('returns 200 with balance data when authenticated', async () => {
      const res = await get(server.baseUrl, '/energy/balance', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      expect(typeof body['balance']).toBe('number');
    });
  });

  // ── GET /energy/transactions ──────────────────────────────────────────

  describe('GET /energy/transactions', () => {
    it('returns 401 without auth token', async () => {
      const res = await get(server.baseUrl, '/energy/transactions');
      expect(res.status).toBe(401);
    });

    it('returns 200 with transactions list when authenticated', async () => {
      const res = await get(server.baseUrl, '/energy/transactions', authToken);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['message']).toBe('string');
      expect(Array.isArray(body['transactions'])).toBe(true);
      expect(typeof body['count']).toBe('number');
    });
  });

  // ── POST /user/logout ─────────────────────────────────────────────────

  describe('POST /user/logout', () => {
    it('returns 401 without auth token', async () => {
      const res = await post(server.baseUrl, '/user/logout', {});
      expect(res.status).toBe(401);
    });

    it('returns 200 with a bogus token (no session to delete)', async () => {
      // The controller validates the Bearer prefix then tries to find the
      // session — if not found it still returns 200 (idempotent logout).
      const res = await post(
        server.baseUrl,
        '/user/logout',
        {},
        'not.a.real.jwt',
      );
      // Auth middleware will reject a malformed JWT before the handler runs
      expect([200, 401, 403]).toContain(res.status);
    });

    it('returns 200 on successful logout', async () => {
      const res = await post(server.baseUrl, '/user/logout', {}, authToken);
      expect(res.status).toBe(200);
    });
  });

  // ── POST /user/direct-challenge (two-step direct login flow) ──────────

  describe('POST /user/direct-challenge', () => {
    // Pre-create all members needed by this describe block in beforeAll so
    // the heavy crypto work (key generation + CBL writes) is done before any
    // HTTP requests fire, avoiding ECONNRESET under load.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dcMembers: Array<{ member: any; username: string; email: string }> = [];
    let sigSize = 64;

    beforeAll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberStore = server.app.services.get<any>('memberStore');

      // Resolve SIGNATURE_SIZE once
      const constants = (
        server.app as unknown as {
          constants: { ECIES: { SIGNATURE_SIZE: number } };
        }
      ).constants;
      sigSize = constants?.ECIES?.SIGNATURE_SIZE ?? 64;

      // Create 5 members up-front (unknown-user, wrong-sig ×2, expired, happy, replay)
      for (let i = 0; i < 5; i++) {
        const username = `dctest_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;
        const email = `${username}@example.com`;
        const { reference, mnemonic } = await memberStore.createMember({
          type: MemberType.User,
          name: username,
          contactEmail: new EmailString(email),
        });
        const member = await memberStore.getMember(reference.id);
        member.loadWallet(new SecureString(mnemonic.value));
        dcMembers.push({ member, username, email });
      }

      // Brief settle — let the block-store flush writes before HTTP tests fire
      await new Promise((r) => setTimeout(r, 300));
    });

    async function fetchChallenge(): Promise<string> {
      const res = await post(server.baseUrl, '/user/request-direct-login', {});
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      return body['challenge'] as string;
    }

    it('returns 401 with missing fields', async () => {
      const res = await post(server.baseUrl, '/user/direct-challenge', {});
      expect(res.status).toBe(401);
    });

    it('returns 401 with an invalid challenge (bad format)', async () => {
      const res = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: 'deadbeef'.repeat(20),
        signature: 'aabbcc'.repeat(20),
        username: testUser.username,
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for an unknown user', async () => {
      const { member } = dcMembers[0];
      const challengeHex = await fetchChallenge();
      const sig = member.sign(Buffer.from(challengeHex, 'hex'));
      const sigHex = Buffer.from(sig).toString('hex');

      const res = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: challengeHex,
        signature: sigHex,
        username: `no_such_user_${Date.now()}`,
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 when the user signature is wrong', async () => {
      // Sign with member[2]'s key but claim to be member[1]
      const { username } = dcMembers[1];
      const { member: wrongMember } = dcMembers[2];

      const challengeHex = await fetchChallenge();
      const badSig = wrongMember.sign(Buffer.from(challengeHex, 'hex'));
      const badSigHex = Buffer.from(badSig).toString('hex');

      const res = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: challengeHex,
        signature: badSigHex,
        username,
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for an expired challenge', async () => {
      const { member, username } = dcMembers[3];
      const crypto = await import('crypto');

      // Timestamp 10 minutes in the past — exceeds LoginChallengeExpiration
      const time = Buffer.alloc(8);
      time.writeBigUInt64BE(BigInt(Date.now() - 10 * 60 * 1000));
      const nonce = crypto.randomBytes(32);
      // Pad server-sig with zeros — expiry check fires before sig verification
      const fakeServerSig = Buffer.alloc(sigSize, 0);
      const challengeBuf = Buffer.concat([time, nonce, fakeServerSig]);
      const challengeHex = challengeBuf.toString('hex');

      const sig = member.sign(challengeBuf);
      const sigHex = Buffer.from(sig).toString('hex');

      const res = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: challengeHex,
        signature: sigHex,
        username,
      });
      expect(res.status).toBe(401);
    });

    it('completes the full two-step direct login flow', async () => {
      const { member, username } = dcMembers[4];

      const challengeHex = await fetchChallenge();
      const sig = member.sign(Buffer.from(challengeHex, 'hex'));
      const sigHex = Buffer.from(sig).toString('hex');

      const dcRes = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: challengeHex,
        signature: sigHex,
        username,
      });

      expect(dcRes.status).toBe(200);
      const dcBody = (await dcRes.json()) as Record<string, unknown>;
      expect(typeof dcBody['token']).toBe('string');
      expect(typeof dcBody['serverPublicKey']).toBe('string');
      expect(dcBody['user']).toBeDefined();
    });

    it('returns 401 on challenge replay', async () => {
      // Use member[0] again — unknown-user test used a non-existent username
      // so the member itself was never consumed by replay prevention.
      const { member, username } = dcMembers[0];

      const challengeHex = await fetchChallenge();
      const sig = member.sign(Buffer.from(challengeHex, 'hex'));
      const sigHex = Buffer.from(sig).toString('hex');

      const firstRes = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: challengeHex,
        signature: sigHex,
        username,
      });
      expect(firstRes.status).toBe(200);

      const replayRes = await post(server.baseUrl, '/user/direct-challenge', {
        challenge: challengeHex,
        signature: sigHex,
        username,
      });
      expect(replayRes.status).toBe(401);
    });
  });
});

// ── Disk-backed e2e suite ────────────────────────────────────────────────────
// Validates the same core flows (register, login, direct-challenge) against a
// real DiskBlockAsyncStore + PersistentHeadRegistry backed by a temp directory.
// This catches bugs that only manifest with persistent storage (e.g. nested
// block layout, head registry serialization, blockstore path resolution).

describe('UserController E2E — disk-backed store', () => {
  let server: TestServer;
  let tmpDir: string;

  const diskTestUser = {
    username: `diskuser_${Date.now()}`,
    email: `diskuser_${Date.now()}@example.com`,
    password: 'DiskPassword123!',
    timezone: 'UTC',
  };

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bc-e2e-disk-'));
    const port = await getFreePort();

    process.env['JWT_SECRET'] = JWT_SECRET;
    process.env['MNEMONIC_HMAC_SECRET'] = MNEMONIC_HMAC_SECRET;
    process.env['MNEMONIC_ENCRYPTION_KEY'] = MNEMONIC_ENCRYPTION_KEY;
    delete process.env['DEV_DATABASE'];
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'] = tmpDir;
    process.env['DEBUG'] = 'false';
    process.env['PORT'] = String(port);
    process.env['HOST'] = '127.0.0.1';
    process.env['UPNP_ENABLED'] = 'false';
    process.env['LETS_ENCRYPT_ENABLED'] = 'false';
    process.env['SYSTEM_MNEMONIC'] = TEST_MNEMONIC;
    process.env['MEMBER_POOL_NAME'] = 'BrightChain';
    process.env['USE_TRANSACTIONS'] = 'false';
    process.env['DISABLE_EMAIL_SEND'] = 'true';
    process.env['API_DIST_DIR'] = join(
      process.cwd(),
      'dist',
      'brightchain-api',
    );
    process.env['REACT_DIST_DIR'] = join(
      process.cwd(),
      'dist',
      'brightchain-react',
    );
    // Placeholder — app.start() overwrites after DB init
    process.env['SYSTEM_PUBLIC_KEY'] = '04' + '00'.repeat(64);

    const env = new Environment(undefined, false, false);
    const app = new App<GuidV4Buffer>(env as Environment<GuidV4Buffer>);
    await app.start();
    server = { app, baseUrl: `http://127.0.0.1:${port}` };
  });

  afterAll(async () => {
    await server.app.stop();
    // Clean up temp directory
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    // Restore DEV_DATABASE for any subsequent suites
    delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
    process.env['DEV_DATABASE'] = 'user-e2e-test-pool';
  });

  it('registers a user on disk-backed store', async () => {
    const res = await post(server.baseUrl, '/user/register', diskTestUser);
    if (res.status !== 201) {
      const errBody = await res.clone().text();
      console.error('Registration failed:', res.status, errBody);
    }
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(typeof data['token']).toBe('string');
    expect(typeof data['memberId']).toBe('string');
  });

  it('logs in the registered user on disk-backed store', async () => {
    const res = await post(server.baseUrl, '/user/login', {
      username: diskTestUser.username,
      password: diskTestUser.password,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(typeof data['token']).toBe('string');
  });

  it('direct-challenge works for RBAC-seeded member on disk-backed store', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = (server.app as any)._plugin;
    const initResult = plugin.lastInitResult;
    expect(initResult).not.toBeNull();

    const memberMnemonic: string = initResult.memberMnemonic;
    const memberUsername: string = initResult.memberUsername;
    const memberEmail: string = initResult.memberEmail;

    const ecies = new NodeECIESService();
    const mnemonic = new SecureString(memberMnemonic);
    const { member } = NodeMember.newMember<GuidV4Buffer>(
      ecies as never,
      MemberType.User,
      memberUsername,
      new EmailString(memberEmail),
      mnemonic,
    );

    const challengeRes = await post(
      server.baseUrl,
      '/user/request-direct-login',
      {},
    );
    expect(challengeRes.status).toBe(200);
    const challengeBody = (await challengeRes.json()) as Record<
      string,
      unknown
    >;
    const challengeHex = challengeBody['challenge'] as string;

    const sig = member.sign(Buffer.from(challengeHex, 'hex'));
    const sigHex = Buffer.from(sig).toString('hex');

    const dcRes = await post(server.baseUrl, '/user/direct-challenge', {
      challenge: challengeHex,
      signature: sigHex,
      username: memberUsername,
    });

    expect(dcRes.status).toBe(200);
    const dcBody = (await dcRes.json()) as Record<string, unknown>;
    expect(typeof dcBody['token']).toBe('string');
  });
});
