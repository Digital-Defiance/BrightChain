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
import {
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
} from './cblWhitening';

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

  // === CBL Whitening Operations ===

  /**
   * Store a CBL with XOR whitening for Owner-Free storage.
   *
   * This method:
   * 1. Generates a cryptographically random block (R) of the same size as the CBL
   * 2. XORs the CBL with R to produce the second block (CBL XOR R)
   * 3. Stores both blocks separately
   * 4. Generates parity blocks if durability options specify redundancy
   * 5. Returns the IDs and a magnet URL for reconstruction
   *
   * Note: Due to XOR commutativity, the order of blocks doesn't matter for reconstruction.
   *
   * @param cblData - The original CBL data as Uint8Array
   * @param options - Optional storage options (durability, expiration, encryption flag)
   * @returns Result containing block IDs, parity IDs (if any), and magnet URL
   * @throws StoreError if storage fails
   */
  storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult>;

  /**
   * Retrieve and reconstruct a CBL from its whitened components.
   *
   * This method:
   * 1. Retrieves both blocks (using parity recovery if needed)
   * 2. XORs the blocks to reconstruct the original CBL
   * 3. Validates the reconstructed CBL format (unless encrypted)
   *
   * Note: Due to XOR commutativity, the order of block IDs doesn't matter.
   *
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param block1ParityIds - Optional parity block IDs for block 1 recovery
   * @param block2ParityIds - Optional parity block IDs for block 2 recovery
   * @returns The original CBL data as Uint8Array
   * @throws StoreError if either block is not found or reconstruction fails
   */
  retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array>;

  /**
   * Parse a whitened CBL magnet URL and extract component IDs.
   *
   * Expected format: magnet:?xt=urn:brightchain:cbl&bs=<block_size>&b1=<id>&b2=<id>[&p1=<parity_ids>][&p2=<parity_ids>][&enc=1]
   *
   * @param magnetUrl - The magnet URL to parse
   * @returns Object containing block IDs, block size, parity IDs (if any), and encryption flag
   * @throws Error if the URL format is invalid
   */
  parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents;

  /**
   * Generate a magnet URL for a whitened CBL.
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
  ): string;
}
