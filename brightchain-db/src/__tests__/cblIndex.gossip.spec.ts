/**
 * CBLIndex – gossip announcement unit tests.
 *
 * Tests that CBLIndex announces new entries and soft-deletions
 * to peers via the gossip service when one is configured.
 *
 * Validates: Requirements 8.1, 8.6
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
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

/**
 * Mock gossip service that captures CBL index announcements.
 */
class MockCBLGossipService implements IGossipService {
  public cblIndexUpdates: ICBLIndexEntry[] = [];
  public cblIndexDeletes: ICBLIndexEntry[] = [];

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
  async announceMessage(
    _blockIds: string[],
    _metadata: MessageDeliveryMetadata,
  ): Promise<void> {}
  async sendDeliveryAck(_ack: DeliveryAckMetadata): Promise<void> {}
  onMessageDelivery(_handler: (a: BlockAnnouncement) => void): void {}
  offMessageDelivery(_handler: (a: BlockAnnouncement) => void): void {}
  onDeliveryAck(_handler: (a: BlockAnnouncement) => void): void {}
  offDeliveryAck(_handler: (a: BlockAnnouncement) => void): void {}

  async announceCBLIndexUpdate(entry: ICBLIndexEntry): Promise<void> {
    this.cblIndexUpdates.push(entry);
  }

  async announceCBLIndexDelete(entry: ICBLIndexEntry): Promise<void> {
    this.cblIndexDeletes.push(entry);
  }

  async announceHeadUpdate(
    _dbName: string,
    _collectionName: string,
    _blockId: string,
  ): Promise<void> {}

  async announceACLUpdate(
    _poolId: string,
    _aclBlockId: string,
  ): Promise<void> {}

  clear(): void {
    this.cblIndexUpdates = [];
    this.cblIndexDeletes = [];
  }
}

/** Create a fresh db + store + CBLIndex with optional gossip service. */
function makeCBLIndex(gossipService?: IGossipService): {
  index: CBLIndex;
  store: MockBlockStore;
  db: BrightChainDb;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();

  const db = new BrightChainDb(store as never, {
    name: 'testdb',
    headRegistry: registry,
  });

  const index = new CBLIndex(db, store as never, { gossipService });
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: MockBlockStore,
  id1 = 'block-aaa-111',
  id2 = 'block-bbb-222',
): Promise<{ blockId1: string; blockId2: string }> {
  await store.put(id1, new Uint8Array([1, 2, 3]));
  await store.put(id2, new Uint8Array([4, 5, 6]));
  return { blockId1: id1, blockId2: id2 };
}

/** Build a minimal valid entry (without _id and sequenceNumber). */
function makeEntry(
  overrides: Partial<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> = {},
): Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'> {
  return {
    magnetUrl:
      'magnet:?xt=urn:brightchain:cbl&bs=256&b1=block-aaa-111&b2=block-bbb-222',
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date(),
    visibility: CBLVisibility.Private,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Requirement 8.1: Announce new CBL index entries to peers
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – gossip announcements for new entries (Req 8.1)', () => {
  it('should announce new entry via gossip when gossipService is configured', async () => {
    const gossip = new MockCBLGossipService();
    const { index, store } = makeCBLIndex(gossip);
    const { blockId1, blockId2 } = await seedBlocks(store);

    const entry = await index.addEntry(
      makeEntry({ blockId1, blockId2, poolId: 'pool-alpha' }),
    );

    expect(gossip.cblIndexUpdates).toHaveLength(1);
    expect(gossip.cblIndexUpdates[0].magnetUrl).toBe(entry.magnetUrl);
    expect(gossip.cblIndexUpdates[0].poolId).toBe('pool-alpha');
    expect(gossip.cblIndexUpdates[0].sequenceNumber).toBe(entry.sequenceNumber);
  });

  it('should not throw when no gossipService is configured', async () => {
    const { index, store } = makeCBLIndex(); // no gossip
    const { blockId1, blockId2 } = await seedBlocks(store);

    await expect(
      index.addEntry(makeEntry({ blockId1, blockId2 })),
    ).resolves.toBeDefined();
  });

  it('should announce entries added via addVersion', async () => {
    const gossip = new MockCBLGossipService();
    const { index, store } = makeCBLIndex(gossip);
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-001',
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:v1',
        poolId: 'pool-beta',
      }),
    );

    expect(gossip.cblIndexUpdates).toHaveLength(1);
    expect(gossip.cblIndexUpdates[0].fileId).toBe('file-001');
    expect(gossip.cblIndexUpdates[0].versionNumber).toBe(1);
  });

  it('should not fail addEntry if gossip announcement throws', async () => {
    const gossip = new MockCBLGossipService();
    gossip.announceCBLIndexUpdate = async () => {
      throw new Error('gossip network down');
    };
    const { index, store } = makeCBLIndex(gossip);
    const { blockId1, blockId2 } = await seedBlocks(store);

    const entry = await index.addEntry(
      makeEntry({ blockId1, blockId2, poolId: 'pool-gamma' }),
    );

    // Entry should still be created despite gossip failure
    expect(entry._id).toBeDefined();
    expect(entry.sequenceNumber).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 8.6: Announce soft-deletions to peers
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – gossip announcements for soft-deletions (Req 8.6)', () => {
  it('should announce soft-deletion via gossip when gossipService is configured', async () => {
    const gossip = new MockCBLGossipService();
    const { index, store } = makeCBLIndex(gossip);
    const { blockId1, blockId2 } = await seedBlocks(store);

    const entry = await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:del1',
        poolId: 'pool-delta',
      }),
    );

    gossip.clear();
    await index.softDelete('magnet:del1');

    expect(gossip.cblIndexDeletes).toHaveLength(1);
    expect(gossip.cblIndexDeletes[0].magnetUrl).toBe('magnet:del1');
    expect(gossip.cblIndexDeletes[0].deletedAt).toBeDefined();
    expect(gossip.cblIndexDeletes[0]._id).toBe(entry._id);
  });

  it('should not fail softDelete if gossip announcement throws', async () => {
    const gossip = new MockCBLGossipService();
    gossip.announceCBLIndexDelete = async () => {
      throw new Error('gossip network down');
    };
    const { index, store } = makeCBLIndex(gossip);
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:del2' }),
    );

    // softDelete should not throw despite gossip failure
    await expect(index.softDelete('magnet:del2')).resolves.toBeUndefined();
  });

  it('should not announce when no gossipService is configured', async () => {
    const { index, store } = makeCBLIndex(); // no gossip
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:del3' }),
    );

    // Should not throw
    await expect(index.softDelete('magnet:del3')).resolves.toBeUndefined();
  });
});
