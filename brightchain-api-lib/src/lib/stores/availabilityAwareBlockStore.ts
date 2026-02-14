/**
 * @fileoverview Availability-Aware Block Store Wrapper
 *
 * Wraps an existing IBlockStore implementation to add availability tracking.
 * Provides hooks for registry updates, gossip announcements, access metadata
 * updates, and partition mode operation restrictions.
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import {
  AvailabilityState,
  BaseBlock,
  BlockFetcherConfig,
  BlockHandle,
  BlockStoreOptions,
  BrightenResult,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  DEFAULT_TOMBSTONE_CONFIG,
  FetchQueueConfig,
  FetchTimeoutError,
  IAvailabilityService,
  IBlockFetcher,
  IBlockMetadata,
  IBlockRegistry,
  IBlockStore,
  IGossipService,
  ILocationRecord,
  IPoolDeletionTombstone,
  IReconciliationService,
  isPooledBlockStore,
  PendingBlockError,
  PendingSyncItem,
  PoolDeletionTombstoneConfig,
  PoolDeletionTombstoneError,
  PoolId,
  RawDataBlock,
  ReadConcern,
  RecoveryResult,
} from '@brightchain/brightchain-lib';

// Re-export so existing consumers of this module continue to work
export { PoolDeletionTombstoneError } from '@brightchain/brightchain-lib';

/**
 * Error thrown when an operation is attempted during partition mode
 * that requires network access.
 */
export class PartitionModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartitionModeError';
  }
}

/**
 * Configuration for the AvailabilityAwareBlockStore.
 */
export interface AvailabilityAwareBlockStoreConfig {
  /**
   * The local node's unique identifier.
   */
  localNodeId: string;

  /**
   * Whether to automatically announce blocks via gossip.
   * Default: true
   */
  autoAnnounce?: boolean;

  /**
   * Whether to track access metadata on reads.
   * Default: true
   */
  trackAccess?: boolean;

  /**
   * Default read concern for getData calls when none is specified.
   * Default: ReadConcern.Local (preserves backward compatibility)
   */
  defaultReadConcern?: ReadConcern;

  /**
   * Configuration for the block fetcher service.
   * Only relevant when an IBlockFetcher is provided.
   */
  blockFetcherConfig?: BlockFetcherConfig;

  /**
   * Configuration for the fetch queue.
   * Only relevant when an IBlockFetcher is provided.
   */
  fetchQueueConfig?: FetchQueueConfig;

  /**
   * Tombstone configuration for pool deletion tracking.
   * Default: DEFAULT_TOMBSTONE_CONFIG (7 days TTL)
   */
  tombstoneConfig?: PoolDeletionTombstoneConfig;
}

/**
 * Resolved configuration type for AvailabilityAwareBlockStore.
 * Core fields are required; fetch-related configs remain optional since
 * they are only meaningful when an IBlockFetcher is provided.
 */
export type ResolvedAvailabilityAwareBlockStoreConfig = Omit<
  Required<AvailabilityAwareBlockStoreConfig>,
  'blockFetcherConfig' | 'fetchQueueConfig' | 'tombstoneConfig'
> &
  Pick<
    AvailabilityAwareBlockStoreConfig,
    'blockFetcherConfig' | 'fetchQueueConfig'
  > & {
    tombstoneConfig: PoolDeletionTombstoneConfig;
  };

/**
 * Default configuration values.
 */
export const DEFAULT_AVAILABILITY_AWARE_BLOCK_STORE_CONFIG: ResolvedAvailabilityAwareBlockStoreConfig =
  {
    localNodeId: '',
    autoAnnounce: true,
    trackAccess: true,
    defaultReadConcern: ReadConcern.Local,
    blockFetcherConfig: undefined,
    fetchQueueConfig: undefined,
    tombstoneConfig: DEFAULT_TOMBSTONE_CONFIG,
  };

