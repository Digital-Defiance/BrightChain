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
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockAccessError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumTransform } from '../transforms/checksumTransform';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * A block handle is a reference to a block in a block store.
 * It does not have the block data itself, but it has the block ID and the block size.
 * It can load the block data and metadata on demand.
 */
export class BlockHandle extends BaseBlock {
  protected static override checksumService: ChecksumService;
  protected _path: string;

  protected static override initialize() {
    super.initialize();
    if (!BlockHandle.checksumService) {
      BlockHandle.checksumService = ServiceProvider.getChecksumService();
    }
  }
  protected _cachedData: Buffer | null = null;
  protected override _blockSize: BlockSize;

  /**
   * Constructor - prefer using static createFromPath() method instead
   */
  constructor(
    path: string,
    blockSize: BlockSize,
    checksum: ChecksumBuffer,
    canRead = true,
    canPersist = true,
  ) {
    if (!existsSync(path)) {
      throw new BlockAccessError(BlockAccessErrorType.BlockFileNotFound, path);
    }
    super(
      BlockType.Handle,
      BlockDataType.RawData,
      checksum,
      new BlockMetadata(
        blockSize,
        BlockType.Handle,
        BlockDataType.RawData,
        statSync(path).size,
        new Date(statSync(path).birthtime),
      ),
      canRead,
      canPersist,
    );
    this._path = path;
    this._blockSize = blockSize;
  }

  /**
   * Create a new block handle from a file path
   */
  public static async createFromPath(
    path: string,
    blockSize: BlockSize,
    checksum?: ChecksumBuffer,
    canRead = true,
    canPersist = true,
  ): Promise<BlockHandle> {
    if (!existsSync(path)) {
      throw new BlockAccessError(BlockAccessErrorType.BlockFileNotFound, path);
    }

    // If no checksum provided, calculate it
    if (!checksum) {
      checksum = await BlockHandle.checksumService.calculateChecksumForStream(
        createReadStream(path),
      );
    }

    return new BlockHandle(path, blockSize, checksum, canRead, canPersist);
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Buffer {
    return Buffer.alloc(0); // Handle blocks don't add header data
  }

  /**
   * Get the complete header data from all layers
   */
  public override get fullHeaderData(): Buffer {
    return Buffer.concat([super.fullHeaderData, this.layerHeaderData]);
  }

  /**
   * Set the block's path
   * @param path - The path to set
   */
  public setPath(path: string): void {
    this._path = path;
  }

  /**
   * Get the block's path
   */
  public get path(): string {
    return this._path;
  }

  /**
   * Get the block data without padding
   */
  public override get data(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    if (!this._cachedData) {
      if (!existsSync(this.path)) {
        throw new BlockAccessError(
          BlockAccessErrorType.BlockFileNotFound,
          this.path,
        );
      }
      this._cachedData = readFileSync(this.path);
    }
    return this._cachedData;
  }

  /**
   * Get the full block data including padding
   */
  public get fullData(): Buffer {
    if (!this._cachedData) {
      if (!existsSync(this.path)) {
        throw new BlockAccessError(
          BlockAccessErrorType.BlockFileNotFound,
          this.path,
        );
      }
      const fileData = readFileSync(this.path);
      this._cachedData = fileData;
    }
    return this._cachedData;
  }

  /**
   * The payload is the same as data for handles
   */
  public override get payload(): Buffer {
    return this.data;
  }

  /**
   * Block metadata from filesystem
   */
  public override get metadata(): BlockMetadata {
    if (!existsSync(this._path)) {
      throw new BlockAccessError(
        BlockAccessErrorType.BlockFileNotFound,
        this._path,
      );
    }
    const stats = statSync(this._path);
    return new BlockMetadata(
      this._blockSize,
      BlockType.Handle,
      BlockDataType.RawData,
      stats.size,
      new Date(stats.birthtime),
    );
  }

  /**
   * Get a read stream for the block data
   */
  public getReadStream(): ReadStream {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    if (!existsSync(this.path)) {
      throw new BlockAccessError(
        BlockAccessErrorType.BlockFileNotFound,
        this.path,
      );
    }
    return createReadStream(this.path);
  }

  /**
   * Get a write stream for the block data
   */
  public getWriteStream(overwrite = false): WriteStream {
    if (!this.canPersist) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotPersistable);
    }
    if (existsSync(this.path) && !overwrite) {
      throw new BlockAccessError(BlockAccessErrorType.BlockAlreadyExists);
    }
    return createWriteStream(this.path);
  }

  /**
   * Calculate the checksum of the block data asynchronously
   */
  public async calculateChecksum(): Promise<ChecksumBuffer> {
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
  }

  /**
   * Calculate the checksum of the block data synchronously
   */
  public calculateChecksumSync(): ChecksumBuffer {
    if (!existsSync(this.path)) {
      throw new BlockAccessError(
        BlockAccessErrorType.BlockFileNotFound,
        this.path,
      );
    }
    const data = readFileSync(this.path);
    return BlockHandle.checksumService.calculateChecksum(data);
  }

  /**
   * Verify the block's checksum matches its ID asynchronously
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override async validateAsync(): Promise<void> {
    const checksum = await this.calculateChecksum();
    if (!checksum.equals(this.idChecksum)) {
      throw new ChecksumMismatchError(this.idChecksum, checksum);
    }
  }

  /**
   * Verify the block's checksum matches its ID synchronously
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validateSync(): void {
    const checksum = this.calculateChecksumSync();
    if (!checksum.equals(this.idChecksum)) {
      throw new ChecksumMismatchError(this.idChecksum, checksum);
    }
  }

  /**
   * Alias for validateSync() to maintain compatibility
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validate(): void {
    this.validateSync();
  }

  /**
   * Clear any cached data
   */
  public clearCache(): void {
    this._cachedData = null;
  }

  public get block(): RawDataBlock {
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
  }
}
