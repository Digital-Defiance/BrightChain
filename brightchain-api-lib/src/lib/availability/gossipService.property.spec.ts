/**
 * @fileoverview Property-based tests for GossipService
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 12: Gossip TTL Decrement
 * - Property 13: Gossip Batching
 *
 * **Validates: Requirements 6.4, 6.6**
 */

import { BlockAnnouncement, GossipConfig } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { GossipService, IPeerProvider } from './gossipService';

/**
 * Generate a valid hex string of specified length (block ID format)
 */
const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength,
      maxLength,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a valid block ID (hex string of at least 32 characters)
 */
const arbBlockId = arbHexString(32, 64);

/**
 * Generate a valid TTL value (0 to 10)
 */
const arbTtl = fc.integer({ min: 0, max: 10 });

/**
 * Generate a valid node ID
 */
const arbNodeId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);

/**
 * Generate a valid block announcement
 */
const arbBlockAnnouncement = fc.record({
  type: fc.constantFrom('add' as const, 'remove' as const),
  blockId: arbBlockId,
  nodeId: arbNodeId,
  timestamp: fc.date(),
  ttl: arbTtl,
});

/**
 * Generate a valid gossip config
 */
const arbGossipConfig = fc.record({
  fanout: fc.integer({ min: 1, max: 10 }),
  defaultTtl: fc.integer({ min: 1, max: 10 }),
  batchIntervalMs: fc.integer({ min: 100, max: 10000 }),
  maxBatchSize: fc.integer({ min: 1, max: 100 }),
});

/**
 * Mock peer provider for testing
 */
class MockPeerProvider implements IPeerProvider {
  private localNodeId: string;
  private connectedPeers: string[];
  public sentBatches: Array<{
    peerId: string;
    announcements: BlockAnnouncement[];
  }> = [];

  constructor(localNodeId: string, connectedPeers: string[] = []) {
    this.localNodeId = localNodeId;
    this.connectedPeers = connectedPeers;
  }

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

  clearSentBatches(): void {
    this.sentBatches = [];
  }

  setConnectedPeers(peers: string[]): void {
    this.connectedPeers = peers;
  }
}

