/* eslint-disable @nx/enforce-module-boundaries */
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
  BlockHandle,
  BlockStoreOptions,
  BrightenResult,
  IAvailabilityService,
  IBlockMetadata,
  IBlockRegistry,
  IBlockStore,
  IGossipService,
  ILocationRecord,
  IReconciliationService,
  PendingSyncItem,
  RawDataBlock,
  RecoveryResult,
} from '@brightchain/brightchain-lib';
import {
  ChecksumUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';

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
}

/**
 * Default configuration values.
 */
export const DEFAULT_AVAILABILITY_AWARE_BLOCK_STORE_CONFIG: Required<AvailabilityAwareBlockStoreConfig> =
  {
    localNodeId: '',
    autoAnnounce: true,
    trackAccess: true,
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
  private readonly config: Required<AvailabilityAwareBlockStoreConfig>;

  /**
   * Create a new AvailabilityAwareBlockStore.
   *
   * @param innerStore - The underlying block store to wrap
   * @param registry - Block registry for local block tracking
   * @param availabilityService - Service for availability state management
   * @param gossipService - Service for block announcements
   * @param reconciliationService - Service for pending sync queue
   * @param config - Configuration options
   */
  constructor(
    innerStore: IBlockStore,
    registry: IBlockRegistry,
    availabilityService: IAvailabilityService,
    gossipService: IGossipService,
    reconciliationService: IReconciliationService,
    config: AvailabilityAwareBlockStoreConfig,
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
  async has(key: ChecksumUint8Array | string): Promise<boolean> {
    return this.innerStore.has(key);
  }

  /**
   * Get a block's data.
   * Updates access metadata if tracking is enabled.
   *
   * @param key - The block's checksum
   * @returns Promise resolving to the block data
   * @throws StoreError if block not found
   * @see Requirements 12.4
   */
  async getData(key: ChecksumUint8Array): Promise<RawDataBlock> {
    const blockId = this.keyToHex(key);

    // Check availability state for remote blocks during partition mode
    if (this.availabilityService.isInPartitionMode()) {
      const state =
        await this.availabilityService.getAvailabilityState(blockId);
      if (state === AvailabilityState.Remote) {
        throw new PartitionModeError(
          `Cannot access remote block ${blockId} during partition mode`,
        );
      }
    }

    // Delegate to inner store
    const block = await this.innerStore.getData(key);

    // Update access metadata if tracking is enabled
    if (this.config.trackAccess) {
      await this.updateAccessMetadata(blockId);
    }

    return block;
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

    // Store in inner store first
    await this.innerStore.setData(block, options);

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
      // Announce to network via gossip
      await this.gossipService.announceBlock(blockId);
    }
  }

  /**
   * Delete a block's data.
   * Updates registry, availability state, and announces removal via gossip.
   *
   * @param key - The block's checksum
   * @see Requirements 12.3, 8.3, 8.5
   */
  async deleteData(key: ChecksumUint8Array): Promise<void> {
    const blockId = this.keyToHex(key);

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
      // Announce removal to network via gossip
      await this.gossipService.announceRemoval(blockId);
    }
  }

  /**
   * Get random block checksums from the store.
   *
   * @param count - Maximum number of blocks to return
   * @returns Array of random block checksums
   */
  async getRandomBlocks(count: number): Promise<ChecksumUint8Array[]> {
    return this.innerStore.getRandomBlocks(count);
  }

  /**
   * Get a handle to a block.
   *
   * @param checksum - The block's checksum or ID
   * @returns Block handle
   */
  get<T extends BaseBlock>(
    checksum: ChecksumUint8Array | string,
  ): BlockHandle<T> {
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
    key: ChecksumUint8Array | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyBuffer =
      typeof key === 'string'
        ? (Buffer.from(key, 'hex') as unknown as ChecksumUint8Array)
        : key;
    const blockId = this.keyToHex(keyBuffer);

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
  async delete(key: ChecksumUint8Array | string): Promise<void> {
    const keyBuffer =
      typeof key === 'string'
        ? (Buffer.from(key, 'hex') as unknown as ChecksumUint8Array)
        : key;
    await this.deleteData(keyBuffer);
  }

  // === Metadata Operations ===

  /**
   * Get metadata for a block.
   *
   * @param key - The block's checksum or ID
   * @returns The block's metadata, or null if not found
   */
  async getMetadata(
    key: ChecksumUint8Array | string,
  ): Promise<IBlockMetadata | null> {
    return this.innerStore.getMetadata(key);
  }

  /**
   * Update metadata for a block.
   *
   * @param key - The block's checksum or ID
   * @param updates - Partial metadata updates to apply
   */
  async updateMetadata(
    key: ChecksumUint8Array | string,
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
    key: ChecksumUint8Array | string,
    parityCount: number,
  ): Promise<ChecksumUint8Array[]> {
    return this.innerStore.generateParityBlocks(key, parityCount);
  }

  /**
   * Get parity block checksums for a data block.
   *
   * @param key - The data block's checksum or ID
   * @returns Array of parity block checksums
   */
  async getParityBlocks(
    key: ChecksumUint8Array | string,
  ): Promise<ChecksumUint8Array[]> {
    return this.innerStore.getParityBlocks(key);
  }

  /**
   * Attempt to recover a corrupted or missing block.
   *
   * @param key - The block's checksum or ID
   * @returns Recovery result
   */
  async recoverBlock(
    key: ChecksumUint8Array | string,
  ): Promise<RecoveryResult> {
    return this.innerStore.recoverBlock(key);
  }

  /**
   * Verify block integrity against its parity data.
   *
   * @param key - The block's checksum or ID
   * @returns True if the block data matches its parity data
   */
  async verifyBlockIntegrity(
    key: ChecksumUint8Array | string,
  ): Promise<boolean> {
    return this.innerStore.verifyBlockIntegrity(key);
  }

  // === Replication Operations ===

  /**
   * Get blocks that are pending replication.
   *
   * @returns Array of block checksums pending replication
   */
  async getBlocksPendingReplication(): Promise<ChecksumUint8Array[]> {
    return this.innerStore.getBlocksPendingReplication();
  }

  /**
   * Get blocks that are under-replicated.
   *
   * @returns Array of block checksums that need additional replicas
   */
  async getUnderReplicatedBlocks(): Promise<ChecksumUint8Array[]> {
    return this.innerStore.getUnderReplicatedBlocks();
  }

  /**
   * Record that a block has been replicated to a node.
   *
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that now holds a replica
   */
  async recordReplication(
    key: ChecksumUint8Array | string,
    nodeId: string,
  ): Promise<void> {
    const blockId = this.keyToHex(key);

    // Record in inner store
    await this.innerStore.recordReplication(key, nodeId);

    // Update location metadata
    const locationRecord: ILocationRecord = {
      nodeId,
      lastSeen: new Date(),
      isAuthoritative: false,
    };
    await this.availabilityService.updateLocation(blockId, locationRecord);
  }

  /**
   * Record that a replica node is no longer available.
   *
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that lost the replica
   */
  async recordReplicaLoss(
    key: ChecksumUint8Array | string,
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
    key: ChecksumUint8Array | string,
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

  // === Helper Methods ===

  /**
   * Convert a key to hex string format.
   */
  private keyToHex(key: ChecksumUint8Array | string): string {
    return typeof key === 'string' ? key : uint8ArrayToHex(key);
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
  getConfig(): Required<AvailabilityAwareBlockStoreConfig> {
    return { ...this.config };
  }
}
