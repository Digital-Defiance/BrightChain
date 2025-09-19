/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ReadStream,
  WriteStream,
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
} from 'fs';
import { BlockMetadata } from '../blockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockAccessError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumTransform } from '../transforms/checksumTransform';
import { ChecksumUint8Array } from '../types';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * Type definition for a BlockHandle - it's the same as T but with additional properties
 */
export type BlockHandle<T extends BaseBlock> = T & {
  _path: string;
  _cachedData: Buffer | null;
  path: string;
  setPath(path: string): void;
  fullData: Buffer;
  layerData: Buffer;
  layerPayloadSize: number;
  getReadStream(): ReadStream;
  getWriteStream(overwrite?: boolean): WriteStream;
  calculateChecksum(): Promise<ChecksumUint8Array>;
  calculateChecksumSync(): ChecksumUint8Array;
  clearCache(): void;
  block: RawDataBlock;
};

/**
 * This function creates a "block handle" for a block of type T which extends BaseBlock.
 * It makes the returned object equivalent to the underlying block type T but replacing
 * the get data() method with an on-demand load of the block data from the block store
 * and adding other functions for block handle operations.
 *
 * So for createBlockHandle<EphemeralBlock>(...) this function shall return an EphemeralBlock
 * but with the overriden get data() method to load the block data from the file system
 * on demand along with other added functions.
 *
 * @param blockConstructor - The constructor for the block type T
 * @param path - The path to the block file
 * @param blockSize - The block size
 * @param checksum - The checksum of the block
 * @param canRead - Whether the block can be read
 * @param canPersist - Whether the block can be persisted
 * @param constructorArgs - Additional arguments to pass to the block constructor
 * @returns A block handle for the specified block type
 */
