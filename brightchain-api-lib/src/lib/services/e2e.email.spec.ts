/**
 * End-to-end multi-node integration tests for the Email API.
 *
 * Spins up multiple Express server instances on separate ports, each with
 * its own EmailController instance backed by a shared MessagePassingService.
 * Tests multi-node email operations: send, retrieve, reply, forward, delete,
 * inbox queries, read status, and delivery status across separate server
 * instances.
 *
 * Follows the exact pattern from e2e.communication.spec.ts.
 *
 * Requirements: 15.1, 15.10
 */

import {
  DeliveryStatus,
  InMemoryEmailMetadataStore,
  type IDeliveryReceipt,
  type IGossipService,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
import { jest } from '@jest/globals';
import express, { Express } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { EmailController } from '../controllers/api/emails';
import { IBrightChainApplication } from '../interfaces/application';
import { EventNotificationSystem } from './eventNotificationSystem';
import { MessagePassingService } from './messagePassingService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal mock application satisfying IBrightChainApplication for controller construction */
function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: {
      mongo: { useTransactions: false },
      blockStorePath: '/tmp',
      debug: false,
    },
    constants: {},
    ready: true,
    services: {},
    plugins: {},
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
        const id = `cbl-msg-${callCount}-${Date.now()}`;
        return Promise.resolve({
          messageId: id,
          contentBlockIds: [`block-${callCount}`],
          magnetUrl: `magnet:?xt=urn:brightchain:cbl&bs=1024&b${callCount}=abc`,
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

/**
 * Represents a single API node — an Express server on its own port with
 * its own EmailController instance, backed by a shared MessagePassingService.
 */
interface ApiNode {
  app: Express;
  server: Server;
  port: number;
  url: string;
}

/**
 * Build a fully-wired multi-node email test environment.
 *
 * Creates `count` Express servers, each with their own EmailController instance,
 * all backed by the SAME shared MessagePassingService (simulating nodes that share
 * a common data store).
 *
 * Returns the shared service and an array of ApiNode handles.
 */
async function buildEmailMultiNodeEnv(count: number): Promise<{
  nodes: ApiNode[];
  messagePassingService: MessagePassingService;
  emailStore: InMemoryEmailMetadataStore;
  teardown: () => Promise<void>;
}> {
  // Shared services — all nodes share the same MessagePassingService
  const gossipService = createMockGossipService();
  const messageCBL = createMockMessageCBL();
  const emailStore = new InMemoryEmailMetadataStore();
  const metadataStore = createMockMetadataStore();

  const messagePassingService = new MessagePassingService(
    messageCBL,
    metadataStore as never,
    new EventNotificationSystem(),
    gossipService,
  );
  messagePassingService.configureEmail(emailStore);

  const mockApp = createMockApplication();
  const nodes: ApiNode[] = [];

  for (let i = 0; i < count; i++) {
    const app = express();
    app.use(express.json());

    // Each node gets its own EmailController wired to the shared service
    const emailController = new EmailController(mockApp);
    emailController.setMessagePassingService(messagePassingService);

    app.use('/api/emails', emailController.router);

    // Error-handling middleware so validation errors are serialized as JSON
    // (without this, Express's default error handler sends HTML)
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

    // Start on a random available port
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    nodes.push({ app, server, port, url: `http://127.0.0.1:${port}` });
  }

  async function teardown(): Promise<void> {
    await Promise.all(
      nodes.map(
        (n) => new Promise<void>((resolve) => n.server.close(() => resolve())),
      ),
    );
  }

  return {
    nodes,
    messagePassingService,
    emailStore,
    teardown,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Email API – Multi-Node E2E Integration', () => {
  let env: Awaited<ReturnType<typeof buildEmailMultiNodeEnv>>;

  beforeAll(async () => {
    env = await buildEmailMultiNodeEnv(3);
  });

  afterAll(async () => {
    await env.teardown();
  });

  // ── Cross-node send and retrieve (Property 6) ────────────────────────

  describe('Cross-node send and retrieve', () => {
    it('scaffold: all nodes are running on separate ports', () => {
      expect(env.nodes).toHaveLength(3);
      const ports = env.nodes.map((n) => n.port);
      // All ports should be unique and non-zero
      expect(new Set(ports).size).toBe(3);
      for (const port of ports) {
        expect(port).toBeGreaterThan(0);
      }
    });

    it('email sent via node-0 is retrievable via node-1 and node-2', async () => {
      const emailPayload = {
        from: {
          localPart: 'alice',
          domain: 'example.com',
          displayName: 'Alice',
        },
        to: [{ localPart: 'bob', domain: 'example.com', displayName: 'Bob' }],
        subject: 'Cross-node test',
        textBody: 'Hello from node-0',
      };

      // 1. Send email via node-0
      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send(emailPayload)
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      expect(sendRes.body.data.messageId).toBeDefined();
      expect(sendRes.body.data.success).toBe(true);

      const messageId = sendRes.body.data.messageId as string;

      // 2. Retrieve metadata via node-1
      const metadataRes = await request(env.nodes[1].app)
        .get(`/api/emails/${encodeURIComponent(messageId)}`)
        .expect(200);

      expect(metadataRes.body.status).toBe('success');
      const metadata = metadataRes.body.data;
      expect(metadata.from.localPart).toBe(emailPayload.from.localPart);
      expect(metadata.from.domain).toBe(emailPayload.from.domain);
      expect(metadata.to).toHaveLength(emailPayload.to.length);
      expect(metadata.to[0].localPart).toBe(emailPayload.to[0].localPart);
      expect(metadata.to[0].domain).toBe(emailPayload.to[0].domain);
      expect(metadata.subject).toBe(emailPayload.subject);

      // 3. Retrieve content via node-2
      const contentRes = await request(env.nodes[2].app)
        .get(`/api/emails/${encodeURIComponent(messageId)}/content`)
        .expect(200);

      expect(contentRes.body.status).toBe('success');
      const content = contentRes.body.data;

      // The content endpoint returns the full email metadata.
      // textBody/htmlBody are extracted from MIME parts by getEmailContent;
      // when sending via the controller without explicit MIME parts, the
      // service stores metadata but does not auto-generate MIME parts.
      // Verify the content metadata matches the original send across nodes.
      expect(content.metadata).toBeDefined();
      expect(content.metadata.messageId).toBe(messageId);
      expect(content.metadata.from.localPart).toBe(emailPayload.from.localPart);
      expect(content.metadata.from.domain).toBe(emailPayload.from.domain);
      expect(content.metadata.to[0].localPart).toBe(
        emailPayload.to[0].localPart,
      );
      expect(content.metadata.to[0].domain).toBe(emailPayload.to[0].domain);
      expect(content.metadata.subject).toBe(emailPayload.subject);
    });
  });

  // ── Cross-node reply and thread (Property 7) ─────────────────────────

  describe('Cross-node reply and thread', () => {
    it('reply via node-1 to email sent via node-0, thread retrievable via node-2', async () => {
      // 1. Send original email via node-0
      const originalPayload = {
        from: {
          localPart: 'sender',
          domain: 'thread.test',
          displayName: 'Sender',
        },
        to: [
          {
            localPart: 'receiver',
            domain: 'thread.test',
            displayName: 'Receiver',
          },
        ],
        subject: 'Thread test original',
        textBody: 'This is the original message',
      };

      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send(originalPayload)
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      const originalMessageId = sendRes.body.data.messageId as string;
      expect(originalMessageId).toBeDefined();

      // 2. Reply via node-1
      const replyPayload = {
        from: {
          localPart: 'receiver',
          domain: 'thread.test',
          displayName: 'Receiver',
        },
        textBody: 'This is the reply',
        subject: 'Re: Thread test original',
      };

      const replyRes = await request(env.nodes[1].app)
        .post(`/api/emails/${encodeURIComponent(originalMessageId)}/reply`)
        .send(replyPayload)
        .expect(201);

      expect(replyRes.body.status).toBe('success');
      expect(replyRes.body.data.messageId).toBeDefined();
      expect(replyRes.body.data.success).toBe(true);

      const replyMessageId = replyRes.body.data.messageId as string;

      // 3. Get thread via node-2
      const threadRes = await request(env.nodes[2].app)
        .get(`/api/emails/${encodeURIComponent(originalMessageId)}/thread`)
        .expect(200);

      expect(threadRes.body.status).toBe('success');
      const thread = threadRes.body.data as Array<{ messageId: string }>;

      // 4. Thread should contain at least 2 emails (original + reply)
      expect(thread.length).toBeGreaterThanOrEqual(2);

      // 5. Verify both original and reply are present in the thread
      const threadMessageIds = thread.map((email) => email.messageId);
      expect(threadMessageIds).toContain(originalMessageId);
      expect(threadMessageIds).toContain(replyMessageId);
    });
  });

  // ── Cross-node forward (Property 8) ──────────────────────────────────

  describe('Cross-node forward', () => {
    it('email sent via node-0, forwarded via node-1, retrievable via node-2', async () => {
      // 1. Send original email via node-0
      const originalPayload = {
        from: {
          localPart: 'originator',
          domain: 'forward.test',
          displayName: 'Originator',
        },
        to: [
          {
            localPart: 'middleman',
            domain: 'forward.test',
            displayName: 'Middleman',
          },
        ],
        subject: 'Forward test original',
        textBody: 'This email will be forwarded',
      };

      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send(originalPayload)
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      expect(sendRes.body.data.success).toBe(true);
      const originalMessageId = sendRes.body.data.messageId as string;
      expect(originalMessageId).toBeDefined();

      // 2. Forward via node-1 to new recipients
      const forwardPayload = {
        forwardTo: [
          {
            localPart: 'recipient-a',
            domain: 'forward.test',
            displayName: 'Recipient A',
          },
          {
            localPart: 'recipient-b',
            domain: 'forward.test',
            displayName: 'Recipient B',
          },
        ],
      };

      const forwardRes = await request(env.nodes[1].app)
        .post(`/api/emails/${encodeURIComponent(originalMessageId)}/forward`)
        .send(forwardPayload)
        .expect(201);

      expect(forwardRes.body.status).toBe('success');
      expect(forwardRes.body.data.success).toBe(true);
      const forwardedMessageId = forwardRes.body.data.messageId as string;
      expect(forwardedMessageId).toBeDefined();
      // Forwarded email should have a different messageId than the original
      expect(forwardedMessageId).not.toBe(originalMessageId);

      // 3. Retrieve the forwarded email via node-2
      const getRes = await request(env.nodes[2].app)
        .get(`/api/emails/${encodeURIComponent(forwardedMessageId)}`)
        .expect(200);

      expect(getRes.body.status).toBe('success');
      const forwarded = getRes.body.data;
      expect(forwarded.messageId).toBe(forwardedMessageId);
      // Forwarded email should be addressed to the new recipients
      expect(forwarded.to).toHaveLength(2);
      const toLocalParts = forwarded.to.map(
        (r: { localPart: string }) => r.localPart,
      );
      expect(toLocalParts).toContain('recipient-a');
      expect(toLocalParts).toContain('recipient-b');
    });
  });

  // ── Cross-node read status (Property 9) ──────────────────────────────

  describe('Cross-node read status', () => {
    it('send via node-0, check unread via node-1, mark read via node-2, verify count via node-0', async () => {
      const recipient = 'readstatus-bob@example.com';

      // 1. Send email via node-0
      const emailPayload = {
        from: {
          localPart: 'readstatus-alice',
          domain: 'example.com',
          displayName: 'Alice',
        },
        to: [
          {
            localPart: 'readstatus-bob',
            domain: 'example.com',
            displayName: 'Bob',
          },
        ],
        subject: 'Read status cross-node test',
        textBody: 'Testing read status across nodes',
      };

      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send(emailPayload)
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      expect(sendRes.body.data.success).toBe(true);
      const messageId = sendRes.body.data.messageId as string;
      expect(messageId).toBeDefined();

      // 2. Check unread count via node-1 — should be 1
      const unreadBefore = await request(env.nodes[1].app)
        .get(
          `/api/emails/inbox/unread-count?memberId=${encodeURIComponent(recipient)}`,
        )
        .expect(200);

      expect(unreadBefore.body.status).toBe('success');
      expect(unreadBefore.body.data.unreadCount).toBe(1);

      // 3. Mark as read via node-2
      const markRes = await request(env.nodes[2].app)
        .post(`/api/emails/${encodeURIComponent(messageId)}/read`)
        .send({ memberId: recipient })
        .expect(200);

      expect(markRes.body.status).toBe('success');
      expect(markRes.body.data.markedAsRead).toBe(true);

      // 4. Check unread count via node-0 — should be 0
      const unreadAfter = await request(env.nodes[0].app)
        .get(
          `/api/emails/inbox/unread-count?memberId=${encodeURIComponent(recipient)}`,
        )
        .expect(200);

      expect(unreadAfter.body.status).toBe('success');
      expect(unreadAfter.body.data.unreadCount).toBe(0);
    });
  });

  // ── Cross-node delete (Property 10) ──────────────────────────────────

  describe('Cross-node delete', () => {
    it('send via node-0, delete via node-1, verify 404 via node-2', async () => {
      // 1. Send email via node-0
      const emailPayload = {
        from: {
          localPart: 'delete-alice',
          domain: 'delete.test',
          displayName: 'Alice',
        },
        to: [
          {
            localPart: 'delete-bob',
            domain: 'delete.test',
            displayName: 'Bob',
          },
        ],
        subject: 'Cross-node delete test',
        textBody: 'This email will be deleted',
      };

      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send(emailPayload)
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      expect(sendRes.body.data.success).toBe(true);
      const messageId = sendRes.body.data.messageId as string;
      expect(messageId).toBeDefined();

      // 2. Verify it exists via node-1
      const getRes = await request(env.nodes[1].app)
        .get(`/api/emails/${encodeURIComponent(messageId)}`)
        .expect(200);

      expect(getRes.body.status).toBe('success');
      expect(getRes.body.data.messageId).toBe(messageId);

      // 3. Delete via node-1
      const deleteRes = await request(env.nodes[1].app)
        .delete(`/api/emails/${encodeURIComponent(messageId)}`)
        .expect(200);

      expect(deleteRes.body.status).toBe('success');
      expect(deleteRes.body.data.deleted).toBe(true);

      // 4. Verify GET via node-2 returns 404
      const notFoundRes = await request(env.nodes[2].app)
        .get(`/api/emails/${encodeURIComponent(messageId)}`)
        .expect(404);

      expect(notFoundRes.body.error).toBeDefined();
      expect(notFoundRes.body.error.code).toBeDefined();
    });
  });

  // ── Cross-node inbox filtering and pagination (Property 11) ──────────

  describe('Cross-node inbox filtering and pagination', () => {
    const recipient = 'inbox-user@pagination.test';
    const sentMessageIds: string[] = [];

    beforeAll(async () => {
      // Send 3 emails via different nodes to the same recipient
      const payloads = [
        {
          from: {
            localPart: 'sender-a',
            domain: 'pagination.test',
            displayName: 'Sender A',
          },
          to: [
            {
              localPart: 'inbox-user',
              domain: 'pagination.test',
              displayName: 'Inbox User',
            },
          ],
          subject: 'Pagination email 1',
          textBody: 'First email for pagination test',
        },
        {
          from: {
            localPart: 'sender-b',
            domain: 'pagination.test',
            displayName: 'Sender B',
          },
          to: [
            {
              localPart: 'inbox-user',
              domain: 'pagination.test',
              displayName: 'Inbox User',
            },
          ],
          subject: 'Pagination email 2',
          textBody: 'Second email for pagination test',
        },
        {
          from: {
            localPart: 'sender-c',
            domain: 'pagination.test',
            displayName: 'Sender C',
          },
          to: [
            {
              localPart: 'inbox-user',
              domain: 'pagination.test',
              displayName: 'Inbox User',
            },
          ],
          subject: 'Pagination email 3',
          textBody: 'Third email for pagination test',
        },
      ];

      for (let i = 0; i < payloads.length; i++) {
        const res = await request(env.nodes[i % env.nodes.length].app)
          .post('/api/emails')
          .send(payloads[i])
          .expect(201);

        expect(res.body.status).toBe('success');
        sentMessageIds.push(res.body.data.messageId as string);
      }
    });

    it('inbox query returns correct totalCount across nodes', async () => {
      // Query inbox via a different node (node-2) than the senders
      const res = await request(env.nodes[2].app)
        .get(`/api/emails/inbox?memberId=${encodeURIComponent(recipient)}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.totalCount).toBe(3);
      expect(res.body.data.emails).toHaveLength(3);

      // All sent message IDs should be present
      const returnedIds = res.body.data.emails.map(
        (e: { messageId: string }) => e.messageId,
      );
      for (const id of sentMessageIds) {
        expect(returnedIds).toContain(id);
      }
    });

    it('pagination page=1, pageSize=2 returns first page correctly', async () => {
      const res = await request(env.nodes[1].app)
        .get(
          `/api/emails/inbox?memberId=${encodeURIComponent(recipient)}&page=1&pageSize=2`,
        )
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.emails).toHaveLength(2);
      expect(res.body.data.totalCount).toBe(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(2);
      expect(res.body.data.hasMore).toBe(true);
    });

    it('pagination page=2, pageSize=2 returns remaining emails', async () => {
      const res = await request(env.nodes[0].app)
        .get(
          `/api/emails/inbox?memberId=${encodeURIComponent(recipient)}&page=2&pageSize=2`,
        )
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.emails).toHaveLength(1);
      expect(res.body.data.totalCount).toBe(3);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.pageSize).toBe(2);
      expect(res.body.data.hasMore).toBe(false);
    });

    it('page boundaries are consistent across nodes', async () => {
      // Query page 1 from node-0 and page 1 from node-2 — should match
      const res0 = await request(env.nodes[0].app)
        .get(
          `/api/emails/inbox?memberId=${encodeURIComponent(recipient)}&page=1&pageSize=2`,
        )
        .expect(200);

      const res2 = await request(env.nodes[2].app)
        .get(
          `/api/emails/inbox?memberId=${encodeURIComponent(recipient)}&page=1&pageSize=2`,
        )
        .expect(200);

      expect(res0.body.data.totalCount).toBe(res2.body.data.totalCount);
      expect(res0.body.data.emails).toHaveLength(res2.body.data.emails.length);

      const ids0 = res0.body.data.emails.map(
        (e: { messageId: string }) => e.messageId,
      );
      const ids2 = res2.body.data.emails.map(
        (e: { messageId: string }) => e.messageId,
      );
      expect(ids0).toEqual(ids2);
    });
  });

  // ── Cross-node delivery status (Property 12) ─────────────────────────

  describe('Cross-node delivery status', () => {
    it('send via node-0, get delivery status via node-1, verify receipts for all recipients', async () => {
      const recipientA = 'delivery-recip-a@delivery.test';
      const recipientB = 'delivery-recip-b@delivery.test';

      // 1. Send email via node-0 to 2 recipients
      const emailPayload = {
        from: {
          localPart: 'delivery-sender',
          domain: 'delivery.test',
          displayName: 'Sender',
        },
        to: [
          {
            localPart: 'delivery-recip-a',
            domain: 'delivery.test',
            displayName: 'Recipient A',
          },
          {
            localPart: 'delivery-recip-b',
            domain: 'delivery.test',
            displayName: 'Recipient B',
          },
        ],
        subject: 'Delivery status cross-node test',
        textBody: 'Testing delivery status across nodes',
      };

      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send(emailPayload)
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      expect(sendRes.body.data.success).toBe(true);
      const messageId = sendRes.body.data.messageId as string;
      expect(messageId).toBeDefined();

      // 2. Seed delivery receipts into the store for both recipients
      //    (In production, gossip acks would populate these; here we simulate.)
      const now = new Date();
      const receipts = new Map<string, IDeliveryReceipt>([
        [
          recipientA,
          {
            recipientId: recipientA,
            recipientNode: 'node-1',
            status: DeliveryStatus.Delivered,
            queuedAt: now,
            sentAt: now,
            deliveredAt: now,
            retryCount: 0,
          },
        ],
        [
          recipientB,
          {
            recipientId: recipientB,
            recipientNode: 'node-2',
            status: DeliveryStatus.Pending,
            queuedAt: now,
            retryCount: 1,
          },
        ],
      ]);

      await env.emailStore.update(messageId, { deliveryReceipts: receipts });

      // 3. Get delivery status via node-1
      const statusRes = await request(env.nodes[1].app)
        .get(`/api/emails/${encodeURIComponent(messageId)}/delivery-status`)
        .expect(200);

      expect(statusRes.body.status).toBe('success');
      const deliveryData = statusRes.body.data as Record<
        string,
        {
          recipientId: string;
          recipientNode: string;
          status: string;
          retryCount: number;
          queuedAt?: string;
          sentAt?: string;
          deliveredAt?: string;
        }
      >;

      // 4. Verify receipts exist for both recipients
      expect(Object.keys(deliveryData)).toHaveLength(2);
      expect(deliveryData[recipientA]).toBeDefined();
      expect(deliveryData[recipientB]).toBeDefined();

      // 5. Verify receipt fields for recipient A (delivered)
      const receiptA = deliveryData[recipientA];
      expect(receiptA.recipientId).toBe(recipientA);
      expect(receiptA.recipientNode).toBe('node-1');
      expect(receiptA.status).toBe(DeliveryStatus.Delivered);
      expect(receiptA.retryCount).toBe(0);
      expect(receiptA.queuedAt).toBeDefined();
      expect(receiptA.sentAt).toBeDefined();
      expect(receiptA.deliveredAt).toBeDefined();

      // 6. Verify receipt fields for recipient B (pending)
      const receiptB = deliveryData[recipientB];
      expect(receiptB.recipientId).toBe(recipientB);
      expect(receiptB.recipientNode).toBe('node-2');
      expect(receiptB.status).toBe(DeliveryStatus.Pending);
      expect(receiptB.retryCount).toBe(1);
      expect(receiptB.queuedAt).toBeDefined();
    });
  });

  // ── Error handling ───────────────────────────────────────────────────

  describe('Error handling', () => {
    it('GET /api/emails/nonexistent-id returns 404', async () => {
      const res = await request(env.nodes[0].app)
        .get('/api/emails/nonexistent-id-that-does-not-exist')
        .expect(404);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeDefined();
    });

    it('POST /api/emails with missing from returns 422', async () => {
      const res = await request(env.nodes[0].app)
        .post('/api/emails')
        .send({
          to: [{ localPart: 'bob', domain: 'example.com' }],
          subject: 'No from field',
          textBody: 'This should fail validation',
        })
        .expect(422);

      expect(res.body.errorType).toBe('ExpressValidationError');
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('POST /api/emails/:id/reply with missing from returns 422', async () => {
      // Send a valid email first so we have a real messageId to reply to
      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send({
          from: { localPart: 'err-alice', domain: 'error.test' },
          to: [{ localPart: 'err-bob', domain: 'error.test' }],
          subject: 'Error handling reply test',
          textBody: 'Original for reply error test',
        })
        .expect(201);

      const messageId = sendRes.body.data.messageId as string;

      const res = await request(env.nodes[0].app)
        .post(`/api/emails/${encodeURIComponent(messageId)}/reply`)
        .send({
          textBody: 'Reply without from field',
        })
        .expect(422);

      expect(res.body.errorType).toBe('ExpressValidationError');
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('POST /api/emails/:id/forward with empty forwardTo returns 422', async () => {
      // Send a valid email first so we have a real messageId to forward
      const sendRes = await request(env.nodes[0].app)
        .post('/api/emails')
        .send({
          from: { localPart: 'err-alice', domain: 'error.test' },
          to: [{ localPart: 'err-bob', domain: 'error.test' }],
          subject: 'Error handling forward test',
          textBody: 'Original for forward error test',
        })
        .expect(201);

      const messageId = sendRes.body.data.messageId as string;

      const res = await request(env.nodes[0].app)
        .post(`/api/emails/${encodeURIComponent(messageId)}/forward`)
        .send({
          forwardTo: [],
        })
        .expect(422);

      expect(res.body.errorType).toBe('ExpressValidationError');
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });
});
