import {
  arraysEqual,
  EmailString,
  Member,
  MemberType,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { ECIES, ENCRYPTION } from '../constants';
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

class TestEncryptedBlock extends EncryptedBlock<Uint8Array> {
  public static override async from<TID extends PlatformID = Uint8Array>(
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
  ): Promise<EncryptedBlock<TID>> {
    // Validate data length
    if (data.length < ECIES.OVERHEAD_SIZE) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // Calculate and validate checksum
    const computedChecksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(data);
    if (
      !arraysEqual(computedChecksum.toUint8Array(), checksum.toUint8Array())
    ) {
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

    return new EncryptedBlock<TID>(
      type,
      dataType,
      data,
      checksum,
      metadata as EncryptedBlockMetadata<TID>,
      creator,
      canRead,
      canPersist,
    );
  }
}

describe('EncryptedBlock', () => {
  let creator: Member<Uint8Array>;
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Message;
  const testDate = new Date(Date.now() - 1000);

  beforeAll(() => {
    // Initialize BrightChain with browser-compatible configuration first
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeBrightChain } = require('../init');
    initializeBrightChain();

    // Reset service provider to ensure we use the correct configuration
    ServiceProvider.resetInstance();
    checksumService = ServiceProvider.getInstance().checksumService;
    const eciesService = ServiceProvider.getInstance().eciesService;
    creator = Member.newMember(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    ).member;
  });

  const createEncryptedData = async (size: number): Promise<Uint8Array> => {
    // Create actual encrypted data with proper structure
    const eciesService = ServiceProvider.getInstance().eciesService;
    const publicKey = new Uint8Array(creator.publicKey);

    // Calculate how much space we have for the actual encrypted payload
    // Size = 1 byte (encryption type) + 16 bytes (recipient ID) + ECIES encrypted data + padding
    const headerSize =
      ENCRYPTION.ENCRYPTION_TYPE_SIZE + ENCRYPTION.RECIPIENT_ID_SIZE;
    const availableSpace = size - headerSize;

    // Create plaintext that will fit after encryption
    // ECIES overhead is about 64 bytes, so we need to account for that
    const plaintextSize = Math.max(1, availableSpace - ECIES.OVERHEAD_SIZE);
    const plainData = new Uint8Array(plaintextSize);
    crypto.getRandomValues(plainData);

    // Encrypt the data
    const encrypted = await eciesService.encryptSimpleOrSingle(
      true,
      publicKey,
      plainData,
    );

    // Create the final array with proper structure
    const finalArray = new Uint8Array(size); // Start with zeros
    crypto.getRandomValues(finalArray); // Fill with random data for padding

    // Write the encryption type as first byte
    finalArray[0] = BlockEncryptionType.SingleRecipient;

    // Write the recipient ID (creator's GUID)
    const creatorGuidBuffer = new Uint8Array(creator.idBytes);
    console.log(
      'Creator GUID size:',
      creatorGuidBuffer.length,
      'Expected:',
      ENCRYPTION.RECIPIENT_ID_SIZE,
    );
    const copyLength = Math.min(
      creatorGuidBuffer.length,
      ENCRYPTION.RECIPIENT_ID_SIZE,
    );
    finalArray.set(
      creatorGuidBuffer.subarray(0, copyLength),
      ENCRYPTION.ENCRYPTION_TYPE_SIZE,
    );

    // Copy the encrypted data after the header
    const encryptedCopyLength = Math.min(encrypted.length, availableSpace);
    finalArray.set(encrypted.subarray(0, encryptedCopyLength), headerSize);

    return finalArray;
  };

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
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
      const tooShortData = new Uint8Array(ECIES.OVERHEAD_SIZE - 1);
      crypto.getRandomValues(tooShortData);

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

      const corruptedData = new Uint8Array(data);
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
