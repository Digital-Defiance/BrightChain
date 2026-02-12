import { PlatformID } from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { BaseBlock } from '../blocks/base';
import { BlockHandle, createBlockHandle } from '../blocks/handle';
import { RawDataBlock } from '../blocks/rawData';
import { BLOCK_HEADER, StructuredBlockType } from '../constants';
import { BlockSize } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { PoolDeletionError } from '../errors/poolDeletionError';
import { StoreError } from '../errors/storeError';
import { IFecService } from '../interfaces/services/fecService';
import {
  BlockStoreOptions,
  createDefaultBlockMetadata,
  IBlockMetadata,
} from '../interfaces/storage/blockMetadata';
import {
  DEFAULT_POOL,
  IPooledBlockStore,
  ListOptions,
  makeStorageKey,
  parseStorageKey,
  PoolDeletionValidationResult,
  PoolId,
  PoolStats,
  validatePoolId,
} from '../interfaces/storage/pooledBlockStore';
import { CBLService } from '../services/cblService';
import { getGlobalServiceProvider } from '../services/globalServiceProvider';
import { Checksum } from '../types/checksum';
import { MemoryBlockMetadataStore } from './memoryBlockMetadataStore';
import { MemoryBlockStore } from './memoryBlockStore';

/**
 * In-memory implementation of IPooledBlockStore.
 *
 * Extends MemoryBlockStore with pool-based namespace isolation.
 * Blocks are stored in a separate pool-scoped map keyed by storage keys
 * (format: "${poolId}:${hash}"). Legacy IBlockStore methods delegate
 * to the DEFAULT_POOL for backward compatibility.
 *
 * @see IPooledBlockStore for the interface definition
 * @see MemoryBlockStore for the base implementation
 */
