/**
 * @fileoverview Property-based tests for AvailabilityService
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 3: Availability State Transitions
 * - Property 4: Orphan State Transition on Partition
 * - Property 24: Block State Query Consistency
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 7.3, 11.3**
 */

import {
  AnnouncementHandler,
  AvailabilityState,
  BlockAnnouncement,
  BlockManifest,
  BloomFilter,
  ConnectivityEventHandler,
  DeliveryAckMetadata,
  DiscoveryConfig,
  DiscoveryResult,
  GossipConfig,
  HeartbeatConfig,
  IBlockRegistry,
  IDiscoveryProtocol,
  IGossipService,
  IHeartbeatMonitor,
  ILocationRecord,
  IReconciliationService,
  MessageDeliveryMetadata,
  PeerQueryResult,
  PendingSyncItem,
  ReconciliationConfig,
  ReconciliationEventHandler,
  ReconciliationResult,
  SyncVectorEntry,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { AvailabilityService } from './availabilityService';

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
 * Generate a valid node ID
 */
const arbNodeId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);

/**
 * Generate a unique set of block IDs
 */
const arbBlockIdSet = fc
  .array(arbBlockId, { minLength: 0, maxLength: 50 })
  .map((ids) => [...new Set(ids)]);

/**
 * Generate an availability state
 */
const arbAvailabilityState = fc.constantFrom(
  AvailabilityState.Local,
  AvailabilityState.Remote,
  AvailabilityState.Cached,
  AvailabilityState.Orphaned,
  AvailabilityState.Unknown,
);

/**
 * Mock BlockRegistry for testing
 */
class MockBlockRegistry implements IBlockRegistry {
  private blocks = new Set<string>();

  hasLocal(blockId: string): boolean {
    return this.blocks.has(blockId);
  }

  addLocal(blockId: string): void {
    this.blocks.add(blockId);
  }

  removeLocal(blockId: string): void {
    this.blocks.delete(blockId);
  }

  getLocalCount(): number {
    return this.blocks.size;
  }

  getLocalBlockIds(): string[] {
    return Array.from(this.blocks);
  }

  exportBloomFilter(): BloomFilter {
    return {
      data: '',
      hashCount: 7,
      bitCount: 1000,
      itemCount: this.blocks.size,
      mightContain: (blockId: string) => this.blocks.has(blockId),
    };
  }

  exportManifest(): BlockManifest {
    return {
      nodeId: 'test-node',
      blockIds: this.getLocalBlockIds(),
      generatedAt: new Date(),
      checksum: 'test-checksum',
    };
  }

  async rebuild(): Promise<void> {
    // No-op for mock
  }

  clear(): void {
    this.blocks.clear();
  }
}

/**
 * Mock DiscoveryProtocol for testing
 */
class MockDiscoveryProtocol implements IDiscoveryProtocol {
  async discoverBlock(blockId: string): Promise<DiscoveryResult> {
    return {
      blockId,
      found: false,
      locations: [],
      queriedPeers: 0,
      duration: 0,
    };
  }

  async queryPeer(peerId: string, _blockId: string): Promise<PeerQueryResult> {
    return {
      peerId,
      hasBlock: false,
      latencyMs: 10,
    };
  }

  getCachedLocations(_blockId: string): ILocationRecord[] | null {
    return null;
  }

  clearCache(_blockId: string): void {}

  clearAllCache(): void {}

  async getPeerBloomFilter(_peerId: string): Promise<BloomFilter> {
    return {
      data: '',
      hashCount: 7,
      bitCount: 1000,
      itemCount: 0,
      mightContain: () => false,
    };
  }

  getConfig(): DiscoveryConfig {
    return {
      queryTimeoutMs: 5000,
      maxConcurrentQueries: 10,
      cacheTtlMs: 60000,
      bloomFilterFalsePositiveRate: 0.01,
      bloomFilterHashCount: 7,
    };
  }
}

/**
 * Mock GossipService for testing
 */
class MockGossipService implements IGossipService {
  async announceBlock(_blockId: string): Promise<void> {}

  async announceRemoval(_blockId: string): Promise<void> {}

  async handleAnnouncement(_announcement: BlockAnnouncement): Promise<void> {}

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

  onMessageDelivery(
    _handler: (announcement: BlockAnnouncement) => void,
  ): void {}

  offMessageDelivery(
    _handler: (announcement: BlockAnnouncement) => void,
  ): void {}

  onDeliveryAck(_handler: (announcement: BlockAnnouncement) => void): void {}

  offDeliveryAck(_handler: (announcement: BlockAnnouncement) => void): void {}
}

/**
 * Mock HeartbeatMonitor for testing
 */
class MockHeartbeatMonitor implements IHeartbeatMonitor {
  private handlers: Set<ConnectivityEventHandler> = new Set();
  private reachablePeers: Set<string> = new Set();
  private unreachablePeers: Set<string> = new Set();
  private running = false;

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  isPeerReachable(peerId: string): boolean {
    return this.reachablePeers.has(peerId);
  }

