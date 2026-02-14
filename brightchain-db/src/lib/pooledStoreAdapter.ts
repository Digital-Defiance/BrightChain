/**
 * PooledStoreAdapter – adapts an IPooledBlockStore to IBlockStore
 * by fixing all operations to a specific pool.
 *
 * This allows Collection to remain unchanged: it continues to call
 * store.has(), store.get(), store.put() as before, but the adapter
 * routes those calls through pool-scoped methods on the inner store.
 */

import type {
  BlockStoreOptions,
  BrightenResult,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  IBlockMetadata,
  IBlockStore,
  IPooledBlockStore,
  PoolId,
  RecoveryResult,
} from '@brightchain/brightchain-lib';
import {
  BaseBlock,
  BlockHandle,
  BlockSize,
  Checksum,
  makeStorageKey,
  RawDataBlock,
} from '@brightchain/brightchain-lib';

/**
 * Adapts an IPooledBlockStore to IBlockStore by fixing all operations
 * to a specific pool. This allows Collection to remain unchanged —
 * all pool routing is handled transparently at the adapter level.
 */
export class PooledStoreAdapter implements IBlockStore {
  constructor(
    private readonly inner: IPooledBlockStore,
    private readonly poolId: PoolId,
  ) {}

  // === Delegated property ===

  public get blockSize(): BlockSize {
    return this.inner.blockSize;
  }

  // === Pool-scoped core block operations ===

  public async has(key: Checksum | string): Promise<boolean> {
    const hash = typeof key === 'string' ? key : key.toHex();
    return this.inner.hasInPool(this.poolId, hash);
  }

  public async getData(key: Checksum): Promise<RawDataBlock> {
    const data = await this.inner.getFromPool(this.poolId, key.toHex());
    return new RawDataBlock(this.blockSize, data);
  }

  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    await this.inner.putInPool(this.poolId, block.data, options);
  }

  public async deleteData(key: Checksum): Promise<void> {
    await this.inner.deleteFromPool(this.poolId, key.toHex());
  }

  public async getRandomBlocks(count: number): Promise<Checksum[]> {
    return this.inner.getRandomBlocksFromPool(this.poolId, count);
  }

  public get<T extends BaseBlock>(key: Checksum | string): BlockHandle<T> {
    const hash = typeof key === 'string' ? key : key.toHex();
    const storageKey = makeStorageKey(this.poolId, hash);
    return this.inner.get<T>(storageKey);
  }

  public async put(
    key: Checksum | string,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    await this.inner.putInPool(this.poolId, data, options);
  }

  public async delete(key: Checksum | string): Promise<void> {
    const hash = typeof key === 'string' ? key : key.toHex();
    await this.inner.deleteFromPool(this.poolId, hash);
  }

  // === Metadata operations (delegated directly to inner store) ===

  public async getMetadata(
    key: Checksum | string,
  ): Promise<IBlockMetadata | null> {
    return this.inner.getMetadata(key);
  }

  public async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    return this.inner.updateMetadata(key, updates);
  }

  // === FEC/Durability operations (delegated directly to inner store) ===

  public async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    return this.inner.generateParityBlocks(key, parityCount);
  }

  public async getParityBlocks(key: Checksum | string): Promise<Checksum[]> {
    return this.inner.getParityBlocks(key);
  }

  public async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    return this.inner.recoverBlock(key);
  }

  public async verifyBlockIntegrity(key: Checksum | string): Promise<boolean> {
    return this.inner.verifyBlockIntegrity(key);
  }

  // === Replication operations (delegated directly to inner store) ===

  public async getBlocksPendingReplication(): Promise<Checksum[]> {
    return this.inner.getBlocksPendingReplication();
  }

  public async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    return this.inner.getUnderReplicatedBlocks();
  }

  public async recordReplication(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    return this.inner.recordReplication(key, nodeId);
  }

  public async recordReplicaLoss(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    return this.inner.recordReplicaLoss(key, nodeId);
  }

  // === XOR Brightening operations (delegated directly to inner store) ===

  public async brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.inner.brightenBlock(key, randomBlockCount);
  }

  // === CBL Whitening operations (delegated through pool) ===

  public async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    return this.inner.storeCBLWithWhiteningInPool(
      this.poolId,
      cblData,
      options,
    );
  }

  public async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    return this.inner.retrieveCBLFromPool(
      this.poolId,
      blockId1,
      blockId2,
      block1ParityIds,
      block2ParityIds,
    );
  }

  public parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    return this.inner.parseCBLMagnetUrl(magnetUrl);
  }

  public generateCBLMagnetUrl(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    blockSize: number,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
    isEncrypted?: boolean,
  ): string {
    return this.inner.generateCBLMagnetUrl(
      blockId1,
      blockId2,
      blockSize,
      block1ParityIds,
      block2ParityIds,
      isEncrypted,
    );
  }
}
