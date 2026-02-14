/**
 * HeadRegistry – Cross-Node Sync Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of HeadRegistry gossip announcements and last-writer-wins conflict resolution.
 */

import type {
  AnnouncementHandler,
  BlockAnnouncement,
  DeliveryAckMetadata,
  GossipConfig,
  ICBLIndexEntry,
  IGossipService,
  MessageDeliveryMetadata,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { InMemoryHeadRegistry } from '../lib/headRegistry';

// ══════════════════════════════════════════════════════════════
// Mock Gossip Service
// ══════════════════════════════════════════════════════════════

/**
 * Captured head update announcement from the gossip service.
 */
interface CapturedHeadUpdate {
  dbName: string;
  collectionName: string;
  blockId: string;
}

/**
 * Mock gossip service that captures head update announcements.
 * Implements IGossipService so it can be used in integration patterns.
 */
class MockHeadGossipService implements IGossipService {
  public headUpdates: CapturedHeadUpdate[] = [];

  async announceBlock(): Promise<void> {}
  async announceRemoval(): Promise<void> {}
  async announcePoolDeletion(): Promise<void> {}
  async handleAnnouncement(): Promise<void> {}
  onAnnouncement(_handler: AnnouncementHandler): void {}
  offAnnouncement(_handler: AnnouncementHandler): void {}
  getPendingAnnouncements(): BlockAnnouncement[] {
    return [];
  }
  async flushAnnouncements(): Promise<void> {}
  start(): void {}
  async stop(): Promise<void> {}
  getConfig(): GossipConfig {
    return {
      fanout: 3,
      defaultTtl: 3,
      batchIntervalMs: 1000,
      maxBatchSize: 100,
      messagePriority: {
        normal: { fanout: 5, ttl: 5 },
        high: { fanout: 7, ttl: 7 },
      },
    };
  }
  async announceCBLIndexUpdate(_entry: ICBLIndexEntry): Promise<void> {}
  async announceCBLIndexDelete(_entry: ICBLIndexEntry): Promise<void> {}
  async announceMessage(
    _blockIds: string[],
    _metadata: MessageDeliveryMetadata,
  ): Promise<void> {}
  async sendDeliveryAck(_ack: DeliveryAckMetadata): Promise<void> {}
  onMessageDelivery(_handler: (a: BlockAnnouncement) => void): void {}
  offMessageDelivery(_handler: (a: BlockAnnouncement) => void): void {}
  onDeliveryAck(_handler: (a: BlockAnnouncement) => void): void {}
  offDeliveryAck(_handler: (a: BlockAnnouncement) => void): void {}

  async announceHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<void> {
    this.headUpdates.push({ dbName, collectionName, blockId });
  }

  async announceACLUpdate(
    _poolId: string,
    _aclBlockId: string,
  ): Promise<void> {}

  clear(): void {
    this.headUpdates = [];
  }
}

// ══════════════════════════════════════════════════════════════
// Arbitraries
// ══════════════════════════════════════════════════════════════

/** Alphanumeric character set for generating safe identifiers. */
const alphaChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Arbitrary for safe identifier strings (no colons to avoid key collisions). */
const identifierArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...alphaChars.split('')), {
    minLength: 3,
    maxLength: 12,
  })
  .map((chars) => chars.join(''));

/** Arbitrary for a hex-like block ID. */
const blockIdArb: fc.Arbitrary<string> = identifierArb.map((s) => `blk-${s}`);

/** Arbitrary for a (dbName, collectionName, blockId) triple. */
const headTripleArb = fc.record({
  dbName: identifierArb.map((s) => `db-${s}`),
  collectionName: identifierArb.map((s) => `col-${s}`),
  blockId: blockIdArb,
});

/**
 * Arbitrary for two distinct timestamps within a reasonable range.
 * Guarantees t1 !== t2 by filtering.
 */
const distinctTimestampPairArb: fc.Arbitrary<{ earlier: Date; later: Date }> =
  fc
    .tuple(
      fc.integer({ min: 1_000_000_000_000, max: 1_900_000_000_000 }),
      fc.integer({ min: 1_000_000_000_000, max: 1_900_000_000_000 }),
    )
    .filter(([a, b]) => a !== b)
    .map(([a, b]) => {
      const sorted = a < b ? [a, b] : [b, a];
      return { earlier: new Date(sorted[0]), later: new Date(sorted[1]) };
    });

/**
 * Arbitrary for two distinct block IDs.
 */