export function createBlockHandle<T extends BaseBlock>(
  blockConstructor: new (...args: any[]) => T,
  path: string,
  blockSize: BlockSize,
  checksum: ChecksumUint8Array,
  canRead = true,
  canPersist = true,
  ...constructorArgs: any[]
): BlockHandle<T> {
  if (!existsSync(path)) {
    throw new BlockAccessError(BlockAccessErrorType.BlockFileNotFound, path);
  }

  // Create the file stats once to avoid repeated file system calls
  const stats = statSync(path);

  // Create a basic instance of T
  // This uses a temporary empty buffer since we'll load data on demand
  const instance = new blockConstructor(
    blockSize,
    Buffer.alloc(0),
    new Date(stats.birthtime),
    checksum,
    BlockType.Handle, // Override blockType to indicate it's a handle
    BlockDataType.RawData,
    canRead,
    canPersist,
    ...constructorArgs,
  ) as BlockHandle<T>;

  // Add handle-specific properties
  instance._path = path;
  instance._cachedData = null;

  // Override and add methods

  // Override get data()
  Object.defineProperty(instance, 'data', {
    get: function () {
      if (!this.canRead) {
        throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
      }
      if (!this._cachedData) {
        if (!existsSync(this._path)) {
          throw new BlockAccessError(
            BlockAccessErrorType.BlockFileNotFound,
            this._path,
          );
        }
        this._cachedData = readFileSync(this._path);
      }
      return this._cachedData;
    },
    enumerable: true,
    configurable: true,
  });

  // Add path getter
  Object.defineProperty(instance, 'path', {
    get: function () {
      return this._path;
    },
    enumerable: true,
    configurable: true,
  });

  // Add setPath method
  instance.setPath = function (path: string): void {
    this._path = path;
  };

  // Add fullData getter
  Object.defineProperty(instance, 'fullData', {
    get: function () {
      return this.data;
    },
    enumerable: true,
    configurable: true,
  });

  // Override get layerPayload()
  Object.defineProperty(instance, 'layerPayload', {
    get: function () {
      return this.fullData;
    },
    enumerable: true,
    configurable: true,
  });

  // Add layerData getter
  Object.defineProperty(instance, 'layerData', {
    get: function () {
      return this.fullData;
    },
    enumerable: true,
    configurable: true,
  });

  // Add layerPayloadSize getter
  Object.defineProperty(instance, 'layerPayloadSize', {
    get: function () {
      return this.fullData.length;
    },
    enumerable: true,
    configurable: true,
  });

  // Override metadata getter
  Object.defineProperty(instance, 'metadata', {
    get: function () {
      if (!existsSync(this._path)) {
        throw new BlockAccessError(
          BlockAccessErrorType.BlockFileNotFound,
          this._path,
        );
      }
      const stats = statSync(this._path);
      return new BlockMetadata(
        this.blockSize,
        BlockType.Handle,
        BlockDataType.RawData,
        stats.size,
        new Date(stats.birthtime),
      );
    },
    enumerable: true,
    configurable: true,
  });

  // Add getReadStream method
  instance.getReadStream = function (): ReadStream {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    if (!existsSync(this._path)) {
      throw new BlockAccessError(
        BlockAccessErrorType.BlockFileNotFound,
        this._path,
      );
    }
    return createReadStream(this._path);
  };

  // Add getWriteStream method
  instance.getWriteStream = function (overwrite = false): WriteStream {
    if (!this.canPersist) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotPersistable);
    }
    if (existsSync(this._path) && !overwrite) {
      throw new BlockAccessError(BlockAccessErrorType.BlockAlreadyExists);
    }
    return createWriteStream(this._path);
  };

  // Add calculateChecksum method
  instance.calculateChecksum = async function (): Promise<ChecksumUint8Array> {
    return new Promise((resolve, reject) => {
      const readStream = this.getReadStream();
      const checksumTransform = new ChecksumTransform();

      readStream.pipe(checksumTransform);

      checksumTransform.on('checksum', (checksum) => {
        readStream.destroy();
        resolve(checksum);
      });

      readStream.on('error', (error: Error) => {
        checksumTransform.destroy();
        reject(error);
      });

      checksumTransform.on('error', (error: Error) => {
        readStream.destroy();
        reject(error);
      });

      // Ensure cleanup on completion
      checksumTransform.on('end', () => {
        readStream.destroy();
      });
    });
  };

  // Add calculateChecksumSync method
  instance.calculateChecksumSync = function (): ChecksumUint8Array {
    if (!existsSync(this._path)) {
      throw new BlockAccessError(
        BlockAccessErrorType.BlockFileNotFound,
        this._path,
      );
    }
    const data = readFileSync(this._path);
    return ServiceProvider.getInstance().checksumService.calculateChecksum(
      data,
    );
  };

  // Override validateAsync method
  instance.validateAsync = async function (): Promise<void> {
    const checksum = await this.calculateChecksum();
    if (!checksum.equals(this.idChecksum)) {
      throw new ChecksumMismatchError(this.idChecksum, checksum);
    }
  };

  // Override validateSync method
  instance.validateSync = function (): void {
    const checksum = this.calculateChecksumSync();
    if (!checksum.equals(this.idChecksum)) {
      throw new ChecksumMismatchError(this.idChecksum, checksum);
    }
  };

  // Override validate method
  instance.validate = function (): void {
    this.validateSync();
  };

  // Add clearCache method
  instance.clearCache = function (): void {
    this._cachedData = null;
  };

  // Add block getter
  Object.defineProperty(instance, 'block', {
    get: function () {
      const newBlock = new RawDataBlock(
        this.blockSize,
        this.fullData,
        this.dateCreated,
        this.idChecksum,
        this.blockType,
        this.blockDataType,
        this.canRead,
        this.canPersist,
      );
      newBlock.validateSync();
      return newBlock;
    },
    enumerable: true,
    configurable: true,
  });

  // Return the augmented instance
  return instance;
}

/**
 * Create a new block handle from a file path
 */
export async function createBlockHandleFromPath<T extends BaseBlock>(
  blockConstructor: new (...args: any[]) => T,
  path: string,
  blockSize: BlockSize,
  checksum?: ChecksumUint8Array,
  canRead = true,
  canPersist = true,
  ...constructorArgs: any[]
): Promise<BlockHandle<T>> {
  if (!existsSync(path)) {
    throw new BlockAccessError(BlockAccessErrorType.BlockFileNotFound, path);
  }

  // If no checksum provided, calculate it
  if (!checksum) {
    checksum =
      await ServiceProvider.getInstance().checksumService.calculateChecksumForStream(
        createReadStream(path),
      );
  }

  return createBlockHandle(
    blockConstructor,
    path,
    blockSize,
    checksum,
    canRead,
    canPersist,
    ...constructorArgs,
  );
}
