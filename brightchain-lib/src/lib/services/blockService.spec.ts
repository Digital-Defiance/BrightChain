import { OwnedDataBlock } from '../blocks/ownedData';
import { BrightChainMember } from '../brightChainMember';
import { CHECKSUM, TUPLE } from '../constants';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { MemberType } from '../enumerations/memberType';
import { ChecksumBuffer } from '../types';
import { BlockService } from './blockService';
import { ServiceProvider } from './service.provider';

describe('BlockService', () => {
  let member: BrightChainMember;
  let tinyData: Buffer;
  let checksum: ChecksumBuffer;

  beforeEach(async () => {
    // Create minimal test data - just a single byte
    tinyData = Buffer.from([1]);
    checksum = ServiceProvider.getChecksumService().calculateChecksum(tinyData);

    // Create test member with valid email
    const result = BrightChainMember.newMember(
      MemberType.User,
      'Test',
      new EmailString('test@example.com'),
    );
    member = result.member;
  });

  // Basic functionality test with memory tracking
  it('should handle CBL creation with minimal data', async () => {
    // Create minimal test data - just a single byte
    const tinyData = Buffer.from([1]);

    // Calculate checksum
    const checksum =
      ServiceProvider.getChecksumService().calculateChecksum(tinyData);

    // Create test member with valid email
    const { member } = BrightChainMember.newMember(
      MemberType.User,
      'Test',
      new EmailString('test@example.com'),
    );

    try {
      // Create blocks - we need TUPLE.SIZE number of blocks
      const blocks = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        const block = await OwnedDataBlock.from(
          BlockType.OwnedDataBlock,
          BlockDataType.RawData,
          BlockSize.Message,
          tinyData,
          checksum,
          member,
        );
        blocks.push(block);
      }

      // Create CBL with minimal data
      const cbl = await BlockService.createCBL(
        blocks,
        member,
        blocks.length, // File length is number of blocks
      );

      // Basic verification
      expect(cbl).toBeDefined();
      expect(cbl.blockType).toBe(BlockType.ConstituentBlockList);
      expect(cbl.cblAddressCount).toBe(TUPLE.SIZE);

      // Help garbage collection
    } catch (error) {
      console.error('\nError during test:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  });

  it('should reject empty blocks array', async () => {
    await expect(BlockService.createCBL([], member, 0)).rejects.toThrow(
      'Blocks array must not be empty',
    );
  });

  it('should reject blocks with different sizes', async () => {
    const block1 = await OwnedDataBlock.from(
      BlockType.OwnedDataBlock,
      BlockDataType.RawData,
      BlockSize.Message,
      tinyData,
      checksum,
      member,
    );

    const largerData = Buffer.from([1, 2, 3, 4]);
    const largerChecksum =
      ServiceProvider.getChecksumService().calculateChecksum(largerData);
    const block2 = await OwnedDataBlock.from(
      BlockType.OwnedDataBlock,
      BlockDataType.RawData,
      BlockSize.Small,
      largerData,
      largerChecksum,
      member,
    );

    await expect(
      BlockService.createCBL([block1, block2], member, 2),
    ).rejects.toThrow('All blocks must have the same block size');
  });

  it('should create CBL with different block sizes', async () => {
    // Test with Small block size
    const smallData = Buffer.from(new Array(100).fill(1));
    const smallChecksum =
      ServiceProvider.getChecksumService().calculateChecksum(smallData);
    const blocks = [];
    for (let i = 0; i < TUPLE.SIZE; i++) {
      const block = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        BlockSize.Small,
        smallData,
        smallChecksum,
        member,
      );
      blocks.push(block);
    }

    const cbl = await BlockService.createCBL(blocks, member, blocks.length);

    expect(cbl).toBeDefined();
    expect(cbl.blockType).toBe(BlockType.ConstituentBlockList);
    expect(cbl.cblAddressCount).toBe(TUPLE.SIZE);
    expect(cbl.blockSize).toBe(BlockSize.Message); // CBL should use Message size
  });

  it('should validate signatures correctly', async () => {
    // Create blocks
    const blocks = [];
    for (let i = 0; i < TUPLE.SIZE; i++) {
      const block = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        BlockSize.Message,
        tinyData,
        checksum,
        member,
      );
      blocks.push(block);
    }

    // Create CBL
    let cbl = await BlockService.createCBL(blocks, member, blocks.length);

    // Verify signature with correct member
    expect(cbl.validateSignature()).toBe(true);

    // Verify signature with different member
    const otherMember = BrightChainMember.newMember(
      MemberType.User,
      'Other',
      new EmailString('other@example.com'),
    ).member;
    cbl = await BlockService.createCBL(blocks, otherMember, blocks.length);
    expect(cbl.validateSignature()).toBe(false);
  });

  it('should validate CBL metadata correctly', async () => {
    const blocks = [];
    for (let i = 0; i < TUPLE.SIZE; i++) {
      const block = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        BlockSize.Message,
        tinyData,
        checksum,
        member,
      );
      blocks.push(block);
    }

    const cbl = await BlockService.createCBL(blocks, member, blocks.length);

    // Verify metadata
    expect(cbl.blockType).toBe(BlockType.ConstituentBlockList);
    expect(cbl.blockDataType).toBe(BlockDataType.EphemeralStructuredData);
    expect(cbl.creatorId.equals(member.id)).toBe(true);
    expect(cbl.originalDataLength).toBe(BigInt(blocks.length));
    expect(cbl.tupleSize).toBe(TUPLE.SIZE);
    expect(cbl.addresses.length).toBe(blocks.length);
    expect(
      cbl.addresses.every(
        (addr) => addr.length === CHECKSUM.SHA3_BUFFER_LENGTH,
      ),
    ).toBe(true);
  });
});
