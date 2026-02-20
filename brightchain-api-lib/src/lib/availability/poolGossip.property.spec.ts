/**
 * @fileoverview Property-based tests for pool lifecycle gossip announcements
 *
 * **Feature: lumen-brightchain-client-protocol, Property 9: Pool lifecycle events trigger gossip announcements**
 *
 * For any pool lifecycle event (creation, metadata update, or deletion), the GossipService
 * queues a corresponding pool announcement (pool_announce for create/update, pool_remove
 * for delete) with the correct pool ID and node ID.
 *
 * **Validates: Requirements 8.1, 8.4**
 */

import {
  BlockAnnouncement,
  GossipConfig,
  PoolAnnouncementMetadata,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { GossipService, IPeerProvider } from './gossipService';

// Longer timeout for property tests
jest.setTimeout(60000);

// ── Generators ──

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Valid node ID */
const arbNodeId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);

/** Random pool announcement metadata */
const arbPoolAnnouncementMetadata: fc.Arbitrary<PoolAnnouncementMetadata> =
  fc.record({
    blockCount: fc.nat({ max: 1_000_000 }),
    totalSize: fc.nat({ max: Number.MAX_SAFE_INTEGER }),
    encrypted: fc.boolean(),
  });

// ── Mock Peer Provider ──

class MockPeerProvider implements IPeerProvider {
  public sentBatches: Array<{
    peerId: string;
    announcements: BlockAnnouncement[];
  }> = [];

  constructor(
    private readonly localNodeId: string,
    private connectedPeers: string[] = [],
  ) {}

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  getConnectedPeerIds(): string[] {
    return this.connectedPeers;
  }

  async sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
  ): Promise<void> {
    this.sentBatches.push({ peerId, announcements: [...announcements] });
  }

  async getPeerPublicKey(_peerId: string): Promise<Buffer | null> {
    return null;
  }
}

// ── Default config for tests ──

const testConfig: GossipConfig = {
  fanout: 3,
  defaultTtl: 3,
  batchIntervalMs: 1000,
  maxBatchSize: 100,
  messagePriority: {
    normal: { fanout: 5, ttl: 5 },
    high: { fanout: 7, ttl: 7 },
  },
};

// ── Property Tests ──

describe('Feature: lumen-brightchain-client-protocol, Property 9: Pool lifecycle events trigger gossip announcements', () => {
  /**
   * Property 9a: announcePool queues a pool_announce announcement with the correct
   * poolId, nodeId, and metadata.
   *
   * **Validates: Requirements 8.1**
   */
  it('Property 9a: announcePool queues pool_announce with correct poolId and metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbNodeId,
        arbPoolAnnouncementMetadata,
        async (poolId, nodeId, metadata) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          await gossipService.announcePool(poolId, metadata);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const announcement = pending[0];
          expect(announcement.type).toBe('pool_announce');
          expect(announcement.poolId).toBe(poolId);
          expect(announcement.nodeId).toBe(nodeId);
          expect(announcement.blockId).toBe('');
          expect(announcement.ttl).toBe(testConfig.defaultTtl);
          expect(announcement.poolAnnouncement).toBeDefined();
          expect(announcement.poolAnnouncement?.blockCount).toBe(
            metadata.blockCount,
          );
          expect(announcement.poolAnnouncement?.totalSize).toBe(
            metadata.totalSize,
          );
          expect(announcement.poolAnnouncement?.encrypted).toBe(
            metadata.encrypted,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9b: announcePoolRemoval queues a pool_remove announcement with the correct
   * poolId and nodeId.
   *
   * **Validates: Requirements 8.4**
   */
  it('Property 9b: announcePoolRemoval queues pool_remove with correct poolId', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolId, arbNodeId, async (poolId, nodeId) => {
        const peerProvider = new MockPeerProvider(nodeId);
        const gossipService = new GossipService(peerProvider, testConfig);

        await gossipService.announcePoolRemoval(poolId);

        const pending = gossipService.getPendingAnnouncements();
        expect(pending.length).toBe(1);

        const announcement = pending[0];
        expect(announcement.type).toBe('pool_remove');
        expect(announcement.poolId).toBe(poolId);
        expect(announcement.nodeId).toBe(nodeId);
        expect(announcement.blockId).toBe('');
        expect(announcement.ttl).toBe(testConfig.defaultTtl);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9c: For any pool lifecycle event type, the announcement type
   * correctly distinguishes between pool_announce and pool_remove.
   *
   * **Validates: Requirements 8.1, 8.4**
   */
  it('Property 9c: pool lifecycle events produce distinct announcement types', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbNodeId,
        arbPoolAnnouncementMetadata,
        async (poolId, nodeId, metadata) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          // Announce pool creation/update
          await gossipService.announcePool(poolId, metadata);
          // Announce pool removal
          await gossipService.announcePoolRemoval(poolId);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(2);
          expect(pending[0].type).toBe('pool_announce');
          expect(pending[1].type).toBe('pool_remove');
          // Both reference the same pool
          expect(pending[0].poolId).toBe(poolId);
          expect(pending[1].poolId).toBe(poolId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 10 imports ──
import { PoolEncryptionService } from '../encryption/poolEncryptionService';

describe('Feature: lumen-brightchain-client-protocol, Property 10: Encrypted pool announcement round-trip', () => {
  const encryptionService = new PoolEncryptionService();

  /** Arbitrary pool metadata as a JSON string (simulating announcement metadata) */
  const arbPoolMetadataJson = fc
    .record({
      blockCount: fc.nat({ max: 1_000_000 }),
      totalSize: fc.nat({ max: Number.MAX_SAFE_INTEGER }),
      memberCount: fc.nat({ max: 10_000 }),
      poolName: fc.string({ minLength: 1, maxLength: 64 }),
    })
    .map((obj) => JSON.stringify(obj));

  /**
   * Property 10a: Encrypting pool announcement metadata with a shared key and
   * decrypting with the same key produces the original metadata.
   *
   * **Validates: Requirements 8.2**
   */
  it('Property 10a: encrypt then decrypt with same key produces original metadata', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolMetadataJson, async (metadataJson) => {
        const key = encryptionService.generatePoolKey();
        const plaintext = new TextEncoder().encode(metadataJson);

        const ciphertext = await encryptionService.encryptPoolShared(
          plaintext,
          key,
        );
        const decrypted = await encryptionService.decryptPoolShared(
          ciphertext,
          key,
        );

        const decryptedJson = new TextDecoder().decode(decrypted);
        expect(decryptedJson).toBe(metadataJson);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b: Decrypting pool announcement metadata with a different key
   * than the one used for encryption fails.
   *
   * **Validates: Requirements 8.2**
   */
  it('Property 10b: decrypt with wrong key fails', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolMetadataJson, async (metadataJson) => {
        const correctKey = encryptionService.generatePoolKey();
        const wrongKey = encryptionService.generatePoolKey();
        const plaintext = new TextEncoder().encode(metadataJson);

        const ciphertext = await encryptionService.encryptPoolShared(
          plaintext,
          correctKey,
        );

        await expect(
          encryptionService.decryptPoolShared(ciphertext, wrongKey),
        ).rejects.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});