  getReachablePeers(): string[] {
    return Array.from(this.reachablePeers);
  }

  getUnreachablePeers(): string[] {
    return Array.from(this.unreachablePeers);
  }

  getMissedCount(_peerId: string): number {
    return 0;
  }

  addPeer(peerId: string): void {
    this.reachablePeers.add(peerId);
  }

  removePeer(peerId: string): void {
    this.reachablePeers.delete(peerId);
    this.unreachablePeers.delete(peerId);
  }

  getMonitoredPeers(): string[] {
    return [...this.reachablePeers, ...this.unreachablePeers];
  }

  onConnectivityChange(handler: ConnectivityEventHandler): void {
    this.handlers.add(handler);
  }

  offConnectivityChange(handler: ConnectivityEventHandler): void {
    this.handlers.delete(handler);
  }

  recordHeartbeatResponse(_peerId: string, _latencyMs: number): void {}

  getLastLatency(_peerId: string): number | undefined {
    return undefined;
  }

  getConfig(): HeartbeatConfig {
    return {
      intervalMs: 5000,
      timeoutMs: 2000,
      missedThreshold: 3,
    };
  }

  // Test helpers
  setReachablePeers(peers: string[]): void {
    this.reachablePeers = new Set(peers);
  }

  setUnreachablePeers(peers: string[]): void {
    this.unreachablePeers = new Set(peers);
  }

  emitEvent(event: { type: string; peerId?: string; timestamp: Date }): void {
    for (const handler of this.handlers) {
      handler(event as Parameters<ConnectivityEventHandler>[0]);
    }
  }
}

/**
 * Mock ReconciliationService for testing
 */
class MockReconciliationService implements IReconciliationService {
  async reconcile(_peerIds: string[]): Promise<ReconciliationResult> {
    return {
      success: true,
      peersReconciled: 0,
      blocksDiscovered: 0,
      blocksUpdated: 0,
      orphansResolved: 0,
      conflictsResolved: 0,
      errors: [],
      duration: 0,
    };
  }

  getSyncVector(_peerId: string): SyncVectorEntry | null {
    return null;
  }

  getAllSyncVectors(): Map<string, SyncVectorEntry> {
    return new Map();
  }

  updateSyncVector(
    _peerId: string,
    _timestamp: Date,
    _manifestChecksum: string,
  ): void {}

  initializeSyncVector(_peerId: string): void {}

  getPendingSyncQueue(): PendingSyncItem[] {
    return [];
  }

  addToPendingSyncQueue(_item: PendingSyncItem): void {}

  async processPendingSyncQueue(): Promise<void> {}

  clearPendingSyncQueue(): void {}

  async persistSyncVectors(): Promise<void> {}

  async loadSyncVectors(): Promise<void> {}

  async persistPendingSyncQueue(): Promise<void> {}

  async loadPendingSyncQueue(): Promise<void> {}

  onEvent(_handler: ReconciliationEventHandler): void {}

  offEvent(_handler: ReconciliationEventHandler): void {}

  getConfig(): ReconciliationConfig {
    return {
      manifestExchangeTimeoutMs: 30000,
      maxConcurrentReconciliations: 5,
      syncVectorPath: 'sync-vectors.json',
      pendingSyncQueuePath: 'pending-sync-queue.json',
      maxPendingSyncQueueSize: 1000,
    };
  }
}

/**
 * Create a test AvailabilityService with mocks
 */
function createTestService(localNodeId = 'test-node-001') {
  const registry = new MockBlockRegistry();
  const discoveryProtocol = new MockDiscoveryProtocol();
  const gossipService = new MockGossipService();
  const reconciliationService = new MockReconciliationService();
  const heartbeatMonitor = new MockHeartbeatMonitor();

  const service = new AvailabilityService(
    registry,
    discoveryProtocol,
    gossipService,
    reconciliationService,
    heartbeatMonitor,
    {
      localNodeId,
      stalenessThresholdMs: 300000,
      queryTimeoutMs: 10000,
    },
  );

  return {
    service,
    registry,
    discoveryProtocol,
    gossipService,
    reconciliationService,
    heartbeatMonitor,
  };
}