/**
 * AvailabilityAwareBlockStore
 *
 * Wraps an existing IBlockStore to add availability tracking.
 * Implements the same IBlockStore interface for transparent usage.
 *
 * Features:
 * - Automatic registry updates on store/delete operations
 * - Gossip announcements for new blocks and removals
 * - Access metadata tracking on reads
 * - Partition mode operation restrictions
 * - Pending sync queue for operations during partition mode
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export class AvailabilityAwareBlockStore implements IBlockStore {
  /**
   * The wrapped block store.
   */
  private readonly innerStore: IBlockStore;

  /**
   * Block registry for local block tracking.
   */
  private readonly registry: IBlockRegistry;

  /**
   * Availability service for state management.
   */
  private readonly availabilityService: IAvailabilityService;

  /**
   * Gossip service for announcements.
   */
  private readonly gossipService: IGossipService;

  /**
   * Reconciliation service for pending sync queue.
   */
  private readonly reconciliationService: IReconciliationService;

  /**
   * Configuration.
   */
  private readonly config: ResolvedAvailabilityAwareBlockStoreConfig;

  /**
   * Optional block fetcher for remote block retrieval.
   * When provided, enables Available and Consistent read concerns.
   */
  private readonly blockFetcher?: IBlockFetcher;

  /**
   * Tombstones for deleted pools. Blocks cannot be stored in a pool
   * with an active tombstone until it expires.
   */
  private readonly tombstones: Map<PoolId, IPoolDeletionTombstone> = new Map();

  /**
   * Create a new AvailabilityAwareBlockStore.
   *
   * @param innerStore - The underlying block store to wrap
   * @param registry - Block registry for local block tracking
   * @param availabilityService - Service for availability state management
   * @param gossipService - Service for block announcements
   * @param reconciliationService - Service for pending sync queue
   * @param config - Configuration options
   * @param blockFetcher - Optional block fetcher for remote block retrieval
   */
  constructor(
    innerStore: IBlockStore,
    registry: IBlockRegistry,
    availabilityService: IAvailabilityService,
    gossipService: IGossipService,
    reconciliationService: IReconciliationService,
    config: AvailabilityAwareBlockStoreConfig,
    blockFetcher?: IBlockFetcher,
  ) {
    this.innerStore = innerStore;
    this.registry = registry;
    this.availabilityService = availabilityService;
    this.gossipService = gossipService;
    this.reconciliationService = reconciliationService;
    this.config = {
      ...DEFAULT_AVAILABILITY_AWARE_BLOCK_STORE_CONFIG,
      ...config,
    };
    this.blockFetcher = blockFetcher;
  }

  /**
   * Get the block size for this store.
   */
  get blockSize() {
    return this.innerStore.blockSize;
  }

  // === Core Block Operations ===

  /**
   * Check if a block exists.
   *
   * @param key - The block's checksum or ID
   * @returns Promise resolving to true if the block exists
   */
  async has(key: Checksum | string): Promise<boolean> {
    return this.innerStore.has(key);
  }

  /**
   * Get a block's data with optional read concern.
   * Updates access metadata if tracking is enabled.
   *
   * Read concern behavior:
   * - Local (default): return only locally available blocks, error for remote/unknown
   * - Consistent: await remote fetch, store result, return or timeout
   * - Available: try fetch with initialWaitMs, return PendingBlockError if not resolved
   *
   * During partition mode, remote blocks always throw PartitionModeError
   * regardless of read concern.
   *
   * @param key - The block's checksum
   * @param readConcern - Optional read concern level (defaults to config.defaultReadConcern)
   * @returns Promise resolving to the block data
   * @throws PartitionModeError if block is remote and system is in partition mode
   * @throws PendingBlockError if Available concern and fetch not resolved in time
   * @throws FetchTimeoutError if Consistent concern and fetch exceeds timeout
   * @throws Error if block not found locally and concern is Local
   * @see Requirements 2.2, 2.3, 2.4, 2.5, 7.3
   */
  async getData(
    key: Checksum,
    readConcern?: ReadConcern,
  ): Promise<RawDataBlock> {
    const blockId = this.keyToHex(key);
    const concern = readConcern ?? this.config.defaultReadConcern;

    // Step 1: Check partition mode for remote blocks BEFORE trying inner store.
    // This preserves the original contract: remote blocks are inaccessible during partition
    // regardless of whether the data happens to be in the inner store.
    if (this.availabilityService.isInPartitionMode()) {
      const state =
        await this.availabilityService.getAvailabilityState(blockId);
      if (state === AvailabilityState.Remote) {
        throw new PartitionModeError(
          `Cannot access remote block ${blockId} during partition mode`,
        );
      }
    }

    // Step 2: Try inner store first
    try {
      const block = await this.innerStore.getData(key);

      // Update access metadata if tracking is enabled
      if (this.config.trackAccess) {
        await this.updateAccessMetadata(blockId);
      }

      return block;
    } catch {
      // Block not found locally — fall through to read concern logic
    }

    // Step 3: Block not found locally — check availability state
    const state = await this.availabilityService.getAvailabilityState(blockId);

    // Step 4: Apply read concern logic
    if (concern === ReadConcern.Local) {
      // Local concern: only return locally available blocks
      throw new Error(`Block ${blockId} not found locally (state: ${state})`);
    }

    // For Available and Consistent concerns, we need a block fetcher
    if (!this.blockFetcher) {
      throw new Error(
        `Block ${blockId} not found locally and no block fetcher configured (state: ${state})`,
      );
    }

    // Only attempt remote fetch for Remote state
    if (state !== AvailabilityState.Remote) {
      throw new Error(`Block ${blockId} not found (state: ${state})`);
    }

    if (concern === ReadConcern.Consistent) {
      return this.fetchBlockConsistent(key, blockId);
    }

    // ReadConcern.Available
    return this.fetchBlockAvailable(key, blockId);
  }

  /**
   * Fetch a block with Consistent read concern.
   * Awaits the full fetch result — returns the block or throws on timeout/failure.
   *
   * @see Requirements 2.4, 2.5
   */
  private async fetchBlockConsistent(
    key: Checksum,
    blockId: string,
  ): Promise<RawDataBlock> {
    const result = await this.blockFetcher!.fetchBlock(blockId);

    if (!result.success) {
      const fetcherConfig = this.blockFetcher!.getConfig();
      throw new FetchTimeoutError(blockId, fetcherConfig.fetchTimeoutMs);
    }

    // Store the fetched block locally and update state to Cached
    await this.innerStore.put(blockId, result.data!);
    await this.availabilityService.setAvailabilityState(
      blockId,
      AvailabilityState.Cached,
    );

    // Update access metadata if tracking is enabled
    if (this.config.trackAccess) {
      await this.updateAccessMetadata(blockId);
    }

    // Return the block from the inner store (now stored locally)
    return this.innerStore.getData(key);
  }

  /**
   * Fetch a block with Available read concern.
   * Tries to fetch within initialWaitMs; throws PendingBlockError if not resolved in time.
   *
   * @see Requirements 2.3
   */
  private async fetchBlockAvailable(
    key: Checksum,
    blockId: string,
  ): Promise<RawDataBlock> {
    const fetcherConfig = this.blockFetcher!.getConfig();
    const initialWaitMs = fetcherConfig.initialWaitMs;

    const fetchPromise = this.blockFetcher!.fetchBlock(blockId);

    // Race the fetch against the initial wait timeout
    const result = await Promise.race([
      fetchPromise.then((r) => ({ kind: 'result' as const, value: r })),
      new Promise<{ kind: 'timeout' }>((resolve) =>
        setTimeout(() => resolve({ kind: 'timeout' }), initialWaitMs),
      ),
    ]);

    if (result.kind === 'timeout') {
      // Fetch didn't complete in time — throw PendingBlockError
      const locations =
        await this.availabilityService.getBlockLocations(blockId);
      throw new PendingBlockError(
        blockId,
        AvailabilityState.Remote,
        locations.map((loc) => loc.nodeId),
      );
    }

    // Fetch completed within initialWaitMs
    if (!result.value.success) {
      // Fetch failed — still throw PendingBlockError since the block may become available later
      const locations =
        await this.availabilityService.getBlockLocations(blockId);
      throw new PendingBlockError(
        blockId,
        AvailabilityState.Remote,
        locations.map((loc) => loc.nodeId),
      );
    }

    // Store the fetched block locally and update state to Cached
    await this.innerStore.put(blockId, result.value.data!);
    await this.availabilityService.setAvailabilityState(
      blockId,
      AvailabilityState.Cached,
    );

    // Update access metadata if tracking is enabled
    if (this.config.trackAccess) {
      await this.updateAccessMetadata(blockId);
    }

    // Return the block from the inner store
    return this.innerStore.getData(key);
  }

  /**
   * Store a block's data with optional durability settings.
   * Updates registry, availability state, and announces via gossip.
   *
   * @param block - The block to store
   * @param options - Optional storage options
   * @see Requirements 12.2, 8.1, 8.3, 8.5
   */
  async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const blockId = this.keyToHex(block.idChecksum);

    // Look up pool context from the inner store's metadata
    // (metadata may already exist if the block was previously stored)
    const existingMetadata = await this.innerStore.getMetadata(blockId);
    const poolId: PoolId | undefined = existingMetadata?.poolId;

    // Check tombstone — reject if pool was deleted
    if (poolId && this.hasTombstone(poolId)) {
      throw new PoolDeletionTombstoneError(poolId);
    }

    // Store in inner store first
    await this.innerStore.setData(block, options);

    // Re-read metadata after store in case it was created during setData
    const storedMetadata = await this.innerStore.getMetadata(blockId);
    const resolvedPoolId: PoolId | undefined = poolId ?? storedMetadata?.poolId;

    // Check tombstone again with resolved poolId (in case metadata was created during store)
    if (resolvedPoolId && !poolId && this.hasTombstone(resolvedPoolId)) {
      throw new PoolDeletionTombstoneError(resolvedPoolId);
    }

    // Update registry with pool context
    this.registry.addLocal(blockId, resolvedPoolId);

    // Update availability state to Local
    await this.availabilityService.setAvailabilityState(
      blockId,
      AvailabilityState.Local,
    );

    // Update location metadata with pool context
    const locationRecord: ILocationRecord = {
      nodeId: this.config.localNodeId,
      lastSeen: new Date(),
      isAuthoritative: true,
      ...(resolvedPoolId ? { poolId: resolvedPoolId } : {}),
    };
    await this.availabilityService.updateLocation(blockId, locationRecord);

    // Handle partition mode - add to pending sync queue
    if (this.availabilityService.isInPartitionMode()) {
      const syncItem: PendingSyncItem = {
        type: 'store',
        blockId,
        timestamp: new Date(),
        data: block.data,
      };
      this.reconciliationService.addToPendingSyncQueue(syncItem);
    } else if (this.config.autoAnnounce) {
      // Announce to network via gossip with pool context
      await this.gossipService.announceBlock(blockId, resolvedPoolId);
    }
  }

  /**
   * Delete a block's data.
   * Updates registry, availability state, and announces removal via gossip.
   *
   * @param key - The block's checksum
   * @see Requirements 12.3, 8.3, 8.5
   */
  async deleteData(key: Checksum): Promise<void> {
    const blockId = this.keyToHex(key);

    // Look up pool context before deletion
    const metadata = await this.innerStore.getMetadata(blockId);
    const poolId: PoolId | undefined = metadata?.poolId;

    // Delete from inner store first
    await this.innerStore.deleteData(key);

    // Update registry
    this.registry.removeLocal(blockId);

    // Remove local location
    await this.availabilityService.removeLocation(
      blockId,
      this.config.localNodeId,
    );

    // Handle partition mode - add to pending sync queue
    if (this.availabilityService.isInPartitionMode()) {
      const syncItem: PendingSyncItem = {
        type: 'delete',
        blockId,
        timestamp: new Date(),
      };
      this.reconciliationService.addToPendingSyncQueue(syncItem);
    } else if (this.config.autoAnnounce) {
      // Announce removal to network via gossip with pool context
      await this.gossipService.announceRemoval(blockId, poolId);
    }
  }

  /**
   * Get random block checksums from the store.
   *
   * @param count - Maximum number of blocks to return
   * @returns Array of random block checksums
   */
  async getRandomBlocks(count: number): Promise<Checksum[]> {
    return this.innerStore.getRandomBlocks(count);
  }

  /**
   * Get a handle to a block.
   *
   * @param checksum - The block's checksum or ID
   * @returns Block handle
   */
  get<T extends BaseBlock>(checksum: Checksum | string): BlockHandle<T> {
    return this.innerStore.get<T>(checksum);
  }

  /**
   * Store raw data with a key.
   *
   * @param key - The key to store the data under
   * @param data - The raw data to store
   * @param options - Optional storage options
   */
  async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    const blockId = this.keyToHex(keyChecksum);

    // Delegate to inner store
    await this.innerStore.put(key, data, options);

    // Update registry
    this.registry.addLocal(blockId);

    // Update availability state to Local
    await this.availabilityService.setAvailabilityState(
      blockId,
      AvailabilityState.Local,
    );

    // Update location metadata
    const locationRecord: ILocationRecord = {
      nodeId: this.config.localNodeId,
      lastSeen: new Date(),
      isAuthoritative: true,
    };
    await this.availabilityService.updateLocation(blockId, locationRecord);

    // Handle partition mode
    if (this.availabilityService.isInPartitionMode()) {
      const syncItem: PendingSyncItem = {
        type: 'store',
        blockId,
        timestamp: new Date(),
        data: new Uint8Array(data),
      };
      this.reconciliationService.addToPendingSyncQueue(syncItem);
    } else if (this.config.autoAnnounce) {
      await this.gossipService.announceBlock(blockId);
    }
  }

  /**
   * Delete a block.
   *
   * @param key - The block's checksum or ID
   */
  async delete(key: Checksum | string): Promise<void> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    await this.deleteData(keyChecksum);
  }

  // === Metadata Operations ===

  /**
   * Get metadata for a block.
   *
   * @param key - The block's checksum or ID
   * @returns The block's metadata, or null if not found
   */
  async getMetadata(key: Checksum | string): Promise<IBlockMetadata | null> {
    return this.innerStore.getMetadata(key);
  }

  /**
   * Update metadata for a block.
   *
   * @param key - The block's checksum or ID
   * @param updates - Partial metadata updates to apply
   */
  async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    return this.innerStore.updateMetadata(key, updates);
  }

  // === FEC/Durability Operations ===

  /**
   * Generate parity blocks for a data block.
   *
   * @param key - The data block's checksum
   * @param parityCount - Number of parity blocks to generate
   * @returns Array of parity block checksums
   */
  async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    return this.innerStore.generateParityBlocks(key, parityCount);
  }

  /**
   * Get parity block checksums for a data block.
   *
   * @param key - The data block's checksum or ID
   * @returns Array of parity block checksums
   */
  async getParityBlocks(key: Checksum | string): Promise<Checksum[]> {
    return this.innerStore.getParityBlocks(key);
  }

  /**
   * Attempt to recover a corrupted or missing block.
   *
   * @param key - The block's checksum or ID
   * @returns Recovery result
   */
  async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    return this.innerStore.recoverBlock(key);
  }

  /**
   * Verify block integrity against its parity data.
   *
   * @param key - The block's checksum or ID
   * @returns True if the block data matches its parity data
   */
  async verifyBlockIntegrity(key: Checksum | string): Promise<boolean> {
    return this.innerStore.verifyBlockIntegrity(key);
  }

  // === Replication Operations ===

  /**
   * Get blocks that are pending replication, scoped by pool.
   *
   * A block's replication count for pool P = number of distinct nodes
   * with a location record for that block with poolId: P.
   * Blocks without a poolId use the inner store's default pending check.
   *
   * @returns Array of block checksums pending replication
   * @see Requirements 6.1, 6.2
   */
  async getBlocksPendingReplication(): Promise<Checksum[]> {
    const pendingFromInner =
      await this.innerStore.getBlocksPendingReplication();
    const result: Checksum[] = [];

    for (const checksum of pendingFromInner) {
      const blockId = this.keyToHex(checksum);
      const metadata = await this.innerStore.getMetadata(blockId);

      if (!metadata?.poolId) {
        // No pool context — use inner store's determination
        result.push(checksum);
        continue;
      }

      // Pool-scoped: count distinct nodes with matching poolId
      const locations =
        await this.availabilityService.getBlockLocations(blockId);
      const poolReplicaCount = this.countPoolScopedReplicas(
        locations,
        metadata.poolId,
      );

      // Still pending if no pool-scoped replicas exist (excluding local node)
      if (poolReplicaCount <= 1) {
        result.push(checksum);
      }
    }

    return result;
  }

  /**
   * Get blocks that are under-replicated, scoped by pool.
   *
   * A block's replication count for pool P = number of distinct nodes
   * with a location record for that block with poolId: P.
   * Under-replicated when pool-scoped replica count < targetReplicationFactor.
   *
   * @returns Array of block checksums that need additional replicas
   * @see Requirements 6.1, 6.2
   */
  async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    const underReplicatedFromInner =
      await this.innerStore.getUnderReplicatedBlocks();
    const result: Checksum[] = [];

    for (const checksum of underReplicatedFromInner) {
      const blockId = this.keyToHex(checksum);
      const metadata = await this.innerStore.getMetadata(blockId);

      if (!metadata?.poolId) {
        // No pool context — use inner store's determination
        result.push(checksum);
        continue;
      }

      // Pool-scoped: count distinct nodes with matching poolId
      const locations =
        await this.availabilityService.getBlockLocations(blockId);
      const poolReplicaCount = this.countPoolScopedReplicas(
        locations,
        metadata.poolId,
      );

      // Under-replicated if pool-scoped replicas < target
      if (poolReplicaCount < metadata.targetReplicationFactor) {
        result.push(checksum);
      }
    }

    return result;
  }

  /**
   * Record that a block has been replicated to a node.
   * Includes poolId in the location record when the block belongs to a pool.
   *
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that now holds a replica
   * @see Requirements 6.1, 6.2
   */
  async recordReplication(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const blockId = this.keyToHex(key);

    // Record in inner store
    await this.innerStore.recordReplication(key, nodeId);

    // Look up pool context from block metadata
    const metadata = await this.innerStore.getMetadata(blockId);
    const poolId: PoolId | undefined = metadata?.poolId;

    // Update location metadata with pool context
    const locationRecord: ILocationRecord = {
      nodeId,
      lastSeen: new Date(),
      isAuthoritative: false,
      ...(poolId ? { poolId } : {}),
    };
    await this.availabilityService.updateLocation(blockId, locationRecord);
  }

  /**
   * Count the number of distinct nodes with a location record
   * for a block that matches the given poolId.
   *
   * @param locations - All location records for the block
   * @param poolId - The pool to scope the count to
   * @returns Number of distinct nodes with matching poolId
   */
  private countPoolScopedReplicas(
    locations: ILocationRecord[],
    poolId: PoolId,
  ): number {
    const nodeIds = new Set<string>();
    for (const loc of locations) {
      if (loc.poolId === poolId) {
        nodeIds.add(loc.nodeId);
      }
    }
    return nodeIds.size;
  }

  /**
   * Record that a replica node is no longer available.
   *
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that lost the replica
   */
  async recordReplicaLoss(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const blockId = this.keyToHex(key);

    // Record in inner store
    await this.innerStore.recordReplicaLoss(key, nodeId);

    // Remove location
    await this.availabilityService.removeLocation(blockId, nodeId);
  }

  // === XOR Brightening Operations ===

  /**
   * Brighten a block by XORing it with random blocks.
   *
   * @param key - The source block's checksum or ID
   * @param randomBlockCount - Number of random blocks to XOR with
   * @returns Result containing the brightened block ID and random block IDs
   */
  async brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    const result = await this.innerStore.brightenBlock(key, randomBlockCount);

    // Update registry and availability for the brightened block
    this.registry.addLocal(result.brightenedBlockId);

    await this.availabilityService.setAvailabilityState(
      result.brightenedBlockId,
      AvailabilityState.Local,
    );

    const locationRecord: ILocationRecord = {
      nodeId: this.config.localNodeId,
      lastSeen: new Date(),
      isAuthoritative: true,
    };
    await this.availabilityService.updateLocation(
      result.brightenedBlockId,
      locationRecord,
    );

    // Announce if not in partition mode
    if (
      !this.availabilityService.isInPartitionMode() &&
      this.config.autoAnnounce
    ) {
      await this.gossipService.announceBlock(result.brightenedBlockId);
    }

    return result;
  }

  // === Pool Deletion ===

  /**
   * Handle a pool deletion event (triggered by a gossip `pool_deleted` announcement).
   * Records a tombstone, removes all blocks in the pool from the local store,
   * and removes pool entries from the registry.
   *
   * @param poolId - The pool that was deleted
   * @param originNodeId - The node that originated the deletion
   * @see Requirements 2.3, 2.4, 2.5
   */
  async handlePoolDeletion(
    poolId: PoolId,
    originNodeId: string,
  ): Promise<void> {
    // Record tombstone
    this.tombstones.set(poolId, {
      poolId,
      deletedAt: new Date(),
      expiresAt: new Date(
        Date.now() + this.config.tombstoneConfig.tombstoneTtlMs,
      ),
      originNodeId,
    });

    // Remove all blocks in the pool from local store
    if (isPooledBlockStore(this.innerStore)) {
      await this.innerStore.forceDeletePool(poolId);
    }

    // Remove from registry (bulk removal by pool)
    // The registry's removeLocal with poolId handles per-block removal;
    // for bulk removal we rely on the pool-scoped manifest to identify blocks.
    // Future task 11.1 will add pool-aware registry internals.
  }

  // === Helper Methods ===

  /**
   * Check if a pool has an active deletion tombstone.
   * Cleans up expired tombstones automatically.
   *
   * @param poolId - The pool ID to check
   * @returns True if an active (non-expired) tombstone exists
   */
  private hasTombstone(poolId: PoolId): boolean {
    const tombstone = this.tombstones.get(poolId);
    if (!tombstone) return false;
    if (new Date() > tombstone.expiresAt) {
      this.tombstones.delete(poolId); // Clean up expired
      return false;
    }
    return true;
  }

  /**
   * Convert a key to hex string format.
   */
  private keyToHex(key: Checksum | string): string {
    return typeof key === 'string' ? key : key.toHex();
  }

  /**
   * Update access metadata for a block.
   */
  private async updateAccessMetadata(blockId: string): Promise<void> {
    try {
      // Update location record with new lastSeen timestamp
      const locationRecord: ILocationRecord = {
        nodeId: this.config.localNodeId,
        lastSeen: new Date(),
        isAuthoritative: true,
      };
      await this.availabilityService.updateLocation(blockId, locationRecord);
    } catch {
      // Ignore errors updating access metadata
    }
  }

  // === Partition Mode Helpers ===

  /**
   * Check if the store is in partition mode.
   *
   * @returns True if in partition mode
   */
  isInPartitionMode(): boolean {
    return this.availabilityService.isInPartitionMode();
  }

  /**
   * Get the underlying block store.
   * Use with caution - bypasses availability tracking.
   *
   * @returns The inner block store
   */
  getInnerStore(): IBlockStore {
    return this.innerStore;
  }

  /**
   * Get the block registry.
   *
   * @returns The block registry
   */
  getRegistry(): IBlockRegistry {
    return this.registry;
  }

  /**
   * Get the availability service.
   *
   * @returns The availability service
   */
  getAvailabilityService(): IAvailabilityService {
    return this.availabilityService;
  }

  /**
   * Get the gossip service.
   *
   * @returns The gossip service
   */
  getGossipService(): IGossipService {
    return this.gossipService;
  }

  /**
   * Get the reconciliation service.
   *
   * @returns The reconciliation service
   */
  getReconciliationService(): IReconciliationService {
    return this.reconciliationService;
  }

  /**
   * Get the configuration.
   *
   * @returns The configuration
   */
  getConfig(): ResolvedAvailabilityAwareBlockStoreConfig {
    return { ...this.config };
  }

  // === CBL Whitening Operations ===

  /**
   * Store a CBL with XOR whitening for Owner-Free storage.
   * Delegates to the inner store and updates availability tracking for both blocks.
   *
   * @param cblData - The original CBL data as Uint8Array
   * @param options - Optional storage options (durability, expiration, encryption flag)
   * @returns Result containing block IDs, parity IDs (if any), and magnet URL
   * @throws StoreError if storage fails
   */
  async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    // Delegate to inner store
    const result = await this.innerStore.storeCBLWithWhitening(
      cblData,
      options,
    );

    // Update registry and availability for both blocks
    this.registry.addLocal(result.blockId1);
    this.registry.addLocal(result.blockId2);

    await this.availabilityService.setAvailabilityState(
      result.blockId1,
      AvailabilityState.Local,
    );
    await this.availabilityService.setAvailabilityState(
      result.blockId2,
      AvailabilityState.Local,
    );

    // Update location metadata for both blocks
    const locationRecord: ILocationRecord = {
      nodeId: this.config.localNodeId,
      lastSeen: new Date(),
      isAuthoritative: true,
    };
    await this.availabilityService.updateLocation(
      result.blockId1,
      locationRecord,
    );
    await this.availabilityService.updateLocation(
      result.blockId2,
      locationRecord,
    );

    // Handle partition mode or announce
    if (this.availabilityService.isInPartitionMode()) {
      // Add both blocks to pending sync queue
      const syncItem1: PendingSyncItem = {
        type: 'store',
        blockId: result.blockId1,
        timestamp: new Date(),
      };
      const syncItem2: PendingSyncItem = {
        type: 'store',
        blockId: result.blockId2,
        timestamp: new Date(),
      };
      this.reconciliationService.addToPendingSyncQueue(syncItem1);
      this.reconciliationService.addToPendingSyncQueue(syncItem2);
    } else if (this.config.autoAnnounce) {
      // Announce both blocks to network via gossip
      await this.gossipService.announceBlock(result.blockId1);
      await this.gossipService.announceBlock(result.blockId2);
    }

    return result;
  }

  /**
   * Retrieve and reconstruct a CBL from its whitened components.
   * Delegates to the inner store.
   *
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param block1ParityIds - Optional parity block IDs for block 1 recovery
   * @param block2ParityIds - Optional parity block IDs for block 2 recovery
   * @returns The original CBL data as Uint8Array
   * @throws StoreError if either block is not found or reconstruction fails
   */
  async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    const b1Id = this.keyToHex(blockId1);
    const b2Id = this.keyToHex(blockId2);

    // Check availability state for remote blocks during partition mode
    if (this.availabilityService.isInPartitionMode()) {
      const state1 = await this.availabilityService.getAvailabilityState(b1Id);
      const state2 = await this.availabilityService.getAvailabilityState(b2Id);

      if (state1 === AvailabilityState.Remote) {
        throw new PartitionModeError(
          `Cannot access remote block ${b1Id} during partition mode`,
        );
      }
      if (state2 === AvailabilityState.Remote) {
        throw new PartitionModeError(
          `Cannot access remote block ${b2Id} during partition mode`,
        );
      }
    }

    // Delegate to inner store
    const cblData = await this.innerStore.retrieveCBL(
      blockId1,
      blockId2,
      block1ParityIds,
      block2ParityIds,
    );

    // Update access metadata if tracking is enabled
    if (this.config.trackAccess) {
      await this.updateAccessMetadata(b1Id);
      await this.updateAccessMetadata(b2Id);
    }

    return cblData;
  }

  /**
   * Parse a whitened CBL magnet URL and extract component IDs.
   * Delegates to the inner store.
   *
   * @param magnetUrl - The magnet URL to parse
   * @returns Object containing block IDs, block size, parity IDs (if any), and encryption flag
   * @throws Error if the URL format is invalid
   */
  parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    return this.innerStore.parseCBLMagnetUrl(magnetUrl);
  }

  /**
   * Generate a magnet URL for a whitened CBL.
   * Delegates to the inner store.
   *
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param blockSize - Block size in bytes
   * @param block1ParityIds - Optional parity block IDs for block 1
   * @param block2ParityIds - Optional parity block IDs for block 2
   * @param isEncrypted - Whether the CBL is encrypted
   * @returns The magnet URL string
   */
  generateCBLMagnetUrl(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    blockSize: number,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
    isEncrypted?: boolean,
  ): string {
    return this.innerStore.generateCBLMagnetUrl(
      blockId1,
      blockId2,
      blockSize,
      block1ParityIds,
      block2ParityIds,
      isEncrypted,
    );
  }
}
