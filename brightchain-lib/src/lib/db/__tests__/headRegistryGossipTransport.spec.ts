/**
 * HeadRegistryGossipTransport – unit tests.
 *
 * Validates outbound gossip announcements on setHead(), inbound merge on
 * 'head_update' announcements, and the periodic anti-entropy snapshot push.
 *
 * @see Requirements 2.1, 7.1, 7.2
 */

import type {
  AnnouncementHandler,
  BlockAnnouncement,
  BrightTrustProposalMetadata,
  BrightTrustVoteMetadata,
  DeliveryAckMetadata,
  GossipConfig,
  HeadUpdateMetadata,
  IGossipService,
  MessageDeliveryMetadata,
} from '../../interfaces/availability/gossipService';
import type { BlockId } from '../../interfaces/branded/primitives/blockId';
import type { ICBLIndexEntry } from '../../interfaces/storage/cblIndex';
import { HeadRegistryGossipTransport } from '../headRegistryGossipTransport';
import { InMemoryHeadRegistry } from '../inMemoryHeadRegistry';
import { brightDateNow } from '../../utils/brightDateConversions';

// ── Mock gossip service ──────────────────────────────────────────────────────

class MockHeadGossipService implements IGossipService {
  public headUpdates: Array<{
    dbName: string;
    collectionName: string;
    blockId: string;
  }> = [];

  private handlers: AnnouncementHandler[] = [];

  /** Simulate an incoming announcement from a remote peer. */
  simulateAnnouncement(ann: BlockAnnouncement): void {
    for (const h of this.handlers) {
      h(ann);
    }
  }

  onAnnouncement(handler: AnnouncementHandler): void {
    this.handlers.push(handler);
  }

  offAnnouncement(handler: AnnouncementHandler): void {
    const idx = this.handlers.indexOf(handler);
    if (idx !== -1) this.handlers.splice(idx, 1);
  }

  async announceHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<void> {
    this.headUpdates.push({ dbName, collectionName, blockId });
  }

  clearRecorded(): void {
    this.headUpdates = [];
  }

