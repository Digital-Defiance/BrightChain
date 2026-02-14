/**
 * @fileoverview Property-based tests for GossipService pool coordination
 *
 * **Feature: cross-node-pool-coordination, Property 1: Block announcements include pool context**
 *
 * For any block stored in a pool via the GossipService, the resulting BlockAnnouncement
 * has its poolId field set to the pool the block was stored in. For blocks announced
 * without pool context, the poolId field is undefined.
 *
 * **Validates: Requirements 1.1, 6.3**
 */

import { BlockAnnouncement, GossipConfig } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { GossipService, IPeerProvider } from './gossipService';

// Longer timeout for property tests
jest.setTimeout(60000);

// ── Generators ──

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Valid hex-encoded block ID (at least 32 hex chars) */
const arbBlockId = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 64 })
  .map((arr) => arr.map((n) => n.toString(16)).join(''));

/** Valid node ID */
const arbNodeId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);

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

describe('Feature: cross-node-pool-coordination, Property 1: Block announcements include pool context', () => {
  /**
   * Property 1a: announceBlock with a poolId produces an announcement whose poolId
   * matches the provided pool.
   *
   * **Validates: Requirements 1.1, 6.3**
   */
  it('Property 1a: announceBlock with poolId sets poolId on the announcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockId,
        arbPoolId,
        arbNodeId,
        async (blockId, poolId, nodeId) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          await gossipService.announceBlock(blockId, poolId);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const announcement = pending[0];
          expect(announcement.type).toBe('add');
          expect(announcement.blockId).toBe(blockId);
          expect(announcement.nodeId).toBe(nodeId);
          expect(announcement.poolId).toBe(poolId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: announceBlock without a poolId produces an announcement
   * where poolId is undefined.
   *
   * **Validates: Requirements 1.1, 6.3**
   */
  it('Property 1b: announceBlock without poolId leaves poolId undefined', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
        const peerProvider = new MockPeerProvider(nodeId);
        const gossipService = new GossipService(peerProvider, testConfig);

        await gossipService.announceBlock(blockId);

        const pending = gossipService.getPendingAnnouncements();
        expect(pending.length).toBe(1);

        const announcement = pending[0];
        expect(announcement.type).toBe('add');
        expect(announcement.blockId).toBe(blockId);
        expect(announcement.nodeId).toBe(nodeId);
        expect(announcement.poolId).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: announceRemoval with a poolId sets poolId on the removal announcement.
   *
   * **Validates: Requirements 1.1, 6.3**
   */
  it('Property 1c: announceRemoval with poolId sets poolId on the announcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockId,
        arbPoolId,
        arbNodeId,
        async (blockId, poolId, nodeId) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          await gossipService.announceRemoval(blockId, poolId);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const announcement = pending[0];
          expect(announcement.type).toBe('remove');
          expect(announcement.blockId).toBe(blockId);
          expect(announcement.nodeId).toBe(nodeId);
          expect(announcement.poolId).toBe(poolId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1d: announceRemoval without a poolId leaves poolId undefined.
   *
   * **Validates: Requirements 1.1, 6.3**
   */
  it('Property 1d: announceRemoval without poolId leaves poolId undefined', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
        const peerProvider = new MockPeerProvider(nodeId);
        const gossipService = new GossipService(peerProvider, testConfig);

        await gossipService.announceRemoval(blockId);

        const pending = gossipService.getPendingAnnouncements();
        expect(pending.length).toBe(1);

        const announcement = pending[0];
        expect(announcement.type).toBe('remove');
        expect(announcement.blockId).toBe(blockId);
        expect(announcement.nodeId).toBe(nodeId);
        expect(announcement.poolId).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e: The poolId on the announcement is exactly the poolId passed in,
   * for any combination of block ID and pool ID — no transformation or truncation.
   *
   * **Validates: Requirements 1.1, 6.3**
   */
  it('Property 1e: poolId is preserved exactly as provided across add and remove', async () => {
    const arbType = fc.constantFrom('add' as const, 'remove' as const);

    await fc.assert(
      fc.asyncProperty(
        arbBlockId,
        arbPoolId,
        arbNodeId,
        arbType,
        async (blockId, poolId, nodeId, type) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          if (type === 'add') {
            await gossipService.announceBlock(blockId, poolId);
          } else {
            await gossipService.announceRemoval(blockId, poolId);
          }

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);
          expect(pending[0].poolId).toStrictEqual(poolId);
          expect(pending[0].type).toBe(type);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: cross-node-pool-coordination, Property 2: Gossip preserves poolId during forwarding', () => {
  /**
   * Property 2a: When an 'add' announcement with poolId is handled,
   * the forwarded announcement preserves the same poolId.
   *
   * **Validates: Requirements 1.2, 2.7**
   */
  it('Property 2a: forwarded add announcement preserves poolId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockId,
        arbPoolId,
        arbNodeId,
        fc.integer({ min: 1, max: 10 }),
        async (blockId, poolId, nodeId, ttl) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          const announcement: BlockAnnouncement = {
            type: 'add',
            blockId,
            nodeId: 'remote-node',
            timestamp: new Date(),
            ttl,
            poolId,
          };

          await gossipService.handleAnnouncement(announcement);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const forwarded = pending[0];
          expect(forwarded.poolId).toBe(poolId);
          expect(forwarded.ttl).toBe(ttl - 1);
          expect(forwarded.type).toBe('add');
          expect(forwarded.blockId).toBe(blockId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2b: When a 'remove' announcement with poolId is handled,
   * the forwarded announcement preserves the same poolId.
   *
   * **Validates: Requirements 1.2, 2.7**
   */
  it('Property 2b: forwarded remove announcement preserves poolId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockId,
        arbPoolId,
        arbNodeId,
        fc.integer({ min: 1, max: 10 }),
        async (blockId, poolId, nodeId, ttl) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          const announcement: BlockAnnouncement = {
            type: 'remove',
            blockId,
            nodeId: 'remote-node',
            timestamp: new Date(),
            ttl,
            poolId,
          };

          await gossipService.handleAnnouncement(announcement);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const forwarded = pending[0];
          expect(forwarded.poolId).toBe(poolId);
          expect(forwarded.ttl).toBe(ttl - 1);
          expect(forwarded.type).toBe('remove');
          expect(forwarded.blockId).toBe(blockId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2c: When a 'pool_deleted' announcement with poolId is handled,
   * the forwarded announcement preserves the same poolId.
   *
   * **Validates: Requirements 1.2, 2.7**
   */
  it('Property 2c: forwarded pool_deleted announcement preserves poolId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbNodeId,
        fc.integer({ min: 1, max: 10 }),
        async (poolId, nodeId, ttl) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          const announcement: BlockAnnouncement = {
            type: 'pool_deleted',
            blockId: '',
            nodeId: 'remote-node',
            timestamp: new Date(),
            ttl,
            poolId,
          };

          await gossipService.handleAnnouncement(announcement);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const forwarded = pending[0];
          expect(forwarded.poolId).toBe(poolId);
          expect(forwarded.ttl).toBe(ttl - 1);
          expect(forwarded.type).toBe('pool_deleted');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2d: poolId is never dropped during forwarding — for any announcement
   * type that carries a poolId, the forwarded copy always has the same poolId.
   *
   * **Validates: Requirements 1.2, 2.7**
   */
  it('Property 2d: poolId is never modified or dropped across all forwardable types', async () => {
    const arbAnnouncementType = fc.constantFrom(
      'add' as const,
      'remove' as const,
      'pool_deleted' as const,
    );

    await fc.assert(
      fc.asyncProperty(
        arbAnnouncementType,
        arbBlockId,
        arbPoolId,
        arbNodeId,
        fc.integer({ min: 1, max: 10 }),
        async (type, blockId, poolId, nodeId, ttl) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          const announcement: BlockAnnouncement = {
            type,
            blockId: type === 'pool_deleted' ? '' : blockId,
            nodeId: 'remote-node',
            timestamp: new Date(),
            ttl,
            poolId,
          };

          await gossipService.handleAnnouncement(announcement);

          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(1);

          const forwarded = pending[0];
          expect(forwarded.poolId).toStrictEqual(poolId);
          expect(forwarded.poolId).not.toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2e: Announcements with TTL=0 are NOT forwarded, but poolId
   * is still preserved in the original (no mutation of the input).
   *
   * **Validates: Requirements 1.2, 2.7**
   */
  it('Property 2e: TTL=0 announcements are not forwarded but original poolId is untouched', async () => {
    const arbAnnouncementType = fc.constantFrom(
      'add' as const,
      'remove' as const,
      'pool_deleted' as const,
    );

    await fc.assert(
      fc.asyncProperty(
        arbAnnouncementType,
        arbBlockId,
        arbPoolId,
        arbNodeId,
        async (type, blockId, poolId, nodeId) => {
          const peerProvider = new MockPeerProvider(nodeId);
          const gossipService = new GossipService(peerProvider, testConfig);

          const announcement: BlockAnnouncement = {
            type,
            blockId: type === 'pool_deleted' ? '' : blockId,
            nodeId: 'remote-node',
            timestamp: new Date(),
            ttl: 0,
            poolId,
          };

          const originalPoolId = announcement.poolId;

          await gossipService.handleAnnouncement(announcement);

          // TTL=0 means no forwarding
          const pending = gossipService.getPendingAnnouncements();
          expect(pending.length).toBe(0);

          // Original announcement's poolId was not mutated
          expect(announcement.poolId).toBe(originalPoolId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: cross-node-pool-coordination, Property 4: Pool deletion creates correct announcement', () => {
  /**
   * Property 4a: announcePoolDeletion produces a pool_deleted announcement with the
   * correct poolId, an empty blockId, and no messageDelivery or deliveryAck metadata.
   *
   * **Validates: Requirements 2.2**
   */
  it('Property 4a: announcePoolDeletion creates announcement with type pool_deleted and correct poolId', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolId, arbNodeId, async (poolId, nodeId) => {
        const peerProvider = new MockPeerProvider(nodeId);
        const gossipService = new GossipService(peerProvider, testConfig);

        await gossipService.announcePoolDeletion(poolId);

        const pending = gossipService.getPendingAnnouncements();
        expect(pending.length).toBe(1);

        const announcement = pending[0];
        expect(announcement.type).toBe('pool_deleted');
        expect(announcement.poolId).toBe(poolId);
        expect(announcement.blockId).toBe('');
        expect(announcement.nodeId).toBe(nodeId);
        expect(announcement.messageDelivery).toBeUndefined();
        expect(announcement.deliveryAck).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4b: announcePoolDeletion sets a positive TTL from the config default,
   * ensuring the announcement will be forwarded by peers.
   *
   * **Validates: Requirements 2.2**
   */
  it('Property 4b: announcePoolDeletion sets TTL from config defaultTtl', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolId, arbNodeId, async (poolId, nodeId) => {
        const peerProvider = new MockPeerProvider(nodeId);
        const gossipService = new GossipService(peerProvider, testConfig);

        await gossipService.announcePoolDeletion(poolId);

        const pending = gossipService.getPendingAnnouncements();
        expect(pending.length).toBe(1);

        const announcement = pending[0];
        expect(announcement.ttl).toBe(testConfig.defaultTtl);
        expect(announcement.timestamp).toBeInstanceOf(Date);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4c: The poolId on the pool_deleted announcement is exactly the poolId
   * passed in — no transformation, truncation, or modification.
   *
   * **Validates: Requirements 2.2**
   */
  it('Property 4c: poolId is preserved exactly as provided', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolId, arbNodeId, async (poolId, nodeId) => {
        const peerProvider = new MockPeerProvider(nodeId);
        const gossipService = new GossipService(peerProvider, testConfig);

        await gossipService.announcePoolDeletion(poolId);

        const pending = gossipService.getPendingAnnouncements();
        expect(pending.length).toBe(1);
        expect(pending[0].poolId).toStrictEqual(poolId);
      }),
      { numRuns: 100 },
    );
  });
});
