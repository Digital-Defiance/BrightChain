/**
 * @fileoverview Property-based tests for AvailabilityAwareBlockStore
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 1: Block Storage Side Effects
 * - Property 2: Block Deletion Side Effects
 * - Property 16: Partition Mode Local Operations
 * - Property 17: Pending Sync Queue
 * - Property 26: Wrapper Error Propagation
 *
 * **Validates: Requirements 1.2, 2.3, 3.2, 6.1, 12.2, 3.3, 6.5, 12.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.6**
 */

import {
  AnnouncementHandler,
  AvailabilityEventHandler,
  AvailabilityState,
  BaseBlock,
  BlockAnnouncement,
  BlockHandle,
  BlockManifest,
  BlockSize,
  BlockStoreOptions,
  BloomFilter,
  BrightenResult,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  DeliveryAckMetadata,
  EventFilter,
  GossipConfig,
  IAvailabilityService,
  IBlockMetadata,
  IBlockRegistry,
  IBlockStore,
  IGossipService,
  ILocationRecord,
  initializeBrightChain,
  IReconciliationService,
  MessageDeliveryMetadata,
  PendingSyncItem,
  RawDataBlock,
  ReconciliationConfig,
  ReconciliationEventHandler,
  ReconciliationResult,
  RecoveryResult,
  ServiceLocator,
  ServiceProvider,
  StoreError,
  StoreErrorType,
  SyncVectorEntry,
} from '@brightchain/brightchain-lib';
import { hexToUint8Array } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import {
  AvailabilityAwareBlockStore,
  PartitionModeError,
} from './availabilityAwareBlockStore';

// Initialize BrightChain before tests
beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

