/**
 * @fileoverview Unit tests for the verify-recipient endpoint (Task 13.3).
 *
 * Tests:
 * - 401 for unauthenticated requests
 * - 200 with exists: true for known username
 * - 200 with exists: false for unknown username
 * - 400 for invalid username format
 * - 429 after exceeding rate limit
 *
 * Validates: Requirements 8.5, 8.6, 8.7, 8.9
 */

import {
  InMemoryEmailMetadataStore,
  RECIPIENT_VERIFY_RATE_LIMIT,
  type IGossipService,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
import {
  GlobalActiveContext,
  I18nEngine,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import { jest } from '@jest/globals';
import express, { Express } from 'express';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { IBrightChainApplication } from '../../interfaces/application';
import { EventNotificationSystem } from '../../services/eventNotificationSystem';
import { MessagePassingService } from '../../services/messagePassingService';
import { EmailController } from './emails';

// ─── i18n bootstrap ─────────────────────────────────────────────────────────

function ensureI18nContext(): void {
  const testLang = {
    id: 'en-US',
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    isDefault: true,
  };
  if (!LanguageRegistry.has('en-US')) {
    LanguageRegistry.register(testLang);
  }
  if (!I18nEngine.hasInstance()) {
    new I18nEngine([testLang]);
  }
  const ctx = GlobalActiveContext.getInstance();
  try {
    ctx.context;
  } catch {
    ctx.createContext('en-US');
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-key';
const TEST_MEMBER_ID = 'test-member-123';
const TEST_DOMAIN = 'brightchain.test';

// ─── Mocks ──────────────────────────────────────────────────────────────────

function createMockGossipService(): IGossipService {
  return {
    announceBlock: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    announceRemoval: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    handleAnnouncement: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    onAnnouncement: jest.fn(),
    offAnnouncement: jest.fn(),
    getPendingAnnouncements: jest.fn().mockReturnValue([]),
    flushAnnouncements: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    start: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getConfig: jest.fn(),
    announceHeadUpdate: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    announceACLUpdate: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    announceMessage: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    sendDeliveryAck: jest.fn(),
    onMessageDelivery: jest.fn(),
    offMessageDelivery: jest.fn(),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
  } as unknown as IGossipService;
}

function createMockMessageCBL(): MessageCBLService {
  let callCount = 0;
  return {
    createMessage: jest
      .fn<
        () => Promise<{
          messageId: string;
          contentBlockIds: string[];
          magnetUrl: string;
        }>
      >()
      .mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          messageId: `cbl-msg-${callCount}`,
          contentBlockIds: [`block-${callCount}`],
          magnetUrl: `magnet:?xt=urn:brightchain:cbl&b${callCount}=abc`,
        });
      }),
    getMessageMetadata: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    getMessageContent: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  } as unknown as MessageCBLService;
}

function createMockMetadataStore() {
  return {
    updateDeliveryStatus: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    recordAcknowledgment: jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
    queryMessages: jest.fn<() => Promise<never[]>>().mockResolvedValue([]),
  };
}

