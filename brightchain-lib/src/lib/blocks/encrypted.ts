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
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
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
    actualDataLength?: number,
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
    void actualDataLength;
    void canRead;
    void canPersist;
    throw new BlockValidationError(
      BlockValidationErrorType.MethodMustBeImplementedByDerivedClass,
    );
  }

  /**
   * Creates an instance of EncryptedBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param metadata - The block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EphemeralBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
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
   * The length of the encrypted data
   */
  public get encryptedLength(): number {
    return this.actualDataLength + StaticHelpersECIES.eciesOverheadLength;
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
      StaticHelpersECIES.publicKeyLength,
    );
    if (key.length !== StaticHelpersECIES.publicKeyLength) {
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
      StaticHelpersECIES.publicKeyLength,
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
    );
    if (iv.length !== StaticHelpersECIES.ivLength) {
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
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength;
    const end = start + StaticHelpersECIES.authTagLength;

    const tag = this.layerHeaderData.subarray(start, end);
    if (tag.length !== StaticHelpersECIES.authTagLength) {
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
    return StaticHelpersECIES.eciesOverheadLength;
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
    return this.data.subarray(0, StaticHelpersECIES.eciesOverheadLength);
  }

  /**
   * Get the encrypted payload data (excluding the encryption header)
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // For encrypted blocks:
    // 1. Skip the encryption header (ephemeral public key + IV + auth tag)
    // 2. Return the entire encrypted data (including padding)
    // 3. Ensure we return exactly blockSize - overhead bytes
    return this.data.subarray(
      StaticHelpersECIES.eciesOverheadLength,
      StaticHelpersECIES.eciesOverheadLength + this.actualDataLength,
    );
  }

  /**
   * Get the length of the payload
   */
  public override get payloadLength(): number {
    // For encrypted blocks:
    // The payload length should be the length of the encrypted data
    // without the encryption header
    return this.data.length - StaticHelpersECIES.eciesOverheadLength;
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    // For encrypted blocks, we need to:
    // 1. Start with the full block size
    // 2. Subtract the ECIES overhead
    // This ensures proper capacity calculation for encrypted blocks
    return this.blockSize - StaticHelpersECIES.eciesOverheadLength;
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override async validateAsync(): Promise<void> {
    // Call parent validation first
    await super.validateAsync();

    // Validate encryption header lengths
    if (
      this.layerHeaderData.length !== StaticHelpersECIES.eciesOverheadLength
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionHeaderLength,
      );
    }

    // Validate individual components
    if (this.ephemeralPublicKey.length !== StaticHelpersECIES.publicKeyLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (this.iv.length !== StaticHelpersECIES.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (this.authTag.length !== StaticHelpersECIES.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
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
    if (
      this.layerHeaderData.length !== StaticHelpersECIES.eciesOverheadLength
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionHeaderLength,
      );
    }

    // Validate individual components
    if (this.ephemeralPublicKey.length !== StaticHelpersECIES.publicKeyLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (this.iv.length !== StaticHelpersECIES.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (this.authTag.length !== StaticHelpersECIES.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
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