describe('GossipService Property Tests', () => {
  describe('Property 12: Gossip TTL Decrement', () => {
    /**
     * **Feature: block-availability-discovery, Property 12: Gossip TTL Decrement**
     *
     * *For any* gossip announcement with TTL > 0, when forwarded to peers,
     * the TTL SHALL be decremented by 1. Announcements with TTL = 0 SHALL NOT be forwarded.
     *
     * **Validates: Requirements 6.4**
     */
    it('should decrement TTL by 1 when forwarding announcements with TTL > 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockAnnouncement.filter((a) => a.ttl > 0),
          arbGossipConfig,
          async (announcement, config) => {
            const peerProvider = new MockPeerProvider('local-node', [
              'peer-1',
              'peer-2',
              'peer-3',
            ]);
            const gossipService = new GossipService(peerProvider, config);

            // Handle the announcement (this should queue a forwarded version)
            await gossipService.handleAnnouncement(announcement);

            // Get pending announcements (may be empty if auto-flushed due to maxBatchSize)
            const pending = gossipService.getPendingAnnouncements();

            // Check either pending queue or sent batches
            // (auto-flush happens when pending.length >= maxBatchSize)
            if (pending.length > 0) {
              // Announcement is still pending
              expect(pending.length).toBe(1);
              expect(pending[0].ttl).toBe(announcement.ttl - 1);
              expect(pending[0].type).toBe(announcement.type);
              expect(pending[0].blockId).toBe(announcement.blockId);
              expect(pending[0].nodeId).toBe(announcement.nodeId);
            } else {
              // Announcement was auto-flushed, check sent batches
              expect(peerProvider.sentBatches.length).toBeGreaterThan(0);
              const allSentAnnouncements = peerProvider.sentBatches.flatMap(
                (b) => b.announcements,
              );
              // Find the forwarded announcement (same blockId, decremented TTL)
              const forwarded = allSentAnnouncements.find(
                (a) =>
                  a.blockId === announcement.blockId &&
                  a.ttl === announcement.ttl - 1,
              );
              expect(forwarded).toBeDefined();
              expect(forwarded!.type).toBe(announcement.type);
              expect(forwarded!.nodeId).toBe(announcement.nodeId);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 12: Gossip TTL Decrement**
     *
     * Announcements with TTL = 0 should not be forwarded.
     *
     * **Validates: Requirements 6.4**
     */
    it('should not forward announcements with TTL = 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockAnnouncement.map((a) => ({ ...a, ttl: 0 })),
          arbGossipConfig,
          async (announcement, config) => {
            const peerProvider = new MockPeerProvider('local-node', [
              'peer-1',
              'peer-2',
              'peer-3',
            ]);
            const gossipService = new GossipService(peerProvider, config);

            // Handle the announcement with TTL = 0
            await gossipService.handleAnnouncement(announcement);

            // Get pending announcements
            const pending = gossipService.getPendingAnnouncements();

            // Should have no forwarded announcements
            expect(pending.length).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 12: Gossip TTL Decrement**
     *
     * After multiple forwards, TTL should reach 0 and stop forwarding.
     *
     * **Validates: Requirements 6.4**
     */
    it('should stop forwarding when TTL reaches 0 after multiple hops', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockAnnouncement.filter((a) => a.ttl >= 1 && a.ttl <= 5),
          async (announcement) => {
            const config: GossipConfig = {
              fanout: 3,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
            };

            let currentAnnouncement = { ...announcement };
            let forwardCount = 0;

            // Simulate multiple hops
            while (currentAnnouncement.ttl > 0) {
              const peerProvider = new MockPeerProvider('local-node', [
                'peer-1',
              ]);
              const gossipService = new GossipService(peerProvider, config);

              await gossipService.handleAnnouncement(currentAnnouncement);
              const pending = gossipService.getPendingAnnouncements();

              if (pending.length > 0) {
                currentAnnouncement = pending[0];
                forwardCount++;
              } else {
                break;
              }
            }

            // Should have forwarded exactly TTL times
            expect(forwardCount).toBe(announcement.ttl);

            // Final TTL should be 0
            expect(currentAnnouncement.ttl).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 13: Gossip Batching', () => {
    /**
     * **Feature: block-availability-discovery, Property 13: Gossip Batching**
     *
     * *For any* sequence of block announcements within the batch interval,
     * the system SHALL combine them into a single batch message up to the maximum batch size.
     *
     * **Validates: Requirements 6.6**
     */
    it('should batch multiple announcements together', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBlockId, { minLength: 2, maxLength: 20 }),
          arbGossipConfig.filter((c) => c.maxBatchSize >= 20),
          async (blockIds, config) => {
            const peerProvider = new MockPeerProvider('local-node', ['peer-1']);
            const gossipService = new GossipService(peerProvider, config);

            // Queue multiple announcements
            for (const blockId of blockIds) {
              await gossipService.announceBlock(blockId);
            }

            // Get pending announcements
            const pending = gossipService.getPendingAnnouncements();

            // Should have all announcements pending
            expect(pending.length).toBe(blockIds.length);

            // Flush and check batching
            await gossipService.flushAnnouncements();

            // Should have sent exactly one batch (since maxBatchSize >= blockIds.length)
            expect(peerProvider.sentBatches.length).toBe(1);

            // The batch should contain all announcements
            expect(peerProvider.sentBatches[0].announcements.length).toBe(
              blockIds.length,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 13: Gossip Batching**
     *
     * Batches should not exceed the maximum batch size.
     *
     * **Validates: Requirements 6.6**
     */
    it('should split announcements into multiple batches when exceeding max size', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 50 }),
          fc.integer({ min: 1, max: 9 }),
          async (announcementCount, maxBatchSize) => {
            const config: GossipConfig = {
              fanout: 1,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize,
            };

            const peerProvider = new MockPeerProvider('local-node', ['peer-1']);
            const gossipService = new GossipService(peerProvider, config);

            // Queue many announcements
            for (let i = 0; i < announcementCount; i++) {
              const blockId = i.toString(16).padStart(32, '0');
              await gossipService.announceBlock(blockId);
            }

            // Flush all announcements
            await gossipService.flushAnnouncements();

            // Calculate expected number of batches
            const expectedBatches = Math.ceil(announcementCount / maxBatchSize);

            // Should have the expected number of batches
            expect(peerProvider.sentBatches.length).toBe(expectedBatches);

            // Each batch should not exceed max size
            for (const batch of peerProvider.sentBatches) {
              expect(batch.announcements.length).toBeLessThanOrEqual(
                maxBatchSize,
              );
            }

            // Total announcements across all batches should equal original count
            const totalSent = peerProvider.sentBatches.reduce(
              (sum, batch) => sum + batch.announcements.length,
              0,
            );
            expect(totalSent).toBe(announcementCount);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 13: Gossip Batching**
     *
     * Pending announcements should be cleared after flush.
     *
     * **Validates: Requirements 6.6**
     */
    it('should clear pending announcements after flush', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBlockId, { minLength: 1, maxLength: 20 }),
          async (blockIds) => {
            const config: GossipConfig = {
              fanout: 1,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
            };

            const peerProvider = new MockPeerProvider('local-node', ['peer-1']);
            const gossipService = new GossipService(peerProvider, config);

            // Queue announcements
            for (const blockId of blockIds) {
              await gossipService.announceBlock(blockId);
            }

            // Verify pending before flush
            expect(gossipService.getPendingAnnouncements().length).toBe(
              blockIds.length,
            );

            // Flush
            await gossipService.flushAnnouncements();

            // Pending should be empty after flush
            expect(gossipService.getPendingAnnouncements().length).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 13: Gossip Batching**
     *
     * Both add and remove announcements should be batched together.
     *
     * **Validates: Requirements 6.6**
     */
    it('should batch both add and remove announcements together', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbBlockId, { minLength: 2, maxLength: 10 }),
          fc.array(arbBlockId, { minLength: 2, maxLength: 10 }),
          async (addBlockIds, removeBlockIds) => {
            const config: GossipConfig = {
              fanout: 1,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
            };

            const peerProvider = new MockPeerProvider('local-node', ['peer-1']);
            const gossipService = new GossipService(peerProvider, config);

            // Queue add announcements
            for (const blockId of addBlockIds) {
              await gossipService.announceBlock(blockId);
            }

            // Queue remove announcements
            for (const blockId of removeBlockIds) {
              await gossipService.announceRemoval(blockId);
            }

            // Get pending
            const pending = gossipService.getPendingAnnouncements();
            const totalExpected = addBlockIds.length + removeBlockIds.length;

            expect(pending.length).toBe(totalExpected);

            // Count types
            const addCount = pending.filter((a) => a.type === 'add').length;
            const removeCount = pending.filter(
              (a) => a.type === 'remove',
            ).length;

            expect(addCount).toBe(addBlockIds.length);
            expect(removeCount).toBe(removeBlockIds.length);

            // Flush and verify batch contains both types
            await gossipService.flushAnnouncements();

            expect(peerProvider.sentBatches.length).toBe(1);
            expect(peerProvider.sentBatches[0].announcements.length).toBe(
              totalExpected,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Fanout behavior', () => {
    /**
     * **Feature: block-availability-discovery**
     *
     * Announcements should be sent to at most fanout number of peers.
     *
     * **Validates: Requirements 6.3**
     */
    it('should send to at most fanout number of peers', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 10 }),
          async (blockId, fanout, peerCount) => {
            const config: GossipConfig = {
              fanout,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
            };

            const peers = Array.from(
              { length: peerCount },
              (_, i) => `peer-${i}`,
            );
            const peerProvider = new MockPeerProvider('local-node', peers);
            const gossipService = new GossipService(peerProvider, config);

            // Announce a block
            await gossipService.announceBlock(blockId);
            await gossipService.flushAnnouncements();

            // Should have sent to at most fanout peers
            const uniquePeers = new Set(
              peerProvider.sentBatches.map((b) => b.peerId),
            );
            expect(uniquePeers.size).toBeLessThanOrEqual(fanout);

            // If fewer peers than fanout, should send to all
            if (peerCount <= fanout) {
              expect(uniquePeers.size).toBe(peerCount);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Handler notification', () => {
    /**
     * **Feature: block-availability-discovery**
     *
     * All registered handlers should be notified of announcements.
     *
     * **Validates: Requirements 6.2**
     */
    it('should notify all registered handlers', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockAnnouncement,
          fc.integer({ min: 1, max: 5 }),
          async (announcement, handlerCount) => {
            const config: GossipConfig = {
              fanout: 3,
              defaultTtl: 3,
              batchIntervalMs: 1000,
              maxBatchSize: 100,
            };

            const peerProvider = new MockPeerProvider('local-node', ['peer-1']);
            const gossipService = new GossipService(peerProvider, config);

            // Register multiple handlers
            const receivedAnnouncements: BlockAnnouncement[][] = [];
            for (let i = 0; i < handlerCount; i++) {
              const received: BlockAnnouncement[] = [];
              receivedAnnouncements.push(received);
              gossipService.onAnnouncement((a) => received.push(a));
            }

            // Handle an announcement
            await gossipService.handleAnnouncement(announcement);

            // All handlers should have received the announcement
            for (const received of receivedAnnouncements) {
              expect(received.length).toBe(1);
              expect(received[0].blockId).toBe(announcement.blockId);
              expect(received[0].type).toBe(announcement.type);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
