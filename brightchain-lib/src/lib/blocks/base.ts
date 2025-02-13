import { Readable } from 'stream';
import { BlockMetadata } from '../blockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, validateBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { BlockAccessError, BlockValidationError } from '../errors/block';
import { IBlock } from '../interfaces/blockBase';
import { ChecksumService } from '../services/checksum.service';
import { ServiceInitializer } from '../services/service.initializer';
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
  protected static checksumService: ChecksumService;

  protected readonly _blockSize: BlockSize;

  protected static initialize() {
    if (!BaseBlock.checksumService) {
      BaseBlock.checksumService = ServiceInitializer.getChecksumService();
    }
  }
  protected readonly _blockType: BlockType;
  protected readonly _blockDataType: BlockDataType;
  protected readonly _checksum: ChecksumBuffer;
  protected readonly _dateCreated: Date;
  protected readonly _metadata: BlockMetadata;
  protected readonly _canRead: boolean;
  protected readonly _canPersist: boolean;
  protected readonly _lengthBeforeEncryption: number;

  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    checksum: ChecksumBuffer,
    metadata: BlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    BaseBlock.initialize();
    // Validate block size
    if (!metadata.size || !validateBlockSize(metadata.size)) {
      throw new BlockValidationError(
        BlockValidationErrorType.BlockSizeNegative,
      );
    }

    // Store basic properties first so capacity calculation works
    this._blockSize = metadata.size;
    this._blockType = type;
    this._blockDataType = dataType;
    this._canRead = canRead;
    this._canPersist = canPersist;
    this._checksum = checksum;
    this._lengthBeforeEncryption = metadata.lengthWithoutPadding;

    // Validate date
    const now = new Date();
    this._dateCreated = metadata ? new Date(metadata?.dateCreated) : now;
    if (this._dateCreated > now) {
      throw new BlockValidationError(
        BlockValidationErrorType.FutureCreationDate,
      );
    }

    // Store or create metadata
    this._metadata = metadata;
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
    return BaseBlock.checksumService.checksumToHexString(
      this.idChecksum,
    ) as ChecksumString;
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
  public get metadata(): BlockMetadata {
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
   * Asynchronously validate the block's checksum and data integrity
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public abstract validateAsync(): Promise<void>;

  /**
   * Synchronously validate the block's checksum and data integrity
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public abstract validateSync(): void;

  /**
   * Alias for validateSync() to maintain compatibility
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public validate(): void {
    return this.validateSync();
  }

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
    return this._lengthBeforeEncryption;
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
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const headers = this.layers.map((layer) => layer.layerHeaderData);
    return Buffer.concat(headers);
  }
}
