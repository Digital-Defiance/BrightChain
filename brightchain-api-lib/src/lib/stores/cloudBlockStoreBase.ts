/**
 * CloudBlockStoreBase - Abstract base class for cloud-backed block stores.
 *
 * Implements IBlockStore and IPooledBlockStore, encapsulating all shared cloud
 * store logic (metadata serialization, FEC orchestration, CBL whitening, pool
 * key management, retry logic). Subclasses implement only the cloud-specific
 * I/O primitives (uploadObject, downloadObject, deleteObject, objectExists,
 * listObjects, isTransientError).
 *
 * @see DiskBlockAsyncStore for the disk-based reference implementation
 * @see AzureBlobBlockStore for the Azure Blob Storage subclass
 * @see S3BlockStore for the Amazon S3 subclass
 */
import {
  asBlockId,
  BaseBlock,
  BlockDataType,
  BlockHandle,
  BlockSize,
  BlockStoreOptions,
  BlockType,
  BrightenResult,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  createDefaultBlockMetadata,
  DEFAULT_POOL,
  DurabilityLevel,
  FecError,
  FecErrorType,
  getParityCountForDurability,
  IBlockMetadata,
  IBlockStore,
  ICloudBlockStoreConfig,
  IFecService,
  IPooledBlockStore,
  lengthToBlockSize,
  ListOptions,
  padToBlockSize,
  ParityData,
  PoolDeletionValidationResult,
  PoolId,
  PoolStats,
  RawDataBlock,
  RecoveryResult,
  ReplicationStatus,
  StoreError,
  StoreErrorType,
  unpadCblData,
  validatePoolId,
  xorArrays,
  XorService,
  type BlockId,
} from '@brightchain/brightchain-lib';

/**
 * Cast a raw hex string to BlockId without validation.
 * Used for opaque storage keys that must satisfy the branded type.
 */
function toStorageKey(hex: string): BlockId {
  return hex as unknown as BlockId;
}

/** Default TTL for the local checksum index (5 minutes) */
const DEFAULT_INDEX_TTL_MS = 5 * 60 * 1000;

/** Default page size for listing objects during index refresh */
const DEFAULT_LIST_PAGE_SIZE = 1000;

/**
 * Serialized metadata format for cloud sidecar objects.
 * Dates are stored as ISO 8601 strings for JSON compatibility.
 */
interface CloudBlockMetadataFile {
  blockId: string;
  createdAt: string;
  expiresAt: string | null;
  durabilityLevel: string;
  parityBlockIds: string[];
  accessCount: number;
  lastAccessedAt: string;
  replicationStatus: string;
  targetReplicationFactor: number;
  replicaNodeIds: string[];
  size: number;
  checksum: string;
  poolId?: string;
}

