import {
  ECIES,
  EmailString,
  Member,
  MemberType,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { initializeBrightChain } from '../init';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
import { EncryptedBlock } from './encrypted';
import { EncryptedBlockFactory } from './encryptedBlockFactory';

// Wrapper class to match factory signature
class TestEncryptedBlock extends EncryptedBlock<Uint8Array> {
  constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Uint8Array,
    checksum: Checksum,
    metadata: EncryptedBlockMetadata<Uint8Array>,
    recipientWithKey: Member<Uint8Array>,
    canRead: boolean,
    canPersist: boolean,
  ) {
    super(
      type,
      dataType,
      data,
      checksum,
      metadata,
      recipientWithKey,
      canRead,
      canPersist,
    );
  }
}

describe('EncryptedBlockFactory', () => {
  let creator: Member<Uint8Array>;
  let checksumService: ChecksumService;

  beforeAll(() => {
    initializeBrightChain();
    ServiceProvider.resetInstance();
    checksumService = ServiceProvider.getInstance().checksumService;
    const eciesService = ServiceProvider.getInstance().eciesService;
    creator = Member.newMember(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    ).member;

    // Register TestEncryptedBlock as the constructor
    EncryptedBlockFactory.registerBlockType(
      BlockType.EncryptedOwnedDataBlock,
      TestEncryptedBlock as unknown as new <TID extends PlatformID>(
        type: BlockType,
        dataType: BlockDataType,
        data: Uint8Array,
        checksum: Checksum,
        metadata: EncryptedBlockMetadata<TID>,
        recipientWithKey: Member<TID>,
        canRead: boolean,
        canPersist: boolean,
      ) => EncryptedBlock,
    );
  });

  describe('registerBlockType', () => {
    it('should register a block type constructor', () => {
      expect(() => {
        EncryptedBlockFactory.registerBlockType(
          BlockType.EncryptedOwnedDataBlock,
          TestEncryptedBlock as unknown as new <TID extends PlatformID>(
            type: BlockType,
            dataType: BlockDataType,
            data: Uint8Array,
            checksum: Checksum,
            metadata: EncryptedBlockMetadata<TID>,
            recipientWithKey: Member<TID>,
            canRead: boolean,
            canPersist: boolean,
          ) => EncryptedBlock,
        );
      }).not.toThrow();
    });
  });

  describe('createBlock', () => {
    it('should create a block with valid data', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      const block = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum,
        creator,
      );

      expect(block).toBeInstanceOf(EncryptedBlock);
      expect(block.blockSize).toBe(blockSize);
      expect(block.blockType).toBe(BlockType.EncryptedOwnedDataBlock);
    });

    it('should throw error for unregistered block type', async () => {
      const data = new Uint8Array(100);
      const checksum = checksumService.calculateChecksum(data);

      await expect(
        EncryptedBlockFactory.createBlock(
          999 as BlockType,
          BlockDataType.RawData,
          BlockSize.Tiny,
          data,
          checksum,
          creator,
        ),
      ).rejects.toThrow(BlockValidationError);
    });

    it('should throw error for data length too short', async () => {
      const data = new Uint8Array(0);
      const checksum = checksumService.calculateChecksum(data);

      await expect(
        EncryptedBlockFactory.createBlock(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.RawData,
          BlockSize.Tiny,
          data,
          checksum,
          creator,
        ),
      ).rejects.toThrow(BlockValidationError);
    });

    it('should throw error for data exceeding capacity', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength + 1);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      await expect(
        EncryptedBlockFactory.createBlock(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.RawData,
          blockSize,
          data,
          checksum,
          creator,
        ),
      ).rejects.toThrow(BlockValidationError);
    });

    it('should throw error for checksum mismatch', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength);
      crypto.getRandomValues(data);
      const wrongChecksum = Checksum.fromUint8Array(new Uint8Array(64));

      await expect(
        EncryptedBlockFactory.createBlock(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.RawData,
          blockSize,
          data,
          wrongChecksum,
          creator,
        ),
      ).rejects.toThrow(ChecksumMismatchError);
    });

    it('should handle already encrypted data', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const data = new Uint8Array(headerSize);

      // Set encryption type
      data[0] = BlockEncryptionType.SingleRecipient;

      // Set recipient ID
      const recipientId = new Uint8Array(creator.idBytes);
      data.set(recipientId.subarray(0, idProvider.byteLength), 1);

      // Fill rest with random data
      crypto.getRandomValues(data.subarray(1 + idProvider.byteLength));

      const checksum = checksumService.calculateChecksum(data);

      const block = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.EncryptedData,
        blockSize,
        data,
        checksum,
        creator,
      );

      expect(block.data[0]).toBe(BlockEncryptionType.SingleRecipient);
    });

    it('should create proper encryption headers for unencrypted data', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      const block = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum,
        creator,
      );

      expect(block.data[0]).toBe(BlockEncryptionType.SingleRecipient);
      expect(block.data.length).toBe(blockSize as number);

      // Verify ephemeral public key is at correct position
      const ephemeralKeyOffset = 1 + idProvider.byteLength;
      expect(block.data[ephemeralKeyOffset]).toBe(ECIES.PUBLIC_KEY_MAGIC);
    });

    it('should validate lengthBeforeEncryption parameter', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      await expect(
        EncryptedBlockFactory.createBlock(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.RawData,
          blockSize,
          data,
          checksum,
          creator,
          undefined,
          payloadLength + 1000,
        ),
      ).rejects.toThrow(BlockValidationError);
    });

    it('should respect canRead and canPersist flags', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      const block = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum,
        creator,
        undefined,
        undefined,
        false,
        false,
      );

      expect(block.canRead).toBe(false);
      expect(block.canPersist).toBe(false);
    });

    it('should validate ephemeral public key after creation', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      const data = new Uint8Array(payloadLength);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      const block = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum,
        creator,
      );

      const ephemeralKeyOffset = 1 + idProvider.byteLength;
      const ephemeralKey = block.data.subarray(
        ephemeralKeyOffset,
        ephemeralKeyOffset + ECIES.PUBLIC_KEY_LENGTH,
      );
      expect(ephemeralKey[0]).toBe(ECIES.PUBLIC_KEY_MAGIC);
    });

    it('should work with different block sizes', async () => {
      const blockSizes = [BlockSize.Tiny, BlockSize.Small, BlockSize.Medium];

      for (const blockSize of blockSizes) {
        const idProvider = ServiceProvider.getInstance().idProvider;
        const headerSize =
          1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
        const payloadLength = (blockSize as number) - headerSize;
        const data = new Uint8Array(payloadLength);

        // Fill with random data in chunks due to 65536 byte limit
        const chunkSize = 65536;
        for (let offset = 0; offset < data.length; offset += chunkSize) {
          const remaining = data.length - offset;
          const currentChunkSize = Math.min(chunkSize, remaining);
          const chunk = data.subarray(offset, offset + currentChunkSize);
          crypto.getRandomValues(chunk);
        }

        const checksum = checksumService.calculateChecksum(data);

        const block = await EncryptedBlockFactory.createBlock(
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.RawData,
          blockSize,
          data,
          checksum,
          creator,
        );

        expect(block.blockSize).toBe(blockSize);
        expect(block.data.length).toBe(blockSize as number);
      }
    });

    it('should set dateCreated when provided', async () => {
      const blockSize = BlockSize.Tiny;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const payloadLength = (blockSize as number) - headerSize;
      // Prepare data with recipient ID as required by EncryptedBlock
      const data = new Uint8Array(payloadLength);
      // Set the first bytes to the creator's idBytes so recipient check passes
      data.set(creator.idBytes, 0);
      if (creator.idBytes.length < payloadLength) {
        // Fill the rest with random data
        crypto.getRandomValues(data.subarray(creator.idBytes.length));
      }
      const checksum = checksumService.calculateChecksum(data);
      const testDate = new Date('2024-01-01');

      const block = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum,
        creator,
        testDate,
      );

      expect(block.dateCreated).toEqual(testDate);
    });
  });
});
