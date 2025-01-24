import { Readable } from 'stream';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { IBlock } from '../interfaces/blockBase';
import { IBlockMetadata } from '../interfaces/blockMetadata';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer, ChecksumString } from '../types';

/**
 * BaseBlock provides core block functionality.
 * All blocks in the Owner Free File System derive from this.
 *
 * Block Structure:
 * [Base Header][Layer Headers][Layer Data][Padding]
 *
 * Base Header:
 * - Block Type
 * - Block Size
 * - Data Type
 * - Checksum
 * - Date Created
 */
export abstract class BaseBlock implements IBlock {
  protected readonly _blockSize: BlockSize;
  protected readonly _blockType: BlockType;
  protected readonly _blockDataType: BlockDataType;
  protected readonly _checksum: ChecksumBuffer;
  protected readonly _dateCreated: Date;
  protected readonly _metadata: IBlockMetadata;
  protected readonly _canRead: boolean;
  protected readonly _canPersist: boolean;

  /**
   * Creates a new BaseBlock instance asynchronously
   * @param type - Block type (raw, encrypted, CBL, etc)
   * @param dataType - Type of data contained
   * @param blockSize - Size category for the block
   * @param data - Block data (may include headers)
   * @param checksum - Optional checksum (calculated if not provided)
   * @param dateCreated - Creation timestamp
   * @param metadata - Optional block metadata
   * @param canRead - Whether block can be read
   * @param canPersist - Whether block can be stored
   */
  public static async createAsync<T extends BaseBlock>(
    this: new (
      type: BlockType,
      dataType: BlockDataType,
      blockSize: BlockSize,
      checksum: ChecksumBuffer,
      dateCreated?: Date,
      metadata?: IBlockMetadata,
      canRead?: boolean,
      canPersist?: boolean,
    ) => T,
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Readable | Buffer,
    checksum?: ChecksumBuffer,
    dateCreated?: Date,
    metadata?: IBlockMetadata,
    canRead = true,
    canPersist = true,
  ): Promise<T> {
    const calculatedChecksum =
      await StaticHelpersChecksum.calculateChecksumAsync(data);

    if (checksum && !calculatedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, calculatedChecksum);
    }

