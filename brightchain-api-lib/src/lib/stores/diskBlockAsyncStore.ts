/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IBlockStore,
  BaseBlock,
  BlockHandle,
  createBlockHandle,
  RawDataBlock,
  BlockDataType,
  BlockSize,
  blockSizeToSizeString,
  BlockType,
  StoreErrorType,
  StoreError,
  IBaseBlockMetadata,
  IBlockMetadata,
  BlockStoreOptions,
  RecoveryResult,
  BrightenResult,
  DurabilityLevel,
  getParityCountForDurability,
  ReplicationStatus,
  createDefaultBlockMetadata,
  IFecService,
  ParityData,
  FecErrorType,
  FecError,
  BlockMetadata,
} from '@brightchain/brightchain-lib';
import { ChecksumUint8Array, uint8ArrayToHex, hexToUint8Array } from '@digitaldefiance/ecies-lib';
import { existsSync, readFileSync } from 'fs';
import { readFile, readdir, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable, Transform } from 'stream';
import { DiskBlockStore } from './diskBlockStore';
import { DiskBlockMetadataStore } from './diskBlockMetadataStore';
import { MemoryWritableStream } from '../transforms/memoryWritableStream';
import { ChecksumTransform } from '../transforms/checksumTransform';
import { XorMultipleTransformStream } from '../transforms/xorMultipleTransform';

/**
 * Parity block file extension pattern: {blockId}.p{index}
 */
const PARITY_FILE_EXTENSION_PREFIX = '.p';

/**
 * DiskBlockAsyncStore provides asynchronous operations for storing and retrieving blocks from disk.
 * It supports raw block storage and XOR operations with stream-based data handling.
 * Blocks are stored as raw data without metadata - their meaning is derived from CBLs.
 *
 * This implementation supports:
 * - Core block operations (store, retrieve, delete)
 * - Metadata management for tracking block lifecycle and access patterns
 * - FEC (Forward Error Correction) operations using Reed-Solomon encoding
 * - Replication tracking for distributed storage
 */
export class DiskBlockAsyncStore extends DiskBlockStore implements IBlockStore {
  /**
   * Metadata store for tracking block lifecycle and access patterns.
   */
  private readonly metadataStore: DiskBlockMetadataStore;

  /**
   * Optional FEC service for parity generation and recovery.
   * If not provided, FEC operations will return errors or no-ops.
   */
  private fecService: IFecService | null = null;

  constructor(config: { storePath: string; blockSize: BlockSize }) {
    super(config);
    this.metadataStore = new DiskBlockMetadataStore(config.storePath, config.blockSize);
  }

