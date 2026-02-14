/**
 * In-memory mock of IBlockStore for testing.
 *
 * Implements only the methods that brightchain-db actually uses:
 *   has(key), get(key), put(key, data), delete(key)
 *
 * All other IBlockStore methods throw "not implemented" so tests catch
 * accidental usage immediately.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockSize,
  BlockStoreOptions,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  Checksum,
  IBlockStore,
  IPooledBlockStore,
  ListOptions,
  makeStorageKey,
  parseStorageKey,
  PoolDeletionValidationResult,
  PoolId,
  PoolStats,
  validatePoolId,
} from '@brightchain/brightchain-lib';
import { sha3_512 } from '@noble/hashes/sha3';

export class MockBlockStore implements IBlockStore {
  readonly blocks = new Map<string, Uint8Array>();

  /** Track method calls for assertions */
  readonly calls = {
    has: [] as string[],
    get: [] as string[],
    put: [] as string[],
    delete: [] as string[],
  };

  /** Optional: simulate errors on specific keys */
  readonly errorKeys = new Set<string>();

  // ── Methods used by brightchain-db ──

  async has(key: any): Promise<boolean> {
    const k = String(key);
    this.calls.has.push(k);
    if (this.errorKeys.has(k))
      throw new Error(`MockBlockStore: simulated error on has(${k})`);
    return this.blocks.has(k);
  }

  get(key: any): any {
    const k = String(key);
    this.calls.get.push(k);
    if (this.errorKeys.has(k))
      throw new Error(`MockBlockStore: simulated error on get(${k})`);
    const data = this.blocks.get(k);
    if (!data) throw new Error(`Block not found: ${k}`);
    return { fullData: data };
  }

  async put(key: any, data: Uint8Array): Promise<void> {
    const k = String(key);
    this.calls.put.push(k);
    if (this.errorKeys.has(k))
      throw new Error(`MockBlockStore: simulated error on put(${k})`);
    this.blocks.set(k, data);
  }

  async delete(key: any): Promise<void> {
    const k = String(key);
    this.calls.delete.push(k);
    this.blocks.delete(k);
  }

  // ── Convenience ──

  /** Total number of blocks currently stored */
  get size(): number {
    return this.blocks.size;
  }

  /** Reset all stored data and call tracking */
  reset(): void {
    this.blocks.clear();
    this.calls.has.length = 0;
    this.calls.get.length = 0;
    this.calls.put.length = 0;
    this.calls.delete.length = 0;
    this.errorKeys.clear();
  }

  // ── Stubs for remaining IBlockStore methods ──

  get blockSize(): any {
    return 0;
  }
  async getData(): Promise<any> {
    throw new Error('not implemented');
  }
  async setData(): Promise<void> {
    throw new Error('not implemented');
  }
  async deleteData(): Promise<void> {
    throw new Error('not implemented');
  }
  async getRandomBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async getMetadata(): Promise<any> {
    throw new Error('not implemented');
  }
  async updateMetadata(): Promise<void> {
    throw new Error('not implemented');
  }
  async generateParityBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async getParityBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async recoverBlock(): Promise<any> {
    throw new Error('not implemented');
  }
  async verifyBlockIntegrity(): Promise<boolean> {
    throw new Error('not implemented');
  }
  async getBlocksPendingReplication(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async getUnderReplicatedBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async recordReplication(): Promise<void> {
    throw new Error('not implemented');
  }
  async recordReplicaLoss(): Promise<void> {
    throw new Error('not implemented');
  }
  async brightenBlock(): Promise<any> {
    throw new Error('not implemented');
  }
  async storeCBLWithWhitening(cblData: Uint8Array): Promise<CBLStorageResult> {
    // Generate two deterministic block IDs from the data
    const blockId1 = `cbl-block1-${this.blocks.size}-${Date.now()}`;
    const blockId2 = `cbl-block2-${this.blocks.size}-${Date.now()}`;

    // Store the original data under blockId1, and a random XOR component under blockId2
    // For mock purposes, we store the raw data under blockId1 and a marker under blockId2
    this.blocks.set(blockId1, new Uint8Array(cblData));
    this.blocks.set(blockId2, new Uint8Array([0xfe, 0xed])); // marker

    const magnetUrl = `magnet:?xt=urn:brightchain:cbl&bs=256&b1=${blockId1}&b2=${blockId2}`;
    return {
      blockId1,
      blockId2,
      blockSize: 256,
      magnetUrl,
    };
  }

  async retrieveCBL(
    blockId1: string | { toString(): string },
    _blockId2?: string | { toString(): string },
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    const k1 = String(blockId1);
    const data = this.blocks.get(k1);
    if (!data) {
      throw new Error(`CBL block not found: ${k1}`);
    }
    return new Uint8Array(data);
  }

  parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    const url = new URL(magnetUrl);
    const params = url.searchParams;
    return {
      blockId1: params.get('b1') ?? '',
      blockId2: params.get('b2') ?? '',
      blockSize: parseInt(params.get('bs') ?? '0', 10),
      isEncrypted: params.get('enc') === '1',
    };
  }

  generateCBLMagnetUrl(
    blockId1: string | { toString(): string },
    blockId2: string | { toString(): string },
    blockSize: number,
  ): string {
    return `magnet:?xt=urn:brightchain:cbl&bs=${blockSize}&b1=${String(blockId1)}&b2=${String(blockId2)}`;
  }
}

