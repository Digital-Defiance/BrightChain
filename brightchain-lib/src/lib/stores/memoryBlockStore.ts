import { randomUUID } from 'crypto';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { BlockStore, BlockId } from '../interfaces/storage/blockStore';
import { ChecksumUint8Array } from '../types';
import { hexToUint8Array } from '@digitaldefiance/ecies-lib';

function normalizeId(blockId: BlockId): ChecksumUint8Array {
  if (typeof blockId === 'string') {
    return hexToUint8Array(blockId) as ChecksumUint8Array;
  }
  return blockId;
}

export class MemoryBlockStore implements BlockStore {
  public readonly blockSize: BlockSize;
  private readonly blocks = new Map<string, RawDataBlock>();

  constructor(blockSize: BlockSize) {
    this.blockSize = blockSize;
  }

  public async put(blockId: BlockId, data: Buffer | Uint8Array): Promise<void> {
    const id = normalizeId(blockId);
    const validated = Buffer.from(data);
    if (validated.length > this.blockSize) {
      throw new Error(`Data length (${validated.length}) exceeds block size (${this.blockSize})`);
    }
    const block = new RawDataBlock(this.blockSize, validated, new Date(), id);
    this.blocks.set(Buffer.from(id).toString('hex'), block);
  }

  public async get(blockId: BlockId): Promise<RawDataBlock> {
    const id = normalizeId(blockId);
    const key = Buffer.from(id).toString('hex');
    const block = this.blocks.get(key);
    if (!block) {
      throw new Error(`Block not found: ${key}`);
    }
    return block;
  }

  public async has(blockId: BlockId): Promise<boolean> {
    const id = normalizeId(blockId);
    return this.blocks.has(Buffer.from(id).toString('hex'));
  }

  public async delete(blockId: BlockId): Promise<void> {
    const id = normalizeId(blockId);
    this.blocks.delete(Buffer.from(id).toString('hex'));
  }

  public static randomId(): string {
    return randomUUID().replace(/-/g, '');
  }
}
