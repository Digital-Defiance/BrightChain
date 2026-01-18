import { BaseBlock } from '../../blocks/base';
import { BlockHandle } from '../../blocks/handle';
import { RawDataBlock } from '../../blocks/rawData';
import { BlockSize } from '../../enumerations/blockSize';
import { Checksum } from '../../types/checksum';
import {
  BlockStoreOptions,
  BrightenResult,
  IBlockMetadata,
  RecoveryResult,
} from './blockMetadata';

/**
 * Base interface for block storage operations with FEC durability and replication support.
 *
 * This interface provides:
 * - Core block operations (store, retrieve, delete)
 * - Metadata management for tracking block lifecycle and access patterns
 * - FEC (Forward Error Correction) operations using Reed-Solomon encoding
 * - Replication tracking for distributed storage
 */
export interface IBlockStore {
  /**
   * The block size for this store
   */
  readonly blockSize: BlockSize;

  // === Core Block Operations ===

  /**
   * Check if a block exists
   */
  has(key: Checksum | string): Promise<boolean>;

  /**
   * Get a block's data
   */
  getData(key: Checksum): Promise<RawDataBlock>;

  /**
   * Store a block's data with optional durability settings
   * @param block - The block to store
   * @param options - Optional storage options including durability level and expiration
   */
  setData(block: RawDataBlock, options?: BlockStoreOptions): Promise<void>;

  /**
   * Delete a block's data (and associated parity blocks and metadata)
   */
  deleteData(key: Checksum): Promise<void>;

  /**
   * Get random block checksums from the store
   */
  getRandomBlocks(count: number): Promise<Checksum[]>;

  /**
   * Get a handle to a block (for compatibility with existing code)
   */
  get<T extends BaseBlock>(checksum: Checksum | string): BlockHandle<T>;

  /**
   * Store raw data with a key (convenience method)
   * @param key - The key to store the data under
   * @param data - The raw data to store
   * @param options - Optional storage options including durability level and expiration
   */
  put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void>;

  /**
   * Delete a block (convenience method, alias for deleteData)
   */
  delete(key: Checksum | string): Promise<void>;

  // === Metadata Operations ===

  /**
   * Get metadata for a block
   * @param key - The block's checksum or ID
   * @returns The block's metadata, or null if not found
   */
  getMetadata(key: Checksum | string): Promise<IBlockMetadata | null>;

  /**
   * Update metadata for a block
   * @param key - The block's checksum or ID
   * @param updates - Partial metadata updates to apply
   */
  updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void>;

  // === FEC/Durability Operations ===

  /**
   * Generate parity blocks for a data block using Reed-Solomon encoding
   * @param key - The data block's checksum
   * @param parityCount - Number of parity blocks to generate
   * @returns Array of parity block checksums
   */
  generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]>;

  /**
   * Get parity block checksums for a data block
   * @param key - The data block's checksum or ID
   * @returns Array of parity block checksums
   */
  getParityBlocks(key: Checksum | string): Promise<Checksum[]>;

  /**
   * Attempt to recover a corrupted or missing block using parity data
   * @param key - The block's checksum or ID
   * @returns Recovery result with the recovered block or error
   */
  recoverBlock(key: Checksum | string): Promise<RecoveryResult>;

  /**
   * Verify block integrity against its parity data
   * @param key - The block's checksum or ID
   * @returns True if the block data matches its parity data
   */
  verifyBlockIntegrity(key: Checksum | string): Promise<boolean>;

  // === Replication Operations ===

  /**
   * Get blocks that are pending replication (status = Pending)
   * @returns Array of block checksums pending replication
   */
  getBlocksPendingReplication(): Promise<Checksum[]>;

  /**
   * Get blocks that are under-replicated (status = UnderReplicated)
   * @returns Array of block checksums that need additional replicas
   */
  getUnderReplicatedBlocks(): Promise<Checksum[]>;

  /**
   * Record that a block has been replicated to a node
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that now holds a replica
   */
  recordReplication(key: Checksum | string, nodeId: string): Promise<void>;

  /**
   * Record that a replica node is no longer available
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that lost the replica
   */
  recordReplicaLoss(key: Checksum | string, nodeId: string): Promise<void>;

  // === XOR Brightening Operations ===

  /**
   * Brighten a block by XORing it with random blocks from the store.
   * This is used to implement Owner-Free storage patterns where the
   * original data cannot be reconstructed without all the random blocks.
   *
   * @param key - The source block's checksum or ID
   * @param randomBlockCount - Number of random blocks to XOR with
   * @returns Result containing the brightened block ID and the random block IDs used
   * @throws StoreError if insufficient random blocks are available
   */
  brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult>;
}