export class PooledMemoryBlockStore
  extends MemoryBlockStore
  implements IPooledBlockStore
{
  /** Pool-scoped block storage: storageKey -> block data */
  private readonly poolBlocks = new Map<string, Uint8Array>();

  /** Per-pool statistics */
  private readonly poolStatsMap = new Map<PoolId, PoolStats>();

  constructor(
    blockSize: BlockSize,
    fecService?: IFecService | null,
    metadataStore?: MemoryBlockMetadataStore,
  ) {
    super(blockSize, fecService, metadataStore);
  }

  // =========================================================================
  // Pool-Scoped Block Operations
  // =========================================================================

  /**
   * Compute the SHA3-512 hash of data and return as hex string.
   */
  private computeHash(data: Uint8Array): string {
    const hashBytes = sha3_512(data);
    return Checksum.fromUint8Array(hashBytes).toHex();
  }

  /**
   * Update pool statistics after a block is added.
   */
  private recordPut(poolId: PoolId, dataLength: number): void {
    const now = new Date();
    const existing = this.poolStatsMap.get(poolId);
    if (existing) {
      existing.blockCount += 1;
      existing.totalBytes += dataLength;
      existing.lastAccessedAt = now;
    } else {
      this.poolStatsMap.set(poolId, {
        poolId,
        blockCount: 1,
        totalBytes: dataLength,
        createdAt: now,
        lastAccessedAt: now,
      });
    }
  }

  /**
   * Update pool statistics after a block is removed.
   */
  private recordDelete(poolId: PoolId, dataLength: number): void {
    const existing = this.poolStatsMap.get(poolId);
    if (existing) {
      existing.blockCount -= 1;
      existing.totalBytes -= dataLength;
      existing.lastAccessedAt = new Date();
    }
  }

  /**
   * Touch the lastAccessedAt timestamp for a pool.
   */
  private touchPool(poolId: PoolId): void {
    const existing = this.poolStatsMap.get(poolId);
    if (existing) {
      existing.lastAccessedAt = new Date();
    }
  }

  public async hasInPool(pool: PoolId, hash: string): Promise<boolean> {
    validatePoolId(pool);
    const key = makeStorageKey(pool, hash);
    this.touchPool(pool);
    return this.poolBlocks.has(key);
  }

  public async getFromPool(pool: PoolId, hash: string): Promise<Uint8Array> {
    validatePoolId(pool);
    const key = makeStorageKey(pool, hash);
    const data = this.poolBlocks.get(key);
    if (!data) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: `${pool}:${hash}`,
      });
    }
    this.touchPool(pool);
    return data;
  }

  public async putInPool(
    pool: PoolId,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<string> {
    validatePoolId(pool);
    const hash = this.computeHash(data);
    const key = makeStorageKey(pool, hash);

    if (this.poolBlocks.has(key)) {
      // Idempotent — block already exists in this pool
      this.touchPool(pool);
      return hash;
    }

    // Store the block data
    this.poolBlocks.set(key, new Uint8Array(data));

    // Create metadata with poolId
    const metadata = createDefaultBlockMetadata(
      hash,
      data.length,
      hash,
      options,
      pool,
    );
    try {
      await this.getMetadataStore().create(metadata);
    } catch {
      // Metadata may already exist if the same hash was stored in another pool
      // Update poolId on existing metadata
      if (this.getMetadataStore().has(hash)) {
        await this.getMetadataStore().update(hash, { poolId: pool });
      }
    }

    // Update pool stats
    this.recordPut(pool, data.length);

    return hash;
  }

  public async deleteFromPool(pool: PoolId, hash: string): Promise<void> {
    validatePoolId(pool);
    const key = makeStorageKey(pool, hash);
    const data = this.poolBlocks.get(key);
    if (data) {
      this.poolBlocks.delete(key);
      this.recordDelete(pool, data.length);
    }
  }

  // =========================================================================
  // Pool Management
  // =========================================================================

  public async listPools(): Promise<PoolId[]> {
    const pools: PoolId[] = [];
    for (const [poolId, stats] of this.poolStatsMap) {
      if (stats.blockCount > 0) {
        pools.push(poolId);
      }
    }
    return pools;
  }

  public async *listBlocksInPool(
    pool: PoolId,
    options?: ListOptions,
  ): AsyncIterable<string> {
    validatePoolId(pool);
    const prefix = pool + ':';
    const limit = options?.limit;
    const cursor = options?.cursor;

    let pastCursor = cursor === undefined;
    let yielded = 0;

    for (const key of this.poolBlocks.keys()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const { hash } = parseStorageKey(key);

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
    const stats = this.poolStatsMap.get(pool);
    if (!stats) {
      throw new Error(
        `Pool "${pool}" not found: no blocks have been stored in this pool`,
      );
    }
    return {
      ...stats,
      createdAt: new Date(stats.createdAt.getTime()),
      lastAccessedAt: new Date(stats.lastAccessedAt.getTime()),
    };
  }

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
    await this.performPoolDeletion(pool);
  }

  /**
   * Internal deletion logic shared by deletePool (after validation) and forceDeletePool.
   * Removes all blocks with the pool prefix and clears pool stats.
   */
  private async performPoolDeletion(pool: PoolId): Promise<void> {
    const prefix = pool + ':';
    const keysToDelete: string[] = [];

    for (const key of this.poolBlocks.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.poolBlocks.delete(key);
    }

    this.poolStatsMap.delete(pool);
  }

  // =========================================================================
  // Pool-Scoped Whitening Operations
  // =========================================================================

  /**
   * Get random block checksums scoped to a specific pool.
   * Iterates storage keys with the pool prefix and randomly selects blocks.
   * @param pool - The pool to source random blocks from
   * @param count - Number of random blocks requested
   * @returns Array of checksums (may be fewer than count if pool has insufficient blocks)
   */
  public async getRandomBlocksFromPool(
    pool: PoolId,
    count: number,
  ): Promise<Checksum[]> {
    validatePoolId(pool);
    const poolPrefix = `${pool}:`;
    const poolKeys: string[] = [];
    for (const key of this.poolBlocks.keys()) {
      if (key.startsWith(poolPrefix)) {
        poolKeys.push(key.substring(poolPrefix.length));
      }
    }
    const actualCount = Math.min(count, poolKeys.length);
    const shuffled = [...poolKeys].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, actualCount).map((hex) => Checksum.fromHex(hex));
  }

  /**
   * Override getRandomBlocks to use Default_Pool for backward compatibility.
   * Delegates to getRandomBlocksFromPool with DEFAULT_POOL.
   */
  public override async getRandomBlocks(count: number): Promise<Checksum[]> {
    return this.getRandomBlocksFromPool(DEFAULT_POOL, count);
  }

  /**
   * Seed a pool with cryptographically random blocks for whitening material.
   * Stub — full implementation in task 5.1.
   */
  public async bootstrapPool(
    pool: PoolId,
    blockSize: BlockSize,
    count: number,
  ): Promise<void> {
    validatePoolId(pool);
    if (count <= 0) return;
    for (let i = 0; i < count; i++) {
      const data = new Uint8Array(blockSize);
      crypto.getRandomValues(data);
      await this.putInPool(pool, data);
    }
  }

  /**
   * Check whether a pool can be safely deleted (no cross-pool XOR dependencies).
   * Scans all other pools' blocks looking for CBL-type blocks whose addresses
   * reference checksums stored in the target pool.
   *
   * @param pool - The pool to validate for deletion
   * @returns Validation result with dependency details if unsafe
   */
  public async validatePoolDeletion(
    pool: PoolId,
  ): Promise<PoolDeletionValidationResult> {
    validatePoolId(pool);

    // 1. Collect all block hashes in the target pool for O(1) lookup
    const targetPoolPrefix = `${pool}:`;
    const targetPoolHashes = new Set<string>();
    for (const key of this.poolBlocks.keys()) {
      if (key.startsWith(targetPoolPrefix)) {
        const { hash } = parseStorageKey(key);
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

    for (const [key, data] of this.poolBlocks.entries()) {
      // Skip blocks in the target pool itself
      if (key.startsWith(targetPoolPrefix)) {
        continue;
      }

      // Check if this block is a structured CBL block
      if (!this.isCblBlock(data)) {
        continue;
      }

      // Extract the pool this CBL belongs to
      const { poolId: otherPool } = parseStorageKey(key);

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

    const dependentPools = Array.from(dependentPoolsSet);
    const referencedBlocks = Array.from(referencedBlocksSet);
    const safe = dependentPools.length === 0;

    return { safe, dependentPools, referencedBlocks };
  }

  /**
   * Check if raw block data represents a CBL-type block.
   * CBL blocks have the BrightChain magic prefix (0xBC) followed by a CBL structured type.
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
   * Extract addresses from a CBL block's raw data.
   * Returns null if the block is encrypted or cannot be parsed.
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
   * Delete a pool without checking for cross-pool dependencies.
   * For administrative use only — bypasses validatePoolDeletion.
   */
  public async forceDeletePool(pool: PoolId): Promise<void> {
    validatePoolId(pool);
    await this.performPoolDeletion(pool);
  }

  // =========================================================================
  // Legacy IBlockStore method overrides — delegate to DEFAULT_POOL
  // =========================================================================

  public override async has(key: Checksum | string): Promise<boolean> {
    const hash = typeof key === 'string' ? key : key.toHex();
    return this.hasInPool(DEFAULT_POOL, hash);
  }

  public override async getData(key: Checksum): Promise<RawDataBlock> {
    const hash = key.toHex();
    const data = await this.getFromPool(DEFAULT_POOL, hash);
    return new RawDataBlock(this.blockSize, data);
  }

  public override async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    await this.putInPool(DEFAULT_POOL, block.data, options);
  }

  public override async deleteData(key: Checksum): Promise<void> {
    const hash = key.toHex();
    await this.deleteFromPool(DEFAULT_POOL, hash);
  }

  public override async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    await this.putInPool(DEFAULT_POOL, data, options);
  }

  public override async delete(key: Checksum | string): Promise<void> {
    const hash = typeof key === 'string' ? key : key.toHex();
    await this.deleteFromPool(DEFAULT_POOL, hash);
  }

  public override get<T extends BaseBlock>(
    key: Checksum | string,
  ): BlockHandle<T> {
    const hash = typeof key === 'string' ? key : key.toHex();
    const storageKey = makeStorageKey(DEFAULT_POOL, hash);
    const data = this.poolBlocks.get(storageKey);
    if (!data) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hash,
      });
    }
    const checksum = typeof key === 'string' ? Checksum.fromHex(key) : key;
    return createBlockHandle(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      RawDataBlock as any,
      this.blockSize,
      data,
      checksum,
      true,
      true,
    ) as BlockHandle<T>;
  }

  // =========================================================================
  // Metadata overrides for pool-scoped storage keys
  // =========================================================================

  public override async getMetadata(
    key: Checksum | string,
  ): Promise<IBlockMetadata | null> {
    const hash = typeof key === 'string' ? key : key.toHex();
    return this.getMetadataStore().get(hash);
  }

  public override async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const hash = typeof key === 'string' ? key : key.toHex();
    if (!this.getMetadataStore().has(hash)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: hash,
      });
    }
    await this.getMetadataStore().update(hash, updates);
  }

  // =========================================================================
  // Utility overrides
  // =========================================================================

  public override clear(): void {
    super.clear();
    this.poolBlocks.clear();
    this.poolStatsMap.clear();
  }

  public override size(): number {
    return this.poolBlocks.size;
  }
}
