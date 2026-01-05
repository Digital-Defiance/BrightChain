import { hexToUint8Array, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { ChecksumUint8Array } from '../types';
import { BlockStore, BlockId } from '../interfaces/storage/blockStore';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

function normalizeId(blockId: BlockId): ChecksumUint8Array {
  if (typeof blockId === 'string') {
    return hexToUint8Array(blockId) as ChecksumUint8Array;
  }
  return blockId;
}

function validateSize(data: Buffer | Uint8Array, blockSize: BlockSize): Buffer {
  const buffer = Buffer.from(data);
  if (buffer.length > blockSize) {
    throw new Error(`Data length (${buffer.length}) exceeds block size (${blockSize})`);
  }
  return buffer;
}

export class DiskBlockStoreAdapter implements BlockStore {
  public readonly blockSize: BlockSize;
  private readonly store: DiskBlockAsyncStore;

  constructor(config: { storePath: string; blockSize: BlockSize }) {
    this.store = new DiskBlockAsyncStore(config);
    this.blockSize = config.blockSize;
  }

  public async put(blockId: BlockId, data: Buffer | Uint8Array): Promise<void> {
    const id = normalizeId(blockId);
    const validated = validateSize(data, this.blockSize);
    const block = new RawDataBlock(this.blockSize, validated, new Date(), id);
    await this.store.setData(block);
  }

  public async get(blockId: BlockId): Promise<RawDataBlock> {
    const id = normalizeId(blockId);
    return this.store.getData(id);
  }

  public async has(blockId: BlockId): Promise<boolean> {
    const id = normalizeId(blockId);
    return this.store.has(id);
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
