/**
 * Unit tests for BounceProcessor.
 *
 * Validates:
 * - DSN parsing (RFC 3464): extract original message ID, recipient, action, diagnostic
 * - VERP address parsing: extract message ID from bounce address
 * - Bounce classification: permanent vs transient
 * - Correlation: DSN → original outbound message via Message-ID and VERP
 * - Permanent failure handling: update delivery status, notify sender via gossip
 * - Transient failure handling: no status update, no notification
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4
 */

import type {
  BlockId,
  IEmailMetadata,
  IGossipService,
} from '@brightchain/brightchain-lib';
import {
  createMailbox,
  DeliveryStatus,
  EmailMessageService,
} from '@brightchain/brightchain-lib';

import { BounceProcessor } from './bounceProcessor';
import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IOutboundQueueStore } from './outboundQueueStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function makeMockEmailMessageService(
  metadata: IEmailMetadata | null = null,
): EmailMessageService & { getEmail: jest.Mock } {
  return {
    getEmail: jest.fn().mockResolvedValue(metadata),
    sendEmail: jest.fn().mockResolvedValue({
      messageId: '<test@brightchain.org>',
      brightchainMessageId: 'bc-1',
      deliveryStatus: new Map(),
      success: true,
    }),
  } as unknown as EmailMessageService & { getEmail: jest.Mock };
}

function makeMockOutboundQueueStore(): IOutboundQueueStore & {
  markFailed: jest.Mock;
} {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    dequeue: jest.fn().mockResolvedValue(undefined),
    peek: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    requeue: jest.fn().mockResolvedValue(undefined),
    getQueueDepth: jest.fn().mockResolvedValue(0),
    getByMessageId: jest.fn().mockResolvedValue(undefined),
  } as unknown as IOutboundQueueStore & { markFailed: jest.Mock };
}

function makeMockGossipService(): IGossipService & {
  announceMessage: jest.Mock;
} {
  return {
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
    onMessageDelivery: jest.fn(),
    offMessageDelivery: jest.fn(),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
    announceBrightTrustProposal: jest.fn().mockResolvedValue(undefined),
    announceBrightTrustVote: jest.fn().mockResolvedValue(undefined),
    onBrightTrustProposal: jest.fn(),
    offBrightTrustProposal: jest.fn(),
    onBrightTrustVote: jest.fn(),
    offBrightTrustVote: jest.fn(),
  } as unknown as IGossipService & { announceMessage: jest.Mock };
}

function makeEmailMetadata(
  overrides: Partial<IEmailMetadata> = {},
): IEmailMetadata {
  return {
    blockId: 'block-1' as unknown as BlockId,
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
    recipients: ['bob@example.com'],
    priority: 0 as never,
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    encryptionScheme: 0 as never,
    isCBL: false,
    cblBlockIds: [],
    from: createMailbox('alice', 'brightchain.org', 'Alice'),
    to: [createMailbox('bob', 'example.com', 'Bob')],
    messageId: '<outbound-1@brightchain.org>',
    subject: 'Hello from BrightChain',
    date: new Date(),
    mimeVersion: '1.0',
    contentType: { type: 'text', subtype: 'plain', parameters: new Map() },
    customHeaders: new Map(),
    deliveryReceipts: new Map([
      [
        'bob@example.com',
        {
          recipientId: 'bob@example.com',
          recipientNode: 'node-1',
          status: DeliveryStatus.Announced,
          retryCount: 0,
        },
      ],
    ]),
    readReceipts: new Map(),
    ...overrides,
  } as IEmailMetadata;
}

/**
 * Build a minimal RFC 3464 DSN message string.
 */
