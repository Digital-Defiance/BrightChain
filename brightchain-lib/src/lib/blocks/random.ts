import { randomBytes } from '../browserCrypto';
import { Readable } from '../browserStream';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import type { ChecksumService } from '../services/checksum.service';
import { getGlobalServiceProvider } from '../services/globalServiceProvider';
import { Checksum } from '../types/checksum';
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
    data: Uint8Array,
    dateCreated?: Date,
    checksum?: Checksum,
    checksumService?: ChecksumService,
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
      checksumService,
    );
  }

  /**
   * Create a new random block
   */
  public static new(blockSize: BlockSize, dateCreated?: Date): RandomBlock {
    const data = randomBytes(blockSize as number);
    return new RandomBlock(blockSize, new Uint8Array(data), dateCreated);
  }

  /**
   * Reconstitute a random block from existing data
   */
  public static reconstitute(
    blockSize: BlockSize,
    data: Uint8Array,
    dateCreated?: Date,
    checksum?: Checksum,
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
  public override get layerHeaderData(): Uint8Array {
    // Random blocks don't have any layer-specific header data
    return new Uint8Array(0);
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
    return RandomBlock.streamToUint8Array(data);
  }

  /**
   * XOR this block with another block
   */
  public async xor<T extends BaseBlock>(other: T): Promise<T> {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes must match');
    }

    const thisData = await RandomBlock.toUint8Array(this.data);
    const otherData = await RandomBlock.toUint8Array(other.data);

    const result = new Uint8Array(thisData.length);
    for (let i = 0; i < thisData.length; i++) {
      result[i] = thisData[i] ^ otherData[i];
    }

    // Use global service provider for checksum calculation
    const checksum =
      getGlobalServiceProvider().checksumService.calculateChecksum(result);

    // Create a new instance of the same type as the input block
    const Constructor = other.constructor as new (
      blockSize: BlockSize,
      data: Uint8Array,
      dateCreated: Date,
      checksum: Checksum,
      canRead: boolean,
      canPersist: boolean,
    ) => T;

    return new Constructor(
      this.blockSize,
      result,
      new Date(),
      checksum,
      this.canRead && other.canRead,
      this.canPersist && other.canPersist,
    );
  }
}
