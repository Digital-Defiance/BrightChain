import {
  ChecksumUint8Array,
  hexToUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { BaseBlock } from '../blocks/base';
import { BlockHandle } from '../blocks/handle';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { IBlockStore } from '../interfaces/storage/blockStore';
import {
  IBlockMetadata,
  BlockStoreOptions,
  RecoveryResult,
  BrightenResult,
} from '../interfaces/storage/blockMetadata';
import { MemoryBlockStore } from './memoryBlockStore';

type BlockId = string | ChecksumUint8Array;

function normalizeId(blockId: BlockId): ChecksumUint8Array {
  if (typeof blockId === 'string') {
    return hexToUint8Array(blockId) as ChecksumUint8Array;
  }
  return blockId;
}

function validateSize(data: Uint8Array, blockSize: BlockSize): Uint8Array {
  if (data.length > blockSize) {
    throw new Error(
      `Data length (${data.length}) exceeds block size (${blockSize})`,
    );
  }
  return data;
}

export class MemoryBlockStoreAdapter implements IBlockStore {
  public readonly blockSize: BlockSize;
  private readonly store: MemoryBlockStore;

  constructor(config: { blockSize: BlockSize }) {
    this.store = new MemoryBlockStore(config.blockSize);
    this.blockSize = config.blockSize;
  }

  public async put(
    blockId: BlockId,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<void> {
    const id = normalizeId(blockId);
    const validated = validateSize(data, this.blockSize);
    const block = new RawDataBlock(this.blockSize, validated, new Date(), id);
    await this.store.setData(block, options);
  }

  public async getData(key: ChecksumUint8Array): Promise<RawDataBlock> {
    return this.store.getData(key);
  }

  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    await this.store.setData(block, options);
  }

  public async has(key: ChecksumUint8Array): Promise<boolean> {
    return this.store.has(key);
  }

  public async deleteData(key: ChecksumUint8Array): Promise<void> {
    await this.store.deleteData(key);
  }

  public async getRandomBlocks(count: number): Promise<ChecksumUint8Array[]> {
    return this.store.getRandomBlocks(count);
  }

  public get<T extends BaseBlock>(
    checksum: ChecksumUint8Array,
  ): BlockHandle<T> {
    return this.store.get<T>(checksum);
  }

  public async getBlock(blockId: BlockId): Promise<RawDataBlock> {
    const id = normalizeId(blockId);
    return this.store.getData(id);
  }

  public async delete(blockId: BlockId): Promise<void> {
    const id = normalizeId(blockId);
    await this.store.deleteData(id);
  }

  public getHex(blockId: BlockId): string {
    const id = normalizeId(blockId);
    return uint8ArrayToHex(id);
  }

  // === Metadata Operations (delegated to underlying store) ===

  public async getMetadata(
    key: ChecksumUint8Array | string,
  ): Promise<IBlockMetadata | null> {
    return this.store.getMetadata(key);
  }

  public async updateMetadata(
    key: ChecksumUint8Array | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    return this.store.updateMetadata(key, updates);
  }

  // === FEC/Durability Operations (delegated to underlying store) ===

  public async generateParityBlocks(
    key: ChecksumUint8Array | string,
    parityCount: number,
  ): Promise<ChecksumUint8Array[]> {
    return this.store.generateParityBlocks(key, parityCount);
  }

  public async getParityBlocks(
    key: ChecksumUint8Array | string,
  ): Promise<ChecksumUint8Array[]> {
    return this.store.getParityBlocks(key);
  }

  public async recoverBlock(
    key: ChecksumUint8Array | string,
  ): Promise<RecoveryResult> {
    return this.store.recoverBlock(key);
  }

  public async verifyBlockIntegrity(
    key: ChecksumUint8Array | string,
  ): Promise<boolean> {
    return this.store.verifyBlockIntegrity(key);
  }

  // === Replication Operations (delegated to underlying store) ===

  public async getBlocksPendingReplication(): Promise<ChecksumUint8Array[]> {
    return this.store.getBlocksPendingReplication();
  }

  public async getUnderReplicatedBlocks(): Promise<ChecksumUint8Array[]> {
    return this.store.getUnderReplicatedBlocks();
  }

  public async recordReplication(
    key: ChecksumUint8Array | string,
    nodeId: string,
  ): Promise<void> {
    return this.store.recordReplication(key, nodeId);
  }

  public async recordReplicaLoss(
    key: ChecksumUint8Array | string,
    nodeId: string,
  ): Promise<void> {
    return this.store.recordReplicaLoss(key, nodeId);
  }

  // === XOR Brightening Operations (delegated to underlying store) ===

  public async brightenBlock(
    key: ChecksumUint8Array | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.store.brightenBlock(key, randomBlockCount);
  }
}
