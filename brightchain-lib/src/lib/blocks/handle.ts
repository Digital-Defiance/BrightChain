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
  private readonly _path: string;
  private _cachedData: Buffer | null = null;
  private _cachedMetadata: IBlockMetadata | null = null;

  constructor(id: ChecksumBuffer, blockSize: BlockSize, path: string) {
    super(
      BlockType.Handle,
      BlockDataType.RawData,
      blockSize,
      Buffer.alloc(0), // Empty buffer since data is loaded on demand
      id,
      undefined, // dateCreated
      undefined, // metadata will be loaded on demand
      true, // canRead
      true, // canPersist
    );
    this._path = path;
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
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    return this.blockSize - this.totalOverhead;
  }

  /**
   * The path to the block file
   */
  public get path(): string {
    return this._path;
  }

  /**
   * The raw data in the block, loaded on demand
   */
  public override get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    if (!this._cachedData) {
      if (!existsSync(this.path)) {
        throw new Error(`Block file not found: ${this.path}`);
      }
      this._cachedData = readFileSync(this.path);
      if (this._cachedData.length !== this.blockSize) {
        throw new Error('Block file size mismatch');
      }
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
        } catch (error) {
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
   * Whether the block's data has been validated
   */
  public override get validated(): boolean {
    try {
      const checksum = StaticHelpersChecksum.calculateChecksum(this.data);
      return checksum.equals(this.idChecksum);
    } catch {
      return false;
    }
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

      readStream.on('error', (error) => {
        checksumTransform.destroy();
        reject(error);
      });

      checksumTransform.on('error', (error) => {
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
  public async verifyChecksum(): Promise<boolean> {
    try {
      const checksum = await this.calculateChecksum();
      return checksum.equals(this.idChecksum);
    } catch {
      return false;
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