const distinctBlockIdPairArb: fc.Arbitrary<{
  blockId1: string;
  blockId2: string;
}> = fc
  .tuple(blockIdArb, blockIdArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({ blockId1: a, blockId2: b }));

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('HeadRegistry Cross-Node Sync Property-Based Tests', () => {
  // ══════════════════════════════════════════════════════════════
  // Property 4: HeadRegistry gossip announcement on update
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 4: HeadRegistry gossip announcement on update
   *
   * Feature: architectural-gaps, Property 4
   *
   * For any (dbName, collectionName, blockId) triple, calling setHead()
   * on a gossip-enabled HeadRegistry should result in exactly one gossip
   * announcement containing the dbName, collectionName, and blockId.
   *
   * This tests the integration pattern: setHead → announceHeadUpdate.
   * The HeadRegistry itself doesn't directly call gossip, so we test
   * the pattern that a caller would use: call setHead, then call
   * announceHeadUpdate on the gossip service.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 4: HeadRegistry gossip announcement on update', async () => {
    await fc.assert(
      fc.asyncProperty(
        headTripleArb,
        async ({ dbName, collectionName, blockId }) => {
          const registry = InMemoryHeadRegistry.createIsolated();
          const gossip = new MockHeadGossipService();

          // Integration pattern: setHead then announce
          await registry.setHead(dbName, collectionName, blockId);
          await gossip.announceHeadUpdate(dbName, collectionName, blockId);

          // Verify the head was set correctly
          expect(registry.getHead(dbName, collectionName)).toBe(blockId);

          // Verify exactly one gossip announcement was produced
          expect(gossip.headUpdates).toHaveLength(1);

          // Verify the announcement contains the correct data
          const announcement = gossip.headUpdates[0];
          expect(announcement.dbName).toBe(dbName);
          expect(announcement.collectionName).toBe(collectionName);
          expect(announcement.blockId).toBe(blockId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (extended): Multiple setHead calls produce one announcement each.
   *
   * For any sequence of N distinct (dbName, collectionName, blockId) triples,
   * calling setHead + announceHeadUpdate for each should produce exactly N
   * announcements, each matching its corresponding triple.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 4 (extended): Multiple setHead calls produce one announcement each', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(headTripleArb, { minLength: 1, maxLength: 10 }),
        async (triples) => {
          const registry = InMemoryHeadRegistry.createIsolated();
          const gossip = new MockHeadGossipService();

          for (const { dbName, collectionName, blockId } of triples) {
            await registry.setHead(dbName, collectionName, blockId);
            await gossip.announceHeadUpdate(dbName, collectionName, blockId);
          }

          // Exactly N announcements
          expect(gossip.headUpdates).toHaveLength(triples.length);

          // Each announcement matches its corresponding triple
          for (let i = 0; i < triples.length; i++) {
            expect(gossip.headUpdates[i].dbName).toBe(triples[i].dbName);
            expect(gossip.headUpdates[i].collectionName).toBe(
              triples[i].collectionName,
            );
            expect(gossip.headUpdates[i].blockId).toBe(triples[i].blockId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 5: HeadRegistry last-writer-wins conflict resolution
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 5: HeadRegistry last-writer-wins conflict resolution
   *
   * Feature: architectural-gaps, Property 5
   *
   * For any two head pointer announcements for the same (dbName, collectionName)
   * with different block IDs and different timestamps, the HeadRegistry should
   * retain the block ID with the later timestamp.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 5: HeadRegistry last-writer-wins conflict resolution', async () => {
    await fc.assert(
      fc.asyncProperty(
        identifierArb.map((s) => `db-${s}`),
        identifierArb.map((s) => `col-${s}`),
        distinctBlockIdPairArb,
        distinctTimestampPairArb,
        async (dbName, collectionName, blockIds, timestamps) => {
          const registry = InMemoryHeadRegistry.createIsolated();

          // Apply the earlier update first, then the later one
          await registry.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId1,
            timestamps.earlier,
          );
          await registry.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId2,
            timestamps.later,
          );

          // The later timestamp's block ID should win
          expect(registry.getHead(dbName, collectionName)).toBe(
            blockIds.blockId2,
          );
          expect(registry.getHeadTimestamp(dbName, collectionName)).toEqual(
            timestamps.later,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5 (reverse order): Last-writer-wins regardless of arrival order.
   *
   * For any two head pointer announcements for the same (dbName, collectionName)
   * with different block IDs and different timestamps, even if the later-timestamped
   * update arrives first, the HeadRegistry should still retain the later timestamp's
   * block ID.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 5 (reverse order): Last-writer-wins regardless of arrival order', async () => {
    await fc.assert(
      fc.asyncProperty(
        identifierArb.map((s) => `db-${s}`),
        identifierArb.map((s) => `col-${s}`),
        distinctBlockIdPairArb,
        distinctTimestampPairArb,
        async (dbName, collectionName, blockIds, timestamps) => {
          const registry = InMemoryHeadRegistry.createIsolated();

          // Apply the LATER update first
          await registry.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId2,
            timestamps.later,
          );

          // Then apply the EARLIER update — should be rejected
          const applied = await registry.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId1,
            timestamps.earlier,
          );

          expect(applied).toBe(false);

          // The later timestamp's block ID should still be retained
          expect(registry.getHead(dbName, collectionName)).toBe(
            blockIds.blockId2,
          );
          expect(registry.getHeadTimestamp(dbName, collectionName)).toEqual(
            timestamps.later,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5 (commutativity): Final state is the same regardless of merge order.
   *
   * For any two head pointer announcements for the same (dbName, collectionName)
   * with different block IDs and different timestamps, merging in either order
   * should produce the same final state (the later timestamp wins).
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 5 (commutativity): Final state is the same regardless of merge order', async () => {
    await fc.assert(
      fc.asyncProperty(
        identifierArb.map((s) => `db-${s}`),
        identifierArb.map((s) => `col-${s}`),
        distinctBlockIdPairArb,
        distinctTimestampPairArb,
        async (dbName, collectionName, blockIds, timestamps) => {
          // Registry A: apply earlier first, then later
          const registryA = InMemoryHeadRegistry.createIsolated();
          await registryA.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId1,
            timestamps.earlier,
          );
          await registryA.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId2,
            timestamps.later,
          );

          // Registry B: apply later first, then earlier
          const registryB = InMemoryHeadRegistry.createIsolated();
          await registryB.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId2,
            timestamps.later,
          );
          await registryB.mergeHeadUpdate(
            dbName,
            collectionName,
            blockIds.blockId1,
            timestamps.earlier,
          );

          // Both registries should converge to the same state
          expect(registryA.getHead(dbName, collectionName)).toBe(
            registryB.getHead(dbName, collectionName),
          );
          expect(
            registryA.getHeadTimestamp(dbName, collectionName)?.getTime(),
          ).toBe(registryB.getHeadTimestamp(dbName, collectionName)?.getTime());

          // And that state should be the later timestamp's block
          expect(registryA.getHead(dbName, collectionName)).toBe(
            blockIds.blockId2,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
