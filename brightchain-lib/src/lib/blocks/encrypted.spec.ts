import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES, ENCRYPTION } from '../constants';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumService } from '../services/checksum.service';
import { ChecksumUint8Array } from '../types';
import { EncryptedBlock } from './encrypted';
import { EmailString } from '@digitaldefiance/ecies-lib';

class TestEncryptedBlock extends EncryptedBlock {
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumUint8Array,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead = true,
    canPersist = true,
  ): Promise<TestEncryptedBlock> {
    // Validate data length
    if (data.length < ECIES.OVERHEAD_SIZE) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // Calculate and validate checksum
    const computedChecksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(data);
    if (!Buffer.from(computedChecksum).equals(Buffer.from(checksum))) {
      throw new ChecksumMismatchError(computedChecksum, checksum);
    }

    const ephemeralMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      lengthBeforeEncryption ?? data.length,
      creator,
      dateCreated ?? new Date(),
    );

    const metadata = EncryptedBlockMetadata.fromEphemeralBlockMetadata(
      ephemeralMetadata,
      BlockEncryptionType.SingleRecipient,
      1,
    );

    return new TestEncryptedBlock(
      type,
      dataType,
      data,
      checksum,
      metadata,
      creator,
      canRead,
      canPersist,
    );
  }
}

describe('EncryptedBlock', () => {
  let creator: BrightChainMember;
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Message;
  const testDate = new Date(Date.now() - 1000);

  beforeAll(() => {
    // Reset service provider to ensure we use the correct configuration
    ServiceProvider.resetInstance();
    checksumService = ServiceProvider.getInstance().checksumService;
    const eciesService = ServiceProvider.getInstance().eciesService;
    creator = BrightChainMember.newMember(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    ).member;
  });

  const createEncryptedData = async (size: number): Promise<Buffer> => {
    // Create actual encrypted data with proper structure
    const eciesService = ServiceProvider.getInstance().eciesService;
    const publicKey = Buffer.from(creator.publicKey);
    
    // Calculate how much space we have for the actual encrypted payload
    // Size = 1 byte (encryption type) + 16 bytes (recipient ID) + ECIES encrypted data + padding
    const headerSize = ENCRYPTION.ENCRYPTION_TYPE_SIZE + ENCRYPTION.RECIPIENT_ID_SIZE;
    const availableSpace = size - headerSize;
    
    // Create plaintext that will fit after encryption
    // ECIES overhead is about 64 bytes, so we need to account for that
    const plaintextSize = Math.max(1, availableSpace - ECIES.OVERHEAD_SIZE);
    const plainData = randomBytes(plaintextSize);
    
    // Encrypt the data
    const encrypted = await eciesService.encryptSimpleOrSingle(
      true,
      publicKey,
      plainData,
    );
    
    // Create the final buffer with proper structure
    const finalBuffer = randomBytes(size); // Start with random data for padding
    
    // Write the encryption type as first byte
    finalBuffer.writeUInt8(BlockEncryptionType.SingleRecipient, 0);
    
    // Write the recipient ID (creator's GUID)
    const creatorGuidBuffer = Buffer.from(creator.guidId.asRawGuidBuffer);
    console.log('Creator GUID size:', creatorGuidBuffer.length, 'Expected:', ENCRYPTION.RECIPIENT_ID_SIZE);
    creatorGuidBuffer.copy(
      finalBuffer,
      ENCRYPTION.ENCRYPTION_TYPE_SIZE,
      0,
      Math.min(creatorGuidBuffer.length, ENCRYPTION.RECIPIENT_ID_SIZE),
    );
    
    // Copy the encrypted data after the header
    encrypted.copy(
      finalBuffer,
      headerSize,
      0,
      Math.min(encrypted.length, availableSpace),
    );
    
    return finalBuffer;
  };

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      // TODO: This test is failing due to GUID validation issues in the ecies-lib
      // The test creates encrypted data with proper structure but GuidV4 constructor
      // is rejecting the 16-byte GUID. This needs investigation in the ecies-lib.
      const data = await createEncryptedData(defaultBlockSize as number);
      const checksum = checksumService.calculateChecksum(data);

      const block = await TestEncryptedBlock.from(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.EncryptedData,
        defaultBlockSize,
        data,
        checksum,
        creator,
        testDate,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.EncryptedOwnedDataBlock);
      expect(block.blockDataType).toBe(BlockDataType.EncryptedData);
      expect(block.data.length).toBe(defaultBlockSize as number);
    });

    it('should reject invalid sizes', async () => {
      const tooShortData = randomBytes(ECIES.OVERHEAD_SIZE - 1);

      await expect(
        TestEncryptedBlock.from(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.EncryptedData,
          defaultBlockSize,
          tooShortData,
          checksumService.calculateChecksum(tooShortData),
          creator,
        ),
      ).rejects.toThrow(BlockValidationError);
    });

    it('should detect data corruption', async () => {
      const data = await createEncryptedData(defaultBlockSize as number);
      const checksum = checksumService.calculateChecksum(data);

      const corruptedData = Buffer.from(data);
      corruptedData[0]++;

      await expect(
        TestEncryptedBlock.from(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.EncryptedData,
          defaultBlockSize,
          corruptedData,
          checksum,
          creator,
        ),
      ).rejects.toThrow(ChecksumMismatchError);
    });
  });
});
