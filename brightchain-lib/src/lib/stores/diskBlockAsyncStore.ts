import { existsSync } from 'fs';
import { readFile, readdir, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable, Transform } from 'stream';
import { BaseBlock } from '../blocks/base';
import { BlockHandleType, createBlockHandle } from '../blocks/handle';
import { RawDataBlock } from '../blocks/rawData';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, blockSizeToSizeString } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IBaseBlockMetadata } from '../interfaces/blocks/metadata/blockMetadata';
import MemoryWritableStream from '../memoryWriteableStream';
import { ServiceLocator } from '../services/serviceLocator';
import { ChecksumTransform } from '../transforms/checksumTransform';
import XorMultipleTransformStream from '../transforms/xorMultipleTransform';
import { ChecksumBuffer } from '../types';
import { DiskBlockStore } from './diskBlockStore';

/**
 * DiskBlockAsyncStore provides asynchronous operations for storing and retrieving blocks from disk.
 * It supports raw block storage and XOR operations with stream-based data handling.
 * Blocks are stored as raw data without metadata - their meaning is derived from CBLs.
 */
export class DiskBlockAsyncStore extends DiskBlockStore {
  constructor(config: { storePath: string; blockSize: BlockSize }) {
    super(config);
  }

  /**
   * Check if a block exists
   */
  public async has(key: ChecksumBuffer): Promise<boolean> {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }

  /**
   * Get a handle to a block
   */
  public get(key: ChecksumBuffer): BlockHandleType<BaseBlock> {
    const blockPath = this.blockPath(key);
    // Use createBlockHandle factory function, assuming RawDataBlock as base
    // Get ChecksumService via ServiceLocator
    const checksumService = ServiceLocator.getServiceProvider().checksumService;
    return createBlockHandle(
      checksumService,
      RawDataBlock as unknown as new (...args: unknown[]) => RawDataBlock,
      blockPath,
      this._blockSize,
      key,
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Get a block's data
   */
  public async getData(key: ChecksumBuffer): Promise<RawDataBlock> {
    const blockPath = this.blockPath(key);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: key.toString('hex'),
      });
    }

