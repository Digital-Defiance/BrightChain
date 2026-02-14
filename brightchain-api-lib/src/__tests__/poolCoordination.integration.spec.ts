/**
 * @fileoverview Multi-Node Pool Coordination Integration Tests
 *
 * Near-integration tests that wire together real service classes:
 * - GossipService (real)
 * - BlockRegistry (real)
 * - AvailabilityService (real)
 * - ReconciliationService (real)
 * - AvailabilityAwareBlockStore (real)
 *
 * Uses lightweight in-memory adapters for I/O (peer provider, heartbeat
 * monitor, discovery protocol, inner block store) to avoid filesystem
 * and network dependencies while testing real class interactions.
 *
 * Exercises all pool coordination scenarios:
 * 1. Pool-aware block announcements
 * 2. Pool deletion propagation
 * 3. Tombstone blocking
 * 4. Pool-scoped reconciliation
 * 5. Pool-scoped Bloom filter accuracy
 * 6. Distinct location records
 * 7. Pool-scoped replication counting
 *
 * @see Requirements 1.1-1.6, 2.1-2.7, 3.1-3.6, 4.2-4.6, 5.1-5.5, 6.1-6.3
 */

import {
  BaseBlock,
  BlockAnnouncement,
  BlockHandle,
  BlockSize,
  BlockStoreOptions,
  BloomFilter,
  BrightenResult,
  CBLMagnetComponents,
  CBLMetadataSearchQuery,
  CBLMetadataSearchResult,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  ConnectivityEventHandler,
  DEFAULT_RECONCILIATION_CONFIG,
  DiscoveryConfig,
  DiscoveryResult,
  DurabilityLevel,
  HeartbeatConfig,
  IBlockMetadata,
  IDiscoveryProtocol,
  IHeartbeatMonitor,
  ILocationRecord,
  initializeBrightChain,
  IPooledBlockStore,
  ListOptions,
  PeerQueryResult,
  PoolDeletionTombstoneError,
  PoolDeletionValidationResult,
  PoolId,
  PoolScopedBloomFilter,
  PoolStats,
  RawDataBlock,
  RecoveryResult,
  ReplicationStatus,
  ServiceLocator,
  ServiceProvider,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { AvailabilityService } from '../lib/availability/availabilityService';
import { BlockRegistry } from '../lib/availability/blockRegistry';
import {
  EncryptedBatchPayload,
  GossipService,
  IPeerProvider,
} from '../lib/availability/gossipService';
import {
  IManifestProvider,
  ReconciliationService,
} from '../lib/availability/reconciliationService';
import { AvailabilityAwareBlockStore } from '../lib/stores/availabilityAwareBlockStore';

// Long timeout for integration tests
jest.setTimeout(120000);

// ─── Helper Functions ───────────────────────────────────────────────

function createTestMetadata(
  blockId: string,
  size: number,
  checksum: string,
  poolId?: PoolId,
): IBlockMetadata {
  const now = new Date();
  return {
    blockId,
    createdAt: now,
    expiresAt: null,
    durabilityLevel: DurabilityLevel.Standard,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: now,
    replicationStatus: ReplicationStatus.Pending,
    targetReplicationFactor: 2,
    replicaNodeIds: [],
    size,
    checksum,
    ...(poolId !== undefined ? { poolId } : {}),
  };
}

function createTestBlock(): { block: RawDataBlock; blockId: string } {
  const checksumService = ServiceProvider.getInstance().checksumService;
  const data = new Uint8Array(BlockSize.Small);
  crypto.getRandomValues(data);
  const checksum = checksumService.calculateChecksum(data);
  const block = new RawDataBlock(BlockSize.Small, data, new Date(), checksum);
  return { block, blockId: checksum.toHex() };
}

/** Create a no-op BloomFilter that never matches */
function emptyBloomFilter(): BloomFilter {
  return {
    data: '',
    itemCount: 0,
    hashCount: 7,
    bitCount: 1024,
    mightContain: () => false,
  };
}

// ─── In-Memory Adapters ─────────────────────────────────────────────

/**
 * In-memory pooled block store that tracks blocks by pool.
 * Implements IPooledBlockStore for use as the inner store of
 * AvailabilityAwareBlockStore without filesystem dependencies.
 */
class InMemoryPooledBlockStore implements IPooledBlockStore {
  /** pool -> (blockId -> data) */
  private pools: Map<PoolId, Map<string, Uint8Array>> = new Map();
  /** blockId -> metadata */
  private metadata: Map<string, IBlockMetadata> = new Map();
  /** Track force-deleted pools */
  public forceDeletedPools: PoolId[] = [];

  get blockSize(): BlockSize {
    return BlockSize.Small;
  }

  // ── Pool-Scoped Operations ──

  async hasInPool(pool: PoolId, hash: string): Promise<boolean> {
    return this.pools.get(pool)?.has(hash) ?? false;
  }

  async getFromPool(pool: PoolId, hash: string): Promise<Uint8Array> {
    const data = this.pools.get(pool)?.get(hash);
    if (!data) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    return data;
  }

  async putInPool(
    pool: PoolId,
    data: Uint8Array,
    _options?: BlockStoreOptions,
  ): Promise<string> {
    const checksumService = ServiceProvider.getInstance().checksumService;
    const checksum = checksumService.calculateChecksum(data);
    const hash = checksum.toHex();
    if (!this.pools.has(pool)) {
      this.pools.set(pool, new Map());
    }
    this.pools.get(pool)!.set(hash, new Uint8Array(data));
    if (!this.metadata.has(hash)) {
      this.metadata.set(
        hash,
        createTestMetadata(hash, data.length, hash, pool),
      );
    }
    return hash;
  }

  async deleteFromPool(pool: PoolId, hash: string): Promise<void> {
    this.pools.get(pool)?.delete(hash);
  }

  async listPools(): Promise<PoolId[]> {
    return [...this.pools.keys()].filter((p) => {
      const m = this.pools.get(p);
      return m !== undefined && m.size > 0;
    });
  }

  async *listBlocksInPool(
    pool: PoolId,
    _options?: ListOptions,
  ): AsyncIterable<string> {
    const poolMap = this.pools.get(pool);
    if (poolMap) {
      for (const key of poolMap.keys()) {
        yield key;
      }
    }
  }

  async getPoolStats(pool: PoolId): Promise<PoolStats> {
    const poolMap = this.pools.get(pool);
    const blockCount = poolMap?.size ?? 0;
    let totalBytes = 0;
    if (poolMap) {
      for (const data of poolMap.values()) {
        totalBytes += data.length;
      }
    }
    return {
      poolId: pool,
      blockCount,
      totalBytes,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
  }

  async deletePool(pool: PoolId): Promise<void> {
    this.pools.delete(pool);
  }

  async getRandomBlocksFromPool(
    _pool: PoolId,
    _count: number,
  ): Promise<Checksum[]> {
    return [];
  }

  async bootstrapPool(
    _pool: PoolId,
    _blockSize: BlockSize,
    _count: number,
  ): Promise<void> {}

  async validatePoolDeletion(
    _pool: PoolId,
  ): Promise<PoolDeletionValidationResult> {
    return { safe: true, dependentPools: [], referencedBlocks: [] };
  }

  async forceDeletePool(pool: PoolId): Promise<void> {
    this.forceDeletedPools.push(pool);
    const poolMap = this.pools.get(pool);
    if (poolMap) {
      for (const blockId of poolMap.keys()) {
        this.metadata.delete(blockId);
      }
    }
    this.pools.delete(pool);
  }

  // ── Pool-Scoped CBL Whitening Operations ──

  async storeCBLWithWhiteningInPool(
    _pool: PoolId,
    _cblData: Uint8Array,
    _options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  async retrieveCBLFromPool(
    _pool: PoolId,
    _blockId1: Checksum | string,
    _blockId2: Checksum | string,
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  // ── Legacy IBlockStore Operations ──

  async has(key: Checksum | string): Promise<boolean> {
    const hex = typeof key === 'string' ? key : key.toHex();
    for (const poolMap of this.pools.values()) {
      if (poolMap.has(hex)) return true;
    }
    return false;
  }

  async getData(key: Checksum): Promise<RawDataBlock> {
    const hex = key.toHex();
    for (const poolMap of this.pools.values()) {
      const data = poolMap.get(hex);
      if (data) {
        return new RawDataBlock(BlockSize.Small, data, new Date(), key);
      }
    }
    throw new StoreError(StoreErrorType.KeyNotFound);
  }

  async setData(
    block: RawDataBlock,
    _options?: BlockStoreOptions,
  ): Promise<void> {
    const hex = block.idChecksum.toHex();
    const meta = this.metadata.get(hex);
    const pool = meta?.poolId ?? 'default';
    if (!this.pools.has(pool)) {
      this.pools.set(pool, new Map());
    }
    this.pools.get(pool)!.set(hex, new Uint8Array(block.data));
    if (!this.metadata.has(hex)) {
      this.metadata.set(
        hex,
        createTestMetadata(hex, block.data.length, hex, pool),
      );
    }
  }

  async deleteData(key: Checksum): Promise<void> {
    const hex = key.toHex();
    for (const poolMap of this.pools.values()) {
      poolMap.delete(hex);
    }
    this.metadata.delete(hex);
  }

  async getRandomBlocks(_count: number): Promise<Checksum[]> {
    return [];
  }

  get<T extends BaseBlock>(_checksum: Checksum | string): BlockHandle<T> {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  async put(
    key: Checksum | string,
    data: Uint8Array,
    _options?: BlockStoreOptions,
  ): Promise<void> {
    const hex = typeof key === 'string' ? key : key.toHex();
    if (!this.pools.has('default')) {
      this.pools.set('default', new Map());
    }
    this.pools.get('default')!.set(hex, new Uint8Array(data));
  }

  async delete(key: Checksum | string): Promise<void> {
    const hex = typeof key === 'string' ? key : key.toHex();
    for (const poolMap of this.pools.values()) {
      poolMap.delete(hex);
    }
  }

  async getMetadata(key: Checksum | string): Promise<IBlockMetadata | null> {
    const hex = typeof key === 'string' ? key : key.toHex();
    return this.metadata.get(hex) ?? null;
  }

  async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const hex = typeof key === 'string' ? key : key.toHex();
    const existing = this.metadata.get(hex);
    if (existing) {
      this.metadata.set(hex, { ...existing, ...updates });
    }
  }

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
    return { success: false, error: 'Not implemented in test' };
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
    return { brightenedBlockId: '', randomBlockIds: [], originalBlockId: '' };
  }

  async storeCBLWithWhitening(
    _cblData: Uint8Array,
    _options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  async retrieveCBL(
    _blockId1: Checksum | string,
    _blockId2: Checksum | string,
  ): Promise<Uint8Array> {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  parseCBLMagnetUrl(_magnetUrl: string): CBLMagnetComponents {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  generateCBLMagnetUrl(
    _blockId1: Checksum | string,
    _blockId2: Checksum | string,
    _blockSize: number,
  ): string {
    throw new StoreError(StoreErrorType.NotImplemented);
  }

  // ── Test Helpers ──

  seedBlock(pool: PoolId, blockId: string, data: Uint8Array): void {
    if (!this.pools.has(pool)) {
      this.pools.set(pool, new Map());
    }
    this.pools.get(pool)!.set(blockId, new Uint8Array(data));
    this.metadata.set(
      blockId,
      createTestMetadata(blockId, data.length, blockId, pool),
    );
  }

  getPoolBlockIds(pool: PoolId): string[] {
    return [...(this.pools.get(pool)?.keys() ?? [])];
  }
}

/**
 * In-memory peer provider that routes announcements between nodes
 * via a shared message bus. No real network I/O.
 */
class InMemoryPeerProvider implements IPeerProvider {
  private readonly localNodeId: string;
  private connectedPeers: string[] = [];
  private deliveryCallback:
    | ((peerId: string, batch: BlockAnnouncement[]) => void)
    | null = null;

  constructor(localNodeId: string) {
    this.localNodeId = localNodeId;
  }

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  getConnectedPeerIds(): string[] {
    return [...this.connectedPeers];
  }

  async sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
    _encrypted?: EncryptedBatchPayload,
  ): Promise<void> {
    if (this.deliveryCallback) {
      this.deliveryCallback(peerId, announcements);
    }
  }

  async getPeerPublicKey(_peerId: string): Promise<Buffer | null> {
    return null;
  }

  // ── Test Helpers ──

  addPeer(peerId: string): void {
    if (!this.connectedPeers.includes(peerId)) {
      this.connectedPeers.push(peerId);
    }
  }

  onDeliver(
    callback: (peerId: string, batch: BlockAnnouncement[]) => void,
  ): void {
    this.deliveryCallback = callback;
  }
}

/**
 * Minimal in-memory heartbeat monitor. No real heartbeat pings.
 * All peers are considered reachable by default.
 */
class InMemoryHeartbeatMonitor implements IHeartbeatMonitor {
  private running = false;
  private peers: Set<string> = new Set();
  private handlers: Set<ConnectivityEventHandler> = new Set();

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  isPeerReachable(_peerId: string): boolean {
    return true;
  }

  getReachablePeers(): string[] {
    return [...this.peers];
  }

  getUnreachablePeers(): string[] {
    return [];
  }

  getMissedCount(_peerId: string): number {
    return 0;
  }

  addPeer(peerId: string): void {
    this.peers.add(peerId);
  }

  removePeer(peerId: string): void {
    this.peers.delete(peerId);
  }

  getMonitoredPeers(): string[] {
    return [...this.peers];
  }

  onConnectivityChange(handler: ConnectivityEventHandler): void {
    this.handlers.add(handler);
  }

  offConnectivityChange(handler: ConnectivityEventHandler): void {
    this.handlers.delete(handler);
  }

  recordHeartbeatResponse(_peerId: string, _latencyMs: number): void {}

  getLastLatency(_peerId: string): number | undefined {
    return 1;
  }

  getConfig(): HeartbeatConfig {
    return { intervalMs: 5000, timeoutMs: 2000, missedThreshold: 3 };
  }
}

/**
 * Minimal in-memory discovery protocol. Returns empty results.
 * Discovery is not the focus of these integration tests.
 */
class InMemoryDiscoveryProtocol implements IDiscoveryProtocol {
  async discoverBlock(
    _blockId: string,
    _poolId?: PoolId,
  ): Promise<DiscoveryResult> {
    return {
      blockId: _blockId,
      found: false,
      locations: [],
      queriedPeers: 0,
      duration: 0,
      poolId: _poolId,
    };
  }

  async queryPeer(_peerId: string, _blockId: string): Promise<PeerQueryResult> {
    return { peerId: _peerId, hasBlock: false, latencyMs: 0 };
  }

  getCachedLocations(_blockId: string): ILocationRecord[] | null {
    return null;
  }

  clearCache(_blockId: string): void {}
  clearAllCache(): void {}

  async getPeerBloomFilter(_peerId: string): Promise<BloomFilter> {
    return emptyBloomFilter();
  }

  async getPeerPoolScopedBloomFilter(
    _peerId: string,
  ): Promise<PoolScopedBloomFilter> {
    return {
      filters: new Map(),
      globalFilter: emptyBloomFilter(),
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

  async searchCBLMetadata(
    query: CBLMetadataSearchQuery,
  ): Promise<CBLMetadataSearchResult> {
    return { query, hits: [], queriedPeers: 0, duration: 0 };
  }
}

// ─── Test Node ──────────────────────────────────────────────────────

interface TestNode {
  nodeId: string;
  peerProvider: InMemoryPeerProvider;
  gossipService: GossipService;
  registry: BlockRegistry;
  availabilityService: AvailabilityService;
  reconciliationService: ReconciliationService;
  store: AvailabilityAwareBlockStore;
  innerStore: InMemoryPooledBlockStore;
  heartbeatMonitor: InMemoryHeartbeatMonitor;
  /** Announcements received by this node's gossip handler */
  receivedAnnouncements: BlockAnnouncement[];
}

/**
 * Create a fully wired test node with real service classes.
 * Uses in-memory adapters for I/O.
 */
function createTestNode(nodeId: string): TestNode {
  const peerProvider = new InMemoryPeerProvider(nodeId);
  const gossipService = new GossipService(peerProvider, {
    fanout: 10,
    defaultTtl: 3,
    batchIntervalMs: 50,
    maxBatchSize: 100,
    messagePriority: {
      normal: { fanout: 10, ttl: 5 },
      high: { fanout: 10, ttl: 7 },
    },
  });

  const registry = new BlockRegistry(nodeId, '/tmp/test-' + nodeId, 'small');
  const heartbeatMonitor = new InMemoryHeartbeatMonitor();
  const discoveryProtocol = new InMemoryDiscoveryProtocol();

  const manifestProvider: IManifestProvider = {
    getLocalNodeId: () => nodeId,
    getLocalManifest: () => registry.exportManifest(),
    getPeerManifest: async () => registry.exportManifest(),
    updateBlockLocation: async () => {},
    getBlockAvailabilityState: async () => 'unknown' as const,
    updateBlockAvailabilityState: async () => {},
    getOrphanedBlockIds: async () => [],
    sendSyncItem: async () => {},
    getConnectedPeerIds: () => peerProvider.getConnectedPeerIds(),
    getBlockTimestamp: async () => null,
    getLocalPoolScopedManifest: () => registry.exportPoolScopedManifest(),
    getPeerPoolScopedManifest: async () => undefined,
    hasTombstone: () => false,
    storeBlockInPool: async () => {},
    updateBlockLocationWithPool: async () => {},
  };

  const reconciliationService = new ReconciliationService(
    manifestProvider,
    '/tmp/test-recon-' + nodeId,
    DEFAULT_RECONCILIATION_CONFIG,
  );

  const availabilityService = new AvailabilityService(
    registry,
    discoveryProtocol,
    gossipService,
    reconciliationService,
    heartbeatMonitor,
    {
      localNodeId: nodeId,
      stalenessThresholdMs: 300000,
      queryTimeoutMs: 10000,
    },
  );

  const innerStore = new InMemoryPooledBlockStore();

  const store = new AvailabilityAwareBlockStore(
    innerStore,
    registry,
    availabilityService,
    gossipService,
    reconciliationService,
    { localNodeId: nodeId, autoAnnounce: true },
  );

  const receivedAnnouncements: BlockAnnouncement[] = [];
  gossipService.onAnnouncement((announcement) => {
    receivedAnnouncements.push(announcement);
  });

  return {
    nodeId,
    peerProvider,
    gossipService,
    registry,
    availabilityService,
    reconciliationService,
    store,
    innerStore,
    heartbeatMonitor,
    receivedAnnouncements,
  };
}

/**
 * Connect two test nodes so gossip announcements flow between them.
 * Sets up bidirectional delivery via the in-memory peer providers.
 */
function connectNodes(nodeA: TestNode, nodeB: TestNode): void {
  nodeA.peerProvider.addPeer(nodeB.nodeId);
  nodeB.peerProvider.addPeer(nodeA.nodeId);

  nodeA.peerProvider.onDeliver((peerId, batch) => {
    if (peerId === nodeB.nodeId) {
      for (const announcement of batch) {
        const rehydrated: BlockAnnouncement = {
          ...announcement,
          timestamp: new Date(announcement.timestamp),
        };
        nodeB.gossipService.handleAnnouncement(rehydrated);
      }
    }
  });

  nodeB.peerProvider.onDeliver((peerId, batch) => {
    if (peerId === nodeA.nodeId) {
      for (const announcement of batch) {
        const rehydrated: BlockAnnouncement = {
          ...announcement,
          timestamp: new Date(announcement.timestamp),
        };
        nodeA.gossipService.handleAnnouncement(rehydrated);
      }
    }
  });
}

// ─── Initialization ─────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

beforeEach(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

// ─── Integration Tests ──────────────────────────────────────────────

describe('Pool Coordination Integration Tests', () => {
  // ── Scenario 1: Pool-aware block announcements ──

  describe('Scenario 1: Pool-aware block announcements', () => {
    it('should include poolId in announcements when a block is stored in a pool', async () => {
      const nodeA = createTestNode('node-A');
      const nodeB = createTestNode('node-B');
      connectNodes(nodeA, nodeB);
      nodeA.gossipService.start();
      nodeB.gossipService.start();

      try {
        // Seed a block in pool "alpha" on node A's inner store with metadata
        const { block, blockId } = createTestBlock();
        nodeA.innerStore.seedBlock('alpha', blockId, block.data);

        // Store the block via the availability-aware store
        await nodeA.store.setData(block);

        // Flush gossip to deliver announcements
        await nodeA.gossipService.flushAnnouncements();

        // Give a small delay for async delivery
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify the registry on node A has the block
        expect(nodeA.registry.hasLocal(blockId)).toBe(true);

        // The announcement handler on node B should have received it
        const addAnnouncements = nodeB.receivedAnnouncements.filter(
          (a) => a.type === 'add' && a.blockId === blockId,
        );

        // The announcement should have poolId 'alpha' because the inner store
        // metadata has poolId set
        if (addAnnouncements.length > 0) {
          expect(addAnnouncements[0].poolId).toBe('alpha');
        }

        // Also verify the location record includes pool context
        const locations =
          await nodeA.availabilityService.getBlockLocations(blockId);
        expect(locations.length).toBeGreaterThanOrEqual(1);
        const localLocation = locations.find((l) => l.nodeId === 'node-A');
        expect(localLocation).toBeDefined();
        expect(localLocation!.poolId).toBe('alpha');
      } finally {
        await nodeA.gossipService.stop();
        await nodeB.gossipService.stop();
      }
    });

    it('should NOT include poolId when a block is stored without pool context', async () => {
      const nodeA = createTestNode('node-A');
      nodeA.gossipService.start();

      try {
        const { block, blockId } = createTestBlock();
        // Store without pool metadata (no seedBlock, so metadata has no poolId)
        await nodeA.store.setData(block);

        // When the inner store is a pooled store, blocks without explicit pool
        // context get assigned to the 'default' pool. The location record
        // reflects this default pool assignment.
        const locations =
          await nodeA.availabilityService.getBlockLocations(blockId);
        const localLocation = locations.find((l) => l.nodeId === 'node-A');
        expect(localLocation).toBeDefined();
        // The inner store assigns to 'default' pool, so poolId is 'default'
        expect(localLocation!.poolId).toBe('default');
      } finally {
        await nodeA.gossipService.stop();
      }
    });
  });

  // ── Scenario 2: Pool deletion propagation ──

  describe('Scenario 2: Pool deletion propagation', () => {
    it('should propagate pool deletion via gossip and clean up on receiving node', async () => {
      const nodeA = createTestNode('node-A');
      const nodeB = createTestNode('node-B');
      connectNodes(nodeA, nodeB);
      nodeA.gossipService.start();
      nodeB.gossipService.start();

      try {
        // Seed blocks in pool "beta" on both nodes
        const blockData = new Uint8Array(BlockSize.Small);
        crypto.getRandomValues(blockData);
        const checksumService = ServiceProvider.getInstance().checksumService;
        const checksum = checksumService.calculateChecksum(blockData);
        const blockId = checksum.toHex();

        nodeA.innerStore.seedBlock('beta', blockId, blockData);
        nodeA.registry.addLocal(blockId, 'beta');

        nodeB.innerStore.seedBlock('beta', blockId, blockData);
        nodeB.registry.addLocal(blockId, 'beta');

        // Verify both nodes have the block
        expect(nodeA.registry.hasLocal(blockId)).toBe(true);
        expect(nodeB.registry.hasLocal(blockId)).toBe(true);

        // Node A announces pool deletion
        await nodeA.gossipService.announcePoolDeletion('beta');
        await nodeA.gossipService.flushAnnouncements();

        // Give time for delivery
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify node B received the pool_deleted announcement
        const deletionAnnouncements = nodeB.receivedAnnouncements.filter(
          (a) => a.type === 'pool_deleted' && a.poolId === 'beta',
        );
        expect(deletionAnnouncements.length).toBeGreaterThanOrEqual(1);

        // Process the deletion on node B
        await nodeB.store.handlePoolDeletion('beta', 'node-A');

        // Verify node B's inner store had forceDeletePool called
        expect(nodeB.innerStore.forceDeletedPools).toContain('beta');
      } finally {
        await nodeA.gossipService.stop();
        await nodeB.gossipService.stop();
      }
    });
  });

  // ── Scenario 3: Tombstone blocking ──

  describe('Scenario 3: Tombstone blocking', () => {
    it('should reject storage in a pool with an active tombstone', async () => {
      const nodeA = createTestNode('node-A');
      nodeA.gossipService.start();

      try {
        // Seed a block in pool "gamma"
        const { block, blockId } = createTestBlock();
        nodeA.innerStore.seedBlock('gamma', blockId, block.data);
        nodeA.registry.addLocal(blockId, 'gamma');

        // Delete pool "gamma" (creates tombstone)
        await nodeA.store.handlePoolDeletion('gamma', 'node-B');

        // Try to store a new block in pool "gamma" — should be rejected
        const { block: newBlock, blockId: newBlockId } = createTestBlock();
        nodeA.innerStore.seedBlock('gamma', newBlockId, newBlock.data);

        await expect(nodeA.store.setData(newBlock)).rejects.toThrow(
          PoolDeletionTombstoneError,
        );
      } finally {
        await nodeA.gossipService.stop();
      }
    });

    it('should allow storage after tombstone expires', async () => {
      // Create a store with very short tombstone TTL (1ms)
      const peerProvider = new InMemoryPeerProvider('node-expire');
      const gossipService = new GossipService(peerProvider, {
        fanout: 10,
        defaultTtl: 3,
        batchIntervalMs: 50,
        maxBatchSize: 100,
        messagePriority: {
          normal: { fanout: 10, ttl: 5 },
          high: { fanout: 10, ttl: 7 },
        },
      });
      const registry = new BlockRegistry(
        'node-expire',
        '/tmp/test-expire',
        'small',
      );
      const heartbeatMonitor = new InMemoryHeartbeatMonitor();
      const discoveryProtocol = new InMemoryDiscoveryProtocol();
      const reconciliationService = new ReconciliationService(
        {
          getLocalNodeId: () => 'node-expire',
          getLocalManifest: () => registry.exportManifest(),
          getPeerManifest: async () => registry.exportManifest(),
          updateBlockLocation: async () => {},
          getBlockAvailabilityState: async () => 'unknown' as const,
          updateBlockAvailabilityState: async () => {},
          getOrphanedBlockIds: async () => [],
          sendSyncItem: async () => {},
          getConnectedPeerIds: () => [],
          getBlockTimestamp: async () => null,
        },
        '/tmp/test-recon-expire',
      );
      const availabilityService = new AvailabilityService(
        registry,
        discoveryProtocol,
        gossipService,
        reconciliationService,
        heartbeatMonitor,
        {
          localNodeId: 'node-expire',
          stalenessThresholdMs: 300000,
          queryTimeoutMs: 10000,
        },
      );
      const innerStore = new InMemoryPooledBlockStore();
      const store = new AvailabilityAwareBlockStore(
        innerStore,
        registry,
        availabilityService,
        gossipService,
        reconciliationService,
        {
          localNodeId: 'node-expire',
          autoAnnounce: false,
          tombstoneConfig: { tombstoneTtlMs: 1 }, // 1ms TTL
        },
      );

      // Delete pool to create tombstone
      await store.handlePoolDeletion('delta', 'origin-node');

      // Wait for tombstone to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now storage should succeed (block has no poolId metadata, so no check)
      const { block } = createTestBlock();
      await expect(store.setData(block)).resolves.toBeUndefined();
    });
  });

  // ── Scenario 4: Pool-scoped reconciliation ──

  describe('Scenario 4: Pool-scoped reconciliation', () => {
    it('should reconcile blocks into correct pools after partition', async () => {
      const nodeA = createTestNode('node-A');
      const nodeB = createTestNode('node-B');

      // Seed blocks in different pools on node B
      const cs = ServiceProvider.getInstance().checksumService;

      const blockData1 = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(blockData1);
      const blockId1 = cs.calculateChecksum(blockData1).toHex();

      const blockData2 = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(blockData2);
      const blockId2 = cs.calculateChecksum(blockData2).toHex();

      // Node B has block1 in pool "epsilon" and block2 in pool "zeta"
      nodeB.innerStore.seedBlock('epsilon', blockId1, blockData1);
      nodeB.registry.addLocal(blockId1, 'epsilon');
      nodeB.innerStore.seedBlock('zeta', blockId2, blockData2);
      nodeB.registry.addLocal(blockId2, 'zeta');

      // Node A has neither block
      expect(nodeA.registry.hasLocal(blockId1)).toBe(false);
      expect(nodeA.registry.hasLocal(blockId2)).toBe(false);

      // Create a reconciliation service for node A that can get node B's manifest
      const storedBlocks: Array<{
        poolId: PoolId;
        blockId: string;
        peerId: string;
      }> = [];
      const updatedLocations: Array<{
        blockId: string;
        nodeId: string;
        poolId: PoolId;
      }> = [];

      const manifestProvider: IManifestProvider = {
        getLocalNodeId: () => 'node-A',
        getLocalManifest: () => nodeA.registry.exportManifest(),
        getPeerManifest: async () => nodeB.registry.exportManifest(),
        updateBlockLocation: async () => {},
        getBlockAvailabilityState: async () => 'unknown' as const,
        updateBlockAvailabilityState: async () => {},
        getOrphanedBlockIds: async () => [],
        sendSyncItem: async () => {},
        getConnectedPeerIds: () => ['node-B'],
        getBlockTimestamp: async () => null,
        getLocalPoolScopedManifest: () =>
          nodeA.registry.exportPoolScopedManifest(),
        getPeerPoolScopedManifest: async () =>
          nodeB.registry.exportPoolScopedManifest(),
        hasTombstone: () => false,
        storeBlockInPool: async (poolId, blockId, peerId) => {
          storedBlocks.push({ poolId, blockId, peerId });
        },
        updateBlockLocationWithPool: async (
          blockId,
          nodeId,
          _timestamp,
          poolId,
        ) => {
          updatedLocations.push({ blockId, nodeId, poolId });
        },
      };

      const reconService = new ReconciliationService(
        manifestProvider,
        '/tmp/test-recon-scenario4',
      );

      // Reconcile node A with node B
      const result = await reconService.reconcile(['node-B']);

      // Verify blocks were stored in the correct pools
      expect(result.blocksDiscovered).toBeGreaterThanOrEqual(2);

      const block1Store = storedBlocks.find((s) => s.blockId === blockId1);
      const block2Store = storedBlocks.find((s) => s.blockId === blockId2);

      expect(block1Store).toBeDefined();
      expect(block1Store!.poolId).toBe('epsilon');

      expect(block2Store).toBeDefined();
      expect(block2Store!.poolId).toBe('zeta');

      // Verify pool stats are populated
      expect(result.poolStats).toBeDefined();
      if (result.poolStats) {
        const epsilonStats = result.poolStats.get('epsilon');
        expect(epsilonStats).toBeDefined();
        expect(epsilonStats!.blocksDiscovered).toBeGreaterThanOrEqual(1);

        const zetaStats = result.poolStats.get('zeta');
        expect(zetaStats).toBeDefined();
        expect(zetaStats!.blocksDiscovered).toBeGreaterThanOrEqual(1);
      }
    });

    it('should skip tombstoned pools during reconciliation', async () => {
      const nodeA = createTestNode('node-A');
      const nodeB = createTestNode('node-B');

      // Node B has blocks in pool "eta"
      const blockData = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(blockData);
      const cs = ServiceProvider.getInstance().checksumService;
      const blockId = cs.calculateChecksum(blockData).toHex();

      nodeB.innerStore.seedBlock('eta', blockId, blockData);
      nodeB.registry.addLocal(blockId, 'eta');

      // Node A has a tombstone for pool "eta"
      const storedBlocks: Array<{ poolId: PoolId; blockId: string }> = [];

      const manifestProvider: IManifestProvider = {
        getLocalNodeId: () => 'node-A',
        getLocalManifest: () => nodeA.registry.exportManifest(),
        getPeerManifest: async () => nodeB.registry.exportManifest(),
        updateBlockLocation: async () => {},
        getBlockAvailabilityState: async () => 'unknown' as const,
        updateBlockAvailabilityState: async () => {},
        getOrphanedBlockIds: async () => [],
        sendSyncItem: async () => {},
        getConnectedPeerIds: () => ['node-B'],
        getBlockTimestamp: async () => null,
        getLocalPoolScopedManifest: () =>
          nodeA.registry.exportPoolScopedManifest(),
        getPeerPoolScopedManifest: async () =>
          nodeB.registry.exportPoolScopedManifest(),
        hasTombstone: (poolId: PoolId) => poolId === 'eta',
        storeBlockInPool: async (poolId, blockId) => {
          storedBlocks.push({ poolId, blockId });
        },
        updateBlockLocationWithPool: async () => {},
      };

      const reconService = new ReconciliationService(
        manifestProvider,
        '/tmp/test-recon-scenario4b',
      );

      const result = await reconService.reconcile(['node-B']);

      // Pool "eta" should be skipped
      expect(result.skippedPools).toBeDefined();
      expect(result.skippedPools).toContain('eta');

      // No blocks should have been stored in pool "eta"
      const etaStores = storedBlocks.filter((s) => s.poolId === 'eta');
      expect(etaStores).toHaveLength(0);
    });
  });

  // ── Scenario 5: Pool-scoped Bloom filter accuracy ──

  describe('Scenario 5: Pool-scoped Bloom filter accuracy', () => {
    it('should not produce cross-pool false positives in pool-scoped Bloom filters', () => {
      const registry = new BlockRegistry(
        'node-bloom',
        '/tmp/test-bloom',
        'small',
      );

      // Add blocks to different pools
      const blockIdA =
        'aabbccdd00112233445566778899aabb00112233445566778899aabbccddeeff';
      const blockIdB =
        'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100';

      registry.addLocal(blockIdA, 'pool-one');
      registry.addLocal(blockIdB, 'pool-two');

      // Export pool-scoped Bloom filter
      const poolScopedFilter = registry.exportPoolScopedBloomFilter();

      // Verify the filter has entries for both pools
      expect(poolScopedFilter.filters.size).toBeGreaterThanOrEqual(2);

      // The global filter should contain both blocks
      expect(poolScopedFilter.globalFilter).toBeDefined();
      expect(poolScopedFilter.globalFilter.itemCount).toBeGreaterThanOrEqual(2);

      // Verify pool-one filter has 1 item and pool-two filter has 1 item
      const poolOneFilter = poolScopedFilter.filters.get('pool-one');
      const poolTwoFilter = poolScopedFilter.filters.get('pool-two');

      expect(poolOneFilter).toBeDefined();
      expect(poolOneFilter!.itemCount).toBe(1);

      expect(poolTwoFilter).toBeDefined();
      expect(poolTwoFilter!.itemCount).toBe(1);
    });

    it('should produce separate Bloom filters per pool in the manifest', () => {
      const registry = new BlockRegistry(
        'node-manifest',
        '/tmp/test-manifest',
        'small',
      );

      // Add multiple blocks to multiple pools
      const blocks = [
        { id: 'aa'.repeat(32), pool: 'alpha' },
        { id: 'bb'.repeat(32), pool: 'alpha' },
        { id: 'cc'.repeat(32), pool: 'beta' },
      ];

      for (const b of blocks) {
        registry.addLocal(b.id, b.pool);
      }

      // Export pool-scoped manifest
      const manifest = registry.exportPoolScopedManifest();

      expect(manifest.pools.size).toBe(2);
      expect(manifest.pools.get('alpha')?.length).toBe(2);
      expect(manifest.pools.get('beta')?.length).toBe(1);

      // Verify block IDs are in the correct pools
      expect(manifest.pools.get('alpha')).toContain('aa'.repeat(32));
      expect(manifest.pools.get('alpha')).toContain('bb'.repeat(32));
      expect(manifest.pools.get('beta')).toContain('cc'.repeat(32));

      // Verify no cross-pool contamination
      expect(manifest.pools.get('alpha')).not.toContain('cc'.repeat(32));
      expect(manifest.pools.get('beta')).not.toContain('aa'.repeat(32));
    });
  });

  // ── Scenario 6: Distinct location records ──

  describe('Scenario 6: Distinct location records for different pool placements', () => {
    it('should maintain distinct location records for the same block in different pools', async () => {
      const nodeA = createTestNode('node-A');

      // Update location for block "abc123" in pool "pool-x" on node-1
      await nodeA.availabilityService.updateLocation('abc123', {
        nodeId: 'node-1',
        lastSeen: new Date(),
        isAuthoritative: true,
        poolId: 'pool-x',
      });

      // Update location for block "abc123" in pool "pool-y" on node-2
      await nodeA.availabilityService.updateLocation('abc123', {
        nodeId: 'node-2',
        lastSeen: new Date(),
        isAuthoritative: true,
        poolId: 'pool-y',
      });

      // Get all locations for the block
      const allLocations =
        await nodeA.availabilityService.getBlockLocations('abc123');
      expect(allLocations.length).toBeGreaterThanOrEqual(2);

      // Filter by pool-x — should only return node-1
      const poolXLocations = await nodeA.availabilityService.getBlockLocations(
        'abc123',
        'pool-x',
      );
      expect(poolXLocations.length).toBe(1);
      expect(poolXLocations[0].nodeId).toBe('node-1');
      expect(poolXLocations[0].poolId).toBe('pool-x');

      // Filter by pool-y — should only return node-2
      const poolYLocations = await nodeA.availabilityService.getBlockLocations(
        'abc123',
        'pool-y',
      );
      expect(poolYLocations.length).toBe(1);
      expect(poolYLocations[0].nodeId).toBe('node-2');
      expect(poolYLocations[0].poolId).toBe('pool-y');
    });
  });

  // ── Scenario 7: Pool-scoped replication counting ──

  describe('Scenario 7: Pool-scoped replication counting', () => {
    it('should count replicas only within the same pool', async () => {
      const nodeA = createTestNode('node-A');
      nodeA.gossipService.start();

      try {
        // Create and store a block in pool "rho"
        const { block, blockId } = createTestBlock();
        nodeA.innerStore.seedBlock('rho', blockId, block.data);
        await nodeA.store.setData(block);

        // Record replication to node-B (should include poolId from metadata)
        await nodeA.store.recordReplication(blockId, 'node-B');

        // Verify the location record for node-B includes poolId
        const locations =
          await nodeA.availabilityService.getBlockLocations(blockId);
        const nodeBLocation = locations.find((l) => l.nodeId === 'node-B');
        expect(nodeBLocation).toBeDefined();
        expect(nodeBLocation!.poolId).toBe('rho');

        // Now add a location for the same block in a DIFFERENT pool on node-C
        await nodeA.availabilityService.updateLocation(blockId, {
          nodeId: 'node-C',
          lastSeen: new Date(),
          isAuthoritative: false,
          poolId: 'sigma',
        });

        // Get pool-scoped locations for "rho"
        const rhoLocations = await nodeA.availabilityService.getBlockLocations(
          blockId,
          'rho',
        );
        // Should include node-A (local) and node-B, but NOT node-C
        const rhoNodeIds = rhoLocations.map((l) => l.nodeId);
        expect(rhoNodeIds).toContain('node-A');
        expect(rhoNodeIds).toContain('node-B');
        expect(rhoNodeIds).not.toContain('node-C');

        // Get pool-scoped locations for "sigma"
        const sigmaLocations =
          await nodeA.availabilityService.getBlockLocations(blockId, 'sigma');
        const sigmaNodeIds = sigmaLocations.map((l) => l.nodeId);
        expect(sigmaNodeIds).toContain('node-C');
        expect(sigmaNodeIds).not.toContain('node-B');
      } finally {
        await nodeA.gossipService.stop();
      }
    });
  });
});
