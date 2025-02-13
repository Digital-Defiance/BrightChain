import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { BrightChainMember } from '../brightChainMember';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockMetadataErrorType } from '../enumerations/blockMetadataErrorType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import {
  BlockAccessError,
  BlockMetadataError,
  BlockValidationError,
} from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { IDataBlock } from '../interfaces/dataBlock';
import { ECIESService } from '../services/ecies.service';
import { ServiceInitializer } from '../services/service.initializer';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

/**
 * Ephemeral blocks are blocks that are not stored on disk, but are either input blocks or reconstituted blocks.
 * Ephemeral blocks should never be written to disk and are therefore memory-only.
 */
export class EphemeralBlock extends BaseBlock implements IDataBlock {
  protected static eciesService: ECIESService;

  protected static override initialize() {
    super.initialize();
    if (!EphemeralBlock.eciesService) {
      EphemeralBlock.eciesService = ServiceInitializer.getECIESService();
    }
  }

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
    lengthBeforeEncryption?: number,
    canRead = true,
    encrypted = false,
    canPersist = true,
  ): Promise<EphemeralBlock> {
    EphemeralBlock.initialize();
    const calculatedChecksum =
      await EphemeralBlock.checksumService.calculateChecksumForStream(
        Readable.from(data),
      );

    if (!calculatedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, calculatedChecksum);
    }

    const metadata: EphemeralBlockMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      dataType,
      lengthBeforeEncryption ?? data.length,
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
    EphemeralBlock.initialize();
    if (data instanceof Readable) {
      throw new BlockValidationError(
        BlockValidationErrorType.EphemeralBlockOnlySupportsBufferData,
      );
    }

    // Initialize base class
    super(type, dataType, checksum, metadata, canRead, canPersist);

    // Validate data length against block size
    const maxDataSize = metadata.size;
    if (data.length > maxDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    // Handle padding
    let paddedData = data;
    if (paddedData.length < maxDataSize) {
      // Pad with random data to reach the full block size
      const padding = randomBytes(maxDataSize - paddedData.length);
      paddedData = Buffer.concat([paddedData, padding]);
    }

    if (!metadata) {
      throw new BlockMetadataError(BlockMetadataErrorType.MetadataRequired);
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
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // For encrypted blocks, return the full data including padding
    // For unencrypted blocks, return only the actual data length
    return this._encrypted
      ? this._data
      : this._data.subarray(0, this.metadata.lengthWithoutPadding);
  }

  /**
   * Get the full padded data buffer for XOR operations
   * @internal
   */
  protected get paddedData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._data;
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
  public get lengthBeforeEncryption(): number {
    return this._lengthBeforeEncryption;
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
    EphemeralBlock.initialize();
    return (
      !this._encrypted &&
      this._lengthBeforeEncryption +
        EphemeralBlock.eciesService.eciesOverheadLength <=
        this.blockSize
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
      throw new BlockValidationError(BlockValidationErrorType.NoChecksum);
    }

    // Calculate checksum on actual data length, excluding padding
    const computedChecksum = EphemeralBlock.checksumService.calculateChecksum(
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
      throw new BlockValidationError(BlockValidationErrorType.NoChecksum);
    }

    // Calculate checksum on actual data length, excluding padding
    const computedChecksum =
      await EphemeralBlock.checksumService.calculateChecksumForStream(
        Readable.from(this._data),
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
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // Return empty buffer by default, but allow derived classes to override
    return Buffer.alloc(0);
  }

  /**
   * Get the payload data
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // For encrypted blocks, let derived class handle payload extraction
    // For unencrypted blocks, return the actual data (no padding)
    return this._encrypted
      ? this.data
      : this._data.subarray(0, this._lengthBeforeEncryption);
  }

  /**
   * Get the length of the payload
   */
  public override get payloadLength(): number {
    // For encrypted blocks, let derived class handle length calculation
    // For unencrypted blocks, use actual data length
    return this._encrypted ? super.payloadLength : this._lengthBeforeEncryption;
  }
}
