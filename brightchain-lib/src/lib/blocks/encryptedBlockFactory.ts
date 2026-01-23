import { ECIES, Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { randomBytes } from '../browserCrypto';
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
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
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
      checksum: Checksum,
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
      checksum: Checksum,
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
    checksum: Checksum,
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

    // Get ID provider to calculate header size
    const idProvider = ServiceProvider.getInstance<TID>().idProvider;

    // Calculate the actual payload capacity
    // Header = 1 byte (encryption type) + idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE
    const headerSize =
      1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
    const payloadLength = (blockSize as number) - headerSize;

    // Validate data length
    if (data.length < 1) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // Total data length must not exceed available payload capacity
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

    // Compare checksums using Checksum.equals()
    if (!computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
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

    // Create final data buffer with proper size
    const finalData = new Uint8Array(blockSize as number);

    // If data is already encrypted (starts with BlockEncryptionType), use it directly
    if (
      data[0] === BlockEncryptionType.SingleRecipient ||
      data[0] === BlockEncryptionType.MultiRecipient
    ) {
      finalData.set(data);

      return new Constructor<TID>(
        type,
        BlockDataType.EncryptedData,
        finalData,
        finalChecksum,
        EncryptedBlockMetadata.fromEphemeralBlockMetadata<TID>(
          updatedMetadata,
          data[0] as BlockEncryptionType,
          1,
        ),
        creator,
        canRead,
        canPersist,
      );
    }

    // Generate encryption headers for unencrypted data
    let offset = 0;

    // Set encryption type byte
    finalData[offset] = BlockEncryptionType.SingleRecipient;
    offset += 1;

    // Set recipient ID
    const recipientId = new Uint8Array(creator.idBytes);
    finalData.set(recipientId.subarray(0, idProvider.byteLength), offset);
    offset += idProvider.byteLength;

    // Generate ECIES WITH_LENGTH header components
    const ephemeralPublicKey = new Uint8Array(ECIES.PUBLIC_KEY_LENGTH);
    const keyData = randomBytes(ECIES.PUBLIC_KEY_LENGTH - 1);
    ephemeralPublicKey[0] = ECIES.PUBLIC_KEY_MAGIC;
    ephemeralPublicKey.set(keyData, 1);

    const iv = randomBytes(ECIES.IV_SIZE);
    const authTag = randomBytes(ECIES.AUTH_TAG_SIZE);

    // Copy ECIES headers to final buffer
    finalData.set(ephemeralPublicKey, offset);
    offset += ECIES.PUBLIC_KEY_LENGTH;
    finalData.set(iv, offset);
    offset += ECIES.IV_SIZE;
    finalData.set(authTag, offset);
    offset += ECIES.AUTH_TAG_SIZE;

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
    const ephemeralKeyOffset = 1 + idProvider.byteLength;
    const ephemeralKeyCheck = finalDataCopy.subarray(
      ephemeralKeyOffset,
      ephemeralKeyOffset + ECIES.PUBLIC_KEY_LENGTH,
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
