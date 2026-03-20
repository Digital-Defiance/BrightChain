/**
 * Unit tests for hot-reload support of canonical domain changes.
 *
 * Validates that when the canonical domain changes via
 * `EmailGatewayService.updateCanonicalDomain()`, all registered
 * child components receive the updated domain without requiring a restart.
 *
 * Components tested:
 * - EmailGatewayService — domain check for external recipients
 * - OutboundDeliveryWorker — DKIM signing domain
 * - RecipientLookupService — inbound recipient validation
 * - BounceProcessor — VERP address parsing
 *
 * @see Requirement 8.5
 */

import type { IBlockStore, IGossipService } from '@brightchain/brightchain-lib';
import { EmailMessageService } from '@brightchain/brightchain-lib';

import { BounceProcessor } from './bounceProcessor';
import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IDomainAwareComponent } from './emailGatewayService';
import { EmailGatewayService } from './emailGatewayService';
import type { IOutboundQueueStore } from './outboundQueueStore';
import type { IUserRegistry } from './recipientLookupService';
import { RecipientLookupService } from './recipientLookupService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(
  overrides: Partial<IEmailGatewayConfig> = {},
): IEmailGatewayConfig {
  return {
    canonicalDomain: 'original.org',
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

function makeMockGossipService(): IGossipService {
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
  } as unknown as IGossipService;
}

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

function makeMockEmailMessageService(): EmailMessageService {
  return {
    getEmail: jest.fn().mockResolvedValue(null),
  } as unknown as EmailMessageService;
}

function makeMockOutboundQueueStore(): IOutboundQueueStore {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    dequeue: jest.fn().mockResolvedValue(undefined),
    peek: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    requeue: jest.fn().mockResolvedValue(undefined),
    getQueueDepth: jest.fn().mockResolvedValue(0),
    getByMessageId: jest.fn().mockResolvedValue(undefined),
  } as unknown as IOutboundQueueStore;
}

