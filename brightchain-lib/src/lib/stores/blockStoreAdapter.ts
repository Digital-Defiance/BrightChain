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

  public async put(blockId: BlockId, data: Uint8Array): Promise<void> {
    const id = normalizeId(blockId);
    const validated = validateSize(data, this.blockSize);
    const block = new RawDataBlock(this.blockSize, validated, new Date(), id);
    await this.store.setData(block);
  }

  public async getData(key: ChecksumUint8Array): Promise<RawDataBlock> {
    return this.store.getData(key);
  }

  public async setData(block: RawDataBlock): Promise<void> {
    await this.store.setData(block);
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
}
