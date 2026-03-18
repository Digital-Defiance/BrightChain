/**
 * Unit tests for EmailGatewayService orchestrator.
 *
 * Validates:
 * - Constructor wiring and lifecycle (start/stop)
 * - Domain check: external vs internal recipient detection
 * - Gossip announcement handling: enqueues external recipients
 * - Mixed recipient partitioning
 *
 * @see Requirements 1.1, 1.2, 1.4
 */

import type {
  BlockAnnouncement,
  IBlockStore,
  IEmailMetadata,
  IGossipService,
} from '@brightchain/brightchain-lib';
import {
  createMailbox,
  EmailMessageService,
  OutboundDeliveryStatus,
} from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IOutboundQueue, IOutboundQueueItem } from './emailGatewayService';
import { EmailGatewayService } from './emailGatewayService';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Minimal config stub with a known canonical domain. */
function makeConfig(
  overrides: Partial<IEmailGatewayConfig> = {},
): IEmailGatewayConfig {
  return {
    canonicalDomain: 'brightchain.org',
    postfixHost: 'localhost',
    postfixPort: 25,
    dkimKeyPath: '/etc/dkim/private.key',
    dkimSelector: 'default',
    mailDropDirectory: '/var/spool/brightchain/incoming/',
    errorDirectory: '/var/spool/brightchain/errors/',
    maxMessageSizeBytes: 25 * 1024 * 1024,
    recipientLookupPort: 2526,
    recipientLookupCacheTtlSeconds: 300,
    spamEngine: 'spamassassin',
    spamThresholds: { probableSpamScore: 5, definiteSpamScore: 10 },
    queueConcurrency: 10,
    retryMaxCount: 5,
    retryMaxDurationMs: 48 * 60 * 60 * 1000,
    retryBaseIntervalMs: 60_000,
    ...overrides,
  };
}

/**
 * Build a mock IGossipService that tracks onMessageDelivery / offMessageDelivery
 * registrations so tests can fire announcements manually.
 */
function makeMockGossipService(): IGossipService & {
  messageDeliveryHandlers: Array<(a: BlockAnnouncement) => void>;
  fireMessageDelivery: (a: BlockAnnouncement) => void;
} {
  const handlers: Array<(a: BlockAnnouncement) => void> = [];

  const stub = {
    announceBlock: jest.fn().mockResolvedValue(undefined),
    announceRemoval: jest.fn().mockResolvedValue(undefined),
    announcePoolDeletion: jest.fn().mockResolvedValue(undefined),
    announceCBLIndexUpdate: jest.fn().mockResolvedValue(undefined),
    announceCBLIndexDelete: jest.fn().mockResolvedValue(undefined),
    announceHeadUpdate: jest.fn().mockResolvedValue(undefined),
    announceACLUpdate: jest.fn().mockResolvedValue(undefined),
    handleAnnouncement: jest.fn().mockResolvedValue(undefined),
    onAnnouncement: jest.fn(),
    offAnnouncement: jest.fn(),
    getPendingAnnouncements: jest.fn().mockReturnValue([]),
    flushAnnouncements: jest.fn().mockResolvedValue(undefined),
    start: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    getConfig: jest.fn().mockReturnValue({}),
    announceMessage: jest.fn().mockResolvedValue(undefined),
    sendDeliveryAck: jest.fn().mockResolvedValue(undefined),
    onMessageDelivery: jest.fn((h: (a: BlockAnnouncement) => void) =>
      handlers.push(h),
    ),
    offMessageDelivery: jest.fn((h: (a: BlockAnnouncement) => void) => {
      const idx = handlers.indexOf(h);
      if (idx >= 0) handlers.splice(idx, 1);
    }),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
    announceBrightTrustProposal: jest.fn().mockResolvedValue(undefined),
    announceBrightTrustVote: jest.fn().mockResolvedValue(undefined),
    onBrightTrustProposal: jest.fn(),
    offBrightTrustProposal: jest.fn(),
    onBrightTrustVote: jest.fn(),
    offBrightTrustVote: jest.fn(),
  } as unknown as IGossipService;

  return {
    ...stub,
    messageDeliveryHandlers: handlers,
    fireMessageDelivery: (a: BlockAnnouncement) => {
      for (const h of handlers) h(a);
    },
  };
}

/** Minimal mock block store — not exercised directly in these tests. */
function makeMockBlockStore(): IBlockStore {
  return {
    supportedBlockSizes: [],
    blockSize: 0 as never,
    has: jest.fn().mockResolvedValue(false),
    getData: jest.fn(),
    setData: jest.fn(),
    deleteData: jest.fn(),
    getRandomBlocks: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    getMetadata: jest.fn().mockResolvedValue(null),
    updateMetadata: jest.fn(),
    generateParityBlocks: jest.fn().mockResolvedValue([]),
    getParityBlocks: jest.fn().mockResolvedValue([]),
    recoverBlock: jest.fn(),
    verifyBlockIntegrity: jest.fn().mockResolvedValue(true),
    getBlocksPendingReplication: jest.fn().mockResolvedValue([]),
    getUnderReplicatedBlocks: jest.fn().mockResolvedValue([]),
    recordReplication: jest.fn(),
    recordReplicaLoss: jest.fn(),
    brightenBlock: jest.fn(),
    storeCBLWithWhitening: jest.fn(),
    retrieveCBL: jest.fn(),
    parseCBLMagnetUrl: jest.fn(),
    generateCBLMagnetUrl: jest.fn(),
  } as unknown as IBlockStore;
}

