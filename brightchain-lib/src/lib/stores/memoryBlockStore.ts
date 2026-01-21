/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseBlock } from '../blocks/base';
import { BlockHandle, createBlockHandle } from '../blocks/handle';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import {
  DurabilityLevel,
  getParityCountForDurability,
} from '../enumerations/durabilityLevel';
import { FecErrorType } from '../enumerations/fecErrorType';
import { ReplicationStatus } from '../enumerations/replicationStatus';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { FecError } from '../errors/fecError';
import { StoreError } from '../errors/storeError';
import { IFecService, ParityData } from '../interfaces/services/fecService';
import {
  BlockStoreOptions,
  BrightenResult,
  createDefaultBlockMetadata,
  IBlockMetadata,
  RecoveryResult,
} from '../interfaces/storage/blockMetadata';
import { IBlockStore } from '../interfaces/storage/blockStore';
import {
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
} from '../interfaces/storage/cblWhitening';
import { ServiceLocator } from '../services/serviceLocator';
import { XorService } from '../services/xor';
import { Checksum } from '../types/checksum';
import { padToBlockSize, unpadCblData, xorArrays } from '../utils/xorUtils';
import { MemoryBlockMetadataStore } from './memoryBlockMetadataStore';

/**
 * Browser-compatible in-memory block store using Uint8Array.
 *
 * This implementation supports:
 * - Core block operations (store, retrieve, delete)
 * - Metadata management for tracking block lifecycle and access patterns
 * - FEC (Forward Error Correction) operations using Reed-Solomon encoding (when FEC service is provided)
 * - Replication tracking for distributed storage
 *
 * @see IBlockStore for the interface definition
 */
export class MemoryBlockStore implements IBlockStore {
  private readonly blocks = new Map<string, RawDataBlock>();
  private readonly _blockSize: BlockSize;

  /**
   * Optional FEC service for parity generation and recovery.
   * If not provided, FEC operations will return errors or no-ops.
   */
  private readonly fecService: IFecService | null;

  /**
   * Metadata store for tracking block lifecycle and access patterns.
   */
  private readonly metadataStore: MemoryBlockMetadataStore;

  /**
   * In-memory storage for parity block data.
   * Key is the data block ID, value is array of parity data.
   */
  private readonly parityBlocks = new Map<string, ParityData[]>();

  /**
   * Create a new MemoryBlockStore.
   * @param blockSize - The block size for this store
   * @param fecService - Optional FEC service for parity generation and recovery
   * @param metadataStore - Optional metadata store (creates new one if not provided)
   */
  constructor(
    blockSize: BlockSize,
    fecService?: IFecService | null,
    metadataStore?: MemoryBlockMetadataStore,
  ) {
    this._blockSize = blockSize;
    this.fecService = fecService ?? null;
    this.metadataStore = metadataStore ?? new MemoryBlockMetadataStore();
  }

  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * Get the FEC service if available.
   * @returns The FEC service or null if not available
   */
  public getFecService(): IFecService | null {
    return this.fecService;
  }

  /**
   * Get the metadata store.
   * @returns The metadata store
   */
  public getMetadataStore(): MemoryBlockMetadataStore {
    return this.metadataStore;
  }

  /**
   * Convert a key to hex string format.
   * @param key - The key as Checksum or string
   * @returns The key as hex string
   */
  private keyToHex(key: Checksum | string): string {
    return typeof key === 'string' ? key : key.toHex();
  }

  /**
   * Convert a hex string to Checksum.
   * @param hex - The hex string
   * @returns The Checksum
   */
  private hexToChecksum(hex: string): Checksum {
    return Checksum.fromHex(hex);
  }

  /**
   * Check if a block exists
   */
  public async has(key: Checksum | string): Promise<boolean> {
    const keyHex = this.keyToHex(key);
    return this.blocks.has(keyHex);
  }

  /**
   * Get a block's data
   */
  public async getData(key: Checksum): Promise<RawDataBlock> {
    const keyHex = this.keyToHex(key);
    const block = this.blocks.get(keyHex);
    if (!block) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    // Record access in metadata
    if (this.metadataStore.has(keyHex)) {
      await this.metadataStore.recordAccess(keyHex);
    }

    return block;
  }

