import { ChecksumString } from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from '../blockMetadata';
import { Readable } from '../browserStream';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, validateBlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { BlockAccessError, BlockValidationError } from '../errors/block';
import { IBaseBlock } from '../interfaces/blocks/base';
import { Checksum } from '../types/checksum';

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
export abstract class BaseBlock implements IBaseBlock {
  protected readonly _blockSize: BlockSize;

  protected readonly _blockType: BlockType;
  protected readonly _blockDataType: BlockDataType;
  protected readonly _checksum: Checksum;
  protected readonly _dateCreated: Date;
  protected readonly _metadata: BlockMetadata;
  protected readonly _canRead: boolean;
  protected readonly _canPersist: boolean;
  protected readonly _lengthBeforeEncryption: number;

  /**
   * Constructs a block.
   * All derived constructors should trust the data being passed in as relevant to the type of block.
   * Blocks types that can validate the data are welcome to do so.
   * @param type Block type
   * @param dataType Data type
   * @param checksum Checksum
   * @param metadata Metadata
   * @param canRead Whether the block can be read
   * @param canPersist Whether the block can be persisted
   */
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    checksum: Checksum,
    metadata: BlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    // Validate block size
    if (!metadata.size || !validateBlockSize(metadata.size)) {
      throw new BlockValidationError(
        BlockValidationErrorType.BlockSizeNegative,
      );
    }

    // Validate date first
    const now = new Date();
    this._dateCreated = metadata ? new Date(metadata?.dateCreated) : now;
    if (this._dateCreated > now) {
      throw new BlockValidationError(
        BlockValidationErrorType.FutureCreationDate,
      );
    }

    // Store basic properties
    this._blockSize = metadata.size;
    this._blockType = type;
    this._blockDataType = dataType;
    this._canRead = canRead;
    this._canPersist = canPersist;
    this._checksum = checksum;
    this._lengthBeforeEncryption = metadata.lengthWithoutPadding;

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
  public get idChecksum(): Checksum {
    return this._checksum;
  }

  /**
   * The block's checksum as a string
   */
  public get checksumString(): ChecksumString {
    return this.idChecksum.toHex() as ChecksumString;
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
  public abstract get data(): Uint8Array | Readable;

  /**
   * Get this layer's header data size
   */
  public abstract get layerOverheadSize(): number;

  /**
   * Get this layer's header data
   */
  public abstract get layerHeaderData(): Uint8Array;

  /**
   * Get this layer's data (including headers)
   */
  public abstract get layerData(): Uint8Array;

  /**
   * Get the payload data (excluding headers)
   */
  public abstract get layerPayload(): Uint8Array;

  /**
   * Get the length of the payload
   */
  public abstract get layerPayloadSize(): number;

  /**
   * Get all layers in the inheritance chain
   */
  public get layers(): IBaseBlock[] {
    const collectLayers = (block: IBaseBlock): IBaseBlock[] => {
      const parent = block.parent;
      return parent ? [...collectLayers(parent), block] : [block];
    };
    return collectLayers(this);
  }

  /**
   * Get the total header size of all layers below this one
   */
  public get lowerLayerHeaderSize(): number {
    const layers = this.layers;
    const currentLayerIndex = layers.indexOf(this);
    if (currentLayerIndex === -1) {
      throw new Error('Current layer not found in layers');
    }

    return layers.slice(0, currentLayerIndex).reduce((sum, layer) => {
      return sum + layer.layerOverheadSize;
    }, 0);
  }

  /**
   * Get the parent layer in the inheritance chain
   */
  public get parent(): IBaseBlock | null {
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
   * Get the complete header data from all layers
   */
  public get fullHeaderData(): Uint8Array {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const headers = this.layers.map((layer) => layer.layerHeaderData);
    const totalLength = headers.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of headers) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}
