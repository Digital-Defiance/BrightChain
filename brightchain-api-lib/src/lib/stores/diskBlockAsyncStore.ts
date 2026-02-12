/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BaseBlock,
  BLOCK_HEADER,
  BlockDataType,
  BlockHandle,
  BlockMetadata,
  BlockSize,
  blockSizeToSizeString,
  BlockStoreOptions,
  BlockType,
  BrightenResult,
  CBLMagnetComponents,
  CBLService,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  createBlockHandle,
  createDefaultBlockMetadata,
  DurabilityLevel,
  FecError,
  FecErrorType,
  getGlobalServiceProvider,
  getParityCountForDurability,
  IBaseBlockMetadata,
  IBlockMetadata,
  IBlockStore,
  IFecService,
  padToBlockSize,
  ParityData,
  PoolDeletionError,
  PoolDeletionValidationResult,
  PoolId,
  RawDataBlock,
  RecoveryResult,
  ReplicationStatus,
  StoreError,
  StoreErrorType,
  StructuredBlockType,
  unpadCblData,
  validatePoolId,
  xorArrays,
  XorService,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable, Transform } from 'stream';
import { ChecksumTransform } from '../transforms/checksumTransform';
import { MemoryWritableStream } from '../transforms/memoryWritableStream';
import { XorMultipleTransformStream } from '../transforms/xorMultipleTransform';
import { DiskBlockMetadataStore } from './diskBlockMetadataStore';
import { DiskBlockStore } from './diskBlockStore';

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
    this.metadataStore = new DiskBlockMetadataStore(config.storePath);
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
   * Find the block size for a given checksum by searching all sizes.
   * @param key - The block's checksum
   * @returns The block size if found, null otherwise
   */
  private async findBlockSize(key: Checksum): Promise<BlockSize | null> {
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockPath)) {
        return size as BlockSize;
      }
    }
    return null;
  }

  /**
   * Get the file path for a parity block.
   * Parity files are stored alongside block files with .p{index} extension.
   * @param blockId - The data block's checksum
   * @param blockSize - The block size
   * @param parityIndex - The parity block index (0-based)
   * @returns The parity file path
   */
  private parityPath(
    blockId: Checksum,
    blockSize: BlockSize,
    parityIndex: number,
  ): string {
    return (
      this.blockPath(blockId, blockSize) +
      PARITY_FILE_EXTENSION_PREFIX +
      parityIndex
    );
  }

  /**
   * Check if a block exists (checks all block sizes)
   */
  public async has(key: Checksum | string): Promise<boolean> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    // Check all possible block sizes
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(keyChecksum, size as BlockSize);
      if (existsSync(blockPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get a handle to a block (searches all block sizes)
   */
  public get<T extends BaseBlock>(key: Checksum | string): BlockHandle<T> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;

    // Search all possible block sizes
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(keyChecksum, size as BlockSize);
      if (existsSync(blockPath)) {
        const data = readFileSync(blockPath);
        return createBlockHandle<T>(
          RawDataBlock as any,
          size as BlockSize,
          data,
          keyChecksum,
          true, // canRead
          true, // canPersist
        );
      }
    }

    throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
      KEY: keyChecksum.toHex(),
    });
  }

  /**
   * Get a block's data (searches all block sizes)
   */
  public async getData(key: Checksum): Promise<RawDataBlock> {
    const keyHex = this.keyToHex(key);

    // Search all possible block sizes
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockPath)) {
        let data: Buffer;
        try {
          data = await readFile(blockPath);
        } catch {
          continue;
        }

        // Use file creation time as block creation time
        const stats = await stat(blockPath);
        const dateCreated = stats.birthtime;

        // Record access in metadata
        if (this.metadataStore.has(keyHex)) {
          await this.metadataStore.recordAccess(keyHex);
        }

        return new RawDataBlock(
          size as BlockSize,
          data,
          dateCreated,
          key,
          BlockType.RawData,
          BlockDataType.EphemeralStructuredData,
          true,
          true,
        );
      }
    }

    throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
      KEY: keyHex,
    });
  }

  /**
   * Delete a block's data (and associated parity blocks and metadata)
   * @param key - The block's checksum
   */
  public async deleteData(key: Checksum): Promise<void> {
    const keyHex = this.keyToHex(key);

    // Find the block across all sizes
    let foundSize: BlockSize | null = null;
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockPath)) {
        foundSize = size as BlockSize;
        break;
      }
    }

    if (!foundSize) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    // Get metadata to find parity blocks
    const metadata = await this.metadataStore.get(keyHex);

    // Delete parity blocks first
    if (metadata && metadata.parityBlockIds.length > 0) {
      for (let i = 0; i < metadata.parityBlockIds.length; i++) {
        const parityFilePath = this.parityPath(key, foundSize, i);
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
      await unlink(this.blockPath(key, foundSize));
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
  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyHex = this.keyToHex(block.idChecksum);
    const blockPath = this.blockPath(block.idChecksum, block.blockSize);
    if (existsSync(blockPath)) {
      return; // Idempotent - block already exists
    }

    try {
      block.validate();
    } catch {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    // Ensure block directory exists before writing
    this.ensureBlockPath(block.idChecksum, block.blockSize);

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
    const durabilityLevel =
      options?.durabilityLevel ?? DurabilityLevel.Standard;
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
   * Get random block checksums scoped to a specific pool.
   * Reads only from the pool-prefixed directory structure: storePath/blockSize/pool/XX/YY/hash
   * @param pool - The pool to source random blocks from
   * @param count - Number of random blocks requested
   * @returns Array of checksums (may be fewer than count if pool has insufficient blocks)
   */
  /**
   * Get random block checksums from the store.
   * Scans the non-pool directory structure (storePath/blockSize/char1/char2/hash)
   * used by the legacy setData/getData methods.
   * @param count - Maximum number of blocks to return
   * @returns Array of random block checksums
   */
  public async getRandomBlocks(count: number): Promise<Checksum[]> {
    if (count <= 0) {
      return [];
    }

    const blockSizeString = blockSizeToSizeString(this._blockSize);
    const basePath = join(this._storePath, blockSizeString);
    if (!existsSync(basePath)) {
      return [];
    }

    const blocks: Checksum[] = [];
    const firstLevelDirs = (await readdir(basePath)).filter(
      (d) => d.length === 1,
    );

    // Randomly select first level directories until we have enough blocks
    while (blocks.length < count && firstLevelDirs.length > 0) {
      const randomFirstIndex = Math.floor(
        Math.random() * firstLevelDirs.length,
      );
      const firstDir = firstLevelDirs[randomFirstIndex];
      const firstLevelPath = join(basePath, firstDir);

      if (!existsSync(firstLevelPath)) {
        firstLevelDirs.splice(randomFirstIndex, 1);
        continue;
      }

      // Get second level directories (single-char names only)
      const secondLevelDirs = (await readdir(firstLevelPath)).filter(
        (d) => d.length === 1,
      );
      if (secondLevelDirs.length === 0) {
        firstLevelDirs.splice(randomFirstIndex, 1);
        continue;
      }

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
        (file) =>
          !file.endsWith('.m.json') &&
          !file.includes(PARITY_FILE_EXTENSION_PREFIX),
      );

      if (blockFiles.length === 0) {
        continue;
      }

      const randomBlockIndex = Math.floor(Math.random() * blockFiles.length);
      const blockFile = blockFiles[randomBlockIndex];
      blocks.push(Checksum.fromHex(blockFile));

      if (blocks.length < count) {
        firstLevelDirs.splice(randomFirstIndex, 1);
      }
    }

    return blocks;
  }

  /**
   * Get the directory path for a block within a pool.
   * Directory structure: storePath/blockSize/pool/checksumChar1/checksumChar2/
   */
  private poolBlockDir(
    pool: PoolId,
    blockId: Checksum,
    blockSize: BlockSize,
  ): string {
    const checksumString = blockId.toHex();
    const blockSizeString = blockSizeToSizeString(blockSize);
    return join(
      this._storePath,
      blockSizeString,
      pool,
      checksumString[0],
      checksumString[1],
    );
  }

  /**
   * Get the file path for a block within a pool.
   * File structure: storePath/blockSize/pool/checksumChar1/checksumChar2/fullChecksum
   */
  private poolBlockPath(
    pool: PoolId,
    blockId: Checksum,
    blockSize: BlockSize,
  ): string {
    const checksumString = blockId.toHex();
    return join(this.poolBlockDir(pool, blockId, blockSize), checksumString);
  }

  /**
   * Ensure the directory structure exists for a block within a pool.
   */
  private ensurePoolBlockPath(
    pool: PoolId,
    blockId: Checksum,
    blockSize: BlockSize,
  ): void {
    const dir = this.poolBlockDir(pool, blockId, blockSize);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Seed a pool with cryptographically random blocks for whitening material.
   * Generates the specified number of random blocks and stores them in the
   * pool-scoped directory structure: storePath/blockSize/pool/XX/YY/hash
   * @param pool - The pool to bootstrap
   * @param blockSize - The block size for generated random blocks
   * @param count - Number of random blocks to generate
   */
  public async bootstrapPool(
    pool: PoolId,
    blockSize: BlockSize,
    count: number,
  ): Promise<void> {
    validatePoolId(pool);
    if (count <= 0) return;

    for (let i = 0; i < count; i++) {
      const data = new Uint8Array(randomBytes(blockSize));
      const block = new RawDataBlock(blockSize, data, new Date());
      const keyHex = this.keyToHex(block.idChecksum);
      const filePath = this.poolBlockPath(pool, block.idChecksum, blockSize);

      if (existsSync(filePath)) {
        continue; // Idempotent - block already exists
      }

      this.ensurePoolBlockPath(pool, block.idChecksum, blockSize);
      await writeFile(filePath, Buffer.from(block.data));

      // Create metadata with pool association
      const metadata = createDefaultBlockMetadata(
        keyHex,
        block.data.length,
        keyHex,
        undefined,
        pool,
      );
      await this.metadataStore.create(metadata);
    }
  }

  /**
   * Check if a block's raw data on disk looks like a CBL block.
   * Checks for the BrightChain structured block magic prefix and CBL-type structured block types.
   * @param data - The raw block data
   * @returns true if the data appears to be a CBL block
   */
  private isCblBlock(data: Uint8Array): boolean {
    if (data.length < 4) {
      return false;
    }
    if (data[0] !== BLOCK_HEADER.MAGIC_PREFIX) {
      return false;
    }
    const structuredType = data[1];
    return (
      structuredType === StructuredBlockType.CBL ||
      structuredType === StructuredBlockType.ExtendedCBL ||
      structuredType === StructuredBlockType.MessageCBL ||
      structuredType === StructuredBlockType.SuperCBL ||
      structuredType === StructuredBlockType.VaultCBL
    );
  }

  /**
   * Extract CBL addresses from raw block data using the CBLService.
   * @param data - The raw CBL block data
   * @param cblService - The CBLService instance to use for parsing
   * @returns Array of checksums referenced by the CBL, or null if unparseable/encrypted
   */
  private extractCblAddresses(
    data: Uint8Array,
    cblService: CBLService<PlatformID>,
  ): Checksum[] | null {
    try {
      // Skip encrypted CBLs — we can't parse their addresses
      if (cblService.isEncrypted(data)) {
        return null;
      }

      // SuperCBLs store sub-CBL checksums, not data block addresses
      if (cblService.isSuperCbl(data)) {
        return cblService.getSuperCblSubCblChecksums(data);
      }

      // Regular/Extended/Message/Vault CBLs use addressDataToAddresses
      return cblService.addressDataToAddresses(data);
    } catch {
      // If parsing fails for any reason, skip this block
      return null;
    }
  }

  /**
   * Collect all block hashes stored in a specific pool on disk.
   * Walks the pool directory structure: storePath/blockSize/pool/XX/YY/hash
   * @param poolPath - The root directory for the pool (storePath/blockSize/pool)
   * @returns Set of block hash hex strings found in the pool
   */
  private async collectPoolBlockHashes(poolPath: string): Promise<Set<string>> {
    const hashes = new Set<string>();
    if (!existsSync(poolPath)) {
      return hashes;
    }

    const firstLevelDirs = await readdir(poolPath);
    for (const firstDir of firstLevelDirs) {
      const firstLevelPath = join(poolPath, firstDir);
      const firstStat = await stat(firstLevelPath);
      if (!firstStat.isDirectory()) continue;

      const secondLevelDirs = await readdir(firstLevelPath);
      for (const secondDir of secondLevelDirs) {
        const secondLevelPath = join(firstLevelPath, secondDir);
        const secondStat = await stat(secondLevelPath);
        if (!secondStat.isDirectory()) continue;

        const files = await readdir(secondLevelPath);
        for (const file of files) {
          // Exclude metadata and parity files
          if (
            !file.endsWith('.m.json') &&
            !file.includes(PARITY_FILE_EXTENSION_PREFIX)
          ) {
            hashes.add(file);
          }
        }
      }
    }
    return hashes;
  }

  /**
   * Check whether a pool can be safely deleted by scanning CBLs in other pools
   * for cross-pool XOR dependencies.
   *
   * Walks the disk directory structure for all block sizes, finds CBL-type blocks
   * in pools other than the target, parses their addresses, and checks if any
   * reference blocks stored in the target pool.
   *
   * @param pool - The pool to validate for deletion
   * @returns Validation result with dependency details if unsafe
   */
  public async validatePoolDeletion(
    pool: PoolId,
  ): Promise<PoolDeletionValidationResult> {
    validatePoolId(pool);

    // 1. Collect all block hashes in the target pool across all block sizes
    const targetPoolHashes = new Set<string>();
    const blockSizes = Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    ) as BlockSize[];

    for (const size of blockSizes) {
      const blockSizeString = blockSizeToSizeString(size);
      const poolPath = join(this._storePath, blockSizeString, pool);
      const hashes = await this.collectPoolBlockHashes(poolPath);
      for (const hash of hashes) {
        targetPoolHashes.add(hash);
      }
    }

    // If the target pool is empty, it's trivially safe to delete
    if (targetPoolHashes.size === 0) {
      return { safe: true, dependentPools: [], referencedBlocks: [] };
    }

    // 2. Get a CBLService instance from the global service provider
    let cblService: CBLService<PlatformID> | null = null;
    try {
      const provider = getGlobalServiceProvider();
      cblService = provider.cblService as CBLService<PlatformID>;
    } catch {
      // Global service provider not initialized — cannot parse CBLs.
      // Return safe=true since we can't determine dependencies without the service.
      return { safe: true, dependentPools: [], referencedBlocks: [] };
    }

    // 3. Scan all blocks in OTHER pools for CBL-type blocks
    const dependentPoolsSet = new Set<PoolId>();
    const referencedBlocksSet = new Set<string>();

    for (const size of blockSizes) {
      const blockSizeString = blockSizeToSizeString(size);
      const blockSizeDir = join(this._storePath, blockSizeString);
      if (!existsSync(blockSizeDir)) continue;

      // List all pool directories under this block size
      const poolDirs = await readdir(blockSizeDir);
      for (const otherPool of poolDirs) {
        // Skip the target pool itself and non-directory entries
        if (otherPool === pool) continue;
        const otherPoolPath = join(blockSizeDir, otherPool);
        const otherPoolStat = await stat(otherPoolPath);
        if (!otherPoolStat.isDirectory()) continue;

        // Walk the other pool's directory structure looking for CBL blocks
        const firstLevelDirs = await readdir(otherPoolPath);
        for (const firstDir of firstLevelDirs) {
          const firstLevelPath = join(otherPoolPath, firstDir);
          const firstStat = await stat(firstLevelPath);
          if (!firstStat.isDirectory()) continue;

          const secondLevelDirs = await readdir(firstLevelPath);
          for (const secondDir of secondLevelDirs) {
            const secondLevelPath = join(firstLevelPath, secondDir);
            const secondStat = await stat(secondLevelPath);
            if (!secondStat.isDirectory()) continue;

            const files = await readdir(secondLevelPath);
            for (const file of files) {
              // Skip metadata and parity files
              if (
                file.endsWith('.m.json') ||
                file.includes(PARITY_FILE_EXTENSION_PREFIX)
              ) {
                continue;
              }

              // Read the block data and check if it's a CBL
              const filePath = join(secondLevelPath, file);
              let data: Uint8Array;
              try {
                data = await readFile(filePath);
              } catch {
                continue; // Skip unreadable files
              }

              if (!this.isCblBlock(data)) {
                continue;
              }

              // Try to parse addresses from this CBL
              const addresses = this.extractCblAddresses(data, cblService);
              if (addresses === null) {
                continue; // Encrypted or unparseable — skip
              }

              // Check if any addresses reference blocks in the target pool
              for (const address of addresses) {
                const addressHex = address.toHex();
                if (targetPoolHashes.has(addressHex)) {
                  dependentPoolsSet.add(otherPool);
                  referencedBlocksSet.add(addressHex);
                }
              }
            }
          }
        }
      }
    }

    const dependentPools = Array.from(dependentPoolsSet);
    const referencedBlocks = Array.from(referencedBlocksSet);
    const safe = dependentPools.length === 0;

    return { safe, dependentPools, referencedBlocks };
  }

  /**
   * Delete a pool without checking for cross-pool dependencies.
   * Removes the pool's directory under each block size directory.
   * For administrative use only.
   * @param pool - The pool to force-delete
   */
  public async forceDeletePool(pool: PoolId): Promise<void> {
    validatePoolId(pool);

    const blockSizes = Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    ) as BlockSize[];

    for (const size of blockSizes) {
      const blockSizeString = blockSizeToSizeString(size);
      const poolPath = join(this._storePath, blockSizeString, pool);
      if (existsSync(poolPath)) {
        rmSync(poolPath, { recursive: true, force: true });
      }
    }
  }

  /**
   * Delete a pool after validating that no other pool depends on its blocks.
   * Calls validatePoolDeletion first and throws PoolDeletionError if unsafe.
   * @param pool - The pool to delete
   * @throws PoolDeletionError if cross-pool dependencies exist
   */
  public async deletePool(pool: PoolId): Promise<void> {
    validatePoolId(pool);

    // Pre-deletion validation
    const validation = await this.validatePoolDeletion(pool);
    if (!validation.safe) {
      throw new PoolDeletionError(
        `Cannot delete pool "${pool}": ${validation.dependentPools.length} dependent pool(s) ` +
          `reference ${validation.referencedBlocks.length} block(s). ` +
          `Dependent pools: ${validation.dependentPools.join(', ')}. ` +
          `Use forceDeletePool() to bypass this check.`,
        validation,
      );
    }

    // Proceed with deletion
    await this.forceDeletePool(pool);
  }

  /**
   * Store raw data with a key (convenience method)
   * Creates a RawDataBlock and stores it
   */
  public async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    const block = new RawDataBlock(
      this._blockSize,
      data,
      new Date(),
      keyChecksum,
    );
    await this.setData(block, options);
  }

  /**
   * Delete a block (convenience method, alias for deleteData)
   */
  public async delete(key: Checksum | string): Promise<void> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    await this.deleteData(keyChecksum);
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
   * Parity blocks are stored as separate files: {blockId}.p0, {blockId}.p1, etc.
   * @param key - The data block's checksum
   * @param parityCount - Number of parity blocks to generate
   * @returns Array of parity block checksums (as synthetic IDs)
   * @throws FecError if FEC service is not available or encoding fails
   */
  public async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    const keyHex = this.keyToHex(key);
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;

    // Check if FEC service is available
    if (!this.fecService) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available',
      });
    }

    // Check if block exists
    const blockSize = await this.findBlockSize(keyChecksum);
    if (!blockSize) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    const blockPath = this.blockPath(keyChecksum, blockSize);

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
    const parityData = await this.fecService.createParityData(
      blockData,
      parityCount,
    );

    // Store parity blocks as separate files
    const parityBlockIds: string[] = [];
    for (let i = 0; i < parityData.length; i++) {
      const parityFilePath = this.parityPath(keyChecksum, blockSize, i);
      await writeFile(parityFilePath, Buffer.from(parityData[i].data));
      parityBlockIds.push(`${keyHex}.p${i}`);
    }

    // Update metadata with parity block IDs
    if (this.metadataStore.has(keyHex)) {
      await this.metadataStore.update(keyHex, { parityBlockIds });
    }

    // Return parity block IDs as Checksum (using hex encoding for synthetic IDs)
    return parityBlockIds.map((id) => {
      // For parity block IDs, we create a checksum from the hex-encoded ID string
      // This is a synthetic ID, not a real checksum of data
      const paddedHex = id.padEnd(64, '0').slice(0, 64);
      return Checksum.fromHex(paddedHex);
    });
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
    // Pad to 128 hex characters (64 bytes) for SHA3-512
    return metadata.parityBlockIds.map((id) => {
      const paddedHex = id.padEnd(128, '0').slice(0, 128);
      return Checksum.fromHex(paddedHex);
    });
  }

  /**
   * Load parity data from disk for a block.
   * @param key - The data block's checksum
   * @returns Array of parity data objects
   */
  private async loadParityData(key: Checksum): Promise<ParityData[]> {
    const keyHex = this.keyToHex(key);
    const metadata = await this.metadataStore.get(keyHex);

    if (!metadata || metadata.parityBlockIds.length === 0) {
      return [];
    }

    const blockSize = await this.findBlockSize(key);
    if (!blockSize) {
      return [];
    }

    const parityData: ParityData[] = [];
    for (let i = 0; i < metadata.parityBlockIds.length; i++) {
      const parityFilePath = this.parityPath(key, blockSize, i);
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
  public async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    const keyHex = this.keyToHex(key);
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;

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
    const parityData = await this.loadParityData(keyChecksum);
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
      const blockSize = await this.findBlockSize(keyChecksum);
      if (!blockSize) {
        return {
          success: false,
          error: 'Block not found',
        };
      }
      const blockPath = this.blockPath(keyChecksum, blockSize);
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
    const _keyHex = this.keyToHex(key);
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;

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
    const blockSize = await this.findBlockSize(keyChecksum);
    if (!blockSize) {
      return false;
    }
    const blockPath = this.blockPath(keyChecksum, blockSize);

    // Get parity data from disk
    const parityData = await this.loadParityData(keyChecksum);
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
  ): Promise<{
    deletedBlockIds: string[];
    errors: Array<{ blockId: string; error: string }>;
  }> {
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
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    const keyHex = this.keyToHex(key);
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;

    // Verify source block exists
    const blockSize = await this.findBlockSize(keyChecksum);
    if (!blockSize) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    // const blockPath = this.blockPath(keyChecksum, blockSize);

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
    const sourceBlockHandle = this.get<RawDataBlock>(keyChecksum);

    // Get handles for all random blocks
    const randomBlockHandles = randomBlockChecksums.map((checksum) =>
      this.get<RawDataBlock>(checksum),
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
    const brightenedBlockId = brightenedBlock.idChecksum.toHex();

    // Store the brightened block if it doesn't already exist
    const brightenedBlockExists = await this.has(brightenedBlockId);
    if (!brightenedBlockExists) {
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
   * 3. XORs the CBL with R to produce the second block (CBL XOR R)
   * 4. Stores both blocks separately with durability options
   * 5. Generates parity blocks if durability options specify redundancy
   * 6. Returns the IDs and a magnet URL for reconstruction
   *
   * Note: Due to XOR commutativity, the order of blocks doesn't matter for reconstruction.
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
    // Try to get a random block from the store
    try {
      const randomBlocks = await this.getRandomBlocks(1);
      if (randomBlocks.length > 0) {
        const block = await this.getData(randomBlocks[0]);
        if (block && block.data.length >= size) {
          // Use the first 'size' bytes of the existing block as the randomizer
          return block.data.slice(0, size);
        }
      }
    } catch {
      // If we can't retrieve a block, fall through to generation
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
   * Note: Due to XOR commutativity, the order of block IDs doesn't matter.
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
