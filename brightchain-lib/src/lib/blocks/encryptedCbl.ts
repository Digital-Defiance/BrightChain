import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockMetadataErrorType } from '../enumerations/blockMetadataErrorType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import {
  BlockAccessError,
  BlockMetadataError,
  BlockValidationError,
} from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';

/**
 * EncryptedConstituentBlockListBlock represents an encrypted version of a ConstituentBlockListBlock.
 * It contains a list of block IDs that make up a larger file or data structure.
 *
 * Block Structure:
 * [Base Headers][Encryption Header][Encrypted CBL Data][Padding]
 *
 * Where:
 * - Base Headers: Headers from parent classes
 * - Encryption Header: [Ephemeral Public Key][IV][Auth Tag]
 * - Encrypted CBL Data: Encrypted form of:
 *   - CBL Header: [Creator ID][Date Created][Address Count][Original Length][Tuple Size][Creator Signature]
 *   - CBL Addresses: Array of block checksums
 * - Padding: Random data to fill block size
 */
export class EncryptedConstituentBlockListBlock extends EncryptedOwnedDataBlock {
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ): Promise<EncryptedConstituentBlockListBlock> {
    // Validate date first, before any other validation
    const now = new Date();
    const finalDate = dateCreated ?? now;
    if (isNaN(finalDate.getTime())) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidDateCreated,
      );
    }
    if (finalDate > now) {
      throw new BlockValidationError(
        BlockValidationErrorType.FutureCreationDate,
      );
    }

    // For encrypted CBL blocks, we need to validate:
    // 1. The minimum data size includes both CBL header and encryption overhead
    const minDataSize =
      ConstituentBlockListBlock.CblHeaderSize +
      StaticHelpersECIES.eciesOverheadLength;
    if (data.length < minDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShortForEncryptedCBL,
      );
    }

    // Calculate the actual data length and metadata
    const payloadLength =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;

    // For already encrypted data (starts with 0x04), validate total size
    if (data[0] === 0x04) {
      if (data.length > (blockSize as number)) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    } else {
      // For unencrypted data, validate it will fit after encryption
      if (data.length > payloadLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // For encrypted blocks with known actual data length:
    // 1. The actual data length must not exceed available capacity
    // 2. The total encrypted length must not exceed block size
    if (actualDataLength !== undefined) {
      if (actualDataLength > payloadLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // Calculate checksum on the original data
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    // Create metadata with correct length
    const metadata = new EncryptedBlockMetadata(
      blockSize,
      type,
      dataType,
      actualDataLength ?? data.length,
      creator,
      finalDate,
    );

    // Create final data buffer filled with random data
    const finalData = randomBytes(blockSize as number);

    // If data is already encrypted (starts with 0x04), use it directly
    if (data[0] === 0x04) {
      // Copy data into the final buffer, preserving the full block size
      data.copy(finalData, 0, 0, Math.min(data.length, blockSize as number));
    } else {
      // Set ECIES header components
      finalData[0] = 0x04; // Set ECIES public key prefix
      // Rest of the public key is already random from randomBytes
      let offset = StaticHelpersECIES.publicKeyLength;
      // IV and authTag are already random from randomBytes
      offset += StaticHelpersECIES.ivLength;
      offset += StaticHelpersECIES.authTagLength;
      // Copy actual data to payload area, preserving the full block size
      data.copy(
        finalData,
        offset,
        0,
        Math.min(data.length, (blockSize as number) - offset),
      );
    }

    // Validate encryption header components
    const ephemeralKey = finalData.subarray(
      0,
      StaticHelpersECIES.publicKeyLength,
    );
    const iv = finalData.subarray(
      StaticHelpersECIES.publicKeyLength,
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
    );
    const authTag = finalData.subarray(
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );

    // Verify all components have correct lengths and format
    if (
      ephemeralKey[0] !== 0x04 ||
      ephemeralKey.length !== StaticHelpersECIES.publicKeyLength
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (iv.length !== StaticHelpersECIES.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (authTag.length !== StaticHelpersECIES.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
      );
    }

    return new EncryptedConstituentBlockListBlock(
      type,
      BlockDataType.EncryptedData,
      finalData,
      finalChecksum,
      metadata,
      canRead,
      canPersist,
    );
  }

  /**
   * Create an encrypted CBL block from a plaintext CBL block
   */
  public static async fromCbl(
    cbl: ConstituentBlockListBlock,
    encryptor: BrightChainMember,
  ): Promise<EncryptedConstituentBlockListBlock> {
    if (!cbl.canEncrypt) {
      throw new BlockAccessError(BlockAccessErrorType.CBLCannotBeEncrypted);
    }

    if (!encryptor) {
      throw new BlockMetadataError(BlockMetadataErrorType.EncryptorRequired);
    }

    // Encrypt the CBL data
    const encryptedData = StaticHelpersECIES.encrypt(
      encryptor.publicKey,
      cbl.data,
    );

    // The creator of the encrypted block should be the same as the original block
    // This maintains the ownership chain and allows for signature validation
    if (!cbl.creator && !cbl.creatorId) {
      throw new BlockMetadataError(BlockMetadataErrorType.CreatorRequired);
    }

    const checksum =
      await StaticHelpersChecksum.calculateChecksumAsync(encryptedData);

    return EncryptedConstituentBlockListBlock.from(
      BlockType.EncryptedConstituentBlockListBlock,
      BlockDataType.EncryptedData,
      cbl.blockSize,
      encryptedData,
      checksum,
      encryptor, // Use encryptor as creator since they're encrypting the data
      cbl.dateCreated,
      cbl.actualDataLength,
      true, // Always readable
      true, // Always persistable
    );
  }

  /**
   * Creates an instance of EncryptedConstituentBlockListBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param dateCreated - The date the block was created
   * @param metadata - The block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  public constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EncryptedBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
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
   * Get the total overhead including CBL header and encryption overhead
   */
  public override get totalOverhead(): number {
    return (
      super.totalOverhead + // Encryption overhead
      ConstituentBlockListBlock.CblHeaderSize // CBL header
    );
  }

  /**
   * Get the usable capacity after accounting for all overhead
   */
  public override get capacity(): number {
    return this.blockSize - this.totalOverhead;
  }

  /**
   * Get the encrypted payload data (excluding all headers)
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }

    // For encrypted CBL blocks:
    // Return the entire payload area (including random padding)
    // The payload starts after the encryption header and goes to the end of the block
    return this.data.subarray(
      StaticHelpersECIES.eciesOverheadLength,
      this.blockSize,
    );
  }

  /**
   * Override validateSync to add CBL-specific validation
   */
  public override validateSync(): void {
    // Call parent validation first
    super.validateSync();

    // Validate CBL-specific constraints
    const minDataSize = ConstituentBlockListBlock.CblHeaderSize;
    if (this.actualDataLength < minDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShortForCBLHeader,
      );
    }

    // Validate that the remaining data length (after header) is a multiple of checksum length
    const dataAfterHeader =
      this.actualDataLength - ConstituentBlockListBlock.CblHeaderSize;
    if (
      dataAfterHeader % StaticHelpersChecksum.Sha3ChecksumBufferLength !==
      0
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLDataLength,
      );
    }

    // Validate total size fits within block
    const totalSize =
      this.actualDataLength + StaticHelpersECIES.eciesOverheadLength;
    if (totalSize > this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }

  /**
   * Override validateAsync to add CBL-specific validation
   */
  public override async validateAsync(): Promise<void> {
    // Call parent validation first
    await super.validateAsync();

    // Validate CBL-specific constraints
    const minDataSize = ConstituentBlockListBlock.CblHeaderSize;
    if (this.actualDataLength < minDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShortForCBLHeader,
      );
    }

    // Validate that the remaining data length (after header) is a multiple of checksum length
    const dataAfterHeader =
      this.actualDataLength - ConstituentBlockListBlock.CblHeaderSize;
    if (
      dataAfterHeader % StaticHelpersChecksum.Sha3ChecksumBufferLength !==
      0
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLDataLength,
      );
    }

    // Validate total size fits within block
    const totalSize =
      this.actualDataLength + StaticHelpersECIES.eciesOverheadLength;
    if (totalSize > this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }
}
