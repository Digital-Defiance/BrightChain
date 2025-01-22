import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BlockSize, sizeToSizeString } from '../enumerations/blockSizes';
import { ChecksumBuffer } from '../types';

/**
 * DiskBlockStore provides base functionality for storing blocks on disk.
 * It handles block paths, metadata paths, and directory structure.
 */
export abstract class DiskBlockStore {
  protected readonly _storePath: string;
  protected readonly _blockSize: BlockSize;

  protected constructor(storePath: string, blockSize: BlockSize) {
    if (!storePath) {
      throw new Error('Store path is required');
    }

    if (!blockSize) {
      throw new Error('Block size is required');
    }

    this._storePath = storePath;
    this._blockSize = blockSize;

    // Ensure store path exists
    if (!existsSync(storePath)) {
      mkdirSync(storePath, { recursive: true });
    }
  }

  /**
   * Get the directory path for a block
   * Directory structure: storePath/blockSize/checksumChar1/checksumChar2/
   */
  protected blockDir(blockId: ChecksumBuffer): string {
    if (!blockId || blockId.length === 0) {
      throw new Error('Block ID is required');
    }

    const checksumString = blockId.toString('hex');
    if (checksumString.length < 2) {
      throw new Error('Invalid block ID: too short');
    }

    const blockSizeString = sizeToSizeString(this._blockSize);
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
  protected blockPath(blockId: ChecksumBuffer): string {
    if (!blockId || blockId.length === 0) {
      throw new Error('Block ID is required');
    }

    const checksumString = blockId.toString('hex');
    if (checksumString.length < 2) {
      throw new Error('Invalid block ID: too short');
    }

    const blockSizeString = sizeToSizeString(this._blockSize);
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
  protected metadataPath(blockId: ChecksumBuffer): string {
    if (!blockId || blockId.length === 0) {
      throw new Error('Block ID is required');
    }

    return this.blockPath(blockId) + '.m.json';
  }

  /**
   * Ensure the directory structure exists for a block
   */
  protected ensureBlockPath(blockId: ChecksumBuffer): void {
    if (!blockId || blockId.length === 0) {
      throw new Error('Block ID is required');
    }

    const blockDir = this.blockDir(blockId);
    if (!existsSync(blockDir)) {
      try {
        mkdirSync(blockDir, { recursive: true });
      } catch (error) {
        throw new Error(
          `Failed to create block directory: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
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