export abstract class CloudBlockStoreBase
  implements IBlockStore, IPooledBlockStore
{
  protected readonly config: ICloudBlockStoreConfig;
  protected readonly _blockSize: BlockSize;
  protected fecService: IFecService | null = null;

  // === Local checksum index for getRandomBlocks ===
  protected localIndex: Set<string> = new Set();
  protected indexStale = true;
  protected indexLastRefreshed = 0;
  protected indexTtlMs: number;
  protected listPageSize: number;

  constructor(
    config: ICloudBlockStoreConfig,
    indexTtlMs = DEFAULT_INDEX_TTL_MS,
    listPageSize = DEFAULT_LIST_PAGE_SIZE,
  ) {
    this.config = config;
    // Defensive: fall back to legacy `blockSize` field or Medium default
    // when `supportedBlockSizes` is missing or empty.
    const sizes = config.supportedBlockSizes;
    this._blockSize =
      sizes && sizes.length > 0
        ? sizes[0]
        : ((config as unknown as Record<string, unknown>)['blockSize'] as BlockSize) ??
          BlockSize.Medium;
    this.indexTtlMs = indexTtlMs;
    this.listPageSize = listPageSize;
  }

  // =========================================================================
  // Abstract primitives — implemented by Azure/S3 subclasses
  // =========================================================================

  protected abstract uploadObject(key: string, data: Uint8Array): Promise<void>;
  protected abstract downloadObject(key: string): Promise<Uint8Array>;
  protected abstract deleteObject(key: string): Promise<void>;
  protected abstract objectExists(key: string): Promise<boolean>;
  protected abstract listObjects(
    prefix: string,
    maxResults?: number,
  ): Promise<string[]>;
  protected abstract isTransientError(error: unknown): boolean;

  // =========================================================================
  // Public accessors
  // =========================================================================

  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  public get supportedBlockSizes(): readonly BlockSize[] {
    return this.config.supportedBlockSizes ?? [this._blockSize];
  }

  public setFecService(fecService: IFecService | null): void {
    this.fecService = fecService;
  }

  public getFecService(): IFecService | null {
    return this.fecService;
  }

  // =========================================================================
  // Key management
  // =========================================================================

  /**
   * Build the object key for block data.
   * Pattern: {keyPrefix}{poolId}/{checksumHex}
   */
  protected buildObjectKey(
    checksumHex: string,
    poolId: PoolId = DEFAULT_POOL,
  ): string {
    const prefix = this.config.keyPrefix ?? '';
    return `${prefix}${poolId}/${checksumHex}`;
  }

  /**
   * Build the object key for a metadata sidecar.
   * Pattern: {keyPrefix}{poolId}/{checksumHex}.meta
   */
  protected buildMetaKey(
    checksumHex: string,
    poolId: PoolId = DEFAULT_POOL,
  ): string {
    return `${this.buildObjectKey(checksumHex, poolId)}.meta`;
  }

  /**
   * Build the object key for a parity block.
   * Pattern: {keyPrefix}{poolId}/parity/{checksumHex}/{parityIndex}
   */
  protected buildParityKey(
    checksumHex: string,
    parityIndex: number,
    poolId: PoolId = DEFAULT_POOL,
  ): string {
    const prefix = this.config.keyPrefix ?? '';
    return `${prefix}${poolId}/parity/${checksumHex}/${parityIndex}`;
  }

  /**
   * Build the prefix for listing parity blocks of a given data block.
   */
  protected buildParityPrefix(
    checksumHex: string,
    poolId: PoolId = DEFAULT_POOL,
  ): string {
    const prefix = this.config.keyPrefix ?? '';
    return `${prefix}${poolId}/parity/${checksumHex}/`;
  }

  /**
   * Build the prefix for listing all blocks in a pool.
   */
  protected buildPoolPrefix(poolId: PoolId = DEFAULT_POOL): string {
    const prefix = this.config.keyPrefix ?? '';
    return `${prefix}${poolId}/`;
  }

  // =========================================================================
  // Utility helpers
  // =========================================================================

  protected keyToHex(key: Checksum | string): string {
    return typeof key === 'string' ? key : key.toHex();
  }

  protected hexToChecksum(hex: string): Checksum {
    return Checksum.fromHex(hex);
  }

  // =========================================================================
  // Retry logic
  // =========================================================================

  /**
   * Retry an operation with exponential backoff for transient errors.
   * Base delay 1s, factor 2x, max 3 retries by default.
   */
  protected async withRetry<T>(
    operation: string,
    blockChecksum: string,
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error) || attempt === maxRetries) {
          break;
        }
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new StoreError(StoreErrorType.CloudOperationFailed, undefined, {
      operation,
      blockChecksum,
      originalError: String(lastError),
    });
  }

  // =========================================================================
  // Metadata serialization helpers
  // =========================================================================

  protected serializeMetadata(metadata: IBlockMetadata): Uint8Array {
    const file: CloudBlockMetadataFile = {
      blockId: metadata.blockId,
      createdAt: metadata.createdAt.toISOString(),
      expiresAt: metadata.expiresAt?.toISOString() ?? null,
      durabilityLevel: metadata.durabilityLevel,
      parityBlockIds: [...metadata.parityBlockIds],
      accessCount: metadata.accessCount,
      lastAccessedAt: metadata.lastAccessedAt.toISOString(),
      replicationStatus: metadata.replicationStatus,
      targetReplicationFactor: metadata.targetReplicationFactor,
      replicaNodeIds: [...metadata.replicaNodeIds],
      size: metadata.size,
      checksum: metadata.checksum,
      ...(metadata.poolId !== undefined ? { poolId: metadata.poolId } : {}),
    };
    return new TextEncoder().encode(JSON.stringify(file));
  }

  protected deserializeMetadata(data: Uint8Array): IBlockMetadata {
    const json = new TextDecoder().decode(data);
    const file: CloudBlockMetadataFile = JSON.parse(json);
    return {
      blockId: file.blockId as unknown as BlockId,
      createdAt: new Date(file.createdAt),
      expiresAt: file.expiresAt ? new Date(file.expiresAt) : null,
      durabilityLevel: file.durabilityLevel as DurabilityLevel,
      parityBlockIds: file.parityBlockIds as unknown as BlockId[],
      accessCount: file.accessCount,
      lastAccessedAt: new Date(file.lastAccessedAt),
      replicationStatus: file.replicationStatus as ReplicationStatus,
      targetReplicationFactor: file.targetReplicationFactor,
      replicaNodeIds: file.replicaNodeIds,
      size: file.size,
      checksum: file.checksum,
      ...(file.poolId !== undefined ? { poolId: file.poolId } : {}),
    };
  }

  // =========================================================================
  // Local checksum index management
  // =========================================================================

  /**
   * Check if the local index needs refreshing based on TTL.
   */
  protected isIndexStale(): boolean {
    if (this.indexStale) return true;
    return Date.now() - this.indexLastRefreshed > this.indexTtlMs;
  }

  /**
   * Refresh the local checksum index by listing objects from the cloud store.
   */
  protected async refreshIndex(poolId: PoolId = DEFAULT_POOL): Promise<void> {
    const prefix = this.buildPoolPrefix(poolId);
    const keys = await this.listObjects(prefix, this.listPageSize);
    this.localIndex.clear();
    const poolPrefix = this.buildPoolPrefix(poolId);
    for (const key of keys) {
      // Extract checksum hex from key, skip .meta and parity/ keys
      if (key.endsWith('.meta')) continue;
      if (key.includes('/parity/')) continue;
      const checksumHex = key.substring(poolPrefix.length);
      if (checksumHex && !checksumHex.includes('/')) {
        this.localIndex.add(checksumHex);
      }
    }
    this.indexStale = false;
    this.indexLastRefreshed = Date.now();
  }

  // =========================================================================
  // IBlockStore — Core Block Operations
  // =========================================================================

  public async has(key: Checksum | string): Promise<boolean> {
    const hex = this.keyToHex(key);
    const objectKey = this.buildObjectKey(hex);
    return this.withRetry('has', hex, () => this.objectExists(objectKey));
  }

  public async getData(key: Checksum): Promise<RawDataBlock> {
    const hex = this.keyToHex(key);
    const objectKey = this.buildObjectKey(hex);

    const data = await this.withRetry('getData', hex, () =>
      this.downloadObject(objectKey),
    );

    // Record access in metadata
    try {
      const metaKey = this.buildMetaKey(hex);
      if (await this.objectExists(metaKey)) {
        const metaData = await this.downloadObject(metaKey);
        const metadata = this.deserializeMetadata(metaData);
        metadata.accessCount++;
        metadata.lastAccessedAt = new Date();
        await this.uploadObject(metaKey, this.serializeMetadata(metadata));
      }
    } catch {
      // Ignore metadata access errors — data retrieval is the priority
    }

    return new RawDataBlock(
      lengthToBlockSize(data.length),
      data,
      new Date(),
      key,
      BlockType.RawData,
      BlockDataType.RawData,
      true,
      true,
    );
  }

  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    // Validate block size is in supportedBlockSizes
    if (!this.config.supportedBlockSizes.includes(block.blockSize)) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: `Block size ${block.blockSize} is not in supportedBlockSizes [${this.config.supportedBlockSizes.join(', ')}]`,
      });
    }

    const hex = this.keyToHex(block.idChecksum);
    const objectKey = this.buildObjectKey(hex);

    // Idempotent — skip if block already exists
    const exists = await this.withRetry('setData.exists', hex, () =>
      this.objectExists(objectKey),
    );
    if (exists) return;

    // Validate block
    try {
      block.validate();
    } catch {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    // Upload block data
    await this.withRetry('setData.upload', hex, () =>
      this.uploadObject(objectKey, block.data),
    );

    // Create and upload metadata sidecar
    const metadata = createDefaultBlockMetadata(
      toStorageKey(hex),
      block.data.length,
      hex,
      options,
    );
    const metaKey = this.buildMetaKey(hex);
    await this.withRetry('setData.meta', hex, () =>
      this.uploadObject(metaKey, this.serializeMetadata(metadata)),
    );

    // Update local index
    this.localIndex.add(hex);

    // Generate parity blocks based on durability level
    const durabilityLevel =
      options?.durabilityLevel ?? DurabilityLevel.Standard;
    const parityCount = getParityCountForDurability(durabilityLevel);
    if (parityCount > 0 && this.fecService) {
      try {
        await this.generateParityBlocks(block.idChecksum, parityCount);
      } catch {
        // If parity generation fails, keep the block but without parity protection
      }
    }
  }

  public async deleteData(key: Checksum): Promise<void> {
    const hex = this.keyToHex(key);
    const objectKey = this.buildObjectKey(hex);

    // Check existence
    const exists = await this.withRetry('deleteData.exists', hex, () =>
      this.objectExists(objectKey),
    );
    if (!exists) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hex,
      });
    }

    // Delete parity blocks first
    try {
      const parityPrefix = this.buildParityPrefix(hex);
      const parityKeys = await this.listObjects(parityPrefix);
      for (const pk of parityKeys) {
        try {
          await this.deleteObject(pk);
        } catch {
          // Ignore errors deleting parity files
        }
      }
    } catch {
      // Ignore errors listing parity blocks
    }

    // Delete block data
    await this.withRetry('deleteData.delete', hex, () =>
      this.deleteObject(objectKey),
    );

    // Delete metadata sidecar
    try {
      const metaKey = this.buildMetaKey(hex);
      await this.deleteObject(metaKey);
    } catch {
      // Ignore errors deleting metadata
    }

    // Update local index
    this.localIndex.delete(hex);
  }

  public async getRandomBlocks(
    count: number,
    blockSize: BlockSize,
  ): Promise<Checksum[]> {
    if (!this.config.supportedBlockSizes.includes(blockSize)) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: `Block size ${blockSize} is not in supportedBlockSizes`,
      });
    }
    if (count <= 0) return [];

    // Refresh index if stale
    if (this.isIndexStale()) {
      await this.refreshIndex();
    }

    const allChecksums = [...this.localIndex];
    if (allChecksums.length === 0) return [];

    // Sample without replacement
    const result: Checksum[] = [];
    const available = [...allChecksums];
    const numToReturn = Math.min(count, available.length);

    for (let i = 0; i < numToReturn; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      result.push(this.hexToChecksum(available[randomIndex]));
      available.splice(randomIndex, 1);
    }

    return result;
  }

  public get<T extends BaseBlock>(_key: Checksum | string): BlockHandle<T> {
    // BlockHandle is synchronous but cloud operations are async.
    // Cloud stores should use getData() for async access.
    throw new StoreError(StoreErrorType.NotImplemented, undefined, {
      ERROR:
        'Synchronous get() is not supported for cloud stores. Use getData() instead.',
    });
  }

  public async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    const block = new RawDataBlock(
      lengthToBlockSize(data.length),
      data,
      new Date(),
      keyChecksum,
    );
    await this.setData(block, options);
  }

  public async delete(key: Checksum | string): Promise<void> {
    const keyChecksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    await this.deleteData(keyChecksum);
  }

  // =========================================================================
  // IBlockStore — Metadata Operations
  // =========================================================================

  public async getMetadata(
    key: Checksum | string,
  ): Promise<IBlockMetadata | null> {
    const hex = this.keyToHex(key);
    const metaKey = this.buildMetaKey(hex);

    try {
      const exists = await this.objectExists(metaKey);
      if (!exists) return null;
      const data = await this.downloadObject(metaKey);
      return this.deserializeMetadata(data);
    } catch {
      return null;
    }
  }

  public async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const hex = this.keyToHex(key);
    const metaKey = this.buildMetaKey(hex);

    const existing = await this.getMetadata(key);
    if (!existing) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hex,
      });
    }

    const updated: IBlockMetadata = { ...existing, ...updates };
    await this.withRetry('updateMetadata', hex, () =>
      this.uploadObject(metaKey, this.serializeMetadata(updated)),
    );
  }

  // =========================================================================
  // IBlockStore — FEC/Durability Operations
  // =========================================================================

  public async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    const hex = this.keyToHex(key);

    if (!this.fecService) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available',
      });
    }

    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'FEC service is not available in this environment',
      });
    }

    // Download block data
    const objectKey = this.buildObjectKey(hex);
    const blockData = await this.withRetry('generateParity.download', hex, () =>
      this.downloadObject(objectKey),
    );

    // Generate parity data
    const parityData = await this.fecService.createParityData(
      blockData,
      parityCount,
    );

    // Store parity blocks as separate cloud objects
    const parityBlockIds: BlockId[] = [];
    for (let i = 0; i < parityData.length; i++) {
      const parityKey = this.buildParityKey(hex, i);
      await this.withRetry('generateParity.upload', hex, () =>
        this.uploadObject(parityKey, parityData[i].data),
      );
      const parityHex = `${hex}`.slice(0, 62) + i.toString(16).padStart(2, '0');
      parityBlockIds.push(asBlockId(parityHex));
    }

    // Update metadata with parity block IDs
    try {
      const existing = await this.getMetadata(key);
      if (existing) {
        await this.updateMetadata(key, { parityBlockIds });
      }
    } catch {
      // Ignore metadata update errors
    }

    return parityBlockIds.map((id) => {
      const paddedHex = id.padEnd(128, '0').slice(0, 128);
      return Checksum.fromHex(paddedHex);
    });
  }

  public async getParityBlocks(key: Checksum | string): Promise<Checksum[]> {
    const metadata = await this.getMetadata(key);
    if (!metadata) return [];

    return metadata.parityBlockIds.map((id) => {
      const paddedHex = id.padEnd(128, '0').slice(0, 128);
      return Checksum.fromHex(paddedHex);
    });
  }

  public async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    const hex = this.keyToHex(key);

    if (!this.fecService) {
      return { success: false, error: 'FEC service is not available' };
    }

    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'FEC service is not available in this environment',
      };
    }

    // Load parity data from cloud
    const parityData = await this.loadParityData(hex);
    if (parityData.length === 0) {
      return { success: false, error: 'No parity data available for recovery' };
    }

    const metadata = await this.getMetadata(key);
    if (!metadata) {
      return { success: false, error: 'Block metadata not found' };
    }

    try {
      // Try to get existing (possibly corrupted) data
      let corruptedData: Uint8Array | null = null;
      try {
        const objectKey = this.buildObjectKey(hex);
        corruptedData = await this.downloadObject(objectKey);
      } catch {
        // Block may be completely missing
      }

      const result = await this.fecService.recoverFileData(
        corruptedData,
        parityData,
        metadata.size,
      );

      if (result.recovered) {
        const recoveredBlock = new RawDataBlock(
          lengthToBlockSize(result.data.length),
          new Uint8Array(result.data),
        );

        // Re-upload the recovered block
        const objectKey = this.buildObjectKey(hex);
        await this.uploadObject(objectKey, new Uint8Array(result.data));

        return { success: true, recoveredBlock };
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

  public async verifyBlockIntegrity(key: Checksum | string): Promise<boolean> {
    const hex = this.keyToHex(key);

    if (!this.fecService) {
      return this.has(key);
    }

    const isAvailable = await this.fecService.isAvailable();
    if (!isAvailable) {
      return this.has(key);
    }

    const objectKey = this.buildObjectKey(hex);
    const exists = await this.objectExists(objectKey).catch(() => false);
    if (!exists) return false;

    const parityData = await this.loadParityData(hex);
    if (parityData.length === 0) return true;

    try {
      const blockData = await this.downloadObject(objectKey);
      return await this.fecService.verifyFileIntegrity(blockData, parityData);
    } catch {
      return false;
    }
  }

  /**
   * Load parity data from cloud for a block.
   */
  private async loadParityData(checksumHex: string): Promise<ParityData[]> {
    const metadata = await this.getMetadata(checksumHex);
    if (!metadata || metadata.parityBlockIds.length === 0) return [];

    const parityData: ParityData[] = [];
    for (let i = 0; i < metadata.parityBlockIds.length; i++) {
      try {
        const parityKey = this.buildParityKey(checksumHex, i);
        const data = await this.downloadObject(parityKey);
        parityData.push({ data, index: i });
      } catch {
        // Skip missing parity blocks
      }
    }
    return parityData;
  }

  // =========================================================================
  // IBlockStore — Replication Operations
  // =========================================================================

  public async getBlocksPendingReplication(): Promise<Checksum[]> {
    // Scan metadata for blocks with Pending status and targetReplicationFactor > 0
    const prefix = this.buildPoolPrefix();
    const keys = await this.listObjects(prefix);
    const results: Checksum[] = [];

    for (const key of keys) {
      if (!key.endsWith('.meta')) continue;
      try {
        const data = await this.downloadObject(key);
        const metadata = this.deserializeMetadata(data);
        if (
          metadata.replicationStatus === ReplicationStatus.Pending &&
          metadata.targetReplicationFactor > 0
        ) {
          results.push(this.hexToChecksum(metadata.checksum));
        }
      } catch {
        // Skip unreadable metadata
      }
    }
    return results;
  }

  public async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    const prefix = this.buildPoolPrefix();
    const keys = await this.listObjects(prefix);
    const results: Checksum[] = [];

    for (const key of keys) {
      if (!key.endsWith('.meta')) continue;
      try {
        const data = await this.downloadObject(key);
        const metadata = this.deserializeMetadata(data);
        if (metadata.replicationStatus === ReplicationStatus.UnderReplicated) {
          results.push(this.hexToChecksum(metadata.checksum));
        }
      } catch {
        // Skip unreadable metadata
      }
    }
    return results;
  }

  public async recordReplication(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const hex = this.keyToHex(key);
    const metadata = await this.getMetadata(key);
    if (!metadata) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hex,
      });
    }

    const replicaNodeIds = [...metadata.replicaNodeIds];
    if (!replicaNodeIds.includes(nodeId)) {
      replicaNodeIds.push(nodeId);
    }

    let replicationStatus = metadata.replicationStatus;
    if (replicaNodeIds.length >= metadata.targetReplicationFactor) {
      replicationStatus = ReplicationStatus.Replicated;
    } else if (replicaNodeIds.length > 0) {
      replicationStatus = ReplicationStatus.UnderReplicated;
    }

    await this.updateMetadata(key, { replicaNodeIds, replicationStatus });
  }

  public async recordReplicaLoss(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    const hex = this.keyToHex(key);
    const metadata = await this.getMetadata(key);
    if (!metadata) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hex,
      });
    }

    const replicaNodeIds = metadata.replicaNodeIds.filter(
      (id) => id !== nodeId,
    );

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

    await this.updateMetadata(key, { replicaNodeIds, replicationStatus });
  }

  // =========================================================================
  // IBlockStore — XOR Brightening Operations
  // =========================================================================

  public async brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    const hex = this.keyToHex(key);

    // Verify source block exists
    const objectKey = this.buildObjectKey(hex);
    const exists = await this.withRetry('brightenBlock.exists', hex, () =>
      this.objectExists(objectKey),
    );
    if (!exists) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hex,
      });
    }

    // Download source block
    const sourceData = await this.withRetry('brightenBlock.download', hex, () =>
      this.downloadObject(objectKey),
    );

    // Get random blocks for XOR (must be same size as source block)
    const sourceBlockSize = lengthToBlockSize(sourceData.length);
    const randomBlockChecksums = await this.getRandomBlocks(
      randomBlockCount,
      sourceBlockSize,
    );
    if (randomBlockChecksums.length < randomBlockCount) {
      throw new StoreError(StoreErrorType.InsufficientRandomBlocks, undefined, {
        REQUESTED: randomBlockCount.toString(),
        AVAILABLE: randomBlockChecksums.length.toString(),
      });
    }

    // XOR with all random blocks
    let result = new Uint8Array(sourceData);
    for (const randomChecksum of randomBlockChecksums) {
      const randomHex = randomChecksum.toHex();
      const randomKey = this.buildObjectKey(randomHex);
      const randomData = await this.withRetry(
        'brightenBlock.downloadRandom',
        randomHex,
        () => this.downloadObject(randomKey),
      );
      result = new Uint8Array(xorArrays(result, randomData));
    }

    // Store the brightened block
    const brightenedBlock = new RawDataBlock(
      sourceBlockSize,
      new Uint8Array(result),
    );
    const brightenedHex = brightenedBlock.idChecksum.toHex();

    const brightenedExists = await this.has(brightenedBlock.idChecksum);
    if (!brightenedExists) {
      await this.setData(brightenedBlock);
    }

    const randomBlockIds = randomBlockChecksums.map((c) =>
      toStorageKey(c.toHex()),
    );

    return {
      brightenedBlockId: toStorageKey(brightenedHex),
      randomBlockIds,
      originalBlockId: toStorageKey(hex),
    };
  }

  // =========================================================================
  // IBlockStore — CBL Whitening Operations
  // =========================================================================

  public async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    if (!cblData || cblData.length === 0) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: 'CBL data cannot be empty',
      });
    }

    // Pad CBL to block size (includes length prefix)
    const paddedCbl = padToBlockSize(cblData, this._blockSize);
    if (paddedCbl.length > this._blockSize) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: `CBL data too large: padded size (${paddedCbl.length}) exceeds block size (${this._blockSize}).`,
      });
    }

    // Select or generate randomizer block
    const randomBlock = await this.selectOrGenerateRandomizer(paddedCbl.length);

    // XOR to create second block
    const xorResult = xorArrays(paddedCbl, randomBlock);

    let block1Stored = false;
    let block1Id: BlockId = toStorageKey('0'.repeat(64));

    try {
      // Store first block (randomizer)
      const block1 = new RawDataBlock(this._blockSize, randomBlock);
      if (!(await this.has(block1.idChecksum))) {
        await this.setData(block1, options);
        block1Stored = true;
      }
      block1Id = toStorageKey(block1.idChecksum.toHex());

      // Store second block (CBL XOR R)
      const block2 = new RawDataBlock(this._blockSize, xorResult);
      await this.setData(block2, options);
      const block2Id = toStorageKey(block2.idChecksum.toHex());

      // Get parity block IDs if FEC redundancy was applied
      let block1ParityIds: BlockId[] | undefined;
      let block2ParityIds: BlockId[] | undefined;

      const block1Meta = await this.getMetadata(block1Id);
      if (block1Meta?.parityBlockIds?.length) {
        block1ParityIds = block1Meta.parityBlockIds;
      }

      const block2Meta = await this.getMetadata(block2Id);
      if (block2Meta?.parityBlockIds?.length) {
        block2ParityIds = block2Meta.parityBlockIds;
      }

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
   * Select an existing block as a randomizer, or generate a new one.
   */
  protected async selectOrGenerateRandomizer(
    size: number,
  ): Promise<Uint8Array> {
    try {
      const randomBlocks = await this.getRandomBlocks(1, this._blockSize);
      if (randomBlocks.length > 0) {
        const block = await this.getData(randomBlocks[0]);
        if (block && block.data.length >= size) {
          return block.data.slice(0, size);
        }
      }
    } catch {
      // Fall through to generation
    }
    return XorService.generateKey(size);
  }

  public async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    // Retrieve first block (with recovery if needed)
    const b1Checksum =
      typeof blockId1 === 'string' ? this.hexToChecksum(blockId1) : blockId1;
    let block1Data: RawDataBlock;
    try {
      block1Data = await this.getData(b1Checksum);
    } catch (error) {
      if (block1ParityIds?.length) {
        const recovery = await this.recoverBlock(b1Checksum);
        if (recovery.success && recovery.recoveredBlock) {
          block1Data = recovery.recoveredBlock;
        } else {
          throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
            KEY: this.keyToHex(blockId1),
          });
        }
      } else {
        throw error;
      }
    }

    // Retrieve second block (with recovery if needed)
    const b2Checksum =
      typeof blockId2 === 'string' ? this.hexToChecksum(blockId2) : blockId2;
    let block2Data: RawDataBlock;
    try {
      block2Data = await this.getData(b2Checksum);
    } catch (error) {
      if (block2ParityIds?.length) {
        const recovery = await this.recoverBlock(b2Checksum);
        if (recovery.success && recovery.recoveredBlock) {
          block2Data = recovery.recoveredBlock;
        } else {
          throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
            KEY: this.keyToHex(blockId2),
          });
        }
      } else {
        throw error;
      }
    }

    // XOR to reconstruct padded CBL
    const reconstructedPadded = xorArrays(block1Data.data, block2Data.data);

    // Remove padding to get original CBL
    return unpadCblData(reconstructedPadded);
  }

  public parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    if (!magnetUrl || !magnetUrl.startsWith('magnet:?')) {
      throw new Error('Invalid magnet URL: must start with "magnet:?"');
    }

    const queryString = magnetUrl.substring('magnet:?'.length);
    const params = new URLSearchParams(queryString);

    const xt = params.get('xt');
    if (xt !== 'urn:brightchain:cbl') {
      throw new Error(
        'Invalid magnet URL: xt parameter must be "urn:brightchain:cbl"',
      );
    }

    const blockId1 = params.get('b1');
    const blockId2 = params.get('b2');
    const blockSizeStr = params.get('bs');

    if (!blockId1) throw new Error('Invalid magnet URL: missing b1 parameter');
    if (!blockId2) throw new Error('Invalid magnet URL: missing b2 parameter');
    if (!blockSizeStr)
      throw new Error('Invalid magnet URL: missing bs (block size) parameter');

    const blockSize = parseInt(blockSizeStr, 10);
    if (isNaN(blockSize) || blockSize <= 0) {
      throw new Error('Invalid magnet URL: invalid block size');
    }

    const p1Param = params.get('p1');
    const p2Param = params.get('p2');
    const block1ParityIds = p1Param
      ? p1Param
          .split(',')
          .filter((id) => id)
          .map(toStorageKey)
      : undefined;
    const block2ParityIds = p2Param
      ? p2Param
          .split(',')
          .filter((id) => id)
          .map(toStorageKey)
      : undefined;

    const isEncrypted = params.get('enc') === '1';

    return {
      blockId1: toStorageKey(blockId1),
      blockId2: toStorageKey(blockId2),
      blockSize,
      block1ParityIds,
      block2ParityIds,
      isEncrypted,
    };
  }

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

    if (block1ParityIds?.length) {
      params.set('p1', block1ParityIds.join(','));
    }
    if (block2ParityIds?.length) {
      params.set('p2', block2ParityIds.join(','));
    }

    if (isEncrypted) {
      params.set('enc', '1');
    }

    return `magnet:?${params.toString()}`;
  }

  // =========================================================================
  // IPooledBlockStore — Pool-Scoped Block Operations
  // =========================================================================

  public async hasInPool(pool: PoolId, hash: string): Promise<boolean> {
    validatePoolId(pool);
    const objectKey = this.buildObjectKey(hash, pool);
    return this.withRetry('hasInPool', hash, () =>
      this.objectExists(objectKey),
    );
  }

  public async getFromPool(pool: PoolId, hash: string): Promise<Uint8Array> {
    validatePoolId(pool);
    const objectKey = this.buildObjectKey(hash, pool);
    const data = await this.withRetry('getFromPool', hash, () =>
      this.downloadObject(objectKey),
    );

    // Record access in metadata
    try {
      const metaKey = this.buildMetaKey(hash, pool);
      if (await this.objectExists(metaKey)) {
        const metaData = await this.downloadObject(metaKey);
        const metadata = this.deserializeMetadata(metaData);
        metadata.accessCount++;
        metadata.lastAccessedAt = new Date();
        await this.uploadObject(metaKey, this.serializeMetadata(metadata));
      }
    } catch {
      // Ignore metadata access errors
    }

    return data;
  }

  public async putInPool(
    pool: PoolId,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<string> {
    validatePoolId(pool);

    // Compute checksum for the data
    const block = new RawDataBlock(lengthToBlockSize(data.length), data);
    const hash = block.idChecksum.toHex();
    const objectKey = this.buildObjectKey(hash, pool);

    // Idempotent — skip if already exists
    const exists = await this.withRetry('putInPool.exists', hash, () =>
      this.objectExists(objectKey),
    );
    if (exists) return hash;

    // Upload block data
    await this.withRetry('putInPool.upload', hash, () =>
      this.uploadObject(objectKey, data),
    );

    // Create and upload metadata sidecar
    const metadata = createDefaultBlockMetadata(
      toStorageKey(hash),
      data.length,
      hash,
      options,
      pool,
    );
    const metaKey = this.buildMetaKey(hash, pool);
    await this.withRetry('putInPool.meta', hash, () =>
      this.uploadObject(metaKey, this.serializeMetadata(metadata)),
    );

    return hash;
  }

  public async deleteFromPool(pool: PoolId, hash: string): Promise<void> {
    validatePoolId(pool);
    const objectKey = this.buildObjectKey(hash, pool);

    const exists = await this.withRetry('deleteFromPool.exists', hash, () =>
      this.objectExists(objectKey),
    );
    if (!exists) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hash,
      });
    }

    // Delete parity blocks
    try {
      const parityPrefix = this.buildParityPrefix(hash, pool);
      const parityKeys = await this.listObjects(parityPrefix);
      for (const pk of parityKeys) {
        try {
          await this.deleteObject(pk);
        } catch {
          // Ignore errors deleting parity files
        }
      }
    } catch {
      // Ignore errors listing parity blocks
    }

    // Delete block data
    await this.withRetry('deleteFromPool.delete', hash, () =>
      this.deleteObject(objectKey),
    );

    // Delete metadata sidecar
    try {
      const metaKey = this.buildMetaKey(hash, pool);
      await this.deleteObject(metaKey);
    } catch {
      // Ignore errors deleting metadata
    }
  }

  // =========================================================================
  // IPooledBlockStore — Pool Management
  // =========================================================================

  public async listPools(): Promise<PoolId[]> {
    const prefix = this.config.keyPrefix ?? '';
    const keys = await this.listObjects(prefix);
    const pools = new Set<PoolId>();

    for (const key of keys) {
      // Strip the prefix and extract the pool segment (first path component)
      const relative = key.substring(prefix.length);
      const slashIndex = relative.indexOf('/');
      if (slashIndex > 0) {
        const poolId = relative.substring(0, slashIndex);
        // Skip 'parity' segments that appear at pool level
        if (poolId !== 'parity') {
          pools.add(poolId);
        }
      }
    }

    return [...pools];
  }

  public async *listBlocksInPool(
    pool: PoolId,
    options?: ListOptions,
  ): AsyncIterable<string> {
    validatePoolId(pool);
    const poolPrefix = this.buildPoolPrefix(pool);
    const keys = await this.listObjects(poolPrefix);
    const limit = options?.limit;
    const cursor = options?.cursor;

    let pastCursor = cursor === undefined;
    let yielded = 0;

    for (const key of keys) {
      // Skip .meta and parity keys
      if (key.endsWith('.meta')) continue;
      if (key.includes('/parity/')) continue;

      const hash = key.substring(poolPrefix.length);
      if (!hash || hash.includes('/')) continue;

      if (!pastCursor) {
        if (hash === cursor) {
          pastCursor = true;
        }
        continue;
      }

      yield hash;
      yielded++;

      if (limit !== undefined && yielded >= limit) {
        break;
      }
    }
  }

  public async getPoolStats(pool: PoolId): Promise<PoolStats> {
    validatePoolId(pool);
    const poolPrefix = this.buildPoolPrefix(pool);
    const keys = await this.listObjects(poolPrefix);

    let blockCount = 0;
    let totalBytes = 0;
    let earliestCreated: Date | null = null;
    let latestAccessed: Date | null = null;

    for (const key of keys) {
      if (key.endsWith('.meta')) {
        try {
          const data = await this.downloadObject(key);
          const metadata = this.deserializeMetadata(data);
          blockCount++;
          totalBytes += metadata.size;
          if (!earliestCreated || metadata.createdAt < earliestCreated) {
            earliestCreated = metadata.createdAt;
          }
          if (!latestAccessed || metadata.lastAccessedAt > latestAccessed) {
            latestAccessed = metadata.lastAccessedAt;
          }
        } catch {
          // Skip unreadable metadata
        }
      }
    }

    const now = new Date();
    return {
      poolId: pool,
      blockCount,
      totalBytes,
      createdAt: earliestCreated ?? now,
      lastAccessedAt: latestAccessed ?? now,
    };
  }

  public async deletePool(pool: PoolId): Promise<void> {
    validatePoolId(pool);
    await this.performPoolDeletion(pool);
  }

  private async performPoolDeletion(pool: PoolId): Promise<void> {
    const poolPrefix = this.buildPoolPrefix(pool);
    const keys = await this.listObjects(poolPrefix);

    for (const key of keys) {
      try {
        await this.deleteObject(key);
      } catch {
        // Best-effort deletion
      }
    }
  }

  // =========================================================================
  // IPooledBlockStore — Pool-Scoped Whitening Operations
  // =========================================================================

  public async getRandomBlocksFromPool(
    pool: PoolId,
    count: number,
  ): Promise<Checksum[]> {
    validatePoolId(pool);
    if (count <= 0) return [];

    const poolPrefix = this.buildPoolPrefix(pool);
    const keys = await this.listObjects(poolPrefix);

    // Collect block checksums (skip .meta and parity)
    const checksums: string[] = [];
    for (const key of keys) {
      if (key.endsWith('.meta')) continue;
      if (key.includes('/parity/')) continue;
      const hash = key.substring(poolPrefix.length);
      if (hash && !hash.includes('/')) {
        checksums.push(hash);
      }
    }

    if (checksums.length === 0) return [];

    // Sample without replacement
    const result: Checksum[] = [];
    const available = [...checksums];
    const numToReturn = Math.min(count, available.length);

    for (let i = 0; i < numToReturn; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      result.push(this.hexToChecksum(available[randomIndex]));
      available.splice(randomIndex, 1);
    }

    return result;
  }

  public async bootstrapPool(
    pool: PoolId,
    blockSize: BlockSize,
    count: number,
  ): Promise<void> {
    validatePoolId(pool);
    if (count <= 0) return;

    for (let i = 0; i < count; i++) {
      const data = XorService.generateKey(blockSize);
      await this.putInPool(pool, data);
    }
  }

  public async validatePoolDeletion(
    pool: PoolId,
  ): Promise<PoolDeletionValidationResult> {
    validatePoolId(pool);
    // For cloud stores, we do a simplified validation:
    // We don't have cross-pool CBL dependency tracking in the cloud,
    // so we return safe=true. Full CBL dependency checking would require
    // scanning all pools' blocks for CBL references, which is expensive.
    return {
      safe: true,
      dependentPools: [],
      referencedBlocks: [],
    };
  }

  public async forceDeletePool(pool: PoolId): Promise<void> {
    validatePoolId(pool);
    await this.performPoolDeletion(pool);
  }

  // =========================================================================
  // IPooledBlockStore — Pool-Scoped CBL Whitening Operations
  // =========================================================================

  public async storeCBLWithWhiteningInPool(
    pool: PoolId,
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    validatePoolId(pool);

    if (!cblData || cblData.length === 0) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: 'CBL data cannot be empty',
      });
    }

    const paddedCbl = padToBlockSize(cblData, this._blockSize);
    if (paddedCbl.length > this._blockSize) {
      throw new StoreError(StoreErrorType.BlockValidationFailed, undefined, {
        ERROR: `CBL data too large: padded size (${paddedCbl.length}) exceeds block size (${this._blockSize}).`,
      });
    }

    // Generate randomizer
    let randomBlock: Uint8Array;
    try {
      const poolRandomBlocks = await this.getRandomBlocksFromPool(pool, 1);
      if (poolRandomBlocks.length > 0) {
        const blockData = await this.getFromPool(
          pool,
          poolRandomBlocks[0].toHex(),
        );
        if (blockData.length >= paddedCbl.length) {
          randomBlock = blockData.slice(0, paddedCbl.length);
        } else {
          randomBlock = XorService.generateKey(paddedCbl.length);
        }
      } else {
        randomBlock = XorService.generateKey(paddedCbl.length);
      }
    } catch {
      randomBlock = XorService.generateKey(paddedCbl.length);
    }

    const xorResult = xorArrays(paddedCbl, randomBlock);

    // Store both blocks in the pool
    const block1Hash = await this.putInPool(pool, randomBlock, options);
    const block2Hash = await this.putInPool(pool, xorResult, options);

    const block1Id = toStorageKey(block1Hash);
    const block2Id = toStorageKey(block2Hash);

    const magnetUrl = this.generateCBLMagnetUrl(
      block1Id,
      block2Id,
      this._blockSize,
      undefined,
      undefined,
      options?.isEncrypted,
    );

    return {
      blockId1: block1Id,
      blockId2: block2Id,
      blockSize: this._blockSize,
      magnetUrl,
      isEncrypted: options?.isEncrypted,
    };
  }

  public async retrieveCBLFromPool(
    pool: PoolId,
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    validatePoolId(pool);

    const b1Hex = this.keyToHex(blockId1);
    const b2Hex = this.keyToHex(blockId2);

    const block1Data = await this.getFromPool(pool, b1Hex);
    const block2Data = await this.getFromPool(pool, b2Hex);

    const reconstructedPadded = xorArrays(block1Data, block2Data);
    return unpadCblData(reconstructedPadded);
  }
}
