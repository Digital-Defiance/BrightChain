/**
 * Unit Tests: TOTP endpoints on BrightDbUserController
 *
 * Tests the full TOTP lifecycle: setup, confirm, disable, and reset.
 * Verifies that the DocumentStore adapter's auto-$set wrapping is handled
 * correctly (controller must NOT use $set since the adapter adds it).
 *
 * Uses an in-memory document store to exercise the real read/write path
 * rather than mocking collection methods, ensuring the double-$set bug
 * cannot regress.
 */

import type { NextFunction, Request, Response } from 'express';
import { BrightDbUserController } from '../lib/controllers/user';
import type { IBrightDbApplication } from '../lib/interfaces/bright-db-application';
import { MemoryDocumentStore } from '../lib/datastore/memory-document-store';
import { ServiceProvider } from '@brightchain/brightchain-lib';

// ─── Constants ──────────────────────────────────────────────────────────────

const TEST_USER_ID = 'abcdef01234567890abcdef012345678'; // 32-char hex
const TEST_EMAIL = 'user@example.com';
const TEST_SECRET = 'JBSWY3DPEHPK3PXP';
const TEST_ENCRYPTED_HEX = Buffer.from(TEST_SECRET, 'utf-8').toString('hex');
const TEST_PROVISIONING_URI = 'otpauth://totp/BrightChain:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=BrightChain';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock SystemUserService — encrypt/decrypt are simple hex encode/decode for tests
jest.mock('@digitaldefiance/node-express-suite', () => {
  const actual = jest.requireActual('@digitaldefiance/node-express-suite');
  return {
    ...actual,
    SystemUserService: {
      getSystemUser: jest.fn().mockReturnValue({
        encryptData: jest.fn().mockImplementation((buf: Buffer) => {
          // Simple passthrough — just return the buffer as-is for testing
          return Promise.resolve(buf);
        }),
        decryptData: jest.fn().mockImplementation((buf: Buffer) => {
          // Simple passthrough — return as-is
          return buf;
        }),
      }),
    },
  };
});

// Mock ServiceProvider.getInstance() for ID conversion
jest.mock('@brightchain/brightchain-lib', () => {
  const actual = jest.requireActual('@brightchain/brightchain-lib');
  return {
    ...actual,
    ServiceProvider: {
      getInstance: jest.fn().mockReturnValue({
        idProvider: {
          idFromString: (s: string) => Buffer.from(s, 'hex'),
          toString: (_id: Buffer, _format: string) => TEST_USER_ID,
        },
      }),
    },
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockTotpService = {
  generateSecret: jest.fn().mockReturnValue(TEST_SECRET),
  verifyCode: jest.fn().mockReturnValue(true),
  generateProvisioningUri: jest.fn().mockReturnValue(TEST_PROVISIONING_URI),
};

function buildMockApplication(db: MemoryDocumentStore): IBrightDbApplication<Buffer> {
  return {
    services: {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'totp') return mockTotpService;
        return undefined;
      }),
    },
    environment: {
      mongo: { useTransactions: false },
      host: 'BrightChain',
      jwtSecret: 'test-secret',
    },
    constants: {},
    db,
    getModel: jest.fn(),
    mongo: undefined,
  } as unknown as IBrightDbApplication<Buffer>;
}

function buildAuthenticatedRequest(body: Record<string, unknown> = {}): Request {
  return {
    body,
    user: {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      username: 'testuser',
      roles: [],
      rolePrivileges: { admin: false, member: true, system: false },
      emailVerified: true,
      timezone: 'UTC',
      siteLanguage: 'en-US',
      darkMode: false,
      currency: 'USD',
      directChallenge: false,
    },
  } as unknown as Request;
}

function buildUnauthenticatedRequest(body: Record<string, unknown> = {}): Request {
  return { body } as unknown as Request;
}

