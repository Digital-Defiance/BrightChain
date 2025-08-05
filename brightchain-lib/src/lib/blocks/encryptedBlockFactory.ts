import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '../services/ecies.service';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

export class EncryptedBlockFactory {
  private static readonly eciesService = new ECIESService();
  private static readonly checksumService = new ChecksumService();

  private static blockConstructors: {
    [key: string]: new (
      type: BlockType,
      dataType: BlockDataType,
      data: Buffer,
      checksum: ChecksumBuffer,
      metadata: EncryptedBlockMetadata,
      canRead: boolean,
      canPersist: boolean,
    ) => EncryptedBlock;
  } = {};

  public static registerBlockType(
    type: BlockType,
    constructor: new (
      type: BlockType,
      dataType: BlockDataType,
      data: Buffer,
      checksum: ChecksumBuffer,
      metadata: EncryptedBlockMetadata,
      canRead: boolean,
      canPersist: boolean,
    ) => EncryptedBlock,
  ): void {
    this.blockConstructors[type] = constructor;
  }

  public static async createBlock(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead = true,
    canPersist = true,
  ): Promise<EncryptedBlock> {
    // Get the constructor for this block type
    const Constructor = this.blockConstructors[type];
    if (!Constructor) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidBlockType,
        type,
      );
    }

    // Calculate the actual data length and metadata
    const payloadLength = (blockSize as number) - ECIES.OVERHEAD_SIZE;

    // Validate data length
    if (data.length < 1) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // Total data length must not exceed block size
    if (data.length > payloadLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
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
    const computedChecksum = this.checksumService.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    // Create metadata with correct length
    const updatedMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      lengthBeforeEncryption ?? data.length,
      false,
      creator,
      dateCreated,
    );

    // If data is already encrypted (starts with 0x04), use it directly
    if (data[0] === ECIES.PUBLIC_KEY_MAGIC) {
      // Create a properly sized buffer
      const finalData = Buffer.alloc(blockSize as number);
      data.copy(finalData);

      return new Constructor(
        type,
        BlockDataType.EncryptedData,
        finalData,
        finalChecksum,
        EncryptedBlockMetadata.fromEphemeralBlockMetadata(updatedMetadata),
        canRead,
        canPersist,
      );
    }

    // Create final data buffer with proper size
    const finalData = Buffer.alloc(blockSize as number);

    // Generate encryption headers
    const ephemeralPublicKey = Buffer.alloc(ECIES.PUBLIC_KEY_LENGTH);
    const keyData = randomBytes(ECIES.PUBLIC_KEY_LENGTH - 1);
    ephemeralPublicKey[0] = ECIES.PUBLIC_KEY_MAGIC; // Set ECIES public key prefix
    keyData.copy(ephemeralPublicKey, 1); // Copy after prefix

    const iv = randomBytes(ECIES.IV_LENGTH);
    const authTag = randomBytes(ECIES.AUTH_TAG_LENGTH);

    // Copy headers to final buffer
    let offset = 0;
    ephemeralPublicKey.copy(finalData, offset);
    offset += ECIES.PUBLIC_KEY_LENGTH;
    iv.copy(finalData, offset);
    offset += ECIES.IV_LENGTH;
    authTag.copy(finalData, offset);
    offset += ECIES.AUTH_TAG_LENGTH;

    // Copy data to payload area
    data.copy(finalData, offset);

    // Create a copy of the data for validation
    const finalDataCopy = Buffer.alloc(blockSize as number);
    finalData.copy(finalDataCopy);

    // Verify the data length matches the block size
    if (finalDataCopy.length !== (blockSize as number)) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
      );
    }

    // Verify the ephemeral public key is valid
    const ephemeralKeyCheck = finalDataCopy.subarray(
      0,
      ECIES.PUBLIC_KEY_LENGTH,
    );
    if (ephemeralKeyCheck[0] !== ECIES.PUBLIC_KEY_MAGIC) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }

    return new Constructor(
      type,
      BlockDataType.EncryptedData,
      finalDataCopy,
      finalChecksum,
      EncryptedBlockMetadata.fromEphemeralBlockMetadata(updatedMetadata),
      canRead,
      canPersist,
    );
  }
}
