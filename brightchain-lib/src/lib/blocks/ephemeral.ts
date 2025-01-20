import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { IDataBlock } from '../interfaces/dataBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

/**
 * Ephemeral blocks are blocks that are not stored on disk, but are either input blocks or reconstituted blocks.
 * Ephemeral blocks should never be written to disk and are therefore memory-only.
 */
export class EphemeralBlock extends BaseBlock implements IDataBlock {
  /**
   * The data in the block
   */
  protected readonly _data: Buffer;
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
   * @param canPersist - Whether the block can be persisted (defaults to false for ephemeral blocks)
   */
  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated: Date = new Date(),
    actualDataLength?: number,
    canRead = true,
    encrypted = false,
    canPersist = false,
  ) {
    // Validate date first
    const now = new Date();
    dateCreated = dateCreated ?? now;
    if (dateCreated > now) {
      throw new Error('Date created cannot be in the future');
    }

    // Store parameters for validation
    const finalData = data;
    const finalActualDataLength = actualDataLength;
    const finalCreator = creator;
    const finalEncrypted = encrypted;

    // Validate actual data length
    if (
      finalActualDataLength !== undefined &&
      finalActualDataLength > finalData.length
    ) {
      throw new Error('Actual data length exceeds data length');
    }

    // Calculate maximum data size
    const maxDataSize = blockSize as number;

    // For both encrypted and unencrypted blocks, we pad to the full block size
    // The difference is that encrypted blocks already include their header
    const effectiveDataSize = maxDataSize;

    // Handle padding
    let paddedData = finalData;
    if (paddedData.length < effectiveDataSize) {
      // Pad with random data to reach the full block size
      const padding = randomBytes(effectiveDataSize - paddedData.length);
      paddedData = Buffer.concat([paddedData, padding]);
    } else if (paddedData.length > effectiveDataSize) {
      throw new Error('Data length exceeds block capacity');
    }

    // Calculate checksum from data before padding
    const calculatedChecksum =
      StaticHelpersChecksum.calculateChecksum(finalData);

    // Use provided checksum or calculated one
    const finalChecksum = checksum ?? calculatedChecksum;

    // For encrypted blocks, validate against provided checksum
    // For unencrypted blocks, calculate checksum on data before padding
    const computedChecksum = finalEncrypted
      ? finalChecksum
      : StaticHelpersChecksum.calculateChecksum(finalData);

    // Initialize base class with final values
    super(
      type,
      blockDataType,
      blockSize,
      paddedData,
      finalChecksum,
      dateCreated,
      undefined, // metadata
      canRead,
      canPersist,
    );

    // Validate checksum and throw if mismatch
    if (!finalEncrypted && !computedChecksum.equals(finalChecksum)) {
      throw new Error('Checksum mismatch');
    }
    this._validated = true;

    // Store block properties
    this._data = paddedData;
    this._actualDataLength = finalActualDataLength ?? finalData.length;
    this._encrypted = finalEncrypted;

    // Handle creator
    if (finalCreator instanceof BrightChainMember) {
      this._creator = finalCreator;
      this._creatorId = finalCreator.id;
    } else if (finalCreator instanceof GuidV4) {
      this._creatorId = finalCreator;
    }
  }

  /**
   * The data in the block
   */
  public get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // For encrypted blocks, return the entire data buffer since it includes the header
    // For unencrypted blocks, return only the actual data (no padding)
    return this._encrypted || this._actualDataLength === this._data.length
      ? this._data
      : this._data.subarray(0, this._actualDataLength);
  }

  /**
   * The date the block was created
   */
  public override get dateCreated(): Date {
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
  public override validate(): boolean {
    // For both encrypted and unencrypted blocks,
    // validate against the provided checksum
    if (!this.idChecksum) {
      throw new Error('No checksum provided');
    }

    // For unencrypted blocks, calculate checksum on data before padding
    // For encrypted blocks, validate against the provided checksum
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(
      this._data.subarray(0, this._actualDataLength),
    );
    this._validated = computedChecksum.equals(this.idChecksum);
    return this._validated;
  }

  /**
   * The block creator object
   * Only returns BrightChainMember creators, not GuidV4 IDs
   */
  public get creator(): BrightChainMember | undefined {
    return this._creator;
  }

  /**
   * The block creator id
   * For BrightChainMember creators, returns their ID
   * For GuidV4 creators, returns the GuidV4 directly
   */
  public get creatorId(): GuidV4 | undefined {
    return this._creatorId;
  }

  /**
   * Whether the block can be signed
   * Returns true if the block has any creator (BrightChainMember or GuidV4)
   */
  public get canSign(): boolean {
    return this._creator !== undefined || this._creatorId !== undefined;
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // Return empty buffer by default, but allow derived classes to override
    return Buffer.alloc(0);
  }

  /**
   * Get the payload data
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // For encrypted blocks, let derived class handle payload extraction
    // For unencrypted blocks, return the actual data (no padding)
    return this._encrypted
      ? this.data
      : this._data.subarray(0, this._actualDataLength);
  }

  /**
   * Get the length of the payload
   */
  public override get payloadLength(): number {
    // For encrypted blocks, let derived class handle length calculation
    // For unencrypted blocks, use actual data length
    return this._encrypted ? super.payloadLength : this._actualDataLength;
  }
}