    return new this(
      type,
      dataType,
      blockSize,
      calculatedChecksum,
      dateCreated,
      metadata,
      canRead,
      canPersist,
    ) as T;
  }

  /**
   * Creates a new BaseBlock instance synchronously with a pre-calculated checksum
   * @param type - Block type (raw, encrypted, CBL, etc)
   * @param dataType - Type of data contained
   * @param blockSize - Size category for the block
   * @param checksum - Pre-calculated checksum
   * @param dateCreated - Creation timestamp
   * @param metadata - Optional block metadata
   * @param canRead - Whether block can be read
   * @param canPersist - Whether block can be stored
   */
  protected static _createSync<T extends BaseBlock>(
    this: new (
      type: BlockType,
      dataType: BlockDataType,
      blockSize: BlockSize,
      checksum: ChecksumBuffer,
      dateCreated?: Date,
      metadata?: IBlockMetadata,
      canRead?: boolean,
      canPersist?: boolean,
    ) => T,
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    checksum: ChecksumBuffer,
    dateCreated?: Date,
    metadata?: IBlockMetadata,
    canRead = true,
    canPersist = true,
  ): T {
    return new this(
      type,
      dataType,
      blockSize,
      checksum,
      dateCreated,
      metadata,
      canRead,
      canPersist,
    ) as T;
  }

  /**
   * Internal constructor - use static createAsync() method instead
   * @param type - Block type (raw, encrypted, CBL, etc)
   * @param dataType - Type of data contained
   * @param blockSize - Size category for the block
   * @param checksum - Block checksum
   * @param dateCreated - Creation timestamp
   * @param metadata - Optional block metadata
   * @param canRead - Whether block can be read
   * @param canPersist - Whether block can be stored
   */
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    checksum: ChecksumBuffer,
    dateCreated?: Date,
    metadata?: IBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    // Validate block size
    if (!blockSize || (blockSize as number) <= 0) {
      throw new Error('Invalid block size');
    }

    // Store basic properties first so capacity calculation works
    this._blockSize = blockSize;
    this._blockType = type;
    this._blockDataType = dataType;
    this._canRead = canRead;
    this._canPersist = canPersist;
    this._checksum = checksum;

    // Validate date
    const now = new Date();
    this._dateCreated = dateCreated ?? now;
    if (this._dateCreated > now) {
      throw new Error('Date created cannot be in the future');
    }

    // Store or create metadata
    this._metadata = metadata ?? {
      size: blockSize,
      type: type,
      blockSize,
      blockType: type,
      dataType,
      dateCreated: this._dateCreated.toISOString(),
      lengthBeforeEncryption: 0,
    };
  }

  /**
   * The size category of the block
   */
  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * The type of block (raw, encrypted, CBL, etc)
   */
  public get blockType(): BlockType {
    return this._blockType;
  }

  /**
   * The type of data contained in the block
   */
  public get blockDataType(): BlockDataType {
    return this._blockDataType;
  }

  /**
   * The block's unique identifier/checksum
   */
  public get idChecksum(): ChecksumBuffer {
    return this._checksum;
  }

  /**
   * The block's checksum as a string
   */
  public get checksumString(): ChecksumString {
    return StaticHelpersChecksum.checksumBufferToChecksumString(
      this.idChecksum,
    );
  }

  /**
   * When the block was created
   */
  public get dateCreated(): Date {
    return this._dateCreated;
  }

  /**
   * Block metadata for storage
   */
  public get metadata(): IBlockMetadata {
    return this._metadata;
  }

  /**
   * Whether the block can be read
   */
  public get canRead(): boolean {
    return this._canRead;
  }

  /**
   * Whether the block can be persisted
   */
  public get canPersist(): boolean {
    return this._canPersist;
  }

  /**
   * Validate the block's checksum
   */
  public abstract validateAsync(): Promise<void>;

  /**
   * Get the complete block data including headers and payload
   */
  public abstract get data(): Buffer | Readable;

  /**
   * Get this layer's header data
   */
  public abstract get layerHeaderData(): Buffer;

  /**
   * Get the payload data (excluding headers)
   */
  public abstract get payload(): Buffer;

  /**
   * Get the length of the payload
   */
  public get payloadLength(): number {
    return this.payload.length;
  }

  /**
   * Get the padding after the payload
   */
  public get padding(): Buffer {
    const paddingLength =
      this.blockSize - (this.totalOverhead + this.payloadLength);
    return Buffer.alloc(paddingLength > 0 ? paddingLength : 0);
  }

  /**
   * Get all layers in the inheritance chain
   */
  public get layers(): IBlock[] {
    const collectLayers = (block: IBlock): IBlock[] => {
      const parent = block.parent;
      return parent ? [...collectLayers(parent), block] : [block];
    };
    return collectLayers(this);
  }

  /**
   * Get the parent layer in the inheritance chain
   */
  public get parent(): IBlock | null {
    const proto = Object.getPrototypeOf(this);
    return proto === BaseBlock.prototype ? null : proto;
  }

  /**
   * Get the total header overhead from all layers
   */
  public get totalOverhead(): number {
    // For base implementation, we don't need to check canRead since we're just calculating overhead
    return this.layers.reduce((sum, layer) => {
      try {
        return sum + layer.layerHeaderData.length;
      } catch {
        // If we can't read header data, assume no overhead for that layer
        return sum;
      }
    }, 0);
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public get capacity(): number {
    // For encrypted blocks, use full block size since overhead is in data buffer
    // For unencrypted blocks, subtract layer headers from block size
    return this.blockDataType === BlockDataType.EncryptedData
      ? this.blockSize
      : this.blockSize - this.totalOverhead;
  }

  /**
   * Get the complete header data from all layers
   */
  public get fullHeaderData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const headers = this.layers.map((layer) => layer.layerHeaderData);
    return Buffer.concat(headers);
  }
}
