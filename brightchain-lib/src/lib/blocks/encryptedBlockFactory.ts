import {
  ChecksumUint8Array,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { randomBytes } from '../browserCrypto';
import { ECIES } from '../constants';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ChecksumService } from '../services/checksum.service';
import { EncryptedBlock } from './encrypted';

import { createECIESService } from '../browserConfig';

export class EncryptedBlockFactory {
  private static readonly eciesService = createECIESService();
  private static readonly checksumService = new ChecksumService();

  private static blockConstructors: {
    [key: string]: new <TID extends PlatformID = Uint8Array>(
      type: BlockType,
      dataType: BlockDataType,
      data: Uint8Array,
      checksum: ChecksumUint8Array,
      metadata: EncryptedBlockMetadata<TID>,
      recipientWithKey: Member<TID>,
      canRead: boolean,
      canPersist: boolean,
    ) => EncryptedBlock;
  } = {};

  public static registerBlockType(
    type: BlockType,
    constructor: new <TID extends PlatformID = Uint8Array>(
      type: BlockType,
      dataType: BlockDataType,
      data: Uint8Array,
      checksum: ChecksumUint8Array,
      metadata: EncryptedBlockMetadata<TID>,
      recipientWithKey: Member<TID>,
      canRead: boolean,
      canPersist: boolean,
    ) => EncryptedBlock,
  ): void {
    this.blockConstructors[type] = constructor;
  }

  public static async createBlock<TID extends PlatformID = Uint8Array>(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Uint8Array,
    checksum: ChecksumUint8Array,
    creator: Member<TID>,
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

    // Compare checksums using array comparison
    if (computedChecksum.length !== checksum.length) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    
    for (let i = 0; i < computedChecksum.length; i++) {
      if (computedChecksum[i] !== checksum[i]) {
        throw new ChecksumMismatchError(checksum, computedChecksum);
      }
    }
    const finalChecksum = checksum ?? computedChecksum;

    // Create metadata with correct length
    const updatedMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      lengthBeforeEncryption ?? data.length,
      creator,
      dateCreated,
    );

    // If data is already encrypted (starts with 0x04), use it directly
    if (data[0] === ECIES.PUBLIC_KEY_MAGIC) {
      // Create a properly sized buffer
      const finalData = new Uint8Array(blockSize as number);
      finalData.set(data);

      return new Constructor<TID>(
        type,
        BlockDataType.EncryptedData,
        finalData,
        finalChecksum,
        EncryptedBlockMetadata.fromEphemeralBlockMetadata<TID>(
          updatedMetadata,
          BlockEncryptionType.SingleRecipient,
          1,
        ),
        creator,
        canRead,
        canPersist,
      );
    }

    // Create final data buffer with proper size
    const finalData = new Uint8Array(blockSize as number);

    // Generate encryption headers
    const ephemeralPublicKey = new Uint8Array(ECIES.PUBLIC_KEY_LENGTH);
    const keyData = randomBytes(ECIES.PUBLIC_KEY_LENGTH - 1);
    ephemeralPublicKey[0] = ECIES.PUBLIC_KEY_MAGIC; // Set ECIES public key prefix
    ephemeralPublicKey.set(keyData, 1); // Copy after prefix

    const iv = randomBytes(ECIES.IV_LENGTH);
    const authTag = randomBytes(ECIES.AUTH_TAG_LENGTH);

    // Copy headers to final buffer
    let offset = 0;
    finalData.set(ephemeralPublicKey, offset);
    offset += ECIES.PUBLIC_KEY_LENGTH;
    finalData.set(iv, offset);
    offset += ECIES.IV_LENGTH;
    finalData.set(authTag, offset);
    offset += ECIES.AUTH_TAG_LENGTH;

    // Copy data to payload area
    finalData.set(data, offset);

    // Create a copy of the data for validation
    const finalDataCopy = new Uint8Array(blockSize as number);
    finalDataCopy.set(finalData);

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

    return new Constructor<TID>(
      type,
      BlockDataType.EncryptedData,
      finalDataCopy,
      finalChecksum,
      EncryptedBlockMetadata.fromEphemeralBlockMetadata<TID>(
        updatedMetadata,
        BlockEncryptionType.SingleRecipient,
        1,
      ),
      creator,
      canRead,
      canPersist,
    );
  }
}
