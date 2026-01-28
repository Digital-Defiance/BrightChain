import {
  arraysEqual,
  ECIES,
  EmailString,
  Member,
  MemberType,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import {
  calculateECIESMultipleRecipientOverhead,
  calculateSingleRecipientOverhead,
} from '../browserConfig';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { initializeBrightChain } from '../init';
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
    if (data.length < ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE) {
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
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    const idProvider = serviceProvider.idProvider;
    const publicKey = new Uint8Array(creator.publicKey);

    // Get the actual recipient ID size from the idProvider (16 for GUID, 12 for ObjectID)
    const recipientIdSize = idProvider.byteLength;

    // Calculate how much space we have for the actual encrypted payload
    // Size = 1 byte (encryption type) + recipientIdSize bytes (recipient ID) + ECIES encrypted data + padding
    const headerSize = ECIES.ENCRYPTION_TYPE_SIZE + recipientIdSize;
    const availableSpace = size - headerSize;

    // Create plaintext that will fit after encryption
    // ECIES WITH_LENGTH overhead is 72 bytes, so we need to account for that
    const plaintextSize = Math.max(
      1,
      availableSpace - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE,
    );
    const plainData = new Uint8Array(plaintextSize);

    // crypto.getRandomValues has a 65536 byte limit, so fill in chunks
    const chunkSize = 65536;
    for (let offset = 0; offset < plainData.length; offset += chunkSize) {
      const remaining = plainData.length - offset;
      const currentChunkSize = Math.min(chunkSize, remaining);
      const chunk = plainData.subarray(offset, offset + currentChunkSize);
      crypto.getRandomValues(chunk);
    }

    // Encrypt the data
    const encrypted = await eciesService.encryptBasic(publicKey, plainData);

    // Create the final array with proper structure
    const finalArray = new Uint8Array(size);

    // Fill with random data for padding (in chunks due to 65536 byte limit)
    for (let offset = 0; offset < finalArray.length; offset += chunkSize) {
      const remaining = finalArray.length - offset;
      const currentChunkSize = Math.min(chunkSize, remaining);
      const chunk = finalArray.subarray(offset, offset + currentChunkSize);
      crypto.getRandomValues(chunk);
    }

    // Write the encryption type as first byte
    finalArray[0] = BlockEncryptionType.SingleRecipient;

    // Write the recipient ID (creator's GUID)
    const creatorGuidBuffer = new Uint8Array(creator.idBytes);
    finalArray.set(
      creatorGuidBuffer.subarray(0, recipientIdSize),
      ECIES.ENCRYPTION_TYPE_SIZE,
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
      const tooShortData = new Uint8Array(
        ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE - 1,
      );
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

  describe('header and capacity calculations', () => {
    it('should use correct recipient ID size from idProvider (16 for GUID)', () => {
      const serviceProvider = ServiceProvider.getInstance();
      const idProvider = serviceProvider.idProvider;

      // BrightChain uses GuidV4Provider which has 16-byte IDs
      expect(idProvider.byteLength).toBe(16);
    });

    it('should calculate single-recipient overhead correctly', () => {
      const serviceProvider = ServiceProvider.getInstance();
      const idSize = serviceProvider.idProvider.byteLength;

      // Single-recipient overhead = idSize + 72 (WITH_LENGTH format)
      const overhead = calculateSingleRecipientOverhead(idSize);
      expect(overhead).toBe(idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE);
      expect(overhead).toBe(16 + 72); // 88 bytes for GUID
    });

    it('should calculate multi-recipient overhead correctly', () => {
      const serviceProvider = ServiceProvider.getInstance();
      const idSize = serviceProvider.idProvider.byteLength;

      // Multi-recipient overhead = 74 + (recipientCount * (idSize + 60))
      const recipientCount = 3;
      const overhead = calculateECIESMultipleRecipientOverhead(
        recipientCount,
        true,
        idSize,
      );

      const expectedOverhead = 74 + recipientCount * (idSize + 60);
      expect(overhead).toBe(expectedOverhead);
      expect(overhead).toBe(74 + 3 * (16 + 60)); // 74 + 228 = 302 bytes
    });

    it('should have correct ECIES constants', () => {
      // Verify the constants used in overhead calculations
      expect(ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE).toBe(72);
      expect(ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE).toBe(64);
      expect(ECIES.MULTIPLE.DATA_LENGTH_SIZE).toBe(8);
      expect(ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE).toBe(2);
      expect(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE).toBe(60);
      expect(ECIES.PUBLIC_KEY_LENGTH).toBe(33);
      expect(ECIES.IV_SIZE).toBe(12);
      expect(ECIES.AUTH_TAG_SIZE).toBe(16);
    });

    it('should work with all standard block sizes', async () => {
      const blockSizes = [
        BlockSize.Message,
        BlockSize.Tiny,
        BlockSize.Small,
        BlockSize.Medium,
        BlockSize.Large,
      ];

      for (const blockSize of blockSizes) {
        const data = await createEncryptedData(blockSize as number);
        const checksum = checksumService.calculateChecksum(data);

        const block = await TestEncryptedBlock.from(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.EncryptedData,
          blockSize,
          data,
          checksum,
          creator,
          testDate,
        );

        expect(block.blockSize).toBe(blockSize);
        expect(block.data.length).toBe(blockSize as number);
      }
    });
  });

  describe('data alignment and integrity', () => {
    it('should preserve data alignment across encryption', async () => {
      const serviceProvider = ServiceProvider.getInstance();
      const idProvider = serviceProvider.idProvider;
      const recipientIdSize = idProvider.byteLength;

      const data = await createEncryptedData(defaultBlockSize as number);

      // Verify header structure
      // Byte 0: encryption type
      expect(data[0]).toBe(BlockEncryptionType.SingleRecipient);

      // Bytes 1 to recipientIdSize: recipient ID
      const recipientId = data.slice(
        ECIES.ENCRYPTION_TYPE_SIZE,
        ECIES.ENCRYPTION_TYPE_SIZE + recipientIdSize,
      );
      expect(recipientId.length).toBe(recipientIdSize);

      // Verify recipient ID matches creator's ID
      const creatorIdBytes = new Uint8Array(creator.idBytes);
      expect(
        arraysEqual(recipientId, creatorIdBytes.subarray(0, recipientIdSize)),
      ).toBe(true);
    });

    it('should not corrupt data during block creation', async () => {
      const data = await createEncryptedData(defaultBlockSize as number);
      const originalData = new Uint8Array(data);
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

      // Verify data wasn't modified
      expect(arraysEqual(block.data, originalData)).toBe(true);
    });

    it('should accept data at minimum valid encrypted size', async () => {
      const serviceProvider = ServiceProvider.getInstance();
      const idProvider = serviceProvider.idProvider;
      const recipientIdSize = idProvider.byteLength;

      // Minimum size is ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE (72 bytes)
      const minSize = ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const data = new Uint8Array(minSize);
      crypto.getRandomValues(data);

      // Set a valid encryption type byte at the start
      data[0] = BlockEncryptionType.SingleRecipient;

      // Set a valid recipient ID (creator's GUID) after the encryption type
      const creatorGuidBuffer = new Uint8Array(creator.idBytes);
      data.set(
        creatorGuidBuffer.subarray(
          0,
          Math.min(recipientIdSize, minSize - ECIES.ENCRYPTION_TYPE_SIZE),
        ),
        ECIES.ENCRYPTION_TYPE_SIZE,
      );

      const checksum = checksumService.calculateChecksum(data);

      // This should succeed since it meets minimum size requirement
      // The test verifies that data >= ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE is accepted
      await expect(
        TestEncryptedBlock.from(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.EncryptedData,
          defaultBlockSize,
          data,
          checksum,
          creator,
          testDate,
          minSize,
        ),
      ).resolves.toBeDefined();
    });

    it('should reject data below minimum encrypted size', async () => {
      // Data smaller than ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE should be rejected
      const tooSmallSize = ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE - 1;
      const data = new Uint8Array(tooSmallSize);
      crypto.getRandomValues(data);
      data[0] = BlockEncryptionType.SingleRecipient;

      const checksum = checksumService.calculateChecksum(data);

      await expect(
        TestEncryptedBlock.from(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.EncryptedData,
          defaultBlockSize,
          data,
          checksum,
          creator,
          testDate,
        ),
      ).rejects.toThrow(BlockValidationError);
    });
  });
});
