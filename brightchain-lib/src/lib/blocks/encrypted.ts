import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockAccessError, BlockValidationError } from '../errors/block';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { ECIESService } from '../services/ecies.service';
import { ChecksumBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';

/**
 * Base class for encrypted blocks.
 * Adds encryption-specific header data and overhead calculations.
 *
 * Block Structure:
 * [Layer 0 Header][Layer 1 Header][...][Encryption Header][Encrypted Payload][Padding]
 *
 * Encryption Header:
 * [Ephemeral Public Key (65 bytes)][IV (16 bytes)][Auth Tag (16 bytes)]
 */
export abstract class EncryptedBlock
  extends EphemeralBlock
  implements IEncryptedBlock
{
  protected readonly eciesService: ECIESService;

  /**
   * Creates an instance of EncryptedBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param metadata - The block metadata
   * @param eciesService - The ECIES service to use for encryption/decryption
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EphemeralBlockMetadata,
    eciesService: ECIESService,
    canRead = true,
    canPersist = true,
  ) {
    // Create a properly sized buffer filled with random data
    const finalData = randomBytes(metadata.size as number);
    // Copy data into the final buffer, preserving the full block size
    data.copy(finalData, 0, 0, Math.min(data.length, metadata.size as number));
    super(type, dataType, finalData, checksum, metadata, canRead, canPersist);
    this.eciesService = eciesService;
  }

  /**
   * Create a new encrypted block from data
   */
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead?: boolean,
    canPersist?: boolean,
  ): Promise<EncryptedBlock> {
    // Suppress unused parameter warnings while providing a base implementation
    void type;
    void dataType;
    void blockSize;
    void data;
    void checksum;
    void creator;
    void dateCreated;
    void lengthBeforeEncryption;
    void canRead;
    void canPersist;
    throw new BlockValidationError(
      BlockValidationErrorType.MethodMustBeImplementedByDerivedClass,
    );
  }

  /**
   * Whether the block is encrypted
   * Always returns true since this is an encrypted block
   */
  public override get encrypted(): boolean {
    return true;
  }

  /**
   * Whether the block can be encrypted
   * Always returns false since this block is already encrypted
   */
  public override get canEncrypt(): boolean {
    return false;
  }

  /**
   * Whether the block can be decrypted
   * Returns true since encrypted blocks can always be decrypted
   * with the appropriate private key
   */
  public override get canDecrypt(): boolean {
    return true;
  }

  /**
   * Whether the block can be signed
   * Returns true if the block has a creator
   */
  public override get canSign(): boolean {
    return this.creator !== undefined;
  }

  /**
   * The length of the encrypted data including overhead and padding
   */
  public get encryptedLength(): number {
    return this.lengthBeforeEncryption + this.eciesService.eciesOverheadLength;
  }

  /**
   * The ephemeral public key used to encrypt the data
   */
  public get ephemeralPublicKey(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // Get the ephemeral public key (already includes 0x04 prefix)
    const key = this.layerHeaderData.subarray(
      0,
      this.eciesService.publicKeyLength,
    );
    if (key.length !== this.eciesService.publicKeyLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    return key;
  }

  /**
   * The initialization vector used to encrypt the data
   */
  public get iv(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const iv = this.layerHeaderData.subarray(
      this.eciesService.publicKeyLength,
      this.eciesService.publicKeyLength + this.eciesService.ivLength,
    );
    if (iv.length !== this.eciesService.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    return iv;
  }

  /**
   * The authentication tag used to encrypt the data
   */
  public get authTag(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // The auth tag is after the ephemeral public key (with 0x04 prefix) and IV
    const start =
      this.eciesService.publicKeyLength + this.eciesService.ivLength;
    const end = start + this.eciesService.authTagLength;

    const tag = this.layerHeaderData.subarray(start, end);
    if (tag.length !== this.eciesService.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
      );
    }
    return tag;
  }

  /**
   * The total overhead of the block, including encryption overhead
   * For encrypted blocks, the overhead is just the ECIES overhead since the
   * encryption header is part of the data buffer
   */
  public override get totalOverhead(): number {
    return this.eciesService.eciesOverheadLength;
  }

  /**
   * Get this layer's header data (encryption metadata)
   */
  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // For encrypted blocks, the header is always at the start of the data
    // since EphemeralBlock has no header data
    return this.data.subarray(0, this.eciesService.eciesOverheadLength);
  }

  /**
   * Get the encrypted payload data (excluding the encryption header)
   * This includes both the actual data and the random padding
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const headerLength = this.layerHeaderData.length;
    return this.data.subarray(
      headerLength,
      headerLength + this.encryptedLength,
    );
  }

  /**
   * Get the length of the payload including padding
   */
  public override get payloadLength(): number {
    // For encrypted blocks:
    // Return the full payload length including padding
    return this.encryptedLength;
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    // For encrypted blocks:
    // The usable capacity is the block size minus the encryption overhead
    // This is the maximum amount of data that can be stored in the block
    const totalCapacity =
      this.blockSize - this.eciesService.eciesOverheadLength;
    // Ensure we never return a negative capacity
    return Math.max(0, totalCapacity);
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override async validateAsync(): Promise<void> {
    // Call parent validation first
    await super.validateAsync();

    // Validate encryption header lengths
    if (this.layerHeaderData.length !== this.eciesService.eciesOverheadLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionHeaderLength,
      );
    }

    // Validate individual components
    if (this.ephemeralPublicKey.length !== this.eciesService.publicKeyLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (this.iv.length !== this.eciesService.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (this.authTag.length !== this.eciesService.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
      );
    }

    // Validate data length
    if (this.data.length !== this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
      );
    }

    // Validate actual data length
    if (this.lengthBeforeEncryption > this.capacity) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    // Validate encrypted length
    if (this.encryptedLength > this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }

  /**
   * Synchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validateSync(): void {
    // Call parent validation first
    super.validateSync();

    // Validate encryption header lengths
    if (this.layerHeaderData.length !== this.eciesService.eciesOverheadLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionHeaderLength,
      );
    }

    // Validate individual components
    if (this.ephemeralPublicKey.length !== this.eciesService.publicKeyLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (this.iv.length !== this.eciesService.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (this.authTag.length !== this.eciesService.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
      );
    }

    // Validate data length
    if (this.data.length !== this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
      );
    }

    // Validate actual data length
    if (this.lengthBeforeEncryption > this.capacity) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    // Validate encrypted length
    if (this.encryptedLength > this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }

  /**
   * Alias for validateSync() to maintain compatibility
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validate(): void {
    this.validateSync();
  }
}
