import { BaseBlock } from '../blocks/base';
import { BlockHandle } from '../blocks/handle';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import {
  BlockStoreOptions,
  BrightenResult,
  IBlockMetadata,
  RecoveryResult,
} from '../interfaces/storage/blockMetadata';
import { IBlockStore } from '../interfaces/storage/blockStore';
import {
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
} from '../interfaces/storage/cblWhitening';
import { Checksum } from '../types/checksum';
import { MemoryBlockStore } from './memoryBlockStore';

type BlockId = string | Checksum;

function normalizeId(blockId: BlockId): Checksum {
  if (typeof blockId === 'string') {
    return Checksum.fromHex(blockId);
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

  public async getData(key: Checksum): Promise<RawDataBlock> {
    return this.store.getData(key);
  }

  public async setData(
    block: RawDataBlock,
    options?: BlockStoreOptions,
  ): Promise<void> {
    await this.store.setData(block, options);
  }

  public async has(key: Checksum | string): Promise<boolean> {
    return this.store.has(key);
  }

  public async deleteData(key: Checksum): Promise<void> {
    await this.store.deleteData(key);
  }

  public async getRandomBlocks(count: number): Promise<Checksum[]> {
    return this.store.getRandomBlocks(count);
  }

  public get<T extends BaseBlock>(checksum: Checksum | string): BlockHandle<T> {
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
    return id.toHex();
  }

  // === Metadata Operations (delegated to underlying store) ===

  public async getMetadata(
    key: Checksum | string,
  ): Promise<IBlockMetadata | null> {
    return this.store.getMetadata(key);
  }

  public async updateMetadata(
    key: Checksum | string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    return this.store.updateMetadata(key, updates);
  }

  // === FEC/Durability Operations (delegated to underlying store) ===

  public async generateParityBlocks(
    key: Checksum | string,
    parityCount: number,
  ): Promise<Checksum[]> {
    return this.store.generateParityBlocks(key, parityCount);
  }

  public async getParityBlocks(key: Checksum | string): Promise<Checksum[]> {
    return this.store.getParityBlocks(key);
  }

  public async recoverBlock(key: Checksum | string): Promise<RecoveryResult> {
    return this.store.recoverBlock(key);
  }

  public async verifyBlockIntegrity(key: Checksum | string): Promise<boolean> {
    return this.store.verifyBlockIntegrity(key);
  }

  // === Replication Operations (delegated to underlying store) ===

  public async getBlocksPendingReplication(): Promise<Checksum[]> {
    return this.store.getBlocksPendingReplication();
  }

  public async getUnderReplicatedBlocks(): Promise<Checksum[]> {
    return this.store.getUnderReplicatedBlocks();
  }

  public async recordReplication(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    return this.store.recordReplication(key, nodeId);
  }

  public async recordReplicaLoss(
    key: Checksum | string,
    nodeId: string,
  ): Promise<void> {
    return this.store.recordReplicaLoss(key, nodeId);
  }

  // === XOR Brightening Operations (delegated to underlying store) ===

  public async brightenBlock(
    key: Checksum | string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.store.brightenBlock(key, randomBlockCount);
  }

  // === CBL Whitening Operations (delegated to underlying store) ===

  public async storeCBLWithWhitening(
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult> {
    return this.store.storeCBLWithWhitening(cblData, options);
  }

  public async retrieveCBL(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array> {
    return this.store.retrieveCBL(
      blockId1,
      blockId2,
      block1ParityIds,
      block2ParityIds,
    );
  }

  public parseCBLMagnetUrl(magnetUrl: string): CBLMagnetComponents {
    return this.store.parseCBLMagnetUrl(magnetUrl);
  }

  public generateCBLMagnetUrl(
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    blockSize: number,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
    isEncrypted?: boolean,
  ): string {
    return this.store.generateCBLMagnetUrl(
      blockId1,
      blockId2,
      blockSize,
      block1ParityIds,
      block2ParityIds,
      isEncrypted,
    );
  }
}
