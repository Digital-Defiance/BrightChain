import { Readable } from 'stream';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer } from '../types';
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
    data: Buffer,
    checksum?: ChecksumBuffer,
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
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // For whitened blocks, like raw data blocks, the payload is the entire data
    return this.data;
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
   * Whether the block can be signed
   */
  public override get canSign(): boolean {
    return false; // Whitened blocks cannot be signed
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
   * Convert a Readable stream to a Buffer
   * @param readable - The readable stream to convert
   * @returns Promise that resolves to a Buffer
   */
  private static async streamToBuffer(readable: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Convert data to Buffer regardless of whether it's a Readable or Buffer
   * @param data - The data to convert
   * @returns Promise that resolves to a Buffer
   */
  private static async toBuffer(data: Readable | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    return WhitenedBlock.streamToBuffer(data);
  }

  /**
   * XOR this block with another block
   */
  public async xor<T extends BaseBlock>(other: T): Promise<T> {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes must match');
    }

    const thisData = await WhitenedBlock.toBuffer(this.data);
    const otherData = await WhitenedBlock.toBuffer(other.data);

    const result = Buffer.alloc(thisData.length);
    for (let i = 0; i < thisData.length; i++) {
      result[i] = thisData[i] ^ otherData[i];
    }

    // Create a new instance of the same type as the input block
    const Constructor = other.constructor as new (
      blockSize: BlockSize,
      data: Buffer,
      dateCreated: Date,
      checksum: ChecksumBuffer,
      canRead: boolean,
      canPersist: boolean,
    ) => T;

    return new Constructor(
      this.blockSize,
      result,
      new Date(),
      StaticHelpersChecksum.calculateChecksum(result),
      this.canRead && other.canRead,
      this.canPersist && other.canPersist,
    );
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Buffer {
    // Whitened blocks don't have any layer-specific header data
    return Buffer.alloc(0);
  }

  /**
   * Create a new whitened block by XORing data with random data
   */
  public static fromData(
    blockSize: BlockSize,
    data: Buffer,
    randomData: Buffer,
  ): WhitenedBlock {
    if (data.length !== randomData.length) {
      throw new Error('Data and random data lengths must match');
    }
    if (data.length > blockSize) {
      throw new Error(
        `Data length (${data.length}) exceeds block size (${blockSize})`,
      );
    }

    const result = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ randomData[i];
    }

    return new WhitenedBlock(
      blockSize,
      result,
      StaticHelpersChecksum.calculateChecksum(result),
      new Date(),
    );
  }
}
