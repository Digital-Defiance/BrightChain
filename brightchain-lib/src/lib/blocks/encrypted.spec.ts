import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { EmailString } from '../emailString';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

class TestEncryptedBlock extends EncryptedBlock {
  public static override async from(
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
  ): Promise<TestEncryptedBlock> {
    // Validate data length
    if (data.length < ECIES.OVERHEAD_SIZE) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // Calculate and validate checksum
    const computedChecksum =
      ServiceProvider.getChecksumService().calculateChecksum(data);
    if (!computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(computedChecksum, checksum);
    }

    const metadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      lengthBeforeEncryption ?? data.length,
      true,
      creator,
      dateCreated ?? new Date(),
    );

    return new TestEncryptedBlock(
      type,
      dataType,
      data,
      checksum,
      EncryptedBlockMetadata.fromEphemeralBlockMetadata(metadata),
      ServiceProvider.getECIESService(),
      canRead,
      canPersist,
    );
  }
}

describe('EncryptedBlock', () => {
  let creator: BrightChainMember;
  const checksumService = ServiceProvider.getChecksumService();
  const defaultBlockSize = BlockSize.Message;
  const testDate = new Date(Date.now() - 1000);

  beforeAll(() => {
    creator = BrightChainMember.newMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    ).member;
  });

  const createEncryptedData = (size: number): Buffer => {
    const data = randomBytes(size);
    data[0] = ECIES.PUBLIC_KEY_MAGIC;
    return data;
  };

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      const data = createEncryptedData(defaultBlockSize as number);
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
      expect(block.encrypted).toBe(true);
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
      const data = createEncryptedData(defaultBlockSize as number);
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
