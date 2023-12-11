import {
  BaseBlock,
  BlockDataType,
  BlockSize,
  Checksum,
  IBaseBlockMetadata,
  RawDataBlock,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { DiskBlockStore } from './diskBlockStore';

/**
 * Synchronous block store backed by the filesystem.
 *
 * Extends DiskBlockStore for its protected path-helper methods and
 * provides synchronous I/O alternatives for scenarios where async
 * operations are not suitable.
 *
 * Synchronous methods are named `hasSync`, `getSync`, `setSync` to
 * avoid conflicting with the async signatures inherited from DiskBlockStore.
 */
export class DiskBlockSyncStore extends DiskBlockStore {
  constructor(config: { storePath: string; blockSize: BlockSize }) {
    super(config);
  }

  /**
   * Synchronous check for block existence across all block sizes.
   */
  hasSync(key: Checksum): boolean {
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockFilePath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockFilePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Synchronous block retrieval across all block sizes.
   */
  getSync(key: Checksum): BaseBlock {
    for (const size of Object.values(BlockSize).filter(
      (v) => typeof v === 'number',
    )) {
      const blockFilePath = this.blockPath(key, size as BlockSize);
      if (existsSync(blockFilePath)) {
        const blockData = readFileSync(blockFilePath);
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

  /**
   * Synchronous block storage.
   */
  setSync(key: Checksum, value: BaseBlock): void {
    if (value.blockDataType == BlockDataType.EphemeralStructuredData) {
      throw new StoreError(StoreErrorType.CannotStoreEphemeralData);
    }
    if (!key.equals(value.idChecksum)) {
      throw new StoreError(StoreErrorType.BlockIdMismatch, undefined, {
        KEY: key.toHex(),
        BLOCK_ID: value.idChecksum.toHex(),
      });
    }
    const blockFilePath = this.blockPath(value.idChecksum, value.blockSize);
    if (existsSync(blockFilePath)) {
      return; // Idempotent - block already exists
    }
    this.ensureBlockPath(value.idChecksum, value.blockSize);
    writeFileSync(blockFilePath, value.data.toString());
    writeFileSync(
      this.metadataPath(value.idChecksum, value.blockSize),
      JSON.stringify(value.metadata),
    );
  }
}