/** Minimal mock EmailMessageService with a controllable getEmail. */
function makeMockEmailMessageService(
  emailMap: Map<string, IEmailMetadata>,
): EmailMessageService {
  return {
    getEmail: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(emailMap.get(id) ?? null),
      ),
  } as unknown as EmailMessageService;
}

/** Minimal mock outbound queue that records enqueued items. */
function makeMockOutboundQueue(): IOutboundQueue & {
  items: IOutboundQueueItem[];
} {
  const items: IOutboundQueueItem[] = [];
  return {
    items,
    enqueue: jest.fn().mockImplementation(async (item: IOutboundQueueItem) => {
      items.push(item);
    }),
  };
}

/** Build a minimal IEmailMetadata stub. */
function makeEmailMetadata(
  overrides: Partial<IEmailMetadata> = {},
): IEmailMetadata {
  return {
    blockId: 'block-1' as never,
    createdAt: new Date(),
    expiresAt: null,
    durabilityLevel: 0 as never,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: new Date(),
    replicationStatus: 0 as never,
    targetReplicationFactor: 0,
    replicaNodeIds: [],
    size: 100,
    checksum: '',
    messageType: 'email',
    senderId: 'alice@brightchain.org',
    recipients: ['bob@external.com'],
    priority: 0 as never,
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    encryptionScheme: 0 as never,
    isCBL: false,
    cblBlockIds: [],
    from: createMailbox('alice', 'brightchain.org', 'Alice'),
    to: [createMailbox('bob', 'external.com', 'Bob')],
    messageId: '<test-1@brightchain.org>',
    subject: 'Hello',
    date: new Date(),
    mimeVersion: '1.0',
    contentType: { type: 'text', subtype: 'plain', parameters: new Map() },
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
    ...overrides,
  } as IEmailMetadata;
}

