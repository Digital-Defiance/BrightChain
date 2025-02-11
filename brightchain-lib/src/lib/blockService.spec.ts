import { BaseBlock } from './blocks/base';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { OwnedDataBlock } from './blocks/ownedData';
import { BlockService } from './blockService';
import { BrightChainMember } from './brightChainMember';
import { TUPLE_SIZE } from './constants';
import { EmailString } from './emailString';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockServiceErrorType } from './enumerations/blockServiceErrorType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { MemberType } from './enumerations/memberType';
import { BlockServiceError } from './errors/blockServiceError';
import { IMemberWithMnemonic } from './interfaces/memberWithMnemonic';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { DiskBlockAsyncStore } from './stores/diskBlockAsyncStore';

describe('BlockService', () => {
  describe('getBlockSizeForData', () => {
    it('should return Message size for small data', () => {
      expect(BlockService.getBlockSizeForData(400)).toBe(BlockSize.Message);
    });

    it('should return Tiny size for slightly larger data', () => {
      expect(BlockService.getBlockSizeForData(900)).toBe(BlockSize.Tiny);
    });

    it('should return Small size for medium data', () => {
      expect(BlockService.getBlockSizeForData(3900)).toBe(BlockSize.Small);
    });

    it('should return Medium size for larger data', () => {
      expect(BlockService.getBlockSizeForData(1048400)).toBe(BlockSize.Medium);
    });

    it('should return Large size for very large data', () => {
      expect(BlockService.getBlockSizeForData(67108700)).toBe(BlockSize.Large);
    });

    it('should return Huge size for extremely large data', () => {
      expect(BlockService.getBlockSizeForData(268435400)).toBe(BlockSize.Huge);
    });

    it('should return Unknown for data exceeding maximum size', () => {
      expect(BlockService.getBlockSizeForData(268435500)).toBe(
        BlockSize.Unknown,
      );
    });

    it('should return Unknown for negative sizes', () => {
      expect(BlockService.getBlockSizeForData(-50)).toBe(BlockSize.Unknown);
    });
  });

  describe('File Operations', () => {
    describe('breakFileIntoBlocks', () => {
      it('should break file into blocks of specified size', () => {
        const fileData = Buffer.from('HelloWorld'); // 10 bytes
        const blocks = BlockService.breakFileIntoBlocks(
          fileData,
          BlockSize.Message,
        );

        expect(blocks.length).toBe(1);
        expect(blocks[0].toString()).toBe('HelloWorld');
      });

      it('should handle file larger than block size', () => {
        const blockSize = BlockSize.Message;
        const fileData = Buffer.alloc(blockSize * 2 + 100); // Create data larger than 2 full blocks
        fileData.fill('x');

        const blocks = BlockService.breakFileIntoBlocks(fileData, blockSize);

        // Should split into 3 blocks
        expect(blocks.length).toBe(3);
        // Each block except last should be full block size
        expect(blocks[0].length).toBe(blockSize);
        expect(blocks[1].length).toBe(blockSize);
        expect(blocks[2].length).toBe(100);
      });

      it('should handle empty file', () => {
        const fileData = Buffer.from('');
        const blocks = BlockService.breakFileIntoBlocks(
          fileData,
          BlockSize.Message,
        );

        expect(blocks.length).toBe(0);
      });
    });

    describe('XOR Operations', () => {
      describe('xorBlockWithWhiteners', () => {
        it('should XOR a single block with all whiteners', () => {
          const block = Buffer.from([1, 2, 3]);
          const whiteners = [Buffer.from([10, 20, 30]), Buffer.from([5, 7, 9])];

          const result = BlockService.xorBlockWithWhiteners(block, whiteners);

          // XOR results: 1^10^5=14, 2^20^7=17, 3^30^9=20
          expect(result).toEqual(Buffer.from([14, 17, 20]));
        });

        it('should throw error when no whiteners provided', () => {
          const block = Buffer.from([1, 2, 3]);
          const whiteners: Buffer[] = [];

          expect(() => {
            BlockService.xorBlockWithWhiteners(block, whiteners);
          }).toThrow(
            new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided),
          );
        });
      });

      describe('xorBlocksWithWhitenersRoundRobin', () => {
        it('should XOR blocks with whiteners in round-robin fashion', () => {
          const blocks = [
            Buffer.from([1, 1]),
            Buffer.from([2, 2]),
            Buffer.from([3, 3]),
          ];
          const whiteners = [Buffer.from([10, 10]), Buffer.from([20, 20])];

          const result = BlockService.xorBlocksWithWhitenersRoundRobin(
            blocks,
            whiteners,
          );

          // First block XORed with first whitener
          expect(result[0]).toEqual(Buffer.from([11, 11]));
          // Second block XORed with second whitener
          expect(result[1]).toEqual(Buffer.from([22, 22]));
          // Third block XORed with first whitener again
          expect(result[2]).toEqual(Buffer.from([9, 9]));
        });

        it('should throw error when no whiteners provided', () => {
          const blocks = [Buffer.from([1, 2, 3])];
          const whiteners: Buffer[] = [];

          expect(() => {
            BlockService.xorBlocksWithWhitenersRoundRobin(blocks, whiteners);
          }).toThrow(
            new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided),
          );
        });
      });
    });
  });

  describe('Encryption Operations', () => {
    let testMember: IMemberWithMnemonic;
    let testData: Buffer;
    let testBlock: OwnedDataBlock;

    beforeEach(async () => {
      // Create a test member
      testMember = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Create test data large enough for encryption
      testData = Buffer.alloc(256); // Smaller size to accommodate encryption overhead
      testData.fill('x');
      const checksum = StaticHelpersChecksum.calculateChecksum(testData);

      testBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        BlockSize.Small, // Use larger block size to accommodate encryption overhead
        testData,
        checksum,
        testMember.member,
      );
    });

    describe('encrypt', () => {
      it('should encrypt a block using ECIES', async () => {
        const encryptedBlock = await BlockService.encrypt(
          testMember.member,
          testBlock,
        );

        // Verify the encrypted block has the expected properties
        expect(encryptedBlock.blockSize).toBe(testBlock.blockSize);
        expect(encryptedBlock.creator).toBeDefined();
        expect((encryptedBlock.creator as BrightChainMember).id).toEqual(
          testMember.member.id,
        );
        expect(encryptedBlock.canDecrypt).toBe(true);

        // Verify the data is actually encrypted (different from original)
        expect(encryptedBlock.data).not.toEqual(testData);
        expect(encryptedBlock.data.length).toBeGreaterThan(testData.length); // Due to encryption overhead
      });
    });

    describe('decrypt', () => {
      it('should decrypt an encrypted block back to original data', async () => {
        // First encrypt the block
        const encryptedBlock = await BlockService.encrypt(
          testMember.member,
          testBlock,
        );

        // Then decrypt it
        const decryptedBlock = await BlockService.decrypt(
          testMember.member,
          encryptedBlock,
        );

        // Verify the decrypted data matches the original
        expect(decryptedBlock.data).toEqual(testData);
        expect(decryptedBlock.blockSize).toBe(testBlock.blockSize);
        expect(decryptedBlock.creator).toBeDefined();
        expect((decryptedBlock.creator as BrightChainMember).id).toEqual(
          testMember.member.id,
        );
      });

      it('should maintain data integrity through encrypt/decrypt cycle', async () => {
        const encryptedBlock = await BlockService.encrypt(
          testMember.member,
          testBlock,
        );
        const decryptedBlock = await BlockService.decrypt(
          testMember.member,
          encryptedBlock,
        );

        // Compare checksums to verify data integrity
        const originalChecksum =
          StaticHelpersChecksum.calculateChecksum(testData);
        const decryptedChecksum = StaticHelpersChecksum.calculateChecksum(
          decryptedBlock.data,
        );

        expect(decryptedChecksum).toEqual(originalChecksum);
      });
    });
  });

  describe('Block Creation', () => {
    let testMember: IMemberWithMnemonic;
    let testData: Buffer;

    beforeEach(() => {
      testMember = BrightChainMember.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      testData = Buffer.from('Test block data');
    });

    describe('createBlock', () => {
      it('should create a base block', async () => {
        const block = await BlockService.createBlock(
          BlockSize.Message,
          BlockType.RawData,
          BlockDataType.RawData,
          testData,
        );

        expect(block.blockSize).toBe(BlockSize.Message);
        expect(block.blockType).toBe(BlockType.RawData);
        expect(block.data).toEqual(testData);
      });

      it('should create an owned data block with creator', async () => {
        const block = await BlockService.createBlock(
          BlockSize.Message,
          BlockType.OwnedDataBlock,
          BlockDataType.RawData,
          testData,
          testMember.member,
        );

        expect(block.blockSize).toBe(BlockSize.Message);
        expect(block.blockType).toBe(BlockType.OwnedDataBlock);
        expect(block.data).toEqual(testData);
        expect((block as OwnedDataBlock).creator).toBeDefined();
        expect(
          ((block as OwnedDataBlock).creator as BrightChainMember).id,
        ).toEqual(testMember.member.id);
      });

      it('should throw error when data is empty', async () => {
        const emptyData = Buffer.from('');

        await expect(
          BlockService.createBlock(
            BlockSize.Message,
            BlockType.RawData,
            BlockDataType.RawData,
            emptyData,
          ),
        ).rejects.toThrow('Data cannot be empty');
      });

      it('should throw error when data exceeds block size', async () => {
        const largeData = Buffer.alloc(BlockSize.Message + 1, 'x');

        await expect(
          BlockService.createBlock(
            BlockSize.Message,
            BlockType.RawData,
            BlockDataType.RawData,
            largeData,
          ),
        ).rejects.toThrow(
          'Block validation failed: Data length exceeds block capacity',
        );
      });

      it('should create encrypted block when data type is encrypted', async () => {
        // Create test data small enough to fit in a Small block with encryption overhead
        const testDataSize = BlockSize.Small - 200; // Leave room for encryption overhead
        const testData = Buffer.alloc(testDataSize);
        testData.fill('x');

        const block = await BlockService.createBlock(
          BlockSize.Small, // Use larger block size to accommodate encryption overhead
          BlockType.EncryptedOwnedDataBlock,
          BlockDataType.EncryptedData,
          testData,
          testMember.member,
        );

        expect(block.blockType).toBe(BlockType.EncryptedOwnedDataBlock);
        expect(block.blockDataType).toBe(BlockDataType.EncryptedData);
        expect(block.data).not.toEqual(testData); // Data should be encrypted
      });
    });

    describe('CBL Operations', () => {
      let blocks: BaseBlock[];

      beforeEach(async () => {
        // Create blocks in multiples of TUPLE_SIZE (3)
        const blockCount = TUPLE_SIZE; // Match TUPLE_SIZE from constants.ts
        blocks = await Promise.all(
          Array(blockCount)
            .fill(null)
            .map(async (_, i) => {
              const data = Buffer.from(`Block ${i} data`);
              const checksum = StaticHelpersChecksum.calculateChecksum(data);
              return OwnedDataBlock.from(
                BlockType.OwnedDataBlock,
                BlockDataType.RawData,
                BlockSize.Message,
                data,
                checksum,
                testMember.member,
              );
            }),
        );
      });

      it('should create and store CBL', async () => {
        const cbl = await BlockService.createAndStoreCBL(
          blocks,
          testMember.member,
          BigInt(
            blocks.reduce((sum, block) => {
              const data = block.data;
              return sum + (Buffer.isBuffer(data) ? data.length : 0);
            }, 0),
          ),
        );

        expect(cbl.blockType).toBe(BlockType.ConstituentBlockList);
        expect(cbl.creator).toBeDefined();
        expect((cbl.creator as BrightChainMember).id).toEqual(
          testMember.member.id,
        );
        expect(cbl.blockSize).toBe(BlockSize.Huge);
      });

      it('should throw error when blocks array is empty', async () => {
        await expect(
          BlockService.createAndStoreCBL([], testMember.member, BigInt(0)),
        ).rejects.toThrow(
          new BlockServiceError(BlockServiceErrorType.EmptyBlocksArray),
        );
      });

      it('should throw error when block sizes mismatch', async () => {
        // Create a block with different size
        const differentSizeBlock = await OwnedDataBlock.from(
          BlockType.OwnedDataBlock,
          BlockDataType.RawData,
          BlockSize.Small, // Different size
          Buffer.from('Different size block'),
          StaticHelpersChecksum.calculateChecksum(
            Buffer.from('Different size block'),
          ),
          testMember.member,
        );

        await expect(
          BlockService.createAndStoreCBL(
            [...blocks, differentSizeBlock],
            testMember.member,
            BigInt(1000),
          ),
        ).rejects.toThrow(
          new BlockServiceError(BlockServiceErrorType.BlockSizeMismatch),
        );
      });

      it('should store CBL to disk', async () => {
        // Create a mock store
        class MockDiskBlockAsyncStore extends DiskBlockAsyncStore {
          constructor() {
            super('/mock/path', BlockSize.Message);
          }

          override setData = jest.fn();
          override getData = jest.fn();
          override has = jest.fn();
          override get = jest.fn();
          override xor = jest.fn();
        }

        const mockStore = new MockDiskBlockAsyncStore();

        const cbl = await BlockService.createAndStoreCBL(
          blocks,
          testMember.member,
          BigInt(
            blocks.reduce((sum, block) => {
              const data = block.data;
              return sum + (Buffer.isBuffer(data) ? data.length : 0);
            }, 0),
          ),
        );

        await BlockService.storeCBLToDisk(cbl, mockStore);

        // Verify store was called with raw data block
        expect(mockStore.setData).toHaveBeenCalled();
        const storedBlock = (mockStore.setData as jest.Mock).mock.calls[0][0];
        expect(storedBlock.blockType).toBe(BlockType.RawData);
        expect(storedBlock.data).toEqual(cbl.data);
      });
    });

    describe('Error Cases', () => {
      it('should throw error when trying to encrypt non-encryptable block', async () => {
        const nonEncryptableBlock = await BlockService.createBlock(
          BlockSize.Message,
          BlockType.RawData,
          BlockDataType.RawData,
          testData,
        );

        await expect(
          BlockService.encrypt(
            testMember.member,
            nonEncryptableBlock as OwnedDataBlock,
          ),
        ).rejects.toThrow('Block cannot be encrypted');
      });

      it('should throw error when trying to decrypt non-decryptable block', async () => {
        const nonDecryptableBlock = await BlockService.createBlock(
          BlockSize.Message,
          BlockType.RawData,
          BlockDataType.RawData,
          testData,
        );

        await expect(
          BlockService.decrypt(
            testMember.member,
            nonDecryptableBlock as EncryptedOwnedDataBlock,
          ),
        ).rejects.toThrow('Block cannot be decrypted');
      });
    });
  });
});