    let data: Buffer;
    try {
      data = await readFile(blockPath);
    } catch (error) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: key.toString('hex'),
      });
    }
    if (data.length !== this._blockSize) {
      throw new StoreError(StoreErrorType.BlockFileSizeMismatch);
    }

    // Use file creation time as block creation time
    const stats = await stat(blockPath);
    const dateCreated = stats.birthtime;

    return new RawDataBlock(
      this._blockSize,
      data,
      dateCreated,
      key,
      BlockType.RawData,
      BlockDataType.EphemeralStructuredData, // Use EphemeralStructuredData as default
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Delete a block's data
   * @param key - The block's checksum
   */
  public async deleteData(key: ChecksumBuffer): Promise<void> {
    const blockPath = this.blockPath(key);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    try {
      await unlink(blockPath);
    } catch (error) {
      throw new StoreError(StoreErrorType.BlockDeletionFailed, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Store a block's data
   */
  public async setData(block: RawDataBlock): Promise<void> {
    if (block.blockSize !== this._blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeMismatch);
    }

    const blockPath = this.blockPath(block.idChecksum);
    if (existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.BlockPathAlreadyExists);
    }

    try {
      block.validate();
    } catch (error) {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    // Ensure block directory exists before writing
    this.ensureBlockPath(block.idChecksum);

    try {
      await writeFile(blockPath, block.data);
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

  /**
   * XOR multiple blocks together
   */
  public async xor(
    blocks: BlockHandleType<BaseBlock>[],
    destBlockMetadata: IBaseBlockMetadata,
  ): Promise<RawDataBlock> {
    if (!blocks.length) {
      throw new StoreError(StoreErrorType.NoBlocksProvided);
    }

    return new Promise((resolve, reject) => {
      // Create read streams from the full block data
      const readStreams = blocks.map((block) => {
        const data = block.fullData; // Use fullData to get padded content
        const stream = new Readable();
        stream.push(data);
        stream.push(null);
        return stream;
      });

      const xorStream = new XorMultipleTransformStream(readStreams);
      const checksumStream = new ChecksumTransform();
      const writeStream = new MemoryWritableStream();

      // Set up pipeline
      xorStream.pipe(checksumStream).pipe(writeStream);

      // Handle stream ends
      this.handleReadStreamEnds(readStreams, xorStream);

      // Handle checksum calculation
      checksumStream.on('checksum', (checksumBuffer) => {
        try {
          const block = new RawDataBlock(
            this._blockSize,
            writeStream.data,
            new Date(destBlockMetadata.dateCreated),
            checksumBuffer,
            BlockType.RawData,
            destBlockMetadata.dataType, // Use the metadata's dataType
            true, // canRead
            true, // canPersist
          );
          resolve(block);
        } catch (error) {
          reject(error);
        } finally {
          this.cleanupStreams([
            ...readStreams,
            xorStream,
            checksumStream,
            writeStream,
          ]);
        }
      });

      // Handle errors
      const handleError = (error: Error) => {
        this.cleanupStreams([
          ...readStreams,
          xorStream,
          checksumStream,
          writeStream,
        ]);
        reject(error);
      };

      readStreams.forEach((stream) => stream.on('error', handleError));
      xorStream.on('error', handleError);
      checksumStream.on('error', handleError);
      writeStream.on('error', handleError);
    });
  }

  /**
   * Create read streams for blocks
   */
  private createReadStreams(blocks: BlockHandleType<BaseBlock>[]): Readable[] {
    return blocks.map((block) => block.getReadStream());
  }

  /**
   * Handle read stream ends
   */
  private handleReadStreamEnds(
    readStreams: Readable[],
    xorStream: Transform,
  ): void {
    let endedStreams = 0;
    readStreams.forEach((readStream) => {
      readStream.on('end', () => {
        if (++endedStreams === readStreams.length) {
          xorStream.end();
        }
      });
    });
  }

  /**
   * Clean up streams
   */
  private cleanupStreams(
    streams: Array<Readable | Transform | MemoryWritableStream>,
  ): void {
    streams.forEach((stream) => {
      try {
        stream.destroy();
      } catch {
        // Ignore errors during cleanup
      }
    });
  }

  /**
   * Get random block checksums from the store
   * @param count - Maximum number of blocks to return
   * @returns Array of random block checksums
   */
  public async getRandomBlocks(count: number): Promise<ChecksumBuffer[]> {
    const blockSizeString = blockSizeToSizeString(this._blockSize);
    const basePath = join(this._storePath, blockSizeString);
    if (!existsSync(basePath)) {
      return [];
    }

    const blocks: ChecksumBuffer[] = [];
    const firstLevelDirs = await readdir(basePath);

    // Randomly select first level directories until we have enough blocks
    while (blocks.length < count && firstLevelDirs.length > 0) {
      // Pick a random first level directory
      const randomFirstIndex = Math.floor(
        Math.random() * firstLevelDirs.length,
      );
      const firstDir = firstLevelDirs[randomFirstIndex];
      const firstLevelPath = join(basePath, firstDir);

      if (!existsSync(firstLevelPath)) {
        // Remove invalid directory and continue
        firstLevelDirs.splice(randomFirstIndex, 1);
        continue;
      }

      // Get second level directories
      const secondLevelDirs = await readdir(firstLevelPath);
      if (secondLevelDirs.length === 0) {
        // Remove empty directory and continue
        firstLevelDirs.splice(randomFirstIndex, 1);
        continue;
      }

      // Pick a random second level directory
      const randomSecondIndex = Math.floor(
        Math.random() * secondLevelDirs.length,
      );
      const secondDir = secondLevelDirs[randomSecondIndex];
      const secondLevelPath = join(firstLevelPath, secondDir);

      if (!existsSync(secondLevelPath)) {
        continue;
      }

      // Get block files
      const blockFiles = (await readdir(secondLevelPath)).filter(
        (file) => !file.endsWith('.m.json'),
      );

      if (blockFiles.length === 0) {
        continue;
      }

      // Pick a random block
      const randomBlockIndex = Math.floor(Math.random() * blockFiles.length);
      const blockFile = blockFiles[randomBlockIndex];
      blocks.push(Buffer.from(blockFile, 'hex') as ChecksumBuffer);

      // Remove used directory if we still need more blocks
      if (blocks.length < count) {
        firstLevelDirs.splice(randomFirstIndex, 1);
      }
    }

    return blocks;
  }
}