  /**
   * Store a block's data with optional durability settings.
   * @param block - The block to store
   * @param options - Optional storage options including durability level and expiration
   */
  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyHex = block.idChecksum.toHex();
    if (this.blocks.has(keyHex)) {
      return; // Idempotent - block already exists
    }

    try {
      block.validate();
    } catch {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    // Store the block
    this.blocks.set(keyHex, block);

    // Create metadata for the block
    const metadata = createDefaultBlockMetadata(
      keyHex,
      block.data.length,
      keyHex,
      options,
    );
    await this.metadataStore.create(metadata);

    // Generate parity blocks based on durability level
    const durabilityLevel =
      options?.durabilityLevel ?? DurabilityLevel.Standard;
    const parityCount = getParityCountForDurability(durabilityLevel);

    if (parityCount > 0 && this.fecService) {
      try {
        await this.generateParityBlocks(keyHex, parityCount);
      } catch {
        // If parity generation fails, we still keep the block but log the issue
        // The block will have no parity protection
      }
    }
  }

  /**
   * Delete a block's data (and associated parity blocks and metadata)
   */
  public async deleteData(key: Checksum): Promise<void> {
    const keyHex = this.keyToHex(key);
    if (!this.blocks.has(keyHex)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    // Delete the block data
    this.blocks.delete(keyHex);

    // Delete parity blocks
    this.parityBlocks.delete(keyHex);

    // Delete metadata (if exists)
    if (this.metadataStore.has(keyHex)) {
      await this.metadataStore.delete(keyHex);
    }
  }

  /**
   * Get random block checksums from the store
   */
  public async getRandomBlocks(count: number): Promise<Checksum[]> {
    const allKeys = Array.from(this.blocks.keys());
    const result: Checksum[] = [];

    const actualCount = Math.min(count, allKeys.length);
    const shuffled = [...allKeys].sort(() => Math.random() - 0.5);

    for (let i = 0; i < actualCount; i++) {
      const keyHex = shuffled[i];
      result.push(Checksum.fromHex(keyHex));
    }

    return result;
  }

  /**
   * Store a block's data (alias for setData)
   */
  public async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const block = new RawDataBlock(this._blockSize, data);
    await this.setData(block, options);
  }

  /**
   * Delete a block (alias for deleteData)
   */
  public async delete(key: Checksum | string): Promise<void> {
    const checksum = typeof key === 'string' ? this.hexToChecksum(key) : key;
    await this.deleteData(checksum);
  }

  /**
   * Generate a random ID
   */
  public static randomId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  /**
   * Clear all blocks, metadata, and parity data
   */
  public clear(): void {
    this.blocks.clear();
    this.parityBlocks.clear();
    this.metadataStore.clear();
  }

  /**
   * Get total number of blocks
   */
  public size(): number {
    return this.blocks.size;
  }

  /**
   * Get a handle to a block
   */
  public get<T extends BaseBlock>(key: Checksum | string): BlockHandle<T> {
    const keyHex = this.keyToHex(key);
    const block = this.blocks.get(keyHex);
    if (!block) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    const checksum = typeof key === 'string' ? this.hexToChecksum(key) : key;
    return createBlockHandle(
      RawDataBlock as any,
      block.blockSize,
      block.data,
      checksum,
      block.canRead,
      block.canPersist,
    ) as BlockHandle<T>;
  }

  // === Metadata Operations ===

  /**
   * Get metadata for a block
   * @param key - The block's checksum or ID
   * @returns The block's metadata, or null if not found
   */
  public async getMetadata(
    key: Checksum | string,
  ): Promise<IBlockMetadata | null> {
    const keyHex = this.keyToHex(key);
    return this.metadataStore.get(keyHex);
  }

