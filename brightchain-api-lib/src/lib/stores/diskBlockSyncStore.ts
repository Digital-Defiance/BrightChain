import {
  BaseBlock,
  BlockDataType,
  BlockSize,
  Checksum,
  IBaseBlockMetadata,
  ISimpleStore,
  RawDataBlock,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DiskBlockStore } from './diskBlockStore';

export class DiskBlockSyncStore
  extends DiskBlockStore
  implements ISimpleStore<Checksum, BaseBlock>
{
  constructor(config: { storePath: string; blockSize: BlockSize }) {
    super(config);
  }

  has(key: Checksum): boolean {
    // Check all possible block sizes
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockPath)) {
        return true;
      }
    }
    return false;
  }

  get(key: Checksum): BaseBlock {
    // Search all possible block sizes
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockPath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockPath)) {
        const blockData = readFileSync(blockPath);
        const metadata = JSON.parse(
          readFileSync(this.metadataPath(key, size as BlockSize)).toString(),
        ) as IBaseBlockMetadata;
        const block = new RawDataBlock(
          size as BlockSize,
          blockData,
          new Date(metadata.dateCreated),
          key,
        );
        block.validateSync();
        return block;
      }
    }
    throw new StoreError(StoreErrorType.KeyNotFound);
  }

  set(key: Checksum, value: BaseBlock): void {
    if (value.blockDataType == BlockDataType.EphemeralStructuredData) {
      throw new StoreError(StoreErrorType.CannotStoreEphemeralData);
    }
    if (!key.equals(value.idChecksum)) {
      throw new StoreError(StoreErrorType.BlockIdMismatch, undefined, {
        KEY: key.toHex(),
        BLOCK_ID: value.idChecksum.toHex(),
      });
    }
    const blockPath = this.blockPath(value.idChecksum, value.blockSize);
    if (existsSync(blockPath)) {
      return; // Idempotent - block already exists
    }
    this.ensureBlockPath(value.idChecksum, value.blockSize);
    writeFileSync(blockPath, value.data.toString());
    writeFileSync(
      this.metadataPath(value.idChecksum, value.blockSize),
      JSON.stringify(value.metadata),
    );
  }
}
