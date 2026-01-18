import { BlockMetadata } from '../blockMetadata';
import { Readable } from '../browserStream';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { WhitenedErrorType } from '../enumerations/whitenedErrorType';
import { WhitenedError } from '../errors/whitenedError';
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * WhitenedBlock represents a block that has been XORed with random data.
 * In the Owner Free Filesystem (OFF), whitened blocks are used to:
 * 1. Obscure data by XORing with random blocks
 * 2. Enable data recovery through XOR operations
 * 3. Provide privacy without encryption overhead
 */
export class WhitenedBlock extends RawDataBlock {
  constructor(
    blockSize: BlockSize,
    data: Uint8Array,
    checksum?: Checksum,
    dateCreated?: Date,
    canRead = true,
    canPersist = true,
  ) {
    super(
      blockSize,
      data,
      dateCreated,
      checksum,
      BlockType.OwnerFreeWhitenedBlock,
      BlockDataType.RawData,
      canRead,
      canPersist,
    );
  }

  /**
   * The type of the block
   */
  public override get blockType(): BlockType {
    return BlockType.OwnerFreeWhitenedBlock;
  }

  /**
   * The type of data in the block
   */
  public override get blockDataType(): BlockDataType {
    return BlockDataType.RawData;
  }

  /**
   * The data in the block, excluding any metadata or other overhead
   */
  public override get layerPayload(): Uint8Array {
    if (!this.canRead) {
      throw new WhitenedError(WhitenedErrorType.BlockNotReadable);
    }
    // For whitened blocks, like raw data blocks, the payload is the entire data
    return new Uint8Array(this.data);
  }

  /**
   * Whether the block can be encrypted
   */
  public override get canEncrypt(): boolean {
    return false; // Whitened blocks cannot be encrypted
  }

  /**
   * Whether the block can be decrypted
   */
  public override get canDecrypt(): boolean {
    return false; // Whitened blocks cannot be decrypted
  }

  /**
   * Get the complete header data from all layers
   */
  public override get fullHeaderData(): Uint8Array {
    const superHeader = super.fullHeaderData;
    const layerHeader = this.layerHeaderData;
    const result = new Uint8Array(superHeader.length + layerHeader.length);
    result.set(superHeader);
    result.set(layerHeader, superHeader.length);
    return result;
  }

  /**
   * Convert a Readable stream to a Uint8Array
   * @param readable - The readable stream to convert
   * @returns Promise that resolves to a Uint8Array
   */
  private static async streamToUint8Array(
    readable: Readable,
  ): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of readable) {
      chunks.push(new Uint8Array(chunk));
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * Convert data to Uint8Array regardless of whether it's a Readable or Uint8Array
   * @param data - The data to convert
   * @returns Promise that resolves to a Uint8Array
   */
  private static async toUint8Array(
    data: Readable | Uint8Array,
  ): Promise<Uint8Array> {
    if (data instanceof Uint8Array) {
      return data;
    }
    return WhitenedBlock.streamToUint8Array(data);
  }

  /**
   * XOR this block with another block
   */
  public async xor<T extends BaseBlock>(other: T): Promise<T> {
    if (this.blockSize !== other.blockSize) {
      throw new WhitenedError(WhitenedErrorType.BlockSizeMismatch);
    }

    const thisData = await WhitenedBlock.toUint8Array(this.data);
    const otherData = await WhitenedBlock.toUint8Array(other.data);

    const result = new Uint8Array(thisData.length);
    for (let i = 0; i < thisData.length; i++) {
      result[i] = thisData[i] ^ otherData[i];
    }

    // Create a new instance of the same type as the input block
    const Constructor = other.constructor as new (
      blockSize: BlockSize,
      data: Uint8Array,
      dateCreated: Date,
      checksum: Checksum,
      canRead: boolean,
      canPersist: boolean,
    ) => T;
    const checksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(result);

    return new Constructor(
      this.blockSize,
      result,
      new Date(),
      checksum,
      this.canRead && other.canRead,
      this.canPersist && other.canPersist,
    );
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Uint8Array {
    // Whitened blocks don't have any layer-specific header data
    return new Uint8Array(0);
  }

  /**
   * Create a new whitened block by XORing data with random data
   */
  public static fromData(
    blockSize: BlockSize,
    data: Uint8Array,
    randomData: Uint8Array,
  ): WhitenedBlock {
    if (data.length !== randomData.length) {
      throw new WhitenedError(WhitenedErrorType.DataLengthMismatch);
    }
    if (data.length > blockSize) {
      throw new WhitenedError(WhitenedErrorType.InvalidBlockSize);
    }

    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ randomData[i];
    }

    const checksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(result);

    return new WhitenedBlock(blockSize, result, checksum, new Date());
  }

  /**
   * Create a new whitened block with specified length metadata
   */
  public static async from(
    blockSize: BlockSize,
    data: Uint8Array,
    checksum?: Checksum,
    dateCreated?: Date,
    lengthWithoutPadding?: number,
    canRead = true,
    canPersist = true,
  ): Promise<WhitenedBlock> {
    // Ensure data is padded to block size
    const paddedData = new Uint8Array(blockSize);
    paddedData.set(data);

    // Create metadata with original length
    const metadata = new BlockMetadata(
      blockSize,
      BlockType.OwnerFreeWhitenedBlock,
      BlockDataType.RawData,
      lengthWithoutPadding ?? data.length,
      dateCreated ?? new Date(),
    );

    // Create block with padded data and preserve padding
    const block = new WhitenedBlock(
      blockSize,
      paddedData,
      checksum,
      dateCreated,
      canRead,
      canPersist,
    );

    // Override the data property to ensure it keeps the padding
    Object.defineProperty(block, 'data', {
      value: paddedData,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    // Override the metadata created in RawDataBlock constructor
    Object.defineProperty(block, 'metadata', {
      value: metadata,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    return block;
  }
}
