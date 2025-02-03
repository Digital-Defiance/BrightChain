import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
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
   * Creates a new ephemeral block
   */
  public static async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    encrypted = false,
    canPersist = true,
  ): Promise<EphemeralBlock> {
    const calculatedChecksum =
      await StaticHelpersChecksum.calculateChecksumAsync(data);

    if (!calculatedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, calculatedChecksum);
    }

    const metadata: EphemeralBlockMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      dataType,
      actualDataLength ?? data.length,
      encrypted,
      creator,
      dateCreated ?? new Date(),
    );

    return new EphemeralBlock(
      type,
      dataType,
      data,
      checksum,
      metadata,
      canRead,
      canPersist,
    );
  }

  /**
   * The data in the block
   */
  protected readonly _data: Buffer;
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
   * @param dataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The data in the block
   * @param checksum - The id/checksum of the block
   * @param dateCreated - The date the block was created
   * @param metadata - Optional block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted (defaults to false for ephemeral blocks)
   * @param encrypted - Whether the block is encrypted
   */
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer | Readable,
    checksum: ChecksumBuffer,
    metadata: EphemeralBlockMetadata,
    canRead = true,
    canPersist = false,
  ) {
    if (data instanceof Readable) {
      throw new Error('EphemeralBlock only supports Buffer data');
    }

    // Initialize base class
    super(type, dataType, checksum, metadata, canRead, canPersist);

    // Validate data length against block size
    const maxDataSize = metadata.size as number;
    if (data.length > maxDataSize) {
      throw new Error('Data length exceeds block capacity');
    }

    // Handle padding
    let paddedData = data;
    if (paddedData.length < maxDataSize) {
      // Pad with random data to reach the full block size
      const padding = randomBytes(maxDataSize - paddedData.length);
      paddedData = Buffer.concat([paddedData, padding]);
    }

    if (!metadata) {
      throw new Error('Metadata is required for ephemeral blocks');
    }

    // Store block properties
    this._data = paddedData;
    this._encrypted = metadata.encrypted;

    // Handle creator from metadata
    const creatorId = metadata.creator;
    if (creatorId instanceof BrightChainMember) {
      this._creator = creatorId;
      this._creatorId = creatorId.id;
    } else if (creatorId instanceof GuidV4) {
      this._creatorId = creatorId;
    }
  }

  /**
   * The data in the block
   */
  public override get data(): Buffer {
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
   * Synchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   */
  public override validateSync(): void {
    // For both encrypted and unencrypted blocks,
    // validate against the provided checksum
    if (!this.idChecksum) {
      throw new Error('No checksum provided');
    }

    // Calculate checksum on actual data length, excluding padding
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(
      this._data,
    );
    const validated = computedChecksum.equals(this.idChecksum);
    if (!validated) {
      throw new ChecksumMismatchError(this.idChecksum, computedChecksum);
    }
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   */
  public override async validateAsync(): Promise<void> {
    // For both encrypted and unencrypted blocks,
    // validate against the provided checksum
    if (!this.idChecksum) {
      throw new Error('No checksum provided');
    }

    // Calculate checksum on actual data length, excluding padding
    const computedChecksum = await StaticHelpersChecksum.calculateChecksumAsync(
      this._data,
    );
    const validated = computedChecksum.equals(this.idChecksum);
    if (!validated) {
      throw new ChecksumMismatchError(this.idChecksum, computedChecksum);
    }
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