/** Build a minimal BlockAnnouncement with messageDelivery metadata. */
function makeAnnouncement(
  messageId: string,
  recipientIds: string[] = [],
): BlockAnnouncement {
  return {
    type: 'add',
    blockId: 'block-1' as never,
    nodeId: 'node-1',
    timestamp: new Date(),
    ttl: 3,
    messageDelivery: {
      messageId,
      recipientIds,
      priority: 'normal',
      blockIds: [],
      cblBlockId: 'cbl-1' as never,
      ackRequired: true,
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EmailGatewayService', () => {
  // ── Lifecycle ───────────────────────────────────────────────────────

  describe('start / stop', () => {
    it('should register a gossip listener on start()', () => {
      const gossip = makeMockGossipService();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );

      expect(svc.isRunning()).toBe(false);
      svc.start();
      expect(svc.isRunning()).toBe(true);
      expect(gossip.onMessageDelivery).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent — calling start() twice registers only once', () => {
      const gossip = makeMockGossipService();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );

      svc.start();
      svc.start();
      expect(gossip.onMessageDelivery).toHaveBeenCalledTimes(1);
    });

    it('should unregister the gossip listener on stop()', () => {
      const gossip = makeMockGossipService();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );

      svc.start();
      svc.stop();
      expect(svc.isRunning()).toBe(false);
      expect(gossip.offMessageDelivery).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent — calling stop() when not running is a no-op', () => {
      const gossip = makeMockGossipService();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );

      svc.stop();
      expect(gossip.offMessageDelivery).not.toHaveBeenCalled();
    });
  });

  // ── Domain Check ────────────────────────────────────────────────────

  describe('isExternalRecipient', () => {
    let svc: EmailGatewayService;

    beforeEach(() => {
      svc = new EmailGatewayService(
        makeConfig({ canonicalDomain: 'brightchain.org' }),
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );
    });

    it('should return false for addresses on the canonical domain', () => {
      expect(svc.isExternalRecipient('alice@brightchain.org')).toBe(false);
    });

    it('should be case-insensitive for domain comparison', () => {
      expect(svc.isExternalRecipient('alice@BrightChain.ORG')).toBe(false);
    });

    it('should return true for addresses on a different domain', () => {
      expect(svc.isExternalRecipient('bob@external.com')).toBe(true);
    });

    it('should treat malformed addresses (no @) as external', () => {
      expect(svc.isExternalRecipient('no-at-sign')).toBe(true);
    });

    it('should handle addresses with multiple @ signs correctly', () => {
      expect(svc.isExternalRecipient('"weird@name"@brightchain.org')).toBe(
        false,
      );
    });
  });

  // ── Recipient Partitioning ──────────────────────────────────────────

  describe('partitionRecipients', () => {
    it('should split mixed recipients into internal and external', () => {
      const svc = new EmailGatewayService(
        makeConfig({ canonicalDomain: 'brightchain.org' }),
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );

      const result = svc.partitionRecipients([
        'alice@brightchain.org',
        'bob@external.com',
        'carol@brightchain.org',
        'dave@other.net',
      ]);

      expect(result.internal).toEqual([
        'alice@brightchain.org',
        'carol@brightchain.org',
      ]);
      expect(result.external).toEqual(['bob@external.com', 'dave@other.net']);
    });

    it('should return empty arrays for empty input', () => {
      const svc = new EmailGatewayService(
        makeConfig(),
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
      );

      const result = svc.partitionRecipients([]);
      expect(result.internal).toEqual([]);
      expect(result.external).toEqual([]);
    });
  });

  // ── Gossip Announcement Handling ────────────────────────────────────

  describe('gossip announcement handler', () => {
    it('should enqueue external recipients when a message-delivery announcement arrives', async () => {
      const messageId = '<outbound-1@brightchain.org>';
      const metadata = makeEmailMetadata({
        messageId,
        from: createMailbox('alice', 'brightchain.org', 'Alice'),
        to: [createMailbox('bob', 'external.com', 'Bob')],
        cc: undefined,
        bcc: undefined,
      });

      const emailMap = new Map<string, IEmailMetadata>([[messageId, metadata]]);
      const gossip = makeMockGossipService();
      const queue = makeMockOutboundQueue();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(emailMap),
        queue,
      );

      svc.start();
      gossip.fireMessageDelivery(
        makeAnnouncement(messageId, ['bob@external.com']),
      );
      await new Promise((r) => setTimeout(r, 50));

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      const item = queue.items[0];
      expect(item.messageId).toBe(messageId);
      expect(item.to).toEqual(['bob@external.com']);
      expect(item.status).toBe(OutboundDeliveryStatus.Queued);
      expect(item.retryCount).toBe(0);
    });

    it('should not enqueue when all recipients are internal', async () => {
      const messageId = '<internal-only@brightchain.org>';
      const metadata = makeEmailMetadata({
        messageId,
        to: [createMailbox('carol', 'brightchain.org', 'Carol')],
      });

      const emailMap = new Map([[messageId, metadata]]);
      const gossip = makeMockGossipService();
      const queue = makeMockOutboundQueue();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(emailMap),
        queue,
      );

      svc.start();
      gossip.fireMessageDelivery(makeAnnouncement(messageId));
      await new Promise((r) => setTimeout(r, 50));

      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('should only enqueue external recipients from a mixed list', async () => {
      const messageId = '<mixed@brightchain.org>';
      const metadata = makeEmailMetadata({
        messageId,
        to: [
          createMailbox('alice', 'brightchain.org', 'Alice'),
          createMailbox('bob', 'external.com', 'Bob'),
        ],
        cc: [createMailbox('dave', 'other.net', 'Dave')],
      });

      const emailMap = new Map([[messageId, metadata]]);
      const gossip = makeMockGossipService();
      const queue = makeMockOutboundQueue();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(emailMap),
        queue,
      );

      svc.start();
      gossip.fireMessageDelivery(makeAnnouncement(messageId));
      await new Promise((r) => setTimeout(r, 50));

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue.items[0].to).toEqual(['bob@external.com', 'dave@other.net']);
    });

    it('should skip when the message is not found in EmailMessageService', async () => {
      const gossip = makeMockGossipService();
      const queue = makeMockOutboundQueue();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(new Map()),
        queue,
      );

      svc.start();
      gossip.fireMessageDelivery(makeAnnouncement('<unknown@brightchain.org>'));
      await new Promise((r) => setTimeout(r, 50));

      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('should skip when no outbound queue is wired', async () => {
      const messageId = '<no-queue@brightchain.org>';
      const metadata = makeEmailMetadata({
        messageId,
        to: [createMailbox('bob', 'external.com', 'Bob')],
      });

      const emailMap = new Map([[messageId, metadata]]);
      const gossip = makeMockGossipService();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(emailMap),
      );

      svc.start();
      gossip.fireMessageDelivery(makeAnnouncement(messageId));
      await new Promise((r) => setTimeout(r, 50));
      // No error thrown, just silently skipped
    });
  });

  // ── setOutboundQueue ────────────────────────────────────────────────

  describe('setOutboundQueue', () => {
    it('should allow wiring the queue after construction', async () => {
      const messageId = '<late-wire@brightchain.org>';
      const metadata = makeEmailMetadata({
        messageId,
        to: [createMailbox('bob', 'external.com', 'Bob')],
      });

      const emailMap = new Map([[messageId, metadata]]);
      const gossip = makeMockGossipService();
      const queue = makeMockOutboundQueue();
      const svc = new EmailGatewayService(
        makeConfig(),
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(emailMap),
      );

      svc.setOutboundQueue(queue);
      svc.start();
      gossip.fireMessageDelivery(makeAnnouncement(messageId));
      await new Promise((r) => setTimeout(r, 50));

      expect(queue.enqueue).toHaveBeenCalledTimes(1);
    });
  });
});