/**
 * Mock pooled block store for testing pool-scoped operations.
 *
 * Extends MockBlockStore with IPooledBlockStore methods using simple
 * in-memory maps. Computes SHA3-512 hashes for putInPool.
 */
export class MockPooledBlockStore
  extends MockBlockStore
  implements IPooledBlockStore
{
  /** Pool-scoped block storage: storageKey -> block data */
  readonly poolBlocks = new Map<string, Uint8Array>();

  /** Per-pool statistics */
  readonly poolStatsMap = new Map<PoolId, PoolStats>();

  /** Track pool method calls for assertions */
  readonly poolCalls = {
    hasInPool: [] as Array<{ pool: PoolId; hash: string }>,
    getFromPool: [] as Array<{ pool: PoolId; hash: string }>,
    putInPool: [] as Array<{ pool: PoolId; dataLength: number }>,
    deleteFromPool: [] as Array<{ pool: PoolId; hash: string }>,
    listPools: 0,
    listBlocksInPool: [] as PoolId[],
    getPoolStats: [] as PoolId[],
    deletePool: [] as PoolId[],
  };

  // ── Helpers ──

  private computeHash(data: Uint8Array): string {
    const hashBytes = sha3_512(data);
    return Buffer.from(hashBytes).toString('hex');
  }

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

  private recordDelete(poolId: PoolId, dataLength: number): void {
    const existing = this.poolStatsMap.get(poolId);
    if (existing) {
      existing.blockCount -= 1;
      existing.totalBytes -= dataLength;
      existing.lastAccessedAt = new Date();
    }
  }

  private touchPool(poolId: PoolId): void {
    const existing = this.poolStatsMap.get(poolId);
    if (existing) {
      existing.lastAccessedAt = new Date();
    }
  }

  // ── Pool-Scoped Block Operations ──

  async hasInPool(pool: PoolId, hash: string): Promise<boolean> {
    validatePoolId(pool);
    this.poolCalls.hasInPool.push({ pool, hash });
    const key = makeStorageKey(pool, hash);
    this.touchPool(pool);
    return this.poolBlocks.has(key);
  }

  async getFromPool(pool: PoolId, hash: string): Promise<Uint8Array> {
    validatePoolId(pool);
    this.poolCalls.getFromPool.push({ pool, hash });
    const key = makeStorageKey(pool, hash);
    const data = this.poolBlocks.get(key);
    if (!data) {
      throw new Error(`Block not found in pool "${pool}": ${hash}`);
    }
    this.touchPool(pool);
    return data;
  }

  async putInPool(
    pool: PoolId,
    data: Uint8Array,
    _options?: BlockStoreOptions,
  ): Promise<string> {
    validatePoolId(pool);
    const hash = this.computeHash(data);
    this.poolCalls.putInPool.push({ pool, dataLength: data.length });
    const key = makeStorageKey(pool, hash);

    if (this.poolBlocks.has(key)) {
      this.touchPool(pool);
      return hash;
    }

    this.poolBlocks.set(key, new Uint8Array(data));
    this.recordPut(pool, data.length);
    return hash;
  }

  async deleteFromPool(pool: PoolId, hash: string): Promise<void> {
    validatePoolId(pool);
    this.poolCalls.deleteFromPool.push({ pool, hash });
    const key = makeStorageKey(pool, hash);
    const data = this.poolBlocks.get(key);
    if (data) {
      this.poolBlocks.delete(key);
      this.recordDelete(pool, data.length);
    }
  }

  // ── Pool Management ──

  async listPools(): Promise<PoolId[]> {
    this.poolCalls.listPools++;
    const pools: PoolId[] = [];
    for (const [poolId, stats] of this.poolStatsMap) {
      if (stats.blockCount > 0) {
        pools.push(poolId);
      }
    }
    return pools;
  }

  async *listBlocksInPool(
    pool: PoolId,
    options?: ListOptions,
  ): AsyncIterable<string> {
    validatePoolId(pool);
    this.poolCalls.listBlocksInPool.push(pool);
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

  async getPoolStats(pool: PoolId): Promise<PoolStats> {
    validatePoolId(pool);
    this.poolCalls.getPoolStats.push(pool);
    const stats = this.poolStatsMap.get(pool);
    if (!stats) {
      throw new Error(
        `Pool "${pool}" not found: no blocks have been stored in this pool`,
      );
    }
    return { ...stats };
  }

  async deletePool(pool: PoolId): Promise<void> {
    validatePoolId(pool);
    this.poolCalls.deletePool.push(pool);
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

  // ── Pool-Scoped Whitening Operations ──

  async getRandomBlocksFromPool(
    pool: PoolId,
    count: number,
  ): Promise<Checksum[]> {
    validatePoolId(pool);
    const prefix = pool + ':';
    const hashes: Checksum[] = [];
    for (const key of this.poolBlocks.keys()) {
      if (key.startsWith(prefix)) {
        const { hash } = parseStorageKey(key);
        hashes.push(Checksum.fromHex(hash));
        if (hashes.length >= count) break;
      }
    }
    return hashes;
  }

  async bootstrapPool(
    pool: PoolId,
    blockSize: BlockSize,
    count: number,
  ): Promise<void> {
    validatePoolId(pool);
    for (let i = 0; i < count; i++) {
      const data = new Uint8Array(blockSize);
      crypto.getRandomValues(data);
      await this.putInPool(pool, data);
    }
  }

  async validatePoolDeletion(
    pool: PoolId,
  ): Promise<PoolDeletionValidationResult> {
    validatePoolId(pool);
    return { safe: true, dependentPools: [], referencedBlocks: [] };
  }

  async forceDeletePool(pool: PoolId): Promise<void> {
    await this.deletePool(pool);
  }

  // ── Pool-Scoped CBL Whitening Operations ──

  async storeCBLWithWhiteningInPool(
    _pool: PoolId,
    _cblData: Uint8Array,
    _options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    throw new Error('Not implemented in mock');
  }

  async retrieveCBLFromPool(
    _pool: PoolId,
    _blockId1: Checksum | string,
    _blockId2: Checksum | string,
    _block1ParityIds?: string[],
    _block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    throw new Error('Not implemented in mock');
  }

  // ── Convenience ──

  /** Reset all stored data including pool data and call tracking */
  override reset(): void {
    super.reset();
    this.poolBlocks.clear();
    this.poolStatsMap.clear();
    this.poolCalls.hasInPool.length = 0;
    this.poolCalls.getFromPool.length = 0;
    this.poolCalls.putInPool.length = 0;
    this.poolCalls.deleteFromPool.length = 0;
    this.poolCalls.listPools = 0;
    this.poolCalls.listBlocksInPool.length = 0;
    this.poolCalls.getPoolStats.length = 0;
    this.poolCalls.deletePool.length = 0;
  }
}