function buildDsnMessage(opts: {
  originalMessageId?: string;
  finalRecipient?: string;
  action?: string;
  status?: string;
  diagnosticCode?: string;
  returnPath?: string;
}): string {
  const lines: string[] = [];
  if (opts.returnPath) {
    lines.push(`Return-Path: <${opts.returnPath}>`);
  }
  lines.push('Content-Type: multipart/report; report-type=delivery-status');
  lines.push('');
  lines.push('This is a delivery status notification.');
  lines.push('');
  if (opts.originalMessageId) {
    lines.push(`Original-Message-ID: ${opts.originalMessageId}`);
  }
  if (opts.finalRecipient) {
    lines.push(`Final-Recipient: rfc822; ${opts.finalRecipient}`);
  }
  if (opts.action) {
    lines.push(`Action: ${opts.action}`);
  }
  if (opts.status) {
    lines.push(`Status: ${opts.status}`);
  }
  if (opts.diagnosticCode) {
    lines.push(`Diagnostic-Code: smtp; ${opts.diagnosticCode}`);
  }
  return lines.join('\r\n');
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BounceProcessor', () => {
  // ── Static: parseDsnMessage (Req 5.1) ─────────────────────────────

  describe('parseDsnMessage (Req 5.1)', () => {
    it('should extract Original-Message-ID from DSN', () => {
      const dsn = buildDsnMessage({
        originalMessageId: '<outbound-1@brightchain.org>',
        finalRecipient: 'bob@example.com',
        action: 'failed',
        status: '5.1.1',
        diagnosticCode: '550 5.1.1 User unknown',
      });

      const parsed = BounceProcessor.parseDsnMessage(dsn);

      expect(parsed.originalMessageId).toBe('<outbound-1@brightchain.org>');
      expect(parsed.recipientAddress).toBe('bob@example.com');
      expect(parsed.action).toBe('failed');
      expect(parsed.statusCode).toBe('5.1.1');
      expect(parsed.diagnosticCode).toBe('550 5.1.1 User unknown');
    });

    it('should fall back to Message-ID when Original-Message-ID is absent', () => {
      const dsn = [
        'Content-Type: multipart/report',
        '',
        'Final-Recipient: rfc822; bob@example.com',
        'Action: failed',
        'Status: 5.1.1',
        '',
        'Message-ID: <fallback-id@brightchain.org>',
      ].join('\r\n');

      const parsed = BounceProcessor.parseDsnMessage(dsn);
      expect(parsed.originalMessageId).toBe('<fallback-id@brightchain.org>');
    });

    it('should extract Return-Path as envelope sender', () => {
      const dsn = buildDsnMessage({
        returnPath: 'bounces+abc123=example.com@brightchain.org',
        action: 'failed',
        status: '5.1.1',
      });

      const parsed = BounceProcessor.parseDsnMessage(dsn);
      expect(parsed.envelopeSender).toBe(
        'bounces+abc123=example.com@brightchain.org',
      );
    });

    it('should handle DSN with \n line endings', () => {
      const dsn =
        'Original-Message-ID: <msg-1@test.org>\n' +
        'Final-Recipient: rfc822; user@test.org\n' +
        'Action: delayed\n' +
        'Status: 4.2.1\n';

      const parsed = BounceProcessor.parseDsnMessage(dsn);
      expect(parsed.originalMessageId).toBe('<msg-1@test.org>');
      expect(parsed.action).toBe('delayed');
      expect(parsed.statusCode).toBe('4.2.1');
    });

    it('should return undefined fields for empty DSN', () => {
      const parsed = BounceProcessor.parseDsnMessage('');
      expect(parsed.originalMessageId).toBeUndefined();
      expect(parsed.recipientAddress).toBeUndefined();
      expect(parsed.action).toBeUndefined();
      expect(parsed.diagnosticCode).toBeUndefined();
      expect(parsed.statusCode).toBeUndefined();
      expect(parsed.envelopeSender).toBeUndefined();
    });

    it('should extract Original-Recipient when Final-Recipient is absent', () => {
      const dsn = [
        'Original-Recipient: rfc822; fallback@example.com',
        'Action: failed',
        'Status: 5.0.0',
      ].join('\r\n');

      const parsed = BounceProcessor.parseDsnMessage(dsn);
      expect(parsed.recipientAddress).toBe('fallback@example.com');
    });
  });

  // ── Static: parseVerpAddress (Req 5.4) ────────────────────────────

  describe('parseVerpAddress (Req 5.4)', () => {
    it('should extract message ID from VERP-encoded bounce address', () => {
      const result = BounceProcessor.parseVerpAddress(
        'bounces+abc123=example.com@brightchain.org',
        'brightchain.org',
      );
      expect(result).toBe('<abc123@example.com>');
    });

    it('should handle complex message ID local parts', () => {
      const result = BounceProcessor.parseVerpAddress(
        'bounces+msg-001=mail.test.org@brightchain.org',
        'brightchain.org',
      );
      expect(result).toBe('<msg-001@mail.test.org>');
    });

    it('should be case-insensitive for domain matching', () => {
      const result = BounceProcessor.parseVerpAddress(
        'bounces+id1=test.com@BRIGHTCHAIN.ORG',
        'brightchain.org',
      );
      expect(result).toBe('<id1@test.com>');
    });

    it('should return undefined for non-VERP addresses', () => {
      expect(
        BounceProcessor.parseVerpAddress(
          'noreply@brightchain.org',
          'brightchain.org',
        ),
      ).toBeUndefined();
    });

    it('should return undefined for wrong canonical domain', () => {
      expect(
        BounceProcessor.parseVerpAddress(
          'bounces+abc=test.com@other.org',
          'brightchain.org',
        ),
      ).toBeUndefined();
    });

    it('should return undefined for malformed VERP (no = separator)', () => {
      expect(
        BounceProcessor.parseVerpAddress(
          'bounces+noequalssign@brightchain.org',
          'brightchain.org',
        ),
      ).toBeUndefined();
    });

    it('should return undefined for address without @', () => {
      expect(
        BounceProcessor.parseVerpAddress(
          'bounces+abc=test.com',
          'brightchain.org',
        ),
      ).toBeUndefined();
    });
  });

  // ── Static: classifyBounce ────────────────────────────────────────

  describe('classifyBounce', () => {
    it('should classify action=failed as permanent', () => {
      expect(
        BounceProcessor.classifyBounce({
          action: 'failed',
          originalMessageId: undefined,
          recipientAddress: undefined,
          diagnosticCode: undefined,
          statusCode: undefined,
          envelopeSender: undefined,
        }),
      ).toBe('permanent');
    });

    it('should classify action=delayed as transient', () => {
      expect(
        BounceProcessor.classifyBounce({
          action: 'delayed',
          originalMessageId: undefined,
          recipientAddress: undefined,
          diagnosticCode: undefined,
          statusCode: undefined,
          envelopeSender: undefined,
        }),
      ).toBe('transient');
    });

    it('should classify 5xx status code as permanent when no action', () => {
      expect(
        BounceProcessor.classifyBounce({
          action: undefined,
          statusCode: '5.1.1',
          originalMessageId: undefined,
          recipientAddress: undefined,
          diagnosticCode: undefined,
          envelopeSender: undefined,
        }),
      ).toBe('permanent');
    });

    it('should classify 4xx status code as transient when no action', () => {
      expect(
        BounceProcessor.classifyBounce({
          action: undefined,
          statusCode: '4.2.1',
          originalMessageId: undefined,
          recipientAddress: undefined,
          diagnosticCode: undefined,
          envelopeSender: undefined,
        }),
      ).toBe('transient');
    });

    it('should default to permanent when no action or status', () => {
      expect(
        BounceProcessor.classifyBounce({
          action: undefined,
          statusCode: undefined,
          originalMessageId: undefined,
          recipientAddress: undefined,
          diagnosticCode: undefined,
          envelopeSender: undefined,
        }),
      ).toBe('permanent');
    });
  });

  // ── processDsn: Permanent Failure (Req 5.2, 5.3) ─────────────────

  describe('processDsn — permanent failure (Req 5.2, 5.3)', () => {
    let config: IEmailGatewayConfig;
    let emailService: EmailMessageService & { getEmail: jest.Mock };
    let queueStore: IOutboundQueueStore & { markFailed: jest.Mock };
    let gossip: IGossipService & { announceMessage: jest.Mock };
    let metadata: IEmailMetadata;

    beforeEach(() => {
      jest.clearAllMocks();
      config = makeConfig();
      metadata = makeEmailMetadata();
      emailService = makeMockEmailMessageService(metadata);
      queueStore = makeMockOutboundQueueStore();
      gossip = makeMockGossipService();
    });

    it('should update delivery status to FAILED and notify sender on permanent bounce', async () => {
      const processor = new BounceProcessor(
        config,
        emailService,
        queueStore,
        gossip,
      );

      const dsn = buildDsnMessage({
        originalMessageId: '<outbound-1@brightchain.org>',
        finalRecipient: 'bob@example.com',
        action: 'failed',
        status: '5.1.1',
        diagnosticCode: '550 5.1.1 User unknown',
      });

      await processor.processDsn(dsn);

      // Req 5.2: delivery status updated to FAILED
      expect(queueStore.markFailed).toHaveBeenCalledWith(
        '<outbound-1@brightchain.org>',
        '550 5.1.1 User unknown',
      );

      // Req 5.3: bounce notification sent via gossip
      expect(gossip.announceMessage).toHaveBeenCalledTimes(1);
      const [, deliveryMeta] = gossip.announceMessage.mock.calls[0];
      expect(deliveryMeta.messageId).toBe(
        'bounce:<outbound-1@brightchain.org>',
      );
      expect(deliveryMeta.recipientIds).toContain('alice@brightchain.org');
    });

    it('should accept Uint8Array DSN input', async () => {
      const processor = new BounceProcessor(
        config,
        emailService,
        queueStore,
        gossip,
      );

      const dsn = buildDsnMessage({
        originalMessageId: '<outbound-1@brightchain.org>',
        action: 'failed',
        status: '5.0.0',
      });

      await processor.processDsn(new TextEncoder().encode(dsn));

      expect(queueStore.markFailed).toHaveBeenCalled();
    });

    it('should use envelope sender for VERP correlation (Req 5.4)', async () => {
      const processor = new BounceProcessor(
        config,
        emailService,
        queueStore,
        gossip,
      );

      // DSN without Original-Message-ID but with VERP envelope sender
      const dsn = buildDsnMessage({
        finalRecipient: 'bob@example.com',
        action: 'failed',
        status: '5.1.1',
        returnPath: 'bounces+outbound-1=brightchain.org@brightchain.org',
      });

      await processor.processDsn(dsn);

      expect(queueStore.markFailed).toHaveBeenCalledWith(
        '<outbound-1@brightchain.org>',
        expect.any(String),
      );
    });

    it('should use envelopeSender parameter for VERP when not in DSN headers', async () => {
      const processor = new BounceProcessor(
        config,
        emailService,
        queueStore,
        gossip,
      );

      const dsn = buildDsnMessage({
        finalRecipient: 'bob@example.com',
        action: 'failed',
        status: '5.1.1',
      });

      await processor.processDsn(
        dsn,
        'bounces+outbound-1=brightchain.org@brightchain.org',
      );

      expect(queueStore.markFailed).toHaveBeenCalledWith(
        '<outbound-1@brightchain.org>',
        expect.any(String),
      );
    });

    it('should handle markFailed throwing without crashing', async () => {
      queueStore.markFailed.mockRejectedValue(new Error('Store error'));

      const processor = new BounceProcessor(
        config,
        emailService,
        queueStore,
        gossip,
      );

      const dsn = buildDsnMessage({
        originalMessageId: '<outbound-1@brightchain.org>',
        action: 'failed',
        status: '5.0.0',
      });

      // Should not throw
      await processor.processDsn(dsn);

      // Gossip notification should still be attempted
      expect(gossip.announceMessage).toHaveBeenCalled();
    });
  });

  // ── processDsn: Transient Failure ─────────────────────────────────

  describe('processDsn — transient failure', () => {
    it('should NOT update delivery status or notify on transient bounce', async () => {
      const metadata = makeEmailMetadata();
      const emailService = makeMockEmailMessageService(metadata);
      const queueStore = makeMockOutboundQueueStore();
      const gossip = makeMockGossipService();

      const processor = new BounceProcessor(
        makeConfig(),
        emailService,
        queueStore,
        gossip,
      );

      const dsn = buildDsnMessage({
        originalMessageId: '<outbound-1@brightchain.org>',
        finalRecipient: 'bob@example.com',
        action: 'delayed',
        status: '4.2.1',
      });

      await processor.processDsn(dsn);

      // Should NOT mark as failed
      expect(queueStore.markFailed).not.toHaveBeenCalled();

      // Should NOT send bounce notification
      expect(gossip.announceMessage).not.toHaveBeenCalled();
    });
  });

  // ── processDsn: Correlation Failure ───────────────────────────────

  describe('processDsn — correlation failure', () => {
    it('should log and return when DSN cannot be correlated', async () => {
      const emailService = makeMockEmailMessageService(null); // no message found
      const queueStore = makeMockOutboundQueueStore();
      const gossip = makeMockGossipService();

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const processor = new BounceProcessor(
        makeConfig(),
        emailService,
        queueStore,
        gossip,
      );

      // DSN with no identifiable message ID
      const dsn = buildDsnMessage({
        action: 'failed',
        status: '5.0.0',
      });

      await processor.processDsn(dsn);

      expect(queueStore.markFailed).not.toHaveBeenCalled();
      expect(gossip.announceMessage).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not correlate'),
      );

      consoleSpy.mockRestore();
    });
  });

  // ── processDsn: Gossip Failure ────────────────────────────────────

  describe('processDsn — gossip failure', () => {
    it('should handle gossip failure gracefully', async () => {
      const metadata = makeEmailMetadata();
      const emailService = makeMockEmailMessageService(metadata);
      const queueStore = makeMockOutboundQueueStore();
      const gossip = makeMockGossipService();
      gossip.announceMessage.mockRejectedValue(new Error('Gossip down'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const processor = new BounceProcessor(
        makeConfig(),
        emailService,
        queueStore,
        gossip,
      );

      const dsn = buildDsnMessage({
        originalMessageId: '<outbound-1@brightchain.org>',
        action: 'failed',
        status: '5.0.0',
      });

      // Should not throw
      await processor.processDsn(dsn);

      // Queue store should still have been updated
      expect(queueStore.markFailed).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
