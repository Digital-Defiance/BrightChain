import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { IDataBlock } from '../interfaces/dataBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

/**
 * Ephermal blocks are blocks that are not stored on disk, but are either input blocks or reconstituted blocks.
 * Ephemeral blocks should never be written to disk and are therefore memory-only.
 */
export class EphemeralBlock extends BaseBlock implements IDataBlock {
  /**
   * Whether the checksum has been validated against the data
   */
  private _validated: boolean;
  /**
   * The data in the block
   */
  private readonly _data: Buffer;
  /**
   * The date the block was created
   */
  private readonly _dateCreated: Date;
  /**
   * The actual data length of the block before any encryption or padding overhead
   */
  private readonly _actualDataLength: number;
  /**
   * Whether the block is encrypted
   */
  private readonly _encrypted: boolean;
  /**
   * The block creator object
   */
  private readonly _creator?: BrightChainMember;
  /**
   * The block creator id
   */
  private readonly _creatorId?: GuidV4;
  /**
   * Create a new ephemeral block
   * @param type - The type of the block
   * @param blockDataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The data in the block
   * @param checksum - The id/checksum of the block
   * @param creator - The block creator id/object
   * @param dateCreated - The date the block was created
   * @param actualDataLength - The actual data length of the block before any encryption or padding overhead
   * @param canRead - Whether the block can be read
   * @param encrypted - Whether the block is encrypted
   */
  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: number,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    encrypted = false,
  ) {
    const now = new Date();
    if (actualDataLength && actualDataLength > data.length) {
      throw new Error('Actual data length exceeds data length');
    }
    let validated = checksum !== undefined;
    if (data.length < blockSize) {
      // pad with random data
      const padding = randomBytes(blockSize - data.length);
      data = Buffer.concat([data, padding]);
    } else if (data.length > blockSize) {
      throw new Error('Data length exceeds block size');
    }
    if (!checksum) {
      checksum = StaticHelpersChecksum.calculateChecksum(data);
      validated = true;
    } else {
      const calculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);
      if (!calculatedChecksum.equals(checksum)) {
        throw new Error('Checksum mismatch');
      }
      validated = true;
    }
    super(type, blockDataType, blockSize, checksum, canRead, false);
    this._validated = validated;
    this._data = data;
    this._dateCreated = dateCreated ?? now;
    if (this._dateCreated > now) {
      throw new Error('Date created is in the future');
    }
    this._actualDataLength = actualDataLength ?? data.length;
    this._encrypted = encrypted;
    if (creator instanceof BrightChainMember) {
      this._creator = creator;
      this._creatorId = creator.id;
    } else if (creator instanceof GuidV4) {
      this._creatorId = creator;
    }
  }
  /**
   * Whether the checksum has been validated against the data
   */
  public get validated(): boolean {
    return this._validated;
  }
  /**
   * The data in the block
   */
  public get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._actualDataLength === this._data.length
      ? this._data
      : this._data.subarray(0, this._actualDataLength);
  }
  /**
   * The date the block was created
   */
  public get dateCreated(): Date {
    return this._dateCreated;
  }
  /**
   * The actual data length of the block before any encryption or padding overhead
   */
  public get actualDataLength(): number {
    return this._actualDataLength;
  }
  /**
   * Whether the block is encrypted
   */
  public get encrypted(): boolean {
    return this._encrypted;
  }
  /**
   * Whether the block can be encrypted
   */
  public get canEncrypt(): boolean {
    return (
      !this._encrypted &&
      this._actualDataLength + StaticHelpersECIES.eciesOverheadLength <=
        (this.blockSize as number)
    );
  }
  /**
   * Whether the block can be decrypted
   */
  public get canDecrypt(): boolean {
    return this._encrypted;
  }
  /**
   * Trigger validation and return the result
   */
  public validate(): boolean {
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(
      this._data,
    );
    this._validated = computedChecksum.equals(this.idChecksum);
    return this._validated;
  }
  /**
   * The block creator object
   */
  public get creator(): BrightChainMember | undefined {
    return this._creator;
  }
  /**
   * The block creator id
   */
  public get creatorId(): GuidV4 | undefined {
    return this._creatorId ?? this._creator?.id;
  }
  /**
   * Whether the block can be signed
   */
  public get canSign(): boolean {
    return this._creator !== undefined;
  }
  /**
   * The data in the block, excluding any metadata or other overhead
   */
  public override get payload(): Buffer {
    return this.data.subarray(
      this.overhead,
      this.overhead + this._actualDataLength,
    );
  }
}
