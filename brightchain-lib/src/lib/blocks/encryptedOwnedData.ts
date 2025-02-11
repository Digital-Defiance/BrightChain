import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

/**
 * EncryptedOwnedDataBlock represents an encrypted block owned by a specific member.
 * These blocks are always in-memory and ephemeral and should never be committed to disk.
 *
 * Block Structure:
 * [Base Headers][Encryption Header][Encrypted Payload][Padding]
 *
 * Where:
 * - Base Headers: Headers from parent classes
 * - Encryption Header: [Ephemeral Public Key][IV][Auth Tag]
 * - Encrypted Payload: Original data encrypted with ECIES
 * - Padding: filled to block size with random data
 */
export class EncryptedOwnedDataBlock extends EncryptedBlock {
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
  ): Promise<EncryptedOwnedDataBlock> {
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

    // Calculate available capacity
    const availableCapacity =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;

    // Validate data length
    if (data.length < 1) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // For already encrypted data (starts with 0x04), validate total size
    if (data[0] === 0x04) {
      if (data.length !== (blockSize as number)) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataBufferIsTruncated,
        );
      }
    } else {
      // For unencrypted data, validate it will fit after encryption
      if (data.length > availableCapacity) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // For encrypted blocks with known actual data length:
    // 1. The actual data length must not exceed available capacity
    // 2. The total encrypted length must not exceed block size
    if (actualDataLength !== undefined) {
      if (actualDataLength > availableCapacity) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // Create final data buffer filled with random data
    const finalData = randomBytes(blockSize as number);

    // Create metadata with correct length
    const metadata = new EncryptedBlockMetadata(
      blockSize,
      type,
      dataType,
      actualDataLength ?? data.length,
      creator,
      finalDate,
    );

    // If data is already encrypted (starts with 0x04), use it directly
    if (data[0] === 0x04) {
      // Copy data into the final buffer, preserving the full block size
      data.copy(finalData, 0, 0, Math.min(data.length, blockSize as number));

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
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidIVLength,
        );
      }
      if (authTag.length !== StaticHelpersECIES.authTagLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidAuthTagLength,
        );
      }

      // Calculate checksum on the final data
      const computedChecksum =
        StaticHelpersChecksum.calculateChecksum(finalData);
      if (checksum && !computedChecksum.equals(checksum)) {
        throw new ChecksumMismatchError(checksum, computedChecksum);
      }
      const finalChecksum = checksum ?? computedChecksum;

      return new EncryptedOwnedDataBlock(
        type,
        BlockDataType.EncryptedData,
        finalData,
        finalChecksum,
        metadata,
        canRead,
        canPersist,
      );
    }

    // For unencrypted data:
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

    // Validate the final data
    if (finalData.length !== (blockSize as number)) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
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

    // Calculate checksum on the final data
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(finalData);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    return new EncryptedOwnedDataBlock(
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
   * Creates an instance of EncryptedOwnedDataBlock.
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
   * Returns true if the block has a BrightChainMember creator
   * (GuidV4 creators cannot decrypt since they don't have private keys)
   */
  public override get canDecrypt(): boolean {
    return this.creator instanceof BrightChainMember;
  }

  /**
   * Whether the block can be signed
   * Returns true if the block has any creator
   * Both BrightChainMember and GuidV4 creators can sign
   */
  public override get canSign(): boolean {
    return this.creator !== undefined;
  }
}