function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: {
      mongo: { useTransactions: false },
      blockStorePath: '/tmp',
      debug: false,
      jwtSecret: JWT_SECRET,
    },
    constants: {},
    ready: true,
    services: {},
    plugins: {},
    authProvider: {
      verifyToken: async (token: string) => {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { memberId: string };
          return { userId: decoded.memberId };
        } catch {
          return null;
        }
      },
      findUserById: async (userId: string) => ({
        id: userId,
        accountStatus: 'Active',
        email: 'test@example.com',
        timezone: 'UTC',
      }),
      buildRequestUserDTO: async (userId: string) => ({
        id: userId,
        username: userId,
        email: 'test@example.com',
        roles: [],
        rolePrivileges: {
          admin: false,
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
    setController: () => {
      /* noop */
    },
    start: async () => {
      /* noop */
    },
  } as unknown as IBrightChainApplication;
}

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeToken(memberId: string): string {
  return jwt.sign({ memberId }, JWT_SECRET, { expiresIn: '1h' });
}

interface TestEnv {
  app: Express;
  server: http.Server;
  controller: EmailController;
  close: () => Promise<void>;
}

function buildTestEnv(knownUsers: Set<string> = new Set()): TestEnv {
  ensureI18nContext();
  const gossipService = createMockGossipService();
  const messageCBL = createMockMessageCBL();
  const emailStore = new InMemoryEmailMetadataStore();
  const metadataStore = createMockMetadataStore();

  const service = new MessagePassingService(
    messageCBL,
    metadataStore as never,
    new EventNotificationSystem(),
    gossipService,
  );
  service.configureEmail(emailStore);

  const mockApp = createMockApplication();
  const app = express();
  app.use(express.json());

  const emailController = new EmailController(mockApp);
  emailController.setMessagePassingService(service);
  emailController.setEmailDomain(TEST_DOMAIN);
  emailController.setUserRegistry({
    async hasUser(email: string): Promise<boolean> {
      const localPart = email.split('@')[0].toLowerCase();
      return knownUsers.has(localPart);
    },
  });

  app.use('/api/emails', emailController.router);

  // Error-handling middleware
  app.use(
    (
      err: Error & {
        statusCode?: number;
        errors?: { array?: () => unknown[] };
      },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status = err.statusCode ?? 500;
      const body: Record<string, unknown> = {
        message: err.message || 'Internal Server Error',
        errorType: err.name || 'Error',
      };
      if (err.errors) {
        body['errors'] =
          typeof err.errors.array === 'function'
            ? err.errors.array()
            : err.errors;
      }
      res.status(status).json(body);
    },
  );

  const server = app.listen(0);
  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

  return { app, server, controller: emailController, close };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/emails/verify-recipient/:username', () => {
  let env: TestEnv;

  afterEach(async () => {
    if (env) await env.close();
  });

  it('should return 401 for unauthenticated requests', async () => {
    env = buildTestEnv();
    const res = await request(env.server).get(
      '/api/emails/verify-recipient/alice',
    );

    expect(res.status).toBe(401);
  });

  it('should return 200 with exists: true for a known username', async () => {
    env = buildTestEnv(new Set(['alice']));
    const token = makeToken(TEST_MEMBER_ID);

    const res = await request(env.server)
      .get('/api/emails/verify-recipient/alice')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      status: 'success',
      data: { username: 'alice', exists: true },
    });
  });

  it('should return 200 with exists: false for an unknown username', async () => {
    env = buildTestEnv(new Set(['alice']));
    const token = makeToken(TEST_MEMBER_ID);

    const res = await request(env.server)
      .get('/api/emails/verify-recipient/bob')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      status: 'success',
      data: { username: 'bob', exists: false },
    });
  });

  it('should return 400 for invalid username format (non-alphanumeric)', async () => {
    env = buildTestEnv();
    const token = makeToken(TEST_MEMBER_ID);

    const res = await request(env.server)
      .get('/api/emails/verify-recipient/invalid-user!')
      .set('Authorization', `Bearer ${token}`);

    // express-validator should reject non-alphanumeric usernames
    // The validation middleware returns 422 or the error handler catches it
    expect([400, 422]).toContain(res.status);
  });

  it('should return 429 after exceeding rate limit', async () => {
    env = buildTestEnv(new Set(['alice']));
    const token = makeToken(TEST_MEMBER_ID);

    // Send RECIPIENT_VERIFY_RATE_LIMIT requests (should all succeed)
    for (let i = 0; i < RECIPIENT_VERIFY_RATE_LIMIT; i++) {
      const res = await request(env.server)
        .get('/api/emails/verify-recipient/alice')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }

    // The next request should be rate limited
    const res = await request(env.server)
      .get('/api/emails/verify-recipient/alice')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(429);
    expect(res.body.error?.message).toBe(
      'Rate limit exceeded. Try again later.',
    );
  });

  it('should allow requests from different users independently', async () => {
    env = buildTestEnv(new Set(['alice']));
    const token1 = makeToken('user-1');
    const token2 = makeToken('user-2');

    // Exhaust rate limit for user-1
    for (let i = 0; i < RECIPIENT_VERIFY_RATE_LIMIT; i++) {
      await request(env.server)
        .get('/api/emails/verify-recipient/alice')
        .set('Authorization', `Bearer ${token1}`);
    }

    // user-1 should be rate limited
    const res1 = await request(env.server)
      .get('/api/emails/verify-recipient/alice')
      .set('Authorization', `Bearer ${token1}`);
    expect(res1.status).toBe(429);

    // user-2 should still be allowed
    const res2 = await request(env.server)
      .get('/api/emails/verify-recipient/alice')
      .set('Authorization', `Bearer ${token2}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.exists).toBe(true);
  });

  it('should return exists: false when no user registry is configured', async () => {
    // Use buildTestEnv but override the controller to not have a registry
    env = buildTestEnv(); // This sets a registry, but we'll test with a fresh one

    // Create a separate env without user registry
    const gossipService = createMockGossipService();
    const messageCBL = createMockMessageCBL();
    const emailStore = new InMemoryEmailMetadataStore();
    const metadataStore = createMockMetadataStore();

    const service = new MessagePassingService(
      messageCBL,
      metadataStore as never,
      new EventNotificationSystem(),
      gossipService,
    );
    service.configureEmail(emailStore);

    const mockApp = createMockApplication();
    const noRegistryController = new EmailController(mockApp);
    noRegistryController.setMessagePassingService(service);
    // Intentionally NOT setting user registry

    // Use supertest with the app directly (no persistent server)
    const noRegistryApp = express();
    noRegistryApp.use(express.json());
    noRegistryApp.use('/api/emails', noRegistryController.router);
    noRegistryApp.use(
      (
        err: Error & { statusCode?: number },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(err.statusCode ?? 500).json({ message: err.message });
      },
    );

    const token = makeToken(TEST_MEMBER_ID);

    // supertest can work with an Express app directly (it creates its own server)
    const res = await request(noRegistryApp)
      .get('/api/emails/verify-recipient/alice')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.exists).toBe(false);
  });
});