  /**
   * Update metadata for a block
   * @param key - The block's checksum or ID
   * @param updates - Partial metadata updates to apply
   */
  public async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const keyHex = this.keyToHex(key);
    if (!this.metadataStore.has(keyHex)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    await this.metadataStore.update(keyHex, updates);
  }

  // === FEC/Durability Operations ===

  /**
   * Generate parity blocks for a data block using Reed-Solomon encoding.
   * @param key - The data block's checksum
   * @param parityCount - Number of parity blocks to generate
   * @returns Array of parity block checksums (as hex strings converted to Checksum)
   * @throws FecError if FEC service is not available or encoding fails
   */
  public async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    const keyHex = this.keyToHex(key);

    // Check if FEC service is available
    if (!this.fecService) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available',
      });
    }

    // Check if block exists
    const block = this.blocks.get(keyHex);
    if (!block) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    // Check if FEC service is available in the environment
    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available in this environment',
      });
    }

    // Generate parity data
    const parityData = await this.fecService.createParityData(
      block.data,
      parityCount,
    );

    // Store parity data
    this.parityBlocks.set(keyHex, parityData);

    // Calculate actual checksums for parity blocks
    const checksumService = ServiceLocator.getServiceProvider().checksumService;
    const parityBlockIds = parityData.map((parity) =>
      checksumService.calculateChecksum(new Uint8Array(parity.data)).toHex(),
    );
    if (this.metadataStore.has(keyHex)) {
      await this.metadataStore.update(keyHex, { parityBlockIds });
    }

    // Return parity block IDs as Checksum
    return parityBlockIds.map((id) => Checksum.fromHex(id));
  }

  /**
   * Get parity block checksums for a data block.
   * @param key - The data block's checksum or ID
   * @returns Array of parity block checksums
   */
  public async getParityBlocks(key: Checksum | string): Promise<Checksum[]> {
    const keyHex = this.keyToHex(key);

    // Get metadata to find parity block IDs
    const metadata = await this.metadataStore.get(keyHex);
    if (!metadata) {
      return [];
    }

    // Return parity block IDs as Checksum
    return metadata.parityBlockIds.map((id) => Checksum.fromHex(id));
  }

  /**
   * Attempt to recover a corrupted or missing block using parity data.
   * @param key - The block's checksum or ID
   * @returns Recovery result with the recovered block or error
   */
  public async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    const keyHex = this.keyToHex(key);

    // Check if FEC service is available
    if (!this.fecService) {
      return {
        success: false,
        error: 'FEC service is not available',
      };
    }

    // Check if FEC service is available in the environment
    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'FEC service is not available in this environment',
      };
    }

    // Get parity data
    const parityData = this.parityBlocks.get(keyHex);
    if (!parityData || parityData.length === 0) {
      return {
        success: false,
        error: 'No parity data available for recovery',
      };
    }

    // Get metadata for original size
    const metadata = await this.metadataStore.get(keyHex);
    if (!metadata) {
      return {
        success: false,
        error: 'Block metadata not found',
      };
    }

    try {
      // Get corrupted data if block still exists
      const existingBlock = this.blocks.get(keyHex);
      const corruptedData = existingBlock ? existingBlock.data : null;

      // Attempt recovery
      const result = await this.fecService.recoverFileData(
        corruptedData,
        parityData,
        metadata.size,
      );

      if (result.recovered) {
        // Create a new block with recovered data
        const recoveredBlock = new RawDataBlock(
          this._blockSize,
          new Uint8Array(result.data),
        );

        // Update the stored block
        this.blocks.set(keyHex, recoveredBlock);

        return {
          success: true,
          recoveredBlock,
        };
      }

      return {
        success: false,
        error: 'Recovery failed - insufficient parity data',
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown recovery error',
      };
    }
  }

  /**
   * Verify block integrity against its parity data.
   * @param key - The block's checksum or ID
   * @returns True if the block data matches its parity data
   */
  public async verifyBlockIntegrity(key: Checksum | string): Promise<boolean> {
    const keyHex = this.keyToHex(key);

    // Check if FEC service is available
    if (!this.fecService) {
      // Without FEC service, we can only verify the block exists
      return this.blocks.has(keyHex);
    }

    // Check if FEC service is available in the environment
    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      // Without FEC service, we can only verify the block exists
      return this.blocks.has(keyHex);
    }

    // Get block data
    const block = this.blocks.get(keyHex);
    if (!block) {
      return false;
    }

    // Get parity data
    const parityData = this.parityBlocks.get(keyHex);
    if (!parityData || parityData.length === 0) {
      // No parity data - can only verify block exists
      return true;
    }

    try {
      return await this.fecService.verifyFileIntegrity(block.data, parityData);
    } catch {
      return false;
    }
  }

  // === Replication Operations ===

  /**
   * Get blocks that are pending replication (status = Pending).
   * @returns Array of block checksums pending replication
   */
  public async getBlocksPendingReplication(): Promise<Checksum[]> {
    const pendingBlocks = await this.metadataStore.findByReplicationStatus(
      ReplicationStatus.Pending,
    );

    return pendingBlocks
      .filter((meta) => meta.targetReplicationFactor > 0)
      .map((meta) => this.hexToChecksum(meta.blockId));
  }

  /**
   * Get blocks that are under-replicated (status = UnderReplicated).
   * @returns Array of block checksums that need additional replicas
   */
  public async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    const underReplicatedBlocks =
      await this.metadataStore.findByReplicationStatus(
        ReplicationStatus.UnderReplicated,
      );

    return underReplicatedBlocks.map((meta) =>
      this.hexToChecksum(meta.blockId),
    );
  }

  /**
   * Record that a block has been replicated to a node.
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that now holds a replica
   */
  public async recordReplication(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const keyHex = this.keyToHex(key);

    const metadata = await this.metadataStore.get(keyHex);
    if (!metadata) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    // Add node to replica list if not already present
    const replicaNodeIds = [...metadata.replicaNodeIds];
    if (!replicaNodeIds.includes(nodeId)) {
      replicaNodeIds.push(nodeId);
    }

    // Update replication status based on target factor
    let replicationStatus = metadata.replicationStatus;
    if (replicaNodeIds.length >= metadata.targetReplicationFactor) {
      replicationStatus = ReplicationStatus.Replicated;
    } else if (replicaNodeIds.length > 0) {
      replicationStatus = ReplicationStatus.UnderReplicated;
    }

    await this.metadataStore.update(keyHex, {
      replicaNodeIds,
      replicationStatus,
    });
  }

  /**
   * Record that a replica node is no longer available.
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that lost the replica
   */
  public async recordReplicaLoss(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const keyHex = this.keyToHex(key);

    const metadata = await this.metadataStore.get(keyHex);
    if (!metadata) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    // Remove node from replica list
    const replicaNodeIds = metadata.replicaNodeIds.filter(
      (id) => id !== nodeId,
    );

    // Update replication status based on remaining replicas
    let replicationStatus = metadata.replicationStatus;
    if (metadata.targetReplicationFactor > 0) {
      if (replicaNodeIds.length >= metadata.targetReplicationFactor) {
        replicationStatus = ReplicationStatus.Replicated;
      } else if (replicaNodeIds.length > 0) {
        replicationStatus = ReplicationStatus.UnderReplicated;
      } else {
        replicationStatus = ReplicationStatus.Pending;
      }
    }

    await this.metadataStore.update(keyHex, {
      replicaNodeIds,
      replicationStatus,
    });
  }

  // === XOR Brightening Operations ===

  /**
   * Brighten a block by XORing it with random blocks from the store.
   * This is used to implement Owner-Free storage patterns where the
   * original data cannot be reconstructed without all the random blocks.
   *
   * @param key - The source block's checksum or ID
   * @param randomBlockCount - Number of random blocks to XOR with
   * @returns Result containing the brightened block ID and the random block IDs used
   * @throws StoreError if the source block is not found or insufficient random blocks are available
   */
  public async brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    const keyHex = this.keyToHex(key);

    // Verify source block exists
    const sourceBlock = this.blocks.get(keyHex);
    if (!sourceBlock) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    // Get random blocks for XOR operation
    const randomBlockChecksums = await this.getRandomBlocks(randomBlockCount);

    // Check if we have enough random blocks
    if (randomBlockChecksums.length < randomBlockCount) {
      throw new StoreError(StoreErrorType.InsufficientRandomBlocks, undefined, {
        REQUESTED: randomBlockCount.toString(),
        AVAILABLE: randomBlockChecksums.length.toString(),
      });
    }

    // Get the random block data
    const randomBlocks: RawDataBlock[] = [];
    for (const checksum of randomBlockChecksums) {
      const block = await this.getData(checksum);
      randomBlocks.push(block);
    }

    // Collect all block data for XOR operation (source + random blocks)
    const allBlockData = [
      sourceBlock.data,
      ...randomBlocks.map((block) => block.data),
    ];

    // Perform XOR operation using XorService: source XOR random1 XOR random2 XOR ...
    const brightenedData = XorService.xorMultiple(allBlockData);

    // Create the brightened block
    const brightenedBlock = new RawDataBlock(this._blockSize, brightenedData);
    const brightenedBlockId = brightenedBlock.idChecksum.toHex();

    // Store the brightened block if it doesn't already exist
    if (!this.blocks.has(brightenedBlockId)) {
      await this.setData(brightenedBlock);
    }

    // Get the random block IDs as hex strings
    const randomBlockIds = randomBlockChecksums.map((checksum) =>
      checksum.toHex(),
    );

    return {
      brightenedBlockId,
      randomBlockIds,
      originalBlockId: keyHex,
    };
  }

  // === CBL Whitening Operations ===

  /**
   * Store a CBL with XOR whitening for Owner-Free storage.
   *
   * This method:
   * 1. Pads the CBL to block size with length prefix
   * 2. Generates a cryptographically random block (R) of the same size
   * 3. XORs the padded CBL with R to produce the second block (CBL XOR R)
   * 4. Stores both blocks separately
   * 5. Generates parity blocks if durability options specify redundancy
   * 6. Returns the IDs and a magnet URL for reconstruction
   *
   * @param cblData - The original CBL data as Uint8Array
   * @param options - Optional storage options (durability, expiration, encryption flag)
   * @returns Result containing block IDs, parity IDs (if any), and magnet URL
   * @throws StoreError if storage fails
   */
  public async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    // Validate input
    if (!cblData || cblData.length === 0) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: 'CBL data cannot be empty',
      });
    }

    // 1. Pad CBL to block size (includes length prefix)
    const paddedCbl = padToBlockSize(cblData, this._blockSize);

    // Validate that padded CBL fits within block size
    if (paddedCbl.length > this._blockSize) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: `CBL data too large: padded size (${paddedCbl.length}) exceeds block size (${this._blockSize}). Use a larger block size or smaller CBL.`,
      });
    }

    // 2. Select or generate randomizer block following OFFSystem principles
    // In OFFSystem, we preferentially use existing blocks from the cache as randomizers
    // This provides multi-use of blocks and better security through data reuse
    const randomBlock = await this.selectOrGenerateRandomizer(paddedCbl.length);

    // 3. XOR to create second block (CBL XOR R)
    const xorResult = xorArrays(paddedCbl, randomBlock);

    // Track stored blocks for rollback on failure
    let block1Stored = false;
    let block1Id = '';

    try {
      // 4. Store first block (R - the randomizer block)
      // Note: If this was selected from existing blocks, it's already stored
      // We still create a block handle for it to get the ID
      const block1 = new RawDataBlock(this._blockSize, randomBlock);
      const block1Checksum = block1.idChecksum;

      // Only store if not already in the store
      if (!(await this.has(block1Checksum))) {
        await this.setData(block1, options);
        block1Stored = true;
      }
      block1Id = block1Checksum.toHex();

      // 5. Store second block (CBL XOR R)
      const block2 = new RawDataBlock(this._blockSize, xorResult);
      await this.setData(block2, options);
      const block2Id = block2.idChecksum.toHex();

      // 6. Get parity block IDs if FEC redundancy was applied
      let block1ParityIds: string[] | undefined;
      let block2ParityIds: string[] | undefined;

      const block1Meta = await this.getMetadata(block1Id);
      if (block1Meta?.parityBlockIds?.length) {
        block1ParityIds = block1Meta.parityBlockIds;
      }

      const block2Meta = await this.getMetadata(block2Id);
      if (block2Meta?.parityBlockIds?.length) {
        block2ParityIds = block2Meta.parityBlockIds;
      }

      // 7. Generate magnet URL
      const magnetUrl = this.generateCBLMagnetUrl(
        block1Id,
        block2Id,
        this._blockSize,
        block1ParityIds,
        block2ParityIds,
        options?.isEncrypted,
      );

      return {
        blockId1: block1Id,
        blockId2: block2Id,
        blockSize: this._blockSize,
        magnetUrl,
        block1ParityIds,
        block2ParityIds,
        isEncrypted: options?.isEncrypted,
      };
    } catch (error) {
      // Rollback: delete block1 if it was stored by us
      if (block1Stored && block1Id) {
        try {
          await this.deleteData(this.hexToChecksum(block1Id));
        } catch {
          // Ignore rollback errors
        }
      }
      throw error;
    }
  }

  /**
   * Select an existing block from the store as a randomizer, or generate a new one.
   *
   * Following OFFSystem principles:
   * - Preferentially select existing blocks from the cache as randomizers
   * - Only generate new random blocks if insufficient blocks exist
   * - All blocks in the store look random and can be used as randomizers
   *
   * @param size - The required size of the randomizer block
   * @returns A Uint8Array containing the randomizer data
   */
  private async selectOrGenerateRandomizer(size: number): Promise<Uint8Array> {
    // Get all block IDs from the store
    const blockIds = Array.from(this.blocks.keys());

    // If we have existing blocks, try to use one as a randomizer
    if (blockIds.length > 0) {
      // Select a random block from the existing blocks
      const randomIndex = Math.floor(Math.random() * blockIds.length);
      const selectedBlockId = blockIds[randomIndex];

      try {
        const block = this.blocks.get(selectedBlockId);
        if (block && block.data.length >= size) {
          // Use the first 'size' bytes of the existing block as the randomizer
          return block.data.slice(0, size);
        }
      } catch {
        // If we can't retrieve the block, fall through to generation
      }
    }

    // Fall back to generating a new random block using CSPRNG
    // This happens when:
    // - The store is empty (early in block store lifecycle)
    // - No suitable blocks were found
    return XorService.generateKey(size);
  }

  /**
   * Retrieve and reconstruct a CBL from its whitened components.
   *
   * This method:
   * 1. Retrieves both blocks (using parity recovery if needed)
   * 2. XORs the blocks to reconstruct the padded CBL
   * 3. Unpads to get the original CBL data
   *
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param block1ParityIds - Optional parity block IDs for block 1 recovery
   * @param block2ParityIds - Optional parity block IDs for block 2 recovery
   * @returns The original CBL data as Uint8Array
   * @throws StoreError if either block is not found or reconstruction fails
   */
  public async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    // 1. Retrieve first block (with recovery if needed)
    const b1Checksum =
      typeof blockId1 === 'string' ? this.hexToChecksum(blockId1) : blockId1;
    let block1Data: RawDataBlock;
    try {
      block1Data = await this.getData(b1Checksum);
    } catch (error) {
      // Attempt recovery using parity blocks if available
      if (block1ParityIds?.length) {
        const recovery = await this.recoverBlock(b1Checksum);
        if (recovery.success && recovery.recoveredBlock) {
          block1Data = recovery.recoveredBlock;
        } else {
          throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
            KEY: this.keyToHex(blockId1),
            ERROR: 'Block 1 not found and recovery failed',
          });
        }
      } else {
        throw error;
      }
    }

    // 2. Retrieve second block (with recovery if needed)
    const b2Checksum =
      typeof blockId2 === 'string' ? this.hexToChecksum(blockId2) : blockId2;
    let block2Data: RawDataBlock;
    try {
      block2Data = await this.getData(b2Checksum);
    } catch (error) {
      // Attempt recovery using parity blocks if available
      if (block2ParityIds?.length) {
        const recovery = await this.recoverBlock(b2Checksum);
        if (recovery.success && recovery.recoveredBlock) {
          block2Data = recovery.recoveredBlock;
        } else {
          throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
            KEY: this.keyToHex(blockId2),
            ERROR: 'Block 2 not found and recovery failed',
          });
        }
      } else {
        throw error;
      }
    }

    // 3. XOR to reconstruct padded CBL (order doesn't matter due to commutativity)
    const reconstructedPadded = xorArrays(block1Data.data, block2Data.data);

    // 4. Remove padding to get original CBL
    return unpadCblData(reconstructedPadded);
  }

  /**
   * Parse a whitened CBL magnet URL and extract component IDs.
   *
   * Expected format: magnet:?xt=urn:brightchain:cbl&bs=<block_size>&b1=<id>&b2=<id>[&p1=<parity_ids>][&p2=<parity_ids>][&enc=1]
   *
   * @param magnetUrl - The magnet URL to parse
   * @returns Object containing block IDs, block size, parity IDs (if any), and encryption flag
   * @throws Error if the URL format is invalid
   */
  public parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    // Validate basic URL format
    if (!magnetUrl || !magnetUrl.startsWith('magnet:?')) {
      throw new Error('Invalid magnet URL: must start with "magnet:?"');
    }

    // Parse URL parameters
    const queryString = magnetUrl.substring('magnet:?'.length);
    const params = new URLSearchParams(queryString);

    // Validate xt parameter
    const xt = params.get('xt');
    if (xt !== 'urn:brightchain:cbl') {
      throw new Error(
        'Invalid magnet URL: xt parameter must be "urn:brightchain:cbl"',
      );
    }

    // Extract required parameters
    const blockId1 = params.get('b1');
    const blockId2 = params.get('b2');
    const blockSizeStr = params.get('bs');

    if (!blockId1) {
      throw new Error('Invalid magnet URL: missing b1 parameter');
    }

    if (!blockId2) {
      throw new Error('Invalid magnet URL: missing b2 parameter');
    }

    if (!blockSizeStr) {
      throw new Error('Invalid magnet URL: missing bs (block size) parameter');
    }

    const blockSize = parseInt(blockSizeStr, 10);
    if (isNaN(blockSize) || blockSize <= 0) {
      throw new Error('Invalid magnet URL: invalid block size');
    }

    // Parse optional parity block IDs
    const p1Param = params.get('p1');
    const p2Param = params.get('p2');
    const block1ParityIds = p1Param
      ? p1Param.split(',').filter((id) => id)
      : undefined;
    const block2ParityIds = p2Param
      ? p2Param.split(',').filter((id) => id)
      : undefined;

    // Parse encryption flag
    const isEncrypted = params.get('enc') === '1';

    return {
      blockId1,
      blockId2,
      blockSize,
      block1ParityIds,
      block2ParityIds,
      isEncrypted,
    };
  }

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
  public generateCBLMagnetUrl(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    blockSize: number,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
    isEncrypted?: boolean,
  ): string {
    const b1Id = typeof blockId1 === 'string' ? blockId1 : blockId1.toHex();
    const b2Id = typeof blockId2 === 'string' ? blockId2 : blockId2.toHex();

    const params = new URLSearchParams();
    params.set('xt', 'urn:brightchain:cbl');
    params.set('bs', blockSize.toString());
    params.set('b1', b1Id);
    params.set('b2', b2Id);

    // Add parity block IDs if present
    if (block1ParityIds?.length) {
      params.set('p1', block1ParityIds.join(','));
    }
    if (block2ParityIds?.length) {
      params.set('p2', block2ParityIds.join(','));
    }

    // Add encryption flag if encrypted
    if (isEncrypted) {
      params.set('enc', '1');
    }

    return `magnet:?${params.toString()}`;
  }
}
