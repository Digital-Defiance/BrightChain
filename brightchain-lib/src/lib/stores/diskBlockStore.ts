import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BlockSize, blockSizeToSizeString } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { ChecksumUint8Array } from '../types';

/**
 * DiskBlockStore provides base functionality for storing blocks on disk.
 * It handles block paths, metadata paths, and directory structure.
 */
export abstract class DiskBlockStore {
  protected readonly _storePath: string;
  protected readonly _blockSize: BlockSize;

  protected constructor(config: { storePath: string; blockSize: BlockSize }) {
    if (!config.storePath) {
      throw new StoreError(StoreErrorType.StorePathRequired);
    }

    if (!config.blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeRequired);
    }

    this._storePath = config.storePath;
    this._blockSize = config.blockSize;

    // Ensure store path exists
    if (!existsSync(config.storePath)) {
      mkdirSync(config.storePath, { recursive: true });
    }
  }

  /**
   * Get the directory path for a block
   * Directory structure: storePath/blockSize/checksumChar1/checksumChar2/
   */
  protected blockDir(blockId: ChecksumUint8Array): string {
    if (!blockId || blockId.length === 0) {
      throw new StoreError(StoreErrorType.BlockIdRequired);
    }

    const checksumString = blockId.toString('hex');
    if (checksumString.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }

    const blockSizeString = blockSizeToSizeString(this._blockSize);
    return join(
      this._storePath,
      blockSizeString,
      checksumString[0],
      checksumString[1],
    );
  }

  /**
   * Get the file path for a block
   * File structure: storePath/blockSize/checksumChar1/checksumChar2/fullChecksum
   */
  protected blockPath(blockId: ChecksumUint8Array): string {
    if (!blockId || blockId.length === 0) {
      throw new StoreError(StoreErrorType.BlockIdRequired);
    }

    const checksumString = blockId.toString('hex');
    if (checksumString.length < 2) {
      throw new StoreError(StoreErrorType.InvalidBlockIdTooShort);
    }

    const blockSizeString = blockSizeToSizeString(this._blockSize);
    return join(
      this._storePath,
      blockSizeString,
      checksumString[0],
      checksumString[1],
      checksumString,
    );
  }

  /**
   * Get the metadata file path for a block
   * Metadata files are stored alongside block files with a .m.json extension
   */
  protected metadataPath(blockId: ChecksumUint8Array): string {
    if (!blockId || blockId.length === 0) {
      throw new StoreError(StoreErrorType.BlockIdRequired);
    }

    return this.blockPath(blockId) + '.m.json';
  }

  /**
   * Ensure the directory structure exists for a block
   */
  protected ensureBlockPath(blockId: ChecksumUint8Array): void {
    if (!blockId || blockId.length === 0) {
      throw new StoreError(StoreErrorType.BlockIdRequired);
    }

    const blockDir = this.blockDir(blockId);
    if (!existsSync(blockDir)) {
      try {
        mkdirSync(blockDir, { recursive: true });
      } catch (error) {
        throw new StoreError(
          StoreErrorType.BlockDirectoryCreationFailed,
          undefined,
          {
            ERROR: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }

  /**
   * Get the block size
   */
  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * Get the store path
   */
  public get storePath(): string {
    return this._storePath;
  }
}
