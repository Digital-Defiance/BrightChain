import { randomBytes } from 'crypto';
import { BlockChecksum } from '../access/checksum';
import { BrightChainMember } from '../brightChainMember';
import { CBL, ECIES } from '../constants';
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
import { IEncryptedBlock } from '../interfaces/blocks/encrypted';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { EncryptedBlock } from './encrypted';
import { EncryptedBlockCreator } from './encryptedBlockCreator';

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

// Register block creator first to avoid circular dependencies
EncryptedBlockCreator.register(
  BlockType.EncryptedConstituentBlockListBlock,
  async (
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<EncryptedBlock> => {
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
    const minDataSize = CBL.BASE_OVERHEAD + ECIES.OVERHEAD_SIZE;
    if (data.length < minDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShortForEncryptedCBL,
      );
    }

    // Calculate the actual data length and metadata
    const payloadLength = (blockSize as number) - ECIES.OVERHEAD_SIZE;

    // For already encrypted data (starts with 0x04), validate total size
    if (data[0] === ECIES.PUBLIC_KEY_MAGIC) {
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
    if (lengthBeforeEncryption !== undefined) {
      if (lengthBeforeEncryption > payloadLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // Calculate checksum on the original data
    const computedChecksum = BlockChecksum.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    // Create metadata with correct length
    const metadata = new EncryptedBlockMetadata(
      blockSize,
      type,
      dataType,
      lengthBeforeEncryption ?? data.length,
      creator,
      finalDate,
    );

    // Create final data buffer filled with random data
    const finalData = randomBytes(blockSize as number);

    // If data is already encrypted (starts with 0x04), use it directly
    if (data[0] === ECIES.PUBLIC_KEY_MAGIC) {
      // Copy data into the final buffer, preserving the full block size
      data.copy(finalData, 0, 0, Math.min(data.length, blockSize as number));
    } else {
      // Set ECIES header components
      finalData[0] = ECIES.PUBLIC_KEY_MAGIC; // Set ECIES public key prefix
      // Rest of the public key is already random from randomBytes
      let offset = ECIES.PUBLIC_KEY_LENGTH;
      // IV and authTag are already random from randomBytes
      offset += ECIES.IV_LENGTH;
      offset += ECIES.AUTH_TAG_LENGTH;
      // Copy actual data to payload area, preserving the full block size
      data.copy(
        finalData,
        offset,
        0,
        Math.min(data.length, (blockSize as number) - offset),
      );
    }

    // Validate encryption header components
    const ephemeralKey = finalData.subarray(0, ECIES.PUBLIC_KEY_LENGTH);
    const iv = finalData.subarray(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    );
    const authTag = finalData.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    // Verify all components have correct lengths and format
    if (
      ephemeralKey[0] !== ECIES.PUBLIC_KEY_MAGIC ||
      ephemeralKey.length !== ECIES.PUBLIC_KEY_LENGTH
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (iv.length !== ECIES.IV_LENGTH) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (authTag.length !== ECIES.AUTH_TAG_LENGTH) {
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
      true, // Always readable
      true, // Always persistable
    ) as EncryptedBlock;
  },
);

export class EncryptedConstituentBlockListBlock
  extends EncryptedBlock
  implements IEncryptedBlock
{
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<EncryptedConstituentBlockListBlock> {
    const result = await EncryptedBlockCreator.create(
      BlockType.EncryptedConstituentBlockListBlock,
      dataType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      lengthBeforeEncryption,
    );
    return result as EncryptedConstituentBlockListBlock;
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
    const encryptedData = ServiceProvider.getInstance().eciesService.encrypt(
      encryptor.publicKey,
      cbl.data,
    );

    // The creator of the encrypted block should be the same as the original block
    // This maintains the ownership chain and allows for signature validation

    const checksum = await BlockChecksum.calculateChecksum(encryptedData);

    return EncryptedConstituentBlockListBlock.from(
      BlockType.EncryptedConstituentBlockListBlock,
      BlockDataType.EncryptedData,
      cbl.blockSize,
      encryptedData,
      checksum,
      encryptor, // Use encryptor as creator since they're encrypting the data
      cbl.dateCreated,
      cbl.lengthBeforeEncryption,
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
   * @param eciesService - The ECIES service to use for encryption/decryption
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
  public get canDecrypt(): boolean {
    return true;
  }

  /**
   * Get the available capacity for payload data in this block
   */
  public override get availableCapacity(): number {
    const blockCapacityCalculator =
      ServiceProvider.getInstance().blockCapacityCalculator;
    const result = blockCapacityCalculator.calculateCapacity({
      blockSize: this.blockSize,
      blockType: this.blockType,
      usesStandardEncryption: true,
    });
    return result.availableCapacity;
  }

  /**
   * Get the total overhead including CBL header and encryption overhead
   */
  public override get totalOverhead(): number {
    return (
      super.totalOverhead + // Encryption overhead
      CBL.BASE_OVERHEAD // CBL header
    );
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
    return this.data.subarray(ECIES.OVERHEAD_SIZE, this.blockSize);
  }

  /**
   * Override validateSync to add CBL-specific validation
   */
  public override validateSync(): void {
    // Call parent validation first
    super.validateSync();

    // Validate CBL-specific constraints
    const minDataSize = CBL.BASE_OVERHEAD;
    if (this.lengthBeforeEncryption < minDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShortForCBLHeader,
      );
    }

    // Validate that the remaining data length (after header) is a multiple of checksum length
    const dataAfterHeader = this.lengthBeforeEncryption - CBL.BASE_OVERHEAD;
    if (dataAfterHeader % BlockChecksum.checksumBufferLength !== 0) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLDataLength,
      );
    }

    // Validate total size fits within block
    const totalSize = this.lengthBeforeEncryption + ECIES.OVERHEAD_SIZE;
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
    const minDataSize = CBL.BASE_OVERHEAD;
    if (this.lengthBeforeEncryption < minDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShortForCBLHeader,
      );
    }

    // Validate that the remaining data length (after header) is a multiple of checksum length
    const dataAfterHeader = this.lengthBeforeEncryption - CBL.BASE_OVERHEAD;
    if (dataAfterHeader % BlockChecksum.checksumBufferLength !== 0) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLDataLength,
      );
    }

    // Validate total size fits within block
    const totalSize = this.lengthBeforeEncryption + ECIES.OVERHEAD_SIZE;
    if (totalSize > this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }
}