  // ── Unused IGossipService stubs ──────────────────────────────────────────
  async announceBlock(): Promise<void> {}
  async announceRemoval(): Promise<void> {}
  async announcePoolDeletion(): Promise<void> {}
  async handleAnnouncement(): Promise<void> {}
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
  async announceBrightTrustProposal(
    _metadata: BrightTrustProposalMetadata,
  ): Promise<void> {}
  async announceBrightTrustVote(
    _metadata: BrightTrustVoteMetadata,
  ): Promise<void> {}
  onBrightTrustProposal(_handler: (a: BlockAnnouncement) => void): void {}
  offBrightTrustProposal(_handler: (a: BlockAnnouncement) => void): void {}
  onBrightTrustVote(_handler: (a: BlockAnnouncement) => void): void {}
  offBrightTrustVote(_handler: (a: BlockAnnouncement) => void): void {}
  async announceCBLIndexUpdate(_entry: ICBLIndexEntry): Promise<void> {}
  async announceCBLIndexDelete(_entry: ICBLIndexEntry): Promise<void> {}
  async announceACLUpdate(
    _poolId: string,
    _aclBlockId: BlockId,
  ): Promise<void> {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTransport(): {
  registry: InMemoryHeadRegistry;
  gossip: MockHeadGossipService;
  transport: HeadRegistryGossipTransport;
} {
  const registry = InMemoryHeadRegistry.createIsolated();
  const gossip = new MockHeadGossipService();
  const transport = new HeadRegistryGossipTransport(registry, gossip);
  return { registry, gossip, transport };
}

function makeHeadUpdateAnnouncement(
  dbName: string,
  collectionName: string,
  blockId: string,
  timestamp: number = brightDateNow(),
): BlockAnnouncement {
  const headUpdate: HeadUpdateMetadata = { dbName, collectionName };
  return {
    type: 'head_update',
    blockId: blockId as BlockId,
    nodeId: 'remote-node-1',
    timestamp,
    ttl: 3,
    headUpdate,
  };
}

// ── Outbound announcements ────────────────────────────────────────────────────

describe('HeadRegistryGossipTransport – outbound announcements (Req 2.1)', () => {
  it('should announce via gossip after setHead()', async () => {
    const { gossip, transport } = makeTransport();

    await transport.setHead('mydb', 'users', 'abc123');

    expect(gossip.headUpdates).toHaveLength(1);
    expect(gossip.headUpdates[0]).toEqual({
      dbName: 'mydb',
      collectionName: 'users',
      blockId: 'abc123',
    });
  });

  it('should persist the head locally even when gossip throws', async () => {
    const { registry, gossip, transport } = makeTransport();
    gossip.announceHeadUpdate = async () => {
      throw new Error('network error');
    };

    await expect(
      transport.setHead('mydb', 'users', 'abc123'),
    ).resolves.toBeUndefined();

    expect(registry.getHead('mydb', 'users')).toBe('abc123');
  });

  it('should announce multiple distinct setHead() calls', async () => {
    const { gossip, transport } = makeTransport();

    await transport.setHead('db1', 'col1', 'aaa');
    await transport.setHead('db2', 'col2', 'bbb');

    expect(gossip.headUpdates).toHaveLength(2);
    expect(gossip.headUpdates[1].dbName).toBe('db2');
    expect(gossip.headUpdates[1].blockId).toBe('bbb');
  });
});

// ── Inbound merge ─────────────────────────────────────────────────────────────

describe('HeadRegistryGossipTransport – inbound head_update handling (Req 7.1)', () => {
  it('should merge an inbound head_update announcement', async () => {
    const { registry, gossip, transport } = makeTransport();

    // Set local head first with a timestamp that's clearly older
    await registry.setHead('mydb', 'users', 'local-head');
    // Use a remote timestamp that is clearly in the future relative to the local write
    const remoteTimestamp = brightDateNow() + 60_000 / 86400000; // 60 seconds in BrightDate units

    gossip.simulateAnnouncement(
      makeHeadUpdateAnnouncement(
        'mydb',
        'users',
        'remote-head',
        remoteTimestamp,
      ),
    );

    // mergeHeadUpdate is async; wait a tick
    await new Promise((r) => setTimeout(r, 0));

    expect(registry.getHead('mydb', 'users')).toBe('remote-head');

    await transport.stop();
  });

  it('should not overwrite a newer local head with an older remote one', async () => {
    const { registry, gossip, transport } = makeTransport();

    await registry.setHead('mydb', 'users', 'local-head-new');
    // Remote has an older timestamp
    const oldTimestamp = brightDateNow() - 120_000 / 86400000; // 120 seconds ago in BrightDate units

    gossip.simulateAnnouncement(
      makeHeadUpdateAnnouncement('mydb', 'users', 'remote-old', oldTimestamp),
    );

    await new Promise((r) => setTimeout(r, 0));

    // Local (newer) wins
    expect(registry.getHead('mydb', 'users')).toBe('local-head-new');

    await transport.stop();
  });

  it('should ignore announcements with unknown types', async () => {
    const { registry, gossip, transport } = makeTransport();

    gossip.simulateAnnouncement({
      type: 'add',
      blockId: 'some-block' as BlockId,
      nodeId: 'remote-node-1',
      timestamp: brightDateNow(),
      ttl: 3,
    });

    await new Promise((r) => setTimeout(r, 0));

    // Nothing merged
    expect(registry.getAllHeads().size).toBe(0);

    await transport.stop();
  });

  it('should ignore head_update announcements missing headUpdate metadata', async () => {
    const { registry, gossip, transport } = makeTransport();

    gossip.simulateAnnouncement({
      type: 'head_update',
      blockId: 'some-block' as BlockId,
      nodeId: 'remote-node-1',
      timestamp: brightDateNow(),
      ttl: 3,
      // headUpdate deliberately omitted
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(registry.getAllHeads().size).toBe(0);

    await transport.stop();
  });

  it('should unregister the inbound handler after stop()', async () => {
    const { registry, gossip, transport } = makeTransport();

    await transport.stop();

    // Simulate an announcement after stop – should be ignored
    gossip.simulateAnnouncement(
      makeHeadUpdateAnnouncement('mydb', 'users', 'after-stop'),
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(registry.getHead('mydb', 'users')).toBeUndefined();
  });
});

// ── Anti-entropy ──────────────────────────────────────────────────────────────

describe('HeadRegistryGossipTransport – pushSnapshot anti-entropy (Req 7.2)', () => {
  it('should re-announce all known heads via pushSnapshot()', async () => {
    const { registry, gossip, transport } = makeTransport();

    await registry.setHead('db1', 'col1', 'head1');
    await registry.setHead('db2', 'col2', 'head2');

    gossip.clearRecorded();
    await transport.pushSnapshot();

    expect(gossip.headUpdates).toHaveLength(2);
    const announced = gossip.headUpdates.map((u) => u.blockId).sort();
    expect(announced).toEqual(['head1', 'head2'].sort());

    await transport.stop();
  });

  it('should continue snapshot push even when one announcement fails', async () => {
    const { registry, gossip, transport } = makeTransport();

    await registry.setHead('db1', 'col1', 'head1');
    await registry.setHead('db2', 'col2', 'head2');

    let callCount = 0;
    gossip.announceHeadUpdate = async (dbName, collectionName, blockId) => {
      callCount++;
      if (callCount === 1) throw new Error('intermittent failure');
      gossip.headUpdates.push({ dbName, collectionName, blockId });
    };
    gossip.clearRecorded();

    await expect(transport.pushSnapshot()).resolves.toBeUndefined();
    expect(gossip.headUpdates).toHaveLength(1); // second call succeeded

    await transport.stop();
  });

  it('should not start anti-entropy timer when intervalMs is 0', async () => {
    const { transport } = makeTransport();
    transport.start(0);
    // @ts-expect-error – accessing private field for test assertion
    expect(transport.antiEntropyTimer).toBeUndefined();
    await transport.stop();
  });

  it('should clear the anti-entropy timer after stop()', async () => {
    const { transport } = makeTransport();
    transport.start(60_000);
    // @ts-expect-error – accessing private field for test assertion
    expect(transport.antiEntropyTimer).toBeDefined();
    await transport.stop();
    // @ts-expect-error – accessing private field for test assertion
    expect(transport.antiEntropyTimer).toBeUndefined();
  });
});

// ── Delegation ────────────────────────────────────────────────────────────────

describe('HeadRegistryGossipTransport – delegation of non-gossip methods', () => {
  it('should delegate getHead() to the inner registry', async () => {
    const { registry, transport } = makeTransport();
    await registry.setHead('db', 'col', 'block-xyz');
    expect(transport.getHead('db', 'col')).toBe('block-xyz');
    await transport.stop();
  });

  it('should delegate getAllHeads() to the inner registry', async () => {
    const { registry, transport } = makeTransport();
    await registry.setHead('db', 'col1', 'b1');
    await registry.setHead('db', 'col2', 'b2');
    expect(transport.getAllHeads().size).toBe(2);
    await transport.stop();
  });

  it('should delegate removeHead() to the inner registry', async () => {
    const { registry, transport } = makeTransport();
    await registry.setHead('db', 'col', 'block-xyz');
    await transport.removeHead('db', 'col');
    expect(registry.getHead('db', 'col')).toBeUndefined();
    await transport.stop();
  });

  it('should delegate clear() to the inner registry', async () => {
    const { registry, transport } = makeTransport();
    await registry.setHead('db', 'col', 'block-xyz');
    await transport.clear();
    expect(registry.getAllHeads().size).toBe(0);
    await transport.stop();
  });

  it('should delegate exportSnapshot() to the inner registry', async () => {
    const { registry, transport } = makeTransport();
    await registry.setHead('db', 'col', 'block-xyz');
    const snap = transport.exportSnapshot();
    expect(snap.size).toBe(1);
    expect(snap.get('db:col')?.blockId).toBe('block-xyz');
    await transport.stop();
  });

  it('should delegate mergeSnapshot() to the inner registry', async () => {
    const { transport } = makeTransport();
    const snapshot: Array<
      readonly [
        string,
        import('../../interfaces/storage/headRegistryDriver').HeadRecord,
      ]
    > = [
      [
        'db:col',
        { blockId: 'remote-block', timestamp: brightDateNow() },
      ],
    ];
    const result = await transport.mergeSnapshot(snapshot);
    expect(result.merged).toBe(1);
    expect(transport.getHead('db', 'col')).toBe('remote-block');
    await transport.stop();
  });
});