beforeEach(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

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
 * Generate random block data
 */
const arbBlockData = fc.uint8Array({ minLength: 64, maxLength: 256 });

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
 * Mock BlockStore for testing
 */
class MockBlockStore implements IBlockStore {
  private blocks = new Map<string, Uint8Array>();
  private metadata = new Map<string, IBlockMetadata>();
  public shouldThrowOnStore = false;
  public shouldThrowOnDelete = false;
  public storeError: Error | null = null;
  public deleteError: Error | null = null;

  get blockSize(): BlockSize {
    return BlockSize.Small;
  }

  async has(key: Checksum | string): Promise<boolean> {
    const keyHex = typeof key === 'string' ? key : key.toHex();
    return this.blocks.has(keyHex);
  }

  async getData(key: Checksum): Promise<RawDataBlock> {
    const keyHex = key.toHex();
    const data = this.blocks.get(keyHex);
    if (!data) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    return new RawDataBlock(BlockSize.Small, data, new Date(), key);
  }

  async setData(
    block: RawDataBlock,
    _options?: BlockStoreOptions,
  ): Promise<void> {
    if (this.shouldThrowOnStore) {
      throw (
        this.storeError || new StoreError(StoreErrorType.BlockPathAlreadyExists)
      );
    }
    const keyHex = block.idChecksum.toHex();
    this.blocks.set(keyHex, block.data);
  }

  async deleteData(key: Checksum): Promise<void> {
    if (this.shouldThrowOnDelete) {
      throw this.deleteError || new StoreError(StoreErrorType.KeyNotFound);
    }
    const keyHex = key.toHex();
    if (!this.blocks.has(keyHex)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    this.blocks.delete(keyHex);
  }

  async getRandomBlocks(_count: number): Promise<Checksum[]> {
    return [];
  }

  get<T extends BaseBlock>(_checksum: Checksum | string): BlockHandle<T> {
    throw new Error('Not implemented in mock');
  }

  async put(
    key: Checksum | string,
    data: Uint8Array,
    _options?: BlockStoreOptions,
  ): Promise<void> {
    if (this.shouldThrowOnStore) {
      throw (
        this.storeError || new StoreError(StoreErrorType.BlockPathAlreadyExists)
      );
    }
    const keyHex = typeof key === 'string' ? key : key.toHex();
    this.blocks.set(keyHex, data);
  }

  async delete(key: Checksum | string): Promise<void> {
    if (this.shouldThrowOnDelete) {
      throw this.deleteError || new StoreError(StoreErrorType.KeyNotFound);
    }
    const keyHex = typeof key === 'string' ? key : key.toHex();
    this.blocks.delete(keyHex);
  }

  async getMetadata(_key: Checksum | string): Promise<IBlockMetadata | null> {
    return null;
  }

  async updateMetadata(
    _key: Checksum | string,
    _updates: Partial<IBlockMetadata>,
  ): Promise<void> {}

  async generateParityBlocks(
    _key: Checksum | string,
    _parityCount: number,
  ): Promise<Checksum[]> {
    return [];
  }

  async getParityBlocks(_key: Checksum | string): Promise<Checksum[]> {
    return [];
  }

  async recoverBlock(_key: Checksum | string): Promise<RecoveryResult> {
    return { success: false, error: 'Not implemented' };
  }

  async verifyBlockIntegrity(_key: Checksum | string): Promise<boolean> {
    return true;
  }

  async getBlocksPendingReplication(): Promise<Checksum[]> {
    return [];
  }

  async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    return [];
  }

  async recordReplication(
    _key: Checksum | string,
    _nodeId: string,
  ): Promise<void> {}

  async recordReplicaLoss(
    _key: Checksum | string,
    _nodeId: string,
  ): Promise<void> {}

  async brightenBlock(
    _key: Checksum | string,
    _randomBlockCount: number,
  ): Promise<BrightenResult> {
    return {
      brightenedBlockId: 'brightened-block-id',
      randomBlockIds: [],
      originalBlockId: 'original-block-id',
    };
  }

  // CBL Whitening Operations (mock implementations)
  async storeCBLWithWhitening(
    _cblData: Uint8Array,
    _options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    return {
      blockId1: 'mock-block-id-1',
      blockId2: 'mock-block-id-2',
      blockSize: BlockSize.Small,
      magnetUrl:
        'magnet:?xt=urn:brightchain:cbl&bs=256&b1=mock-block-id-1&b2=mock-block-id-2',
    };
  }

  async retrieveCBL(
    _blockId1: Checksum | string,
    _blockId2: Checksum | string,
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    return new Uint8Array([1, 2, 3]);
  }

  parseCBLMagnetUrl(_magnetUrl: string): CBLMagnetComponents {
    return {
      blockId1: 'mock-block-id-1',
      blockId2: 'mock-block-id-2',
      blockSize: BlockSize.Small,
      isEncrypted: false,
    };
  }

  generateCBLMagnetUrl(
    _blockId1: Checksum | string,
    _blockId2: Checksum | string,
    _blockSize: number,
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
    _isEncrypted?: boolean,
  ): string {
    return 'magnet:?xt=urn:brightchain:cbl&bs=256&b1=mock-block-id-1&b2=mock-block-id-2';
  }

  // Test helpers
  clear(): void {
    this.blocks.clear();
    this.metadata.clear();
  }

  addBlock(blockId: string, data: Uint8Array): void {
    this.blocks.set(blockId, data);
  }
}

/**
 * Mock AvailabilityService for testing
 */
class MockAvailabilityService implements IAvailabilityService {
  private blockStates = new Map<string, AvailabilityState>();
  private blockLocations = new Map<string, ILocationRecord[]>();
  private partitionMode = false;
  private disconnectedPeers: string[] = [];
  private running = false;
  private localNodeId = 'test-node';

  async getAvailabilityState(blockId: string): Promise<AvailabilityState> {
    return this.blockStates.get(blockId) ?? AvailabilityState.Unknown;
  }

  async getBlockLocations(blockId: string): Promise<ILocationRecord[]> {
    return this.blockLocations.get(blockId) ?? [];
  }

  async queryBlockLocation(blockId: string) {
    return {
      blockId,
      state: await this.getAvailabilityState(blockId),
      locations: await this.getBlockLocations(blockId),
      isStale: false,
      lastUpdated: new Date(),
    };
  }

  async listBlocksByState(state: AvailabilityState): Promise<string[]> {
    const result: string[] = [];
    for (const [blockId, s] of this.blockStates) {
      if (s === state) result.push(blockId);
    }
    return result;
  }

  async getStatistics() {
    return {
      localCount: 0,
      remoteCount: 0,
      cachedCount: 0,
      orphanedCount: 0,
      unknownCount: 0,
      totalKnownLocations: 0,
      averageLocationsPerBlock: 0,
    };
  }

  async updateLocation(
    blockId: string,
    location: ILocationRecord,
  ): Promise<void> {
    const locations = this.blockLocations.get(blockId) ?? [];
    const existingIndex = locations.findIndex(
      (l) => l.nodeId === location.nodeId,
    );
    if (existingIndex >= 0) {
      locations[existingIndex] = location;
    } else {
      locations.push(location);
    }
    this.blockLocations.set(blockId, locations);
  }

  async removeLocation(blockId: string, nodeId: string): Promise<void> {
    const locations = this.blockLocations.get(blockId) ?? [];
    this.blockLocations.set(
      blockId,
      locations.filter((l) => l.nodeId !== nodeId),
    );
  }

  async setAvailabilityState(
    blockId: string,
    state: AvailabilityState,
  ): Promise<void> {
    this.blockStates.set(blockId, state);
  }

  isInPartitionMode(): boolean {
    return this.partitionMode;
  }

  enterPartitionMode(): void {
    this.partitionMode = true;
  }

  async exitPartitionMode(): Promise<ReconciliationResult> {
    this.partitionMode = false;
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

  getDisconnectedPeers(): string[] {
    return this.disconnectedPeers;
  }

  onEvent(_handler: AvailabilityEventHandler, _filter?: EventFilter): void {}

  offEvent(_handler: AvailabilityEventHandler): void {}

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig() {
    return {
      localNodeId: this.localNodeId,
      stalenessThresholdMs: 300000,
      queryTimeoutMs: 10000,
    };
  }

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  // Test helpers
  setPartitionMode(mode: boolean): void {
    this.partitionMode = mode;
  }

  clear(): void {
    this.blockStates.clear();
    this.blockLocations.clear();
    this.partitionMode = false;
  }

  getBlockState(blockId: string): AvailabilityState | undefined {
    return this.blockStates.get(blockId);
  }

  getLocations(blockId: string): ILocationRecord[] {
    return this.blockLocations.get(blockId) ?? [];
  }
}

/**
 * Mock GossipService for testing
 */
class MockGossipService implements IGossipService {
  public announcedBlocks: string[] = [];
  public removedBlocks: string[] = [];

  async announceBlock(blockId: string): Promise<void> {
    this.announcedBlocks.push(blockId);
  }

  async announceRemoval(blockId: string): Promise<void> {
    this.removedBlocks.push(blockId);
  }

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

  // Test helpers
  clear(): void {
    this.announcedBlocks = [];
    this.removedBlocks = [];
  }
}

/**
 * Mock ReconciliationService for testing
 */
class MockReconciliationService implements IReconciliationService {
  public pendingSyncQueue: PendingSyncItem[] = [];

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
    return [...this.pendingSyncQueue];
  }

  addToPendingSyncQueue(item: PendingSyncItem): void {
    this.pendingSyncQueue.push(item);
  }

  async processPendingSyncQueue(): Promise<void> {}

  clearPendingSyncQueue(): void {
    this.pendingSyncQueue = [];
  }

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

  // Test helpers
  clear(): void {
    this.pendingSyncQueue = [];
  }
}

/**
 * Create a test AvailabilityAwareBlockStore with mocks
 */
function createTestStore(localNodeId = 'test-node-001') {
  const innerStore = new MockBlockStore();
  const registry = new MockBlockRegistry();
  const availabilityService = new MockAvailabilityService();
  const gossipService = new MockGossipService();
  const reconciliationService = new MockReconciliationService();

  const store = new AvailabilityAwareBlockStore(
    innerStore,
    registry,
    availabilityService,
    gossipService,
    reconciliationService,
    { localNodeId },
  );

  return {
    store,
    innerStore,
    registry,
    availabilityService,
    gossipService,
    reconciliationService,
  };
}

/**
 * Create a mock RawDataBlock for testing
 */
function createMockBlock(blockId: string, data: Uint8Array): RawDataBlock {
  // A 64-byte checksum needs a 128-character hex string
  const checksumArray = hexToUint8Array(blockId.padEnd(128, '0'));
  const checksum = Checksum.fromUint8Array(checksumArray);
  return new RawDataBlock(BlockSize.Small, data, new Date(), checksum);
}

describe('AvailabilityAwareBlockStore Property Tests', () => {
  describe('Property 1: Block Storage Side Effects', () => {
    /**
     * **Feature: block-availability-discovery, Property 1: Block Storage Side Effects**
     *
     * *For any* block stored locally, the system SHALL:
     * - Mark the block's availability state as Local
     * - Add the local node ID to the block's location records
     * - Add the block ID to the local registry
     * - Announce the block to connected peers via gossip
     *
     * **Validates: Requirements 1.2, 2.3, 3.2, 6.1, 12.2**
     */
    it('should update registry when storing a block', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, registry } = createTestStore();
          const block = createMockBlock(blockId, data);

          // Store block
          await store.setData(block);

          // Verify registry was updated
          expect(registry.hasLocal(blockId.padEnd(128, '0'))).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should set availability state to Local when storing a block', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService } = createTestStore();
          const block = createMockBlock(blockId, data);
          const fullBlockId = blockId.padEnd(128, '0');

          // Store block
          await store.setData(block);

          // Verify availability state
          const state = availabilityService.getBlockState(fullBlockId);
          expect(state).toBe(AvailabilityState.Local);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should add local node to location records when storing a block', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbBlockData,
          arbNodeId,
          async (blockId, data, localNodeId) => {
            const { store, availabilityService } = createTestStore(localNodeId);
            const block = createMockBlock(blockId, data);
            const fullBlockId = blockId.padEnd(128, '0');

            // Store block
            await store.setData(block);

            // Verify location record
            const locations = availabilityService.getLocations(fullBlockId);
            expect(locations.length).toBeGreaterThan(0);
            expect(locations.some((l) => l.nodeId === localNodeId)).toBe(true);
            expect(
              locations.find((l) => l.nodeId === localNodeId)?.isAuthoritative,
            ).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should announce block via gossip when storing (not in partition mode)', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, gossipService } = createTestStore();
          const block = createMockBlock(blockId, data);
          const fullBlockId = blockId.padEnd(128, '0');

          // Store block
          await store.setData(block);

          // Verify gossip announcement
          expect(gossipService.announcedBlocks).toContain(fullBlockId);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Block Deletion Side Effects', () => {
    /**
     * **Feature: block-availability-discovery, Property 2: Block Deletion Side Effects**
     *
     * *For any* block deleted locally, the system SHALL:
     * - Remove the block ID from the local registry
     * - Remove the local node from the block's location records
     * - Announce the removal to connected peers via gossip
     *
     * **Validates: Requirements 3.3, 6.5, 12.3**
     */
    it('should remove from registry when deleting a block', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, registry, innerStore } = createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // First store the block
          innerStore.addBlock(fullBlockId, data);
          registry.addLocal(fullBlockId);

          // Delete block
          await store.deleteData(checksum);

          // Verify registry was updated
          expect(registry.hasLocal(fullBlockId)).toBe(false);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should remove local node from location records when deleting', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbBlockData,
          arbNodeId,
          async (blockId, data, localNodeId) => {
            const { store, availabilityService, registry, innerStore } =
              createTestStore(localNodeId);
            const fullBlockId = blockId.padEnd(128, '0');
            const checksum = Checksum.fromUint8Array(
              hexToUint8Array(fullBlockId),
            );

            // First store the block
            innerStore.addBlock(fullBlockId, data);
            registry.addLocal(fullBlockId);
            await availabilityService.updateLocation(fullBlockId, {
              nodeId: localNodeId,
              lastSeen: new Date(),
              isAuthoritative: true,
            });

            // Delete block
            await store.deleteData(checksum);

            // Verify location record was removed
            const locations = availabilityService.getLocations(fullBlockId);
            expect(locations.some((l) => l.nodeId === localNodeId)).toBe(false);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should announce removal via gossip when deleting (not in partition mode)', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, gossipService, registry, innerStore } =
            createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // First store the block
          innerStore.addBlock(fullBlockId, data);
          registry.addLocal(fullBlockId);

          // Delete block
          await store.deleteData(checksum);

          // Verify gossip removal announcement
          expect(gossipService.removedBlocks).toContain(fullBlockId);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 16: Partition Mode Local Operations', () => {
    /**
     * **Feature: block-availability-discovery, Property 16: Partition Mode Local Operations**
     *
     * *For any* node in Partition Mode:
     * - Reading and writing Local blocks SHALL succeed
     * - Reading Cached blocks SHALL succeed
     * - Requests for Remote blocks SHALL fail with a partition error
     *
     * **Validates: Requirements 8.1, 8.2, 8.4, 8.6**
     */
    it('should allow storing local blocks during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, registry } = createTestStore();
          const block = createMockBlock(blockId, data);

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Store should succeed
          await store.setData(block);

          // Verify block was stored
          expect(registry.hasLocal(blockId.padEnd(128, '0'))).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should allow reading local blocks during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, innerStore, registry } =
            createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // Store block first
          innerStore.addBlock(fullBlockId, data);
          registry.addLocal(fullBlockId);
          await availabilityService.setAvailabilityState(
            fullBlockId,
            AvailabilityState.Local,
          );

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Read should succeed
          const block = await store.getData(checksum);
          expect(block).toBeDefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should allow reading cached blocks during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, innerStore } = createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // Store block and mark as cached
          innerStore.addBlock(fullBlockId, data);
          await availabilityService.setAvailabilityState(
            fullBlockId,
            AvailabilityState.Cached,
          );

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Read should succeed
          const block = await store.getData(checksum);
          expect(block).toBeDefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should reject reading remote blocks during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, innerStore } = createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // Store block and mark as remote
          innerStore.addBlock(fullBlockId, data);
          await availabilityService.setAvailabilityState(
            fullBlockId,
            AvailabilityState.Remote,
          );

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Read should fail with partition error
          await expect(store.getData(checksum)).rejects.toThrow(
            PartitionModeError,
          );

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 17: Pending Sync Queue', () => {
    /**
     * **Feature: block-availability-discovery, Property 17: Pending Sync Queue**
     *
     * *For any* local change (store, delete, replicate) made during Partition Mode,
     * the change SHALL be added to the pending sync queue with a timestamp.
     *
     * **Validates: Requirements 8.3, 8.5**
     */
    it('should add store operations to pending sync queue during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, reconciliationService } =
            createTestStore();
          const block = createMockBlock(blockId, data);
          const fullBlockId = blockId.padEnd(128, '0');

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Store block
          await store.setData(block);

          // Verify pending sync queue
          const queue = reconciliationService.getPendingSyncQueue();
          expect(queue.length).toBeGreaterThan(0);

          const storeItem = queue.find(
            (item) => item.blockId === fullBlockId && item.type === 'store',
          );
          expect(storeItem).toBeDefined();
          expect(storeItem?.timestamp).toBeInstanceOf(Date);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should add delete operations to pending sync queue during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const {
            store,
            availabilityService,
            reconciliationService,
            innerStore,
            registry,
          } = createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // First store the block
          innerStore.addBlock(fullBlockId, data);
          registry.addLocal(fullBlockId);

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Delete block
          await store.deleteData(checksum);

          // Verify pending sync queue
          const queue = reconciliationService.getPendingSyncQueue();
          const deleteItem = queue.find(
            (item) => item.blockId === fullBlockId && item.type === 'delete',
          );
          expect(deleteItem).toBeDefined();
          expect(deleteItem?.timestamp).toBeInstanceOf(Date);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should not add to pending sync queue when not in partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, reconciliationService } =
            createTestStore();
          const block = createMockBlock(blockId, data);

          // Ensure not in partition mode
          availabilityService.setPartitionMode(false);

          // Store block
          await store.setData(block);

          // Verify pending sync queue is empty
          const queue = reconciliationService.getPendingSyncQueue();
          expect(queue.length).toBe(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should not announce via gossip during partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, availabilityService, gossipService } =
            createTestStore();
          const block = createMockBlock(blockId, data);

          // Enter partition mode
          availabilityService.setPartitionMode(true);

          // Store block
          await store.setData(block);

          // Verify no gossip announcement
          expect(gossipService.announcedBlocks.length).toBe(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 26: Wrapper Error Propagation', () => {
    /**
     * **Feature: block-availability-discovery, Property 26: Wrapper Error Propagation**
     *
     * *For any* error from the underlying IBlockStore, the AvailabilityAwareBlockStore
     * wrapper SHALL propagate the error without modification.
     *
     * **Validates: Requirements 12.6**
     */
    it('should propagate store errors from inner store', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, innerStore } = createTestStore();
          const block = createMockBlock(blockId, data);

          // Configure inner store to throw
          innerStore.shouldThrowOnStore = true;
          innerStore.storeError = new StoreError(
            StoreErrorType.BlockPathAlreadyExists,
          );

          // Store should propagate the error
          await expect(store.setData(block)).rejects.toThrow(StoreError);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should propagate delete errors from inner store', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const { store, innerStore } = createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // Configure inner store to throw
          innerStore.shouldThrowOnDelete = true;
          innerStore.deleteError = new StoreError(StoreErrorType.KeyNotFound);

          // Delete should propagate the error
          await expect(store.deleteData(checksum)).rejects.toThrow(StoreError);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should not update registry if inner store fails on store', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, innerStore, registry } = createTestStore();
          const block = createMockBlock(blockId, data);
          const fullBlockId = blockId.padEnd(128, '0');

          // Configure inner store to throw
          innerStore.shouldThrowOnStore = true;

          // Store should fail
          try {
            await store.setData(block);
          } catch {
            // Expected
          }

          // Registry should not be updated
          expect(registry.hasLocal(fullBlockId)).toBe(false);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should not update registry if inner store fails on delete', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, arbBlockData, async (blockId, data) => {
          const { store, innerStore, registry } = createTestStore();
          const fullBlockId = blockId.padEnd(128, '0');
          const checksum = Checksum.fromUint8Array(
            hexToUint8Array(fullBlockId),
          );

          // First add to registry
          innerStore.addBlock(fullBlockId, data);
          registry.addLocal(fullBlockId);

          // Configure inner store to throw
          innerStore.shouldThrowOnDelete = true;

          // Delete should fail
          try {
            await store.deleteData(checksum);
          } catch {
            // Expected
          }

          // Registry should still have the block
          expect(registry.hasLocal(fullBlockId)).toBe(true);

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });
});