const mockRes = {} as Response;
const mockNext = jest.fn() as NextFunction;

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('BrightDbUserController — TOTP endpoints', () => {
  let controller: BrightDbUserController<Buffer>;
  let memoryStore: MemoryDocumentStore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTotpService.generateSecret.mockReturnValue(TEST_SECRET);
    mockTotpService.verifyCode.mockReturnValue(true);
    mockTotpService.generateProvisioningUri.mockReturnValue(TEST_PROVISIONING_URI);

    memoryStore = new MemoryDocumentStore();
    controller = new BrightDbUserController(buildMockApplication(memoryStore));
  });

  // ─── totpSetup ──────────────────────────────────────────────────────────

  describe('POST /totp/setup', () => {
    it('returns 401 when no user on request', async () => {
      const req = buildUnauthenticatedRequest();
      const result = await controller.totpSetup(req, mockRes, mockNext);
      expect(result.statusCode).toBe(401);
    });

    it('returns 200 with provisioning URI and secret on success', async () => {
      const req = buildAuthenticatedRequest();
      const result = await controller.totpSetup(req, mockRes, mockNext);

      expect(result.statusCode).toBe(200);
      const response = result.response as { provisioningUri: string; secret: string; message: string };
      expect(response.secret).toBe(TEST_SECRET);
      expect(response.provisioningUri).toBe(TEST_PROVISIONING_URI);
      expect(response.message).toBe('TOTP setup initiated');
    });

    it('creates user document with totpPendingSecret when document does not exist', async () => {
      const req = buildAuthenticatedRequest();
      await controller.totpSetup(req, mockRes, mockNext);

      // Verify the document was created in the store
      const col = memoryStore.collection('users');
      const doc = await col.findOne({ _id: TEST_USER_ID } as never);
      expect(doc).not.toBeNull();
      expect((doc as Record<string, unknown>)?.totpPendingSecret).toBe(TEST_ENCRYPTED_HEX);
    });

    it('updates existing document with totpPendingSecret', async () => {
      // Pre-create the user document
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpEnabled: false } as never);

      const req = buildAuthenticatedRequest();
      await controller.totpSetup(req, mockRes, mockNext);

      // Verify the pending secret was set
      const doc = await col.findOne({ _id: TEST_USER_ID } as never);
      expect((doc as Record<string, unknown>)?.totpPendingSecret).toBe(TEST_ENCRYPTED_HEX);
    });

    it('does NOT double-wrap with $set (regression test)', async () => {
      // Pre-create the user document
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpEnabled: false } as never);

      const req = buildAuthenticatedRequest();
      await controller.totpSetup(req, mockRes, mockNext);

      // The document should NOT have a literal "$set" field
      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc).not.toHaveProperty('$set');
      expect(doc?.totpPendingSecret).toBe(TEST_ENCRYPTED_HEX);
    });

    it('returns 409 when TOTP is already enabled', async () => {
      // Pre-create user with TOTP already active
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpEnabled: true, totpSecret: 'existing' } as never);

      const req = buildAuthenticatedRequest();
      const result = await controller.totpSetup(req, mockRes, mockNext);

      expect(result.statusCode).toBe(409);
      expect((result.response as { message: string }).message).toBe('TOTP is already active');
    });
  });

  // ─── totpConfirm ────────────────────────────────────────────────────────

  describe('POST /totp/confirm', () => {
    it('returns 401 when no user on request', async () => {
      const req = buildUnauthenticatedRequest({ code: '123456' });
      const result = await controller.totpConfirm(req, mockRes, mockNext);
      expect(result.statusCode).toBe(401);
    });

    it('returns 400 when code is not 6 digits', async () => {
      const req = buildAuthenticatedRequest({ code: '12345' });
      const result = await controller.totpConfirm(req, mockRes, mockNext);
      expect(result.statusCode).toBe(400);
      expect((result.response as { message: string }).message).toBe('Code must be exactly 6 digits');
    });

    it('returns 400 when code is not a string', async () => {
      const req = buildAuthenticatedRequest({ code: 123456 });
      const result = await controller.totpConfirm(req, mockRes, mockNext);
      expect(result.statusCode).toBe(400);
    });

    it('returns 400 when TOTP setup has not been initiated', async () => {
      // User exists but no pending secret
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpEnabled: false } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      const result = await controller.totpConfirm(req, mockRes, mockNext);

      expect(result.statusCode).toBe(400);
      expect((result.response as { message: string }).message).toBe('TOTP setup has not been initiated');
    });

    it('returns 400 when TOTP code is invalid', async () => {
      // Setup pending secret
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpPendingSecret: TEST_ENCRYPTED_HEX } as never);

      mockTotpService.verifyCode.mockReturnValue(false);

      const req = buildAuthenticatedRequest({ code: '000000' });
      const result = await controller.totpConfirm(req, mockRes, mockNext);

      expect(result.statusCode).toBe(400);
      expect((result.response as { message: string }).message).toBe('Invalid TOTP code');
    });

    it('activates TOTP on valid code', async () => {
      // Setup pending secret
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpPendingSecret: TEST_ENCRYPTED_HEX } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      const result = await controller.totpConfirm(req, mockRes, mockNext);

      expect(result.statusCode).toBe(200);
      expect((result.response as { message: string }).message).toBe('TOTP has been enabled successfully');

      // Verify DB state
      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc?.totpEnabled).toBe(true);
      expect(doc?.totpSecret).toBe(TEST_ENCRYPTED_HEX);
      expect(doc?.totpPendingSecret).toBeNull();
    });

    it('full setup→confirm flow works end-to-end', async () => {
      // Step 1: Setup
      const setupReq = buildAuthenticatedRequest();
      const setupResult = await controller.totpSetup(setupReq, mockRes, mockNext);
      expect(setupResult.statusCode).toBe(200);

      // Step 2: Confirm
      const confirmReq = buildAuthenticatedRequest({ code: '123456' });
      const confirmResult = await controller.totpConfirm(confirmReq, mockRes, mockNext);
      expect(confirmResult.statusCode).toBe(200);

      // Verify final state
      const col = memoryStore.collection('users');
      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc?.totpEnabled).toBe(true);
      expect(doc?.totpSecret).toBeTruthy();
      expect(doc?.totpPendingSecret).toBeNull();
    });
  });

  // ─── totpDisable ────────────────────────────────────────────────────────

  describe('POST /totp/disable', () => {
    it('returns 401 when no user on request', async () => {
      const req = buildUnauthenticatedRequest({ code: '123456' });
      const result = await controller.totpDisable(req, mockRes, mockNext);
      expect(result.statusCode).toBe(401);
    });

    it('returns 400 when code is invalid format', async () => {
      const req = buildAuthenticatedRequest({ code: 'abcdef' });
      const result = await controller.totpDisable(req, mockRes, mockNext);
      expect(result.statusCode).toBe(400);
    });

    it('returns 409 when TOTP is not active', async () => {
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpEnabled: false } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      const result = await controller.totpDisable(req, mockRes, mockNext);

      expect(result.statusCode).toBe(409);
      expect((result.response as { message: string }).message).toBe('TOTP is not currently active');
    });

    it('returns 400 when code verification fails', async () => {
      const col = memoryStore.collection('users');
      await col.create({
        _id: TEST_USER_ID,
        totpEnabled: true,
        totpSecret: TEST_ENCRYPTED_HEX,
      } as never);

      mockTotpService.verifyCode.mockReturnValue(false);

      const req = buildAuthenticatedRequest({ code: '000000' });
      const result = await controller.totpDisable(req, mockRes, mockNext);

      expect(result.statusCode).toBe(400);
      expect((result.response as { message: string }).message).toBe('Invalid TOTP code');
    });

    it('disables TOTP on valid code', async () => {
      const col = memoryStore.collection('users');
      await col.create({
        _id: TEST_USER_ID,
        totpEnabled: true,
        totpSecret: TEST_ENCRYPTED_HEX,
      } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      const result = await controller.totpDisable(req, mockRes, mockNext);

      expect(result.statusCode).toBe(200);
      expect((result.response as { message: string }).message).toBe('TOTP has been disabled successfully');

      // Verify DB state
      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc?.totpEnabled).toBe(false);
      expect(doc?.totpSecret).toBeNull();
      expect(doc?.totpPendingSecret).toBeNull();
    });
  });

  // ─── totpReset ──────────────────────────────────────────────────────────

  describe('POST /totp/reset', () => {
    it('returns 401 when no user on request', async () => {
      const req = buildUnauthenticatedRequest({ code: '123456' });
      const result = await controller.totpReset(req, mockRes, mockNext);
      expect(result.statusCode).toBe(401);
    });

    it('returns 409 when TOTP is not active', async () => {
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpEnabled: false } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      const result = await controller.totpReset(req, mockRes, mockNext);

      expect(result.statusCode).toBe(409);
      expect((result.response as { message: string }).message).toBe('TOTP is not currently active');
    });

    it('returns 400 when current code is invalid', async () => {
      const col = memoryStore.collection('users');
      await col.create({
        _id: TEST_USER_ID,
        totpEnabled: true,
        totpSecret: TEST_ENCRYPTED_HEX,
      } as never);

      mockTotpService.verifyCode.mockReturnValue(false);

      const req = buildAuthenticatedRequest({ code: '000000' });
      const result = await controller.totpReset(req, mockRes, mockNext);

      expect(result.statusCode).toBe(400);
    });

    it('generates new pending secret on valid code', async () => {
      const col = memoryStore.collection('users');
      await col.create({
        _id: TEST_USER_ID,
        totpEnabled: true,
        totpSecret: TEST_ENCRYPTED_HEX,
      } as never);

      const NEW_SECRET = 'NEWSECRETBASE32XX';
      mockTotpService.generateSecret.mockReturnValue(NEW_SECRET);

      const req = buildAuthenticatedRequest({ code: '123456' });
      const result = await controller.totpReset(req, mockRes, mockNext);

      expect(result.statusCode).toBe(200);
      const response = result.response as { secret: string; provisioningUri: string; message: string };
      expect(response.secret).toBe(NEW_SECRET);
      expect(response.message).toContain('TOTP reset initiated');

      // Verify DB state — new pending secret stored
      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      const expectedHex = Buffer.from(NEW_SECRET, 'utf-8').toString('hex');
      expect(doc?.totpPendingSecret).toBe(expectedHex);
    });
  });

  // ─── Regression: $set double-wrapping ───────────────────────────────────

  describe('$set double-wrapping regression', () => {
    it('totpConfirm does not create a literal $set field', async () => {
      const col = memoryStore.collection('users');
      await col.create({ _id: TEST_USER_ID, totpPendingSecret: TEST_ENCRYPTED_HEX } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      await controller.totpConfirm(req, mockRes, mockNext);

      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc).not.toHaveProperty('$set');
      expect(doc?.totpEnabled).toBe(true);
    });

    it('totpDisable does not create a literal $set field', async () => {
      const col = memoryStore.collection('users');
      await col.create({
        _id: TEST_USER_ID,
        totpEnabled: true,
        totpSecret: TEST_ENCRYPTED_HEX,
      } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      await controller.totpDisable(req, mockRes, mockNext);

      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc).not.toHaveProperty('$set');
      expect(doc?.totpEnabled).toBe(false);
    });

    it('totpReset does not create a literal $set field', async () => {
      const col = memoryStore.collection('users');
      await col.create({
        _id: TEST_USER_ID,
        totpEnabled: true,
        totpSecret: TEST_ENCRYPTED_HEX,
      } as never);

      const req = buildAuthenticatedRequest({ code: '123456' });
      await controller.totpReset(req, mockRes, mockNext);

      const doc = await col.findOne({ _id: TEST_USER_ID } as never) as Record<string, unknown>;
      expect(doc).not.toHaveProperty('$set');
      expect(doc?.totpPendingSecret).toBeTruthy();
    });
  });
});