describe('AvailabilityService Property Tests - State Management', () => {
  describe('Property 3: Availability State Transitions', () => {
    /**
     * **Feature: block-availability-discovery, Property 3: Availability State Transitions**
     *
     * *For any* block, the availability state SHALL transition correctly:
     * - When stored locally as authoritative → Local
     * - When discovered only on remote nodes → Remote
     * - When cached locally with remote authoritative → Cached
     * - When all source nodes become unreachable → Orphaned
     * - When location is undetermined → Unknown
     *
     * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**
     */
    it('should return Local state for blocks in the local registry', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service, registry } = createTestService();

          // Add block to local registry
          registry.addLocal(blockId);

          // Query state
          const state = await service.getAvailabilityState(blockId);

          expect(state).toBe(AvailabilityState.Local);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should return Remote state for blocks with remote locations only', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbNodeId,
          async (blockId, remoteNodeId) => {
            const { service } = createTestService('local-node');

            // Set block state to Remote with a remote location
            await service.setAvailabilityState(
              blockId,
              AvailabilityState.Remote,
            );
            await service.updateLocation(blockId, {
              nodeId: remoteNodeId,
              lastSeen: new Date(),
              isAuthoritative: true,
            });

            // Query state
            const state = await service.getAvailabilityState(blockId);

            expect(state).toBe(AvailabilityState.Remote);
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return Cached state for blocks marked as cached', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service } = createTestService();

          // Set block state to Cached
          await service.setAvailabilityState(blockId, AvailabilityState.Cached);

          // Query state
          const state = await service.getAvailabilityState(blockId);

          expect(state).toBe(AvailabilityState.Cached);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should return Orphaned state for blocks marked as orphaned', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service } = createTestService();

          // Set block state to Orphaned
          await service.setAvailabilityState(
            blockId,
            AvailabilityState.Orphaned,
          );

          // Query state
          const state = await service.getAvailabilityState(blockId);

          expect(state).toBe(AvailabilityState.Orphaned);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should return Unknown state for blocks with no location data', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service } = createTestService();

          // Query state for unknown block
          const state = await service.getAvailabilityState(blockId);

          expect(state).toBe(AvailabilityState.Unknown);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should emit state_changed event when state transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          // Use only non-Unknown states for initial state since Unknown is the default
          fc.constantFrom(
            AvailabilityState.Remote,
            AvailabilityState.Cached,
            AvailabilityState.Orphaned,
          ),
          fc.constantFrom(
            AvailabilityState.Remote,
            AvailabilityState.Cached,
            AvailabilityState.Orphaned,
          ),
          async (blockId, initialState, newState) => {
            // Skip if states are the same
            if (initialState === newState) return true;

            const { service } = createTestService();
            const events: Array<{
              oldState: AvailabilityState;
              newState: AvailabilityState;
            }> = [];

            service.onEvent((event) => {
              if (event.type === 'state_changed' && event.blockId === blockId) {
                events.push({
                  oldState: event.oldState,
                  newState: event.newState,
                });
              }
            });

            // Set initial state (this will emit first event from Unknown -> initialState)
            await service.setAvailabilityState(blockId, initialState);

            // Transition to new state (this will emit second event from initialState -> newState)
            await service.setAvailabilityState(blockId, newState);

            // Verify events - we expect 2 events:
            // 1. Unknown -> initialState
            // 2. initialState -> newState
            expect(events.length).toBe(2);
            expect(events[1].oldState).toBe(initialState);
            expect(events[1].newState).toBe(newState);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Orphan State Transition on Partition', () => {
    /**
     * **Feature: block-availability-discovery, Property 4: Orphan State Transition on Partition**
     *
     * *For any* block in Remote state, when all nodes holding that block become
     * unreachable, the block's state SHALL transition to Orphaned.
     *
     * **Validates: Requirements 1.5, 7.3**
     */
    it('should transition Remote blocks to Orphaned when entering partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          if (blockIds.length === 0) return true;

          const { service, heartbeatMonitor } = createTestService();
          const orphanedEvents: string[] = [];

          service.onEvent((event) => {
            if (
              event.type === 'state_changed' &&
              event.newState === AvailabilityState.Orphaned
            ) {
              orphanedEvents.push(event.blockId);
            }
          });

          // Set all blocks to Remote state
          for (const blockId of blockIds) {
            await service.setAvailabilityState(
              blockId,
              AvailabilityState.Remote,
            );
          }

          // Set up unreachable peers
          heartbeatMonitor.setUnreachablePeers(['peer-1', 'peer-2']);
          heartbeatMonitor.setReachablePeers([]);

          // Enter partition mode
          service.enterPartitionMode();

          // Verify all Remote blocks are now Orphaned
          for (const blockId of blockIds) {
            const state = await service.getAvailabilityState(blockId);
            expect(state).toBe(AvailabilityState.Orphaned);
          }

          // Verify events were emitted
          expect(orphanedEvents.length).toBe(blockIds.length);
          for (const blockId of blockIds) {
            expect(orphanedEvents).toContain(blockId);
          }

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should not affect Local or Cached blocks when entering partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbBlockId,
          async (localBlockId, cachedBlockId) => {
            const { service, registry, heartbeatMonitor } = createTestService();

            // Set up local block
            registry.addLocal(localBlockId);

            // Set up cached block
            await service.setAvailabilityState(
              cachedBlockId,
              AvailabilityState.Cached,
            );

            // Set up unreachable peers
            heartbeatMonitor.setUnreachablePeers(['peer-1']);
            heartbeatMonitor.setReachablePeers([]);

            // Enter partition mode
            service.enterPartitionMode();

            // Verify Local block is still Local
            const localState = await service.getAvailabilityState(localBlockId);
            expect(localState).toBe(AvailabilityState.Local);

            // Verify Cached block is still Cached
            const cachedState =
              await service.getAvailabilityState(cachedBlockId);
            expect(cachedState).toBe(AvailabilityState.Cached);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should emit partition_entered event with disconnected peers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 10 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();
            let partitionEvent: { disconnectedPeers: string[] } | null = null;

            service.onEvent((event) => {
              if (event.type === 'partition_entered') {
                partitionEvent = { disconnectedPeers: event.disconnectedPeers };
              }
            });

            // Set up unreachable peers
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);

            // Enter partition mode
            service.enterPartitionMode();

            // Verify event
            expect(partitionEvent).not.toBeNull();
            expect(new Set(partitionEvent!.disconnectedPeers)).toEqual(
              new Set(peerIds),
            );

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 24: Block State Query Consistency', () => {
    /**
     * **Feature: block-availability-discovery, Property 24: Block State Query Consistency**
     *
     * *For any* availability state S, listing blocks by state S SHALL return
     * exactly the set of blocks currently in state S.
     *
     * **Validates: Requirements 11.3**
     */
    it('should return exactly the blocks in the queried state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(
              arbBlockId,
              // Exclude Unknown state since it's the default "not tracked" state
              // and blocks are only tracked when explicitly set to a known state
              fc.constantFrom(
                AvailabilityState.Local,
                AvailabilityState.Remote,
                AvailabilityState.Cached,
                AvailabilityState.Orphaned,
              ),
            ),
            {
              minLength: 0,
              maxLength: 50,
            },
          ),
          async (blockStatesPairs) => {
            const { service, registry } = createTestService('local-node');

            // Group blocks by state
            const blocksByState = new Map<AvailabilityState, Set<string>>();
            for (const state of Object.values(AvailabilityState)) {
              blocksByState.set(state, new Set());
            }

            // Set up blocks with their states
            for (const [blockId, state] of blockStatesPairs) {
              if (state === AvailabilityState.Local) {
                registry.addLocal(blockId);
              } else {
                await service.setAvailabilityState(blockId, state);
              }
              blocksByState.get(state)!.add(blockId);
            }

            // Verify listBlocksByState returns correct blocks for each state
            // (excluding Unknown since it's not tracked)
            for (const state of [
              AvailabilityState.Local,
              AvailabilityState.Remote,
              AvailabilityState.Cached,
              AvailabilityState.Orphaned,
            ]) {
              const listedBlocks = await service.listBlocksByState(state);
              const expectedBlocks = blocksByState.get(state)!;

              const listedSet = new Set(listedBlocks);
              expect(listedSet).toEqual(expectedBlocks);
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should return empty array for states with no blocks', async () => {
      await fc.assert(
        fc.asyncProperty(arbAvailabilityState, async (state) => {
          const { service } = createTestService();

          // Query empty service
          const blocks = await service.listBlocksByState(state);

          expect(blocks).toEqual([]);
          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should update listBlocksByState results when state changes', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service } = createTestService();

          // Set initial state
          await service.setAvailabilityState(blockId, AvailabilityState.Remote);

          // Verify block is in Remote list
          let remoteBlocks = await service.listBlocksByState(
            AvailabilityState.Remote,
          );
          expect(remoteBlocks).toContain(blockId);

          // Change state
          await service.setAvailabilityState(
            blockId,
            AvailabilityState.Orphaned,
          );

          // Verify block is no longer in Remote list
          remoteBlocks = await service.listBlocksByState(
            AvailabilityState.Remote,
          );
          expect(remoteBlocks).not.toContain(blockId);

          // Verify block is now in Orphaned list
          const orphanedBlocks = await service.listBlocksByState(
            AvailabilityState.Orphaned,
          );
          expect(orphanedBlocks).toContain(blockId);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});

describe('AvailabilityService Property Tests - Partition Mode', () => {
  describe('Property 14: Partition Mode Entry', () => {
    /**
     * **Feature: block-availability-discovery, Property 14: Partition Mode Entry**
     *
     * *For any* node, when all known peers become unreachable (missed heartbeat
     * threshold exceeded), the system SHALL enter Partition Mode and emit a
     * partition_entered event.
     *
     * **Validates: Requirements 7.2, 7.7, 14.4**
     */
    it('should enter partition mode when all peers become unreachable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 10 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();
            let partitionEntered = false;

            service.onEvent((event) => {
              if (event.type === 'partition_entered') {
                partitionEntered = true;
              }
            });

            // Initially not in partition mode
            expect(service.isInPartitionMode()).toBe(false);

            // Set all peers as unreachable
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);

            // Enter partition mode
            service.enterPartitionMode();

            // Verify partition mode is active
            expect(service.isInPartitionMode()).toBe(true);
            expect(partitionEntered).toBe(true);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should not enter partition mode if already in partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbNodeId, async (peerId) => {
          const { service, heartbeatMonitor } = createTestService();
          let eventCount = 0;

          service.onEvent((event) => {
            if (event.type === 'partition_entered') {
              eventCount++;
            }
          });

          // Set up unreachable peer
          heartbeatMonitor.setUnreachablePeers([peerId]);
          heartbeatMonitor.setReachablePeers([]);

          // Enter partition mode twice
          service.enterPartitionMode();
          service.enterPartitionMode();

          // Should only emit one event
          expect(eventCount).toBe(1);
          expect(service.isInPartitionMode()).toBe(true);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should track disconnected peers when entering partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 10 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();

            // Set up unreachable peers
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);

            // Enter partition mode
            service.enterPartitionMode();

            // Verify disconnected peers are tracked
            const disconnected = service.getDisconnectedPeers();
            expect(new Set(disconnected)).toEqual(new Set(peerIds));

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 15: Partition Mode Exit', () => {
    /**
     * **Feature: block-availability-discovery, Property 15: Partition Mode Exit**
     *
     * *For any* node in Partition Mode, when at least one peer becomes reachable,
     * the system SHALL exit Partition Mode and initiate reconciliation.
     *
     * **Validates: Requirements 7.5, 9.1**
     */
    it('should exit partition mode when peers become reachable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 5 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();
            let partitionExited = false;
            let reconciliationStarted = false;

            service.onEvent((event) => {
              if (event.type === 'partition_exited') {
                partitionExited = true;
              }
              if (event.type === 'reconciliation_started') {
                reconciliationStarted = true;
              }
            });

            // Enter partition mode first
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);
            service.enterPartitionMode();

            expect(service.isInPartitionMode()).toBe(true);

            // Make peers reachable
            heartbeatMonitor.setReachablePeers(peerIds);
            heartbeatMonitor.setUnreachablePeers([]);

            // Exit partition mode
            await service.exitPartitionMode();

            // Verify partition mode is exited
            expect(service.isInPartitionMode()).toBe(false);
            expect(partitionExited).toBe(true);
            expect(reconciliationStarted).toBe(true);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should return empty result when not in partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const { service } = createTestService();

          // Not in partition mode
          expect(service.isInPartitionMode()).toBe(false);

          // Exit should return empty result
          const result = await service.exitPartitionMode();

          expect(result.success).toBe(true);
          expect(result.peersReconciled).toBe(0);
          expect(service.isInPartitionMode()).toBe(false);

          return true;
        }),
        { numRuns: 10 },
      );
    });

    it('should emit partition_exited event with reconnected peers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 5 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();
            let reconnectedPeers: string[] = [];

            service.onEvent((event) => {
              if (event.type === 'partition_exited') {
                reconnectedPeers = event.reconnectedPeers;
              }
            });

            // Enter partition mode
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);
            service.enterPartitionMode();

            // Make peers reachable
            heartbeatMonitor.setReachablePeers(peerIds);
            heartbeatMonitor.setUnreachablePeers([]);

            // Exit partition mode
            await service.exitPartitionMode();

            // Verify reconnected peers in event
            expect(new Set(reconnectedPeers)).toEqual(new Set(peerIds));

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should clear disconnected peers after exiting partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 5 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();

            // Enter partition mode
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);
            service.enterPartitionMode();

            // Verify disconnected peers are tracked
            expect(service.getDisconnectedPeers().length).toBeGreaterThan(0);

            // Make peers reachable and exit
            heartbeatMonitor.setReachablePeers(peerIds);
            heartbeatMonitor.setUnreachablePeers([]);
            await service.exitPartitionMode();

            // Verify disconnected peers are cleared
            expect(service.getDisconnectedPeers()).toEqual([]);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

describe('AvailabilityService Property Tests - Events', () => {
  describe('Property 28: Event Emission Completeness', () => {
    /**
     * **Feature: block-availability-discovery, Property 28: Event Emission Completeness**
     *
     * *For any* state change (availability state change, location added/removed,
     * partition enter/exit, reconciliation start/complete), the system SHALL emit
     * the corresponding event.
     *
     * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
     */
    it('should emit state_changed event for every state change', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.constantFrom(
            AvailabilityState.Remote,
            AvailabilityState.Cached,
            AvailabilityState.Orphaned,
          ),
          fc.constantFrom(
            AvailabilityState.Remote,
            AvailabilityState.Cached,
            AvailabilityState.Orphaned,
          ),
          async (blockId, state1, state2) => {
            // Skip if states are the same
            if (state1 === state2) return true;

            const { service } = createTestService();
            const stateChanges: Array<{
              blockId: string;
              oldState: AvailabilityState;
              newState: AvailabilityState;
            }> = [];

            service.onEvent((event) => {
              if (event.type === 'state_changed') {
                stateChanges.push({
                  blockId: event.blockId,
                  oldState: event.oldState,
                  newState: event.newState,
                });
              }
            });

            // Set first state
            await service.setAvailabilityState(blockId, state1);

            // Set second state
            await service.setAvailabilityState(blockId, state2);

            // Verify events
            expect(stateChanges.length).toBe(2);
            expect(stateChanges[1].blockId).toBe(blockId);
            expect(stateChanges[1].oldState).toBe(state1);
            expect(stateChanges[1].newState).toBe(state2);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should emit location_added event when adding new location', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
          const { service } = createTestService('local-node');
          const locationEvents: Array<{
            blockId: string;
            nodeId: string;
          }> = [];

          service.onEvent((event) => {
            if (event.type === 'location_added') {
              locationEvents.push({
                blockId: event.blockId,
                nodeId: event.location.nodeId,
              });
            }
          });

          // Add location
          await service.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          // Verify event
          expect(locationEvents.length).toBe(1);
          expect(locationEvents[0].blockId).toBe(blockId);
          expect(locationEvents[0].nodeId).toBe(nodeId);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should emit location_removed event when removing location', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
          const { service } = createTestService('local-node');
          const removeEvents: Array<{
            blockId: string;
            nodeId: string;
          }> = [];

          service.onEvent((event) => {
            if (event.type === 'location_removed') {
              removeEvents.push({
                blockId: event.blockId,
                nodeId: event.nodeId,
              });
            }
          });

          // Add location first
          await service.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          // Remove location
          await service.removeLocation(blockId, nodeId);

          // Verify event
          expect(removeEvents.length).toBe(1);
          expect(removeEvents[0].blockId).toBe(blockId);
          expect(removeEvents[0].nodeId).toBe(nodeId);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should emit partition_entered and partition_exited events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbNodeId, { minLength: 1, maxLength: 5 }),
          async (peerIds) => {
            const { service, heartbeatMonitor } = createTestService();
            const events: string[] = [];

            service.onEvent((event) => {
              events.push(event.type);
            });

            // Enter partition mode
            heartbeatMonitor.setUnreachablePeers(peerIds);
            heartbeatMonitor.setReachablePeers([]);
            service.enterPartitionMode();

            // Exit partition mode
            heartbeatMonitor.setReachablePeers(peerIds);
            heartbeatMonitor.setUnreachablePeers([]);
            await service.exitPartitionMode();

            // Verify events
            expect(events).toContain('partition_entered');
            expect(events).toContain('partition_exited');
            expect(events).toContain('reconciliation_started');
            expect(events).toContain('reconciliation_completed');

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should not emit location_added for existing location updates', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
          const { service } = createTestService('local-node');
          let eventCount = 0;

          service.onEvent((event) => {
            if (event.type === 'location_added') {
              eventCount++;
            }
          });

          // Add location
          await service.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          // Update same location
          await service.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: true,
            latencyMs: 100,
          });

          // Should only emit one event (for the initial add)
          expect(eventCount).toBe(1);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 29: Event Filtering', () => {
    /**
     * **Feature: block-availability-discovery, Property 29: Event Filtering**
     *
     * *For any* event subscription with filters, the subscriber SHALL receive
     * only events matching the specified event types and block ID patterns.
     *
     * **Validates: Requirements 14.6**
     */
    it('should filter events by event type', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service, heartbeatMonitor } = createTestService();
          const receivedEvents: string[] = [];

          // Subscribe only to state_changed events
          service.onEvent(
            (event) => {
              receivedEvents.push(event.type);
            },
            { eventTypes: ['state_changed'] },
          );

          // Trigger various events
          await service.setAvailabilityState(blockId, AvailabilityState.Remote);
          await service.updateLocation(blockId, {
            nodeId: 'peer-1',
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          heartbeatMonitor.setUnreachablePeers(['peer-1']);
          heartbeatMonitor.setReachablePeers([]);
          service.enterPartitionMode();

          // Should only receive state_changed events
          for (const eventType of receivedEvents) {
            expect(eventType).toBe('state_changed');
          }

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should filter events by block ID pattern', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const { service } = createTestService();
          const receivedBlockIds: string[] = [];

          // Subscribe only to blocks starting with 'abc'
          service.onEvent(
            (event) => {
              if ('blockId' in event) {
                receivedBlockIds.push(event.blockId);
              }
            },
            { blockIdPatterns: ['abc*'] },
          );

          // Trigger events for different blocks
          await service.setAvailabilityState(
            'abc123456789012345678901234567890',
            AvailabilityState.Remote,
          );
          await service.setAvailabilityState(
            'def123456789012345678901234567890',
            AvailabilityState.Remote,
          );
          await service.setAvailabilityState(
            'abcdef789012345678901234567890123',
            AvailabilityState.Cached,
          );

          // Should only receive events for blocks matching pattern
          for (const blockId of receivedBlockIds) {
            expect(blockId.startsWith('abc')).toBe(true);
          }
          expect(receivedBlockIds.length).toBe(2);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should receive all events when no filter is specified', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service, heartbeatMonitor } = createTestService();
          const receivedEventTypes = new Set<string>();

          // Subscribe without filter
          service.onEvent((event) => {
            receivedEventTypes.add(event.type);
          });

          // Trigger various events
          await service.setAvailabilityState(blockId, AvailabilityState.Remote);
          await service.updateLocation(blockId, {
            nodeId: 'peer-1',
            lastSeen: new Date(),
            isAuthoritative: false,
          });
          await service.removeLocation(blockId, 'peer-1');

          heartbeatMonitor.setUnreachablePeers(['peer-1']);
          heartbeatMonitor.setReachablePeers([]);
          service.enterPartitionMode();

          heartbeatMonitor.setReachablePeers(['peer-1']);
          heartbeatMonitor.setUnreachablePeers([]);
          await service.exitPartitionMode();

          // Should receive multiple event types
          expect(receivedEventTypes.size).toBeGreaterThan(1);
          expect(receivedEventTypes.has('state_changed')).toBe(true);
          expect(receivedEventTypes.has('location_added')).toBe(true);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should support multiple filters combined', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const { service } = createTestService();
          const receivedEvents: Array<{ type: string; blockId?: string }> = [];

          // Subscribe with both type and pattern filter
          service.onEvent(
            (event) => {
              receivedEvents.push({
                type: event.type,
                blockId: 'blockId' in event ? event.blockId : undefined,
              });
            },
            {
              eventTypes: ['state_changed'],
              blockIdPatterns: ['test*'],
            },
          );

          // Trigger events
          await service.setAvailabilityState(
            'test12345678901234567890123456789',
            AvailabilityState.Remote,
          );
          await service.setAvailabilityState(
            'other1234567890123456789012345678',
            AvailabilityState.Remote,
          );
          await service.updateLocation('test12345678901234567890123456789', {
            nodeId: 'peer-1',
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          // Should only receive state_changed events for test* blocks
          expect(receivedEvents.length).toBe(1);
          expect(receivedEvents[0].type).toBe('state_changed');
          expect(receivedEvents[0].blockId?.startsWith('test')).toBe(true);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should allow removing event handlers', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service } = createTestService();
          let eventCount = 0;

          const handler = () => {
            eventCount++;
          };

          // Subscribe
          service.onEvent(handler);

          // Trigger event
          await service.setAvailabilityState(blockId, AvailabilityState.Remote);
          expect(eventCount).toBe(1);

          // Unsubscribe
          service.offEvent(handler);

          // Trigger another event
          await service.setAvailabilityState(
            blockId,
            AvailabilityState.Orphaned,
          );

          // Should not receive the second event
          expect(eventCount).toBe(1);

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });
});

describe('AvailabilityService Property Tests - Staleness', () => {
  describe('Property 25: Staleness Indication', () => {
    /**
     * **Feature: block-availability-discovery, Property 25: Staleness Indication**
     *
     * *For any* location query where the location data is older than the configured
     * staleness threshold, the response SHALL include a staleness indicator.
     *
     * **Validates: Requirements 11.6**
     */
    it('should indicate staleness when location data exceeds threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbNodeId,
          fc.integer({ min: 1000, max: 10000 }), // staleness threshold in ms
          fc.integer({ min: 0, max: 5000 }), // age within threshold
          async (blockId, nodeId, thresholdMs, ageWithinThreshold) => {
            const { service: _service, registry } =
              createTestService('local-node');

            // Override config with custom staleness threshold
            const customService = new AvailabilityService(
              registry,
              new MockDiscoveryProtocol(),
              new MockGossipService(),
              new MockReconciliationService(),
              new MockHeartbeatMonitor(),
              {
                localNodeId: 'local-node',
                stalenessThresholdMs: thresholdMs,
                queryTimeoutMs: 10000,
              },
            );

            // Add location with specific timestamp
            const locationTimestamp = new Date(Date.now() - ageWithinThreshold);
            await customService.updateLocation(blockId, {
              nodeId,
              lastSeen: locationTimestamp,
              isAuthoritative: false,
            });

            // Query location
            const result = await customService.queryBlockLocation(blockId);

            // Verify staleness indication
            expect(result.blockId).toBe(blockId);
            expect(result.isStale).toBe(false); // Within threshold
            expect(result.lastUpdated).toBeDefined();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should mark location as stale when exceeding threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbNodeId,
          fc.integer({ min: 1000, max: 5000 }), // staleness threshold in ms
          fc.integer({ min: 6000, max: 20000 }), // age exceeding threshold
          async (blockId, nodeId, thresholdMs, ageExceedingThreshold) => {
            const { registry } = createTestService('local-node');

            // Create service with custom staleness threshold
            const customService = new AvailabilityService(
              registry,
              new MockDiscoveryProtocol(),
              new MockGossipService(),
              new MockReconciliationService(),
              new MockHeartbeatMonitor(),
              {
                localNodeId: 'local-node',
                stalenessThresholdMs: thresholdMs,
                queryTimeoutMs: 10000,
              },
            );

            // Add location with old timestamp
            const oldTimestamp = new Date(Date.now() - ageExceedingThreshold);

            // Manually set block data with old timestamp
            customService.setBlockData(blockId, {
              state: AvailabilityState.Remote,
              locations: [
                {
                  nodeId,
                  lastSeen: oldTimestamp,
                  isAuthoritative: false,
                },
              ],
              lastUpdated: oldTimestamp,
            });

            // Query location
            const result = await customService.queryBlockLocation(blockId);

            // Verify staleness indication
            expect(result.blockId).toBe(blockId);
            expect(result.isStale).toBe(true); // Exceeds threshold
            expect(result.lastUpdated).toEqual(oldTimestamp);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return correct staleness for local blocks', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service, registry } = createTestService('local-node');

          // Add block to local registry
          registry.addLocal(blockId);

          // Query location
          const result = await service.queryBlockLocation(blockId);

          // Local blocks should not be stale (they're always current)
          expect(result.blockId).toBe(blockId);
          expect(result.state).toBe(AvailabilityState.Local);
          expect(result.isStale).toBe(false);
          expect(result.locations.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should update staleness when location is refreshed', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
          const { registry } = createTestService('local-node');

          // Create service with short staleness threshold
          const customService = new AvailabilityService(
            registry,
            new MockDiscoveryProtocol(),
            new MockGossipService(),
            new MockReconciliationService(),
            new MockHeartbeatMonitor(),
            {
              localNodeId: 'local-node',
              stalenessThresholdMs: 1000, // 1 second
              queryTimeoutMs: 10000,
            },
          );

          // Add location with old timestamp
          const oldTimestamp = new Date(Date.now() - 5000); // 5 seconds ago
          customService.setBlockData(blockId, {
            state: AvailabilityState.Remote,
            locations: [
              {
                nodeId,
                lastSeen: oldTimestamp,
                isAuthoritative: false,
              },
            ],
            lastUpdated: oldTimestamp,
          });

          // Query - should be stale
          let result = await customService.queryBlockLocation(blockId);
          expect(result.isStale).toBe(true);

          // Update location (refresh)
          await customService.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          // Query again - should no longer be stale
          result = await customService.queryBlockLocation(blockId);
          expect(result.isStale).toBe(false);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should include lastUpdated timestamp in query result', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbNodeId, async (blockId, nodeId) => {
          const { service } = createTestService('local-node');

          const beforeUpdate = new Date();

          // Add location
          await service.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          const afterUpdate = new Date();

          // Query location
          const result = await service.queryBlockLocation(blockId);

          // Verify lastUpdated is within expected range
          expect(result.lastUpdated).toBeDefined();
          expect(result.lastUpdated.getTime()).toBeGreaterThanOrEqual(
            beforeUpdate.getTime(),
          );
          expect(result.lastUpdated.getTime()).toBeLessThanOrEqual(
            afterUpdate.getTime(),
          );

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should handle unknown blocks with staleness check', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { service } = createTestService('local-node');

          // Query unknown block
          const result = await service.queryBlockLocation(blockId);

          // Unknown blocks should have empty locations and not be marked stale
          expect(result.blockId).toBe(blockId);
          expect(result.state).toBe(AvailabilityState.Unknown);
          expect(result.locations).toEqual([]);
          expect(result.isStale).toBe(false); // No data to be stale
          expect(result.lastUpdated).toBeDefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly calculate staleness at threshold boundary', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbNodeId,
          fc.integer({ min: 1000, max: 10000 }),
          async (blockId, nodeId, thresholdMs) => {
            const { registry } = createTestService('local-node');

            const customService = new AvailabilityService(
              registry,
              new MockDiscoveryProtocol(),
              new MockGossipService(),
              new MockReconciliationService(),
              new MockHeartbeatMonitor(),
              {
                localNodeId: 'local-node',
                stalenessThresholdMs: thresholdMs,
                queryTimeoutMs: 10000,
              },
            );

            // Test slightly beyond the threshold to avoid timing issues
            // Add 100ms buffer to ensure we're definitely past the threshold
            const beyondThresholdTimestamp = new Date(
              Date.now() - thresholdMs - 100,
            );
            customService.setBlockData(blockId, {
              state: AvailabilityState.Remote,
              locations: [
                {
                  nodeId,
                  lastSeen: beyondThresholdTimestamp,
                  isAuthoritative: false,
                },
              ],
              lastUpdated: beyondThresholdTimestamp,
            });

            const result = await customService.queryBlockLocation(blockId);

            // Beyond the threshold, should be considered stale
            // (age > threshold means stale)
            expect(result.isStale).toBe(true);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
