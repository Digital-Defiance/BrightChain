import { BlockSize } from '../../enumerations/blockSize';
import { RawDataBlock } from '../../blocks/rawData';
import { ChecksumUint8Array } from '../../types';

export type BlockId = ChecksumUint8Array | string;

export interface BlockStore {
  readonly blockSize: BlockSize;
  put(blockId: BlockId, data: Buffer | Uint8Array): Promise<void>;
  get(blockId: BlockId): Promise<RawDataBlock>;
  has(blockId: BlockId): Promise<boolean>;
  delete(blockId: BlockId): Promise<void>;
}

export interface BlockIndexEntry {
  id: string;
  size: number;
  created: Date;
}

export interface BlockIndex {
  add(entry: BlockIndexEntry): Promise<void>;
  get(id: string): Promise<BlockIndexEntry | undefined>;
  remove(id: string): Promise<void>;
}
