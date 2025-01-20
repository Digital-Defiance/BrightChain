import { randomBytes } from 'crypto';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * RandomBlock represents a block containing cryptographically secure random data.
 * Used in conjunction with WhitenedBlock for the Owner Free Filesystem concept,
 * where data blocks are XORed with random blocks to make them meaningless on their own.
 */
export class RandomBlock extends RawDataBlock {
  private constructor(
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
      true, // canRead
      true, // canPersist
    );
  }

  /**
   * Create a new random block
   */
  public static new(blockSize: BlockSize): RandomBlock {
    const data = randomBytes(blockSize as number);
    return new RandomBlock(blockSize, data);
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
   * Whether the block can be signed
   */
  public override get canSign(): boolean {
    return false; // Random blocks cannot be signed
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
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    return this.blockSize - this.totalOverhead;
  }

  /**
   * XOR this block with another block
   */
  public xor<T extends BaseBlock>(other: T): T {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes must match');
    }

    const result = Buffer.alloc(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      result[i] = this.data[i] ^ other.data[i];
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
}
