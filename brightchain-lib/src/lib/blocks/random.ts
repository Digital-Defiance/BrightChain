import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * RandomBlock represents a block containing cryptographically secure random data.
 * Used in conjunction with WhitenedBlock for the Owner Free Filesystem concept,
 * where data blocks are XORed with random blocks to make them meaningless on their own.
 */
export class RandomBlock extends RawDataBlock {
  public constructor(
    blockSize: BlockSize,
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer,
  ) {
    if (data.length !== blockSize) {
      throw new Error('Data length must match block size');
    }

    super(
      blockSize,
      data,
      dateCreated,
      checksum,
      BlockType.Random,
      BlockDataType.RawData,
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Create a new random block
   */
  public static new(blockSize: BlockSize, dateCreated?: Date): RandomBlock {
    const data = randomBytes(blockSize as number);
    return new RandomBlock(blockSize, data, dateCreated);
  }

  /**
   * Reconstitute a random block from existing data
   */
  public static reconstitute(
    blockSize: BlockSize,
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer,
  ): RandomBlock {
    return new RandomBlock(blockSize, data, dateCreated, checksum);
  }

  /**
   * The type of the block
   */
  public override get blockType(): BlockType {
    return BlockType.Random;
  }

  /**
   * The type of data in the block
   */
  public override get blockDataType(): BlockDataType {
    return BlockDataType.RawData;
  }

  /**
   * Whether the block can be encrypted
   */
  public override get canEncrypt(): boolean {
    return false; // Random blocks cannot be encrypted
  }

  /**
   * Whether the block can be decrypted
   */
  public override get canDecrypt(): boolean {
    return false; // Random blocks cannot be decrypted
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Buffer {
    // Random blocks don't have any layer-specific header data
    return Buffer.alloc(0);
  }

  /**
   * Get the complete header data from all layers
   */
  public override get fullHeaderData(): Buffer {
    return Buffer.concat([super.fullHeaderData, this.layerHeaderData]);
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
    return RandomBlock.streamToBuffer(data);
  }

  /**
   * XOR this block with another block
   */
  public async xor<T extends BaseBlock>(other: T): Promise<T> {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes must match');
    }

    const thisData = await RandomBlock.toBuffer(this.data);
    const otherData = await RandomBlock.toBuffer(other.data);

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
      ServiceProvider.getInstance().checksumService.calculateChecksum(result),
      this.canRead && other.canRead,
      this.canPersist && other.canPersist,
    );
  }
}
