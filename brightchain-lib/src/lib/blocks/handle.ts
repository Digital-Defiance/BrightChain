import {
  ReadStream,
  WriteStream,
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
} from 'fs';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockMetadata, IBlockMetadata } from '../interfaces/blockMetadata';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumTransform } from '../transforms/checksumTransform';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

/**
 * A block handle is a reference to a block in a block store.
 * It does not have the block data itself, but it has the block ID and the block size.
 * It can load the block data and metadata on demand.
 */
export class BlockHandle extends BaseBlock {
  protected _path: string;
  protected _cachedData: Buffer | null = null;
  protected _cachedMetadata: IBlockMetadata | null = null;

  /**
   * Constructor - prefer using static createFromPath() method instead
   */
  constructor(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    checksum: ChecksumBuffer,
    dateCreated?: Date,
    metadata?: IBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(
      type,
      dataType,
      blockSize,
      checksum,
      dateCreated,
      metadata,
      canRead,
      canPersist,
    );
    this._path = '';
  }

  /**
   * Create a new block handle from a file path
   */
  public static async createFromPath(
    blockSize: BlockSize,
    path: string,
    checksum?: ChecksumBuffer,
    dateCreated?: Date,
    metadata?: IBlockMetadata,
    canRead = true,
    canPersist = true,
  ): Promise<BlockHandle> {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }
    const data = readFileSync(path);

    // If no checksum provided, calculate it
    if (!checksum) {
      checksum = await StaticHelpersChecksum.calculateChecksumAsync(data);
    }

    // Create the handle with the checksum
    const block = new BlockHandle(
      BlockType.Handle,
      BlockDataType.RawData,
      blockSize,
      checksum,
      dateCreated,
      metadata,
      canRead,
      canPersist,
    );
    block._path = path;

    // Validate if we calculated the checksum ourselves
    if (!checksum) {
      await block.validateAsync();
    }

    return block;
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
   * Get the block's path
   */
  public get path(): string {
    return this._path;
  }

  /**
   * Get the block data
   */
  public get data(): Buffer {
    if (!this._cachedData) {
      if (!existsSync(this.path)) {
        throw new Error(`Block file not found: ${this.path}`);
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
   * Block metadata, loaded on demand
   */
  public override get metadata(): IBlockMetadata {
    if (!this._cachedMetadata) {
      const metadataPath = `${this.path}.m.json`;
      if (!existsSync(metadataPath)) {
        // If no metadata file exists, create default metadata
        this._cachedMetadata = BlockMetadata.create(
          this.blockSize,
          BlockType.Handle,
          BlockDataType.RawData,
        );
      } else {
        try {
          const metadataJson = readFileSync(metadataPath).toString();
          this._cachedMetadata = BlockMetadata.fromJSON(metadataJson);
        } catch (error: unknown) {
          if (error instanceof Error) {
            throw new Error(`Invalid block metadata: ${error.message}`);
          }
          throw new Error('Invalid block metadata');
        }
      }
    }
    return this._cachedMetadata;
  }

  /**
   * Get a read stream for the block data
   */
  public getReadStream(): ReadStream {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    if (!existsSync(this.path)) {
      throw new Error(`Block file not found: ${this.path}`);
    }
    return createReadStream(this.path);
  }

  /**
   * Get a write stream for the block data
   */
  public getWriteStream(overwrite = false): WriteStream {
    if (!this.canPersist) {
      throw new Error('Block cannot be persisted');
    }
    if (existsSync(this.path) && !overwrite) {
      throw new Error('Block file already exists');
    }
    return createWriteStream(this.path);
  }

  /**
   * Calculate the checksum of the block data
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
   * Verify the block's checksum matches its ID
   */
  public async validateAsync(): Promise<void> {
    const checksum = await this.calculateChecksum();
    if (!checksum.equals(this.idChecksum)) {
      throw new Error('Checksum validation failed');
    }
  }

  /**
   * Clear any cached data
   */
  public clearCache(): void {
    this._cachedData = null;
    this._cachedMetadata = null;
  }
}