  /**
   * Set the FEC service for parity generation and recovery.
   * @param fecService - The FEC service to use
   */
  public setFecService(fecService: IFecService | null): void {
    this.fecService = fecService;
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
  public getMetadataStore(): DiskBlockMetadataStore {
    return this.metadataStore;
  }

  /**
   * Convert a key to hex string format.
   * @param key - The key as ChecksumUint8Array or string
   * @returns The key as hex string
   */
  private keyToHex(key: ChecksumUint8Array | string): string {
    return typeof key === 'string' ? key : uint8ArrayToHex(key);
  }

  /**
   * Convert a hex string to ChecksumUint8Array.
   * @param hex - The hex string
   * @returns The ChecksumUint8Array
   */
  private hexToChecksum(hex: string): ChecksumUint8Array {
    return hexToUint8Array(hex) as ChecksumUint8Array;
  }

  /**
   * Get the file path for a parity block.
   * Parity files are stored alongside block files with .p{index} extension.
   * @param blockId - The data block's checksum
   * @param parityIndex - The parity block index (0-based)
   * @returns The parity file path
   */
  private parityPath(blockId: ChecksumUint8Array, parityIndex: number): string {
    return this.blockPath(blockId) + PARITY_FILE_EXTENSION_PREFIX + parityIndex;
  }

  /**
   * Check if a block exists
   */
  public async has(key: ChecksumUint8Array | string): Promise<boolean> {
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;
    const blockPath = this.blockPath(keyBuffer);
    return existsSync(blockPath);
  }

  /**
   * Get a handle to a block
   */
  public get<T extends BaseBlock>(key: ChecksumUint8Array | string): BlockHandle<T> {
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;
    const blockPath = this.blockPath(keyBuffer);
    
    // Read the block data synchronously to create the handle
    // This matches the synchronous signature expected by IBlockStore.get
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: uint8ArrayToHex(keyBuffer),
      });
    }
    
    const data = readFileSync(blockPath);
    
    return createBlockHandle<T>(
      RawDataBlock as any,
      this._blockSize,
      data,
      keyBuffer,
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Get a block's data
   */
  public async getData(key: ChecksumUint8Array): Promise<RawDataBlock> {
    const keyHex = this.keyToHex(key);
    const blockPath = this.blockPath(key);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }

    let data: Buffer;
    try {
      data = await readFile(blockPath);
    } catch {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    if (data.length > this._blockSize) {
      throw new StoreError(StoreErrorType.BlockFileSizeMismatch);
    }

    // Use file creation time as block creation time
    const stats = await stat(blockPath);
    const dateCreated = stats.birthtime;

    // Record access in metadata
    if (this.metadataStore.has(keyHex)) {
      await this.metadataStore.recordAccess(keyHex);
    }

    return new RawDataBlock(
      this._blockSize,
      data,
      dateCreated,
      key,
      BlockType.RawData,
      BlockDataType.EphemeralStructuredData, // Use EphemeralStructuredData as default
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Delete a block's data (and associated parity blocks and metadata)
   * @param key - The block's checksum
   */
  public async deleteData(key: ChecksumUint8Array): Promise<void> {
    const keyHex = this.keyToHex(key);
    const blockPath = this.blockPath(key);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    // Get metadata to find parity blocks
    const metadata = await this.metadataStore.get(keyHex);
    
    // Delete parity blocks first
    if (metadata && metadata.parityBlockIds.length > 0) {
      for (let i = 0; i < metadata.parityBlockIds.length; i++) {
        const parityFilePath = this.parityPath(key, i);
        if (existsSync(parityFilePath)) {
          try {
            await unlink(parityFilePath);
          } catch {
            // Ignore errors deleting parity files
          }
        }
      }
    }

    // Delete the block data
    try {
      await unlink(blockPath);
    } catch (error) {
      throw new StoreError(StoreErrorType.BlockDeletionFailed, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }

    // Delete metadata (if exists)
    if (this.metadataStore.has(keyHex)) {
      try {
        await this.metadataStore.delete(keyHex);
      } catch {
        // Ignore errors deleting metadata
      }
    }
  }

  /**
   * Store a block's data with optional durability settings
   */
  public async setData(block: RawDataBlock, options?: BlockStoreOptions): Promise<void> {
    if (block.blockSize !== this._blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeMismatch);
    }

    const keyHex = this.keyToHex(block.idChecksum);
    const blockPath = this.blockPath(block.idChecksum);
    if (existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.BlockPathAlreadyExists);
    }

    try {
      block.validate();
    } catch {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    // Ensure block directory exists before writing
    this.ensureBlockPath(block.idChecksum);

    try {
      await writeFile(blockPath, Buffer.from(block.data));
    } catch (error) {
      throw new StoreError(
        StoreErrorType.BlockDirectoryCreationFailed,
        undefined,
        {
          ERROR: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Create metadata for the block
    const metadata = createDefaultBlockMetadata(
      keyHex,
      block.data.length,
      keyHex,
      options,
    );
    await this.metadataStore.create(metadata);

    // Generate parity blocks based on durability level
    const durabilityLevel = options?.durabilityLevel ?? DurabilityLevel.Standard;
    const parityCount = getParityCountForDurability(durabilityLevel);

    if (parityCount > 0 && this.fecService) {
      try {
        await this.generateParityBlocks(block.idChecksum, parityCount);
      } catch {
        // If parity generation fails, we still keep the block but log the issue
        // The block will have no parity protection
      }
    }
  }

  /**
   * XOR multiple blocks together
   */
  public async xor<T extends BaseBlock>(
    blocks: BlockHandle<T>[],
    destBlockMetadata: IBaseBlockMetadata,
  ): Promise<RawDataBlock> {
    if (!blocks.length) {
      throw new StoreError(StoreErrorType.NoBlocksProvided);
    }

    return new Promise((resolve, reject) => {
      // Create read streams from the full block data
      const readStreams = blocks.map((block) => {
        const data = block.fullData; // Use fullData to get padded content
        const stream = new Readable();
        stream.push(Buffer.from(data));
        stream.push(null);
        return stream;
      });

      const xorStream = new XorMultipleTransformStream(readStreams);
      const checksumStream = new ChecksumTransform();
      const writeStream = new MemoryWritableStream();

      // Set up pipeline
      xorStream.pipe(checksumStream).pipe(writeStream);

      // Handle stream ends
      this.handleReadStreamEnds(readStreams, xorStream);

      // Handle checksum calculation
      checksumStream.on('checksum', (checksumBuffer) => {
        try {
          const block = new RawDataBlock(
            this._blockSize,
            writeStream.data,
            new Date(destBlockMetadata.dateCreated),
            checksumBuffer,
            BlockType.RawData,
            destBlockMetadata.dataType, // Use the metadata's dataType
            true, // canRead
            true, // canPersist
          );
          resolve(block);
        } catch (error) {
          reject(error);
        } finally {
          this.cleanupStreams([
            ...readStreams,
            xorStream,
            checksumStream,
            writeStream,
          ]);
        }
      });

      // Handle errors
      const handleError = (error: Error) => {
        this.cleanupStreams([
          ...readStreams,
          xorStream,
          checksumStream,
          writeStream,
        ]);
        reject(error);
      };

      readStreams.forEach((stream) => stream.on('error', handleError));
      xorStream.on('error', handleError);
      checksumStream.on('error', handleError);
      writeStream.on('error', handleError);
    });
  }

  /**
   * Handle read stream ends
   */
  private handleReadStreamEnds(
    readStreams: Readable[],
    xorStream: Transform,
  ): void {
    let endedStreams = 0;
    readStreams.forEach((readStream) => {
      readStream.on('end', () => {
        if (++endedStreams === readStreams.length) {
          xorStream.end();
        }
      });
    });
  }

  /**
   * Clean up streams
   */
  private cleanupStreams(
    streams: Array<Readable | Transform | MemoryWritableStream>,
  ): void {
    streams.forEach((stream) => {
      try {
        stream.destroy();
      } catch {
        // Ignore errors during cleanup
      }
    });
  }

  /**
   * Get random block checksums from the store
   * @param count - Maximum number of blocks to return
   * @returns Array of random block checksums
   */
  public async getRandomBlocks(count: number): Promise<ChecksumUint8Array[]> {
    const blockSizeString = blockSizeToSizeString(this._blockSize);
    const basePath = join(this._storePath, blockSizeString);
    if (!existsSync(basePath)) {
      return [];
    }

    const blocks: ChecksumUint8Array[] = [];
    const firstLevelDirs = await readdir(basePath);

    // Randomly select first level directories until we have enough blocks
    while (blocks.length < count && firstLevelDirs.length > 0) {
      // Pick a random first level directory
      const randomFirstIndex = Math.floor(
        Math.random() * firstLevelDirs.length,
      );
      const firstDir = firstLevelDirs[randomFirstIndex];
      const firstLevelPath = join(basePath, firstDir);

      if (!existsSync(firstLevelPath)) {
        // Remove invalid directory and continue
        firstLevelDirs.splice(randomFirstIndex, 1);
        continue;
      }

      // Get second level directories
      const secondLevelDirs = await readdir(firstLevelPath);
      if (secondLevelDirs.length === 0) {
        // Remove empty directory and continue
        firstLevelDirs.splice(randomFirstIndex, 1);
        continue;
      }

      // Pick a random second level directory
      const randomSecondIndex = Math.floor(
        Math.random() * secondLevelDirs.length,
      );
      const secondDir = secondLevelDirs[randomSecondIndex];
      const secondLevelPath = join(firstLevelPath, secondDir);

      if (!existsSync(secondLevelPath)) {
        continue;
      }

      // Get block files (exclude metadata and parity files)
      const blockFiles = (await readdir(secondLevelPath)).filter(
        (file) => !file.endsWith('.m.json') && !file.includes(PARITY_FILE_EXTENSION_PREFIX),
      );

      if (blockFiles.length === 0) {
        continue;
      }

      // Pick a random block
      const randomBlockIndex = Math.floor(Math.random() * blockFiles.length);
      const blockFile = blockFiles[randomBlockIndex];
      blocks.push(
        Buffer.from(blockFile, 'hex') as unknown as ChecksumUint8Array,
      );

      // Remove used directory if we still need more blocks
      if (blocks.length < count) {
        firstLevelDirs.splice(randomFirstIndex, 1);
      }
    }

    return blocks;
  }

  /**
   * Store raw data with a key (convenience method)
   * Creates a RawDataBlock and stores it
   */
  public async put(key: ChecksumUint8Array | string, data: Uint8Array, options?: BlockStoreOptions): Promise<void> {
    const keyBuffer = typeof key === 'string' 
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;
    const block = new RawDataBlock(this._blockSize, data, new Date(), keyBuffer);
    await this.setData(block, options);
  }

  /**
   * Delete a block (convenience method, alias for deleteData)
   */
  public async delete(key: ChecksumUint8Array | string): Promise<void> {
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;
    await this.deleteData(keyBuffer);
  }

  // === Metadata Operations ===

  /**
   * Get metadata for a block
   * @param key - The block's checksum or ID
   * @returns The block's metadata, or null if not found
   */
  public async getMetadata(key: ChecksumUint8Array | string): Promise<IBlockMetadata | null> {
    const keyHex = this.keyToHex(key);
    return this.metadataStore.get(keyHex);
  }

  /**
   * Update metadata for a block
   * @param key - The block's checksum or ID
   * @param updates - Partial metadata updates to apply
   */
  public async updateMetadata(
    key: ChecksumUint8Array | string,
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
   * Parity blocks are stored as separate files: {blockId}.p0, {blockId}.p1, etc.
   * @param key - The data block's checksum
   * @param parityCount - Number of parity blocks to generate
   * @returns Array of parity block checksums (as synthetic IDs)
   * @throws FecError if FEC service is not available or encoding fails
   */
  public async generateParityBlocks(
    key: ChecksumUint8Array | string,
    parityCount: number,
  ): Promise<ChecksumUint8Array[]> {
    const keyHex = this.keyToHex(key);
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;

    // Check if FEC service is available
    if (!this.fecService) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available',
      });
    }

    // Check if block exists
    const blockPath = this.blockPath(keyBuffer);
    if (!existsSync(blockPath)) {
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

    // Read block data
    const blockData = await readFile(blockPath);

    // Generate parity data
    const parityData = await this.fecService.createParityData(blockData, parityCount);

    // Store parity blocks as separate files
    const parityBlockIds: string[] = [];
    for (let i = 0; i < parityData.length; i++) {
      const parityFilePath = this.parityPath(keyBuffer, i);
      await writeFile(parityFilePath, Buffer.from(parityData[i].data));
      parityBlockIds.push(`${keyHex}.p${i}`);
    }

    // Update metadata with parity block IDs
    if (this.metadataStore.has(keyHex)) {
      await this.metadataStore.update(keyHex, { parityBlockIds });
    }

    // Return parity block IDs as ChecksumUint8Array
    return parityBlockIds.map(id => {
      const bytes = new TextEncoder().encode(id);
      return bytes as unknown as ChecksumUint8Array;
    });
  }

  /**
   * Get parity block checksums for a data block.
   * @param key - The data block's checksum or ID
   * @returns Array of parity block checksums
   */
  public async getParityBlocks(key: ChecksumUint8Array | string): Promise<ChecksumUint8Array[]> {
    const keyHex = this.keyToHex(key);

    // Get metadata to find parity block IDs
    const metadata = await this.metadataStore.get(keyHex);
    if (!metadata) {
      return [];
    }

    // Return parity block IDs as ChecksumUint8Array
    return metadata.parityBlockIds.map(id => {
      const bytes = new TextEncoder().encode(id);
      return bytes as unknown as ChecksumUint8Array;
    });
  }

  /**
   * Load parity data from disk for a block.
   * @param key - The data block's checksum
   * @returns Array of parity data objects
   */
  private async loadParityData(key: ChecksumUint8Array): Promise<ParityData[]> {
    const keyHex = this.keyToHex(key);
    const metadata = await this.metadataStore.get(keyHex);
    
    if (!metadata || metadata.parityBlockIds.length === 0) {
      return [];
    }

    const parityData: ParityData[] = [];
    for (let i = 0; i < metadata.parityBlockIds.length; i++) {
      const parityFilePath = this.parityPath(key, i);
      if (existsSync(parityFilePath)) {
        const data = await readFile(parityFilePath);
        parityData.push({ data, index: i });
      }
    }

    return parityData;
  }

  /**
   * Attempt to recover a corrupted or missing block using parity data.
   * @param key - The block's checksum or ID
   * @returns Recovery result with the recovered block or error
   */
  public async recoverBlock(key: ChecksumUint8Array | string): Promise<RecoveryResult> {
    const keyHex = this.keyToHex(key);
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;

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

    // Get parity data from disk
    const parityData = await this.loadParityData(keyBuffer);
    if (parityData.length === 0) {
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
      const blockPath = this.blockPath(keyBuffer);
      let corruptedData: Buffer | null = null;
      if (existsSync(blockPath)) {
        corruptedData = await readFile(blockPath);
      }

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

        // Update the stored block on disk
        await writeFile(blockPath, Buffer.from(result.data));

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
        error: error instanceof Error ? error.message : 'Unknown recovery error',
      };
    }
  }

  /**
   * Verify block integrity against its parity data.
   * @param key - The block's checksum or ID
   * @returns True if the block data matches its parity data
   */
  public async verifyBlockIntegrity(key: ChecksumUint8Array | string): Promise<boolean> {
    const keyHex = this.keyToHex(key);
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;

    // Check if FEC service is available
    if (!this.fecService) {
      // Without FEC service, we can only verify the block exists
      return this.has(key);
    }

    // Check if FEC service is available in the environment
    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      // Without FEC service, we can only verify the block exists
      return this.has(key);
    }

    // Check if block exists
    const blockPath = this.blockPath(keyBuffer);
    if (!existsSync(blockPath)) {
      return false;
    }

    // Get parity data from disk
    const parityData = await this.loadParityData(keyBuffer);
    if (parityData.length === 0) {
      // No parity data - can only verify block exists
      return true;
    }

    try {
      const blockData = await readFile(blockPath);
      return await this.fecService.verifyFileIntegrity(blockData, parityData);
    } catch {
      return false;
    }
  }

  // === Replication Operations ===

  /**
   * Get blocks that are pending replication (status = Pending).
   * @returns Array of block checksums pending replication
   */
  public async getBlocksPendingReplication(): Promise<ChecksumUint8Array[]> {
    const pendingBlocks = await this.metadataStore.findByReplicationStatus(
      ReplicationStatus.Pending,
    );

    return pendingBlocks
      .filter(meta => meta.targetReplicationFactor > 0)
      .map(meta => this.hexToChecksum(meta.blockId));
  }

  /**
   * Get blocks that are under-replicated (status = UnderReplicated).
   * @returns Array of block checksums that need additional replicas
   */
  public async getUnderReplicatedBlocks(): Promise<ChecksumUint8Array[]> {
    const underReplicatedBlocks = await this.metadataStore.findByReplicationStatus(
      ReplicationStatus.UnderReplicated,
    );

    return underReplicatedBlocks.map(meta => this.hexToChecksum(meta.blockId));
  }

  /**
   * Record that a block has been replicated to a node.
   * @param key - The block's checksum or ID
   * @param nodeId - The ID of the node that now holds a replica
   */
  public async recordReplication(
    key: ChecksumUint8Array | string,
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
    key: ChecksumUint8Array | string,
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
    const replicaNodeIds = metadata.replicaNodeIds.filter(id => id !== nodeId);

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

  // === Block Expiration and Cleanup ===

  /**
   * Find all blocks that have expired (expiresAt is in the past).
   * @returns Array of metadata for expired blocks
   */
  public async findExpired(): Promise<IBlockMetadata[]> {
    return this.metadataStore.findExpired();
  }

  /**
   * Clean up expired blocks.
   * This method identifies expired blocks and deletes them along with their
   * parity blocks and metadata.
   * 
   * @param cblChecker - Optional function to check if a block is referenced by a CBL.
   *                     If provided, blocks referenced by active CBLs will not be deleted.
   * @returns Object containing deleted block IDs and any errors encountered
   */
  public async cleanupExpiredBlocks(
    cblChecker?: (blockId: string) => Promise<boolean>,
  ): Promise<{ deletedBlockIds: string[]; errors: Array<{ blockId: string; error: string }> }> {
    const expiredBlocks = await this.findExpired();
    const deletedBlockIds: string[] = [];
    const errors: Array<{ blockId: string; error: string }> = [];

    for (const metadata of expiredBlocks) {
      try {
        // Check if block is referenced by a CBL
        if (cblChecker) {
          const isReferenced = await cblChecker(metadata.blockId);
          if (isReferenced) {
            // Skip deletion - block is still referenced
            continue;
          }
        }

        // Delete the block (this also deletes parity blocks and metadata)
        const keyBuffer = this.hexToChecksum(metadata.blockId);
        await this.deleteData(keyBuffer);
        deletedBlockIds.push(metadata.blockId);
      } catch (error) {
        errors.push({
          blockId: metadata.blockId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { deletedBlockIds, errors };
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
    key: ChecksumUint8Array | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    const keyHex = this.keyToHex(key);
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'hex') as unknown as ChecksumUint8Array
      : key;

    // Verify source block exists
    const blockPath = this.blockPath(keyBuffer);
    if (!existsSync(blockPath)) {
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

    // Get the source block handle
    const sourceBlockHandle = this.get<RawDataBlock>(keyBuffer);

    // Get handles for all random blocks
    const randomBlockHandles = randomBlockChecksums.map(checksum => 
      this.get<RawDataBlock>(checksum)
    );

    // Combine source block with random blocks for XOR operation
    const allBlockHandles = [sourceBlockHandle, ...randomBlockHandles];

    // Create metadata for the brightened block
    const destBlockMetadata = new BlockMetadata(
      this._blockSize,
      BlockType.RawData,
      BlockDataType.EphemeralStructuredData,
      this._blockSize, // lengthWithoutPadding - use full block size for XOR result
      new Date(),
    );

    // Perform XOR operation using the existing xor method
    const brightenedBlock = await this.xor(allBlockHandles, destBlockMetadata);
    const brightenedBlockId = uint8ArrayToHex(brightenedBlock.idChecksum);

    // Store the brightened block if it doesn't already exist
    const brightenedBlockExists = await this.has(brightenedBlockId);
    if (!brightenedBlockExists) {
      await this.setData(brightenedBlock);
    }

    // Get the random block IDs as hex strings
    const randomBlockIds = randomBlockChecksums.map(checksum => uint8ArrayToHex(checksum));

    return {
      brightenedBlockId,
      randomBlockIds,
      originalBlockId: keyHex,
    };
  }
}