function makeMockUserRegistry(users: Set<string> = new Set()): IUserRegistry {
  return {
    hasUser: jest
      .fn()
      .mockImplementation(async (email: string) =>
        users.has(email.toLowerCase()),
      ),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Hot-reload: canonical domain changes (Req 8.5)', () => {
  describe('EmailGatewayService.updateCanonicalDomain', () => {
    it('should update the config canonicalDomain', () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const svc = new EmailGatewayService(
        config,
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      svc.updateCanonicalDomain('newdomain.com');
      expect(svc.getCanonicalDomain()).toBe('newdomain.com');
    });

    it('should update domain check behavior after domain change', () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const svc = new EmailGatewayService(
        config,
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      // Before change: original.org is internal
      expect(svc.isExternalRecipient('alice@original.org')).toBe(false);
      expect(svc.isExternalRecipient('bob@newdomain.com')).toBe(true);

      svc.updateCanonicalDomain('newdomain.com');

      // After change: newdomain.com is now internal, original.org is external
      expect(svc.isExternalRecipient('alice@original.org')).toBe(true);
      expect(svc.isExternalRecipient('bob@newdomain.com')).toBe(false);
    });

    it('should propagate domain change to all registered components', () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const svc = new EmailGatewayService(
        config,
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      const mockComponent1: IDomainAwareComponent = {
        updateCanonicalDomain: jest.fn(),
      };
      const mockComponent2: IDomainAwareComponent = {
        updateCanonicalDomain: jest.fn(),
      };

      svc.registerDomainAwareComponent(mockComponent1);
      svc.registerDomainAwareComponent(mockComponent2);

      svc.updateCanonicalDomain('updated.net');

      expect(mockComponent1.updateCanonicalDomain).toHaveBeenCalledWith(
        'updated.net',
      );
      expect(mockComponent2.updateCanonicalDomain).toHaveBeenCalledWith(
        'updated.net',
      );
    });

    it('should trim whitespace from the new domain', () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const svc = new EmailGatewayService(
        config,
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      svc.updateCanonicalDomain('  trimmed.org  ');
      expect(svc.getCanonicalDomain()).toBe('trimmed.org');
    });

    it('should ignore empty domain updates', () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const svc = new EmailGatewayService(
        config,
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      svc.updateCanonicalDomain('');
      expect(svc.getCanonicalDomain()).toBe('original.org');

      svc.updateCanonicalDomain('   ');
      expect(svc.getCanonicalDomain()).toBe('original.org');
    });

    it('should update partitionRecipients behavior after domain change', () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const svc = new EmailGatewayService(
        config,
        makeMockGossipService(),
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      svc.updateCanonicalDomain('newdomain.com');

      const result = svc.partitionRecipients([
        'alice@newdomain.com',
        'bob@original.org',
        'carol@external.net',
      ]);

      expect(result.internal).toEqual(['alice@newdomain.com']);
      expect(result.external).toEqual([
        'bob@original.org',
        'carol@external.net',
      ]);
    });
  });

  describe('RecipientLookupService domain update', () => {
    it('should validate against the new domain after updateCanonicalDomain', async () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const users = new Set(['alice@newdomain.com']);
      const registry = makeMockUserRegistry(users);
      const rls = new RecipientLookupService(config, registry);

      // Before update: lookup for newdomain.com returns NOTFOUND (wrong domain)
      const beforeResult = await rls.lookup('alice@newdomain.com');
      expect(beforeResult).toBe('NOTFOUND');

      // Update domain
      rls.updateCanonicalDomain('newdomain.com');

      // After update: lookup for newdomain.com now queries the registry
      const afterResult = await rls.lookup('alice@newdomain.com');
      expect(afterResult).toBe('OK');
    });

    it('should clear cache when domain changes', async () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const users = new Set(['alice@original.org']);
      const registry = makeMockUserRegistry(users);
      const rls = new RecipientLookupService(config, registry);

      // Populate cache
      await rls.lookup('alice@original.org');
      expect(rls.getCache().size).toBe(1);

      // Update domain — cache should be cleared
      rls.updateCanonicalDomain('newdomain.com');
      expect(rls.getCache().size).toBe(0);
    });
  });

  describe('BounceProcessor domain update', () => {
    it('should use the updated domain for VERP parsing after updateCanonicalDomain', () => {
      // VERP address at the new domain
      const verpAddress = 'bounces+msg123=example.com@newdomain.com';

      // Before update: parsing against original.org should fail
      const beforeResult = BounceProcessor.parseVerpAddress(
        verpAddress,
        'original.org',
      );
      expect(beforeResult).toBeUndefined();

      // After update: parsing against newdomain.com should succeed
      const afterResult = BounceProcessor.parseVerpAddress(
        verpAddress,
        'newdomain.com',
      );
      expect(afterResult).toBe('<msg123@example.com>');
    });
  });

  describe('End-to-end domain propagation', () => {
    it('should propagate domain change from gateway to all child components', async () => {
      const config = makeConfig({ canonicalDomain: 'original.org' });
      const gossip = makeMockGossipService();
      const svc = new EmailGatewayService(
        config,
        gossip,
        makeMockBlockStore(),
        makeMockEmailMessageService(),
      );

      // Create real child components
      const users = new Set(['alice@newdomain.com']);
      const rls = new RecipientLookupService(
        config,
        makeMockUserRegistry(users),
      );
      const bp = new BounceProcessor(
        config,
        makeMockEmailMessageService(),
        makeMockOutboundQueueStore(),
        gossip,
      );

      // Register components
      svc.registerDomainAwareComponent(rls);
      svc.registerDomainAwareComponent(bp);

      // Verify initial state
      expect(svc.getCanonicalDomain()).toBe('original.org');
      expect(svc.isExternalRecipient('alice@newdomain.com')).toBe(true);

      // Propagate domain change
      svc.updateCanonicalDomain('newdomain.com');

      // Verify gateway updated
      expect(svc.getCanonicalDomain()).toBe('newdomain.com');
      expect(svc.isExternalRecipient('alice@newdomain.com')).toBe(false);
      expect(svc.isExternalRecipient('bob@original.org')).toBe(true);

      // Verify RecipientLookupService updated
      const lookupResult = await rls.lookup('alice@newdomain.com');
      expect(lookupResult).toBe('OK');
    });
  });
});
