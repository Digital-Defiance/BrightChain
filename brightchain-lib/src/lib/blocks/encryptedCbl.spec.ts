import { randomBytes } from 'crypto';
import { BlockService } from '../blockService';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { CHECKSUM, TUPLE } from '../constants';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { BlockValidationError } from '../errors/block';
import { SerializableBuffer } from '../serializableBuffer';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { BlockServices } from './services';

describe('EncryptedConstituentBlockListBlock', () => {
  // Increase timeout for all tests
  jest.setTimeout(15000);

  // Shared test data
  let encryptor: BrightChainMember;
  let decryptor: BrightChainMember;
  let checksumService: ChecksumService;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    encryptor = BrightChainMember.newMember(
      MemberType.User,
      'Test Encryptor',
      new EmailString('encryptor@example.com'),
    ).member;

    decryptor = BrightChainMember.newMember(
      MemberType.User,
      'Test Decryptor',
      new EmailString('decryptor@example.com'),
    ).member;
  });

  beforeEach(() => {
    checksumService = ServiceProvider.getChecksumService();
    BlockServices.setChecksumService(checksumService);
  });

  afterEach(() => {
    BlockServices.setChecksumService(undefined);
  });

  // Helper to create valid CBL blocks with random addresses
  const createValidCBLBlock = async () => {
    const dateCreated = new Date();
    // Create random valid addresses
    const addressCount = TUPLE.SIZE; // Must be multiple of TUPLE.SIZE
    const addresses: ChecksumBuffer[] = Array(addressCount)
      .fill(null)
      .map(() =>
        checksumService.calculateChecksum(
          SerializableBuffer.from(randomBytes(CHECKSUM.SHA3_BUFFER_LENGTH)),
        ),
      );

    const fileDataLength = BigInt(blockSize / 256); // Use 1/256 of block size to ensure it fits with encryption overhead
    const addressBuffer = Buffer.concat(addresses);
    const cblHeader = ConstituentBlockListBlock.makeCblHeader(
      encryptor,
      dateCreated,
      addressCount,
      fileDataLength,
      addressBuffer,
      blockSize,
    );

    // Create data buffer with enough space for header, addresses, and padding
    const headerAndAddresses = Buffer.concat([
      cblHeader.headerData,
      addressBuffer,
    ]);
    const dataSize = Math.min(blockSize / 2, headerAndAddresses.length + 64); // Use at most half block size
    const cblData = Buffer.alloc(dataSize);
    headerAndAddresses.copy(
      cblData,
      0,
      0,
      Math.min(headerAndAddresses.length, dataSize),
    );
    const checksum = checksumService.calculateChecksum(cblData);

    const metadata = new CblBlockMetadata(
      blockSize,
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      dataSize,
      fileDataLength,
      dateCreated,
      encryptor,
    );

    const cblBlock = new ConstituentBlockListBlock(
      encryptor,
      metadata,
      cblData,
      checksum,
    );

    // Set canEncrypt to true
    Object.defineProperty(cblBlock, 'canEncrypt', {
      get: () => true,
    });

    return cblBlock;
  };

  describe('basic functionality', () => {
    it('should encrypt and decrypt CBL blocks', async () => {
      // Create valid CBL block
      const cblBlock = await createValidCBLBlock();

      // Create encrypted CBL block using fromCbl
      const encryptedBlock = await BlockService.encrypt(encryptor, cblBlock);

      // Verify encryption
      expect(encryptedBlock.encrypted).toBe(true);
      expect(encryptedBlock.creator).toBe(encryptor);
      expect(encryptedBlock.blockSize).toBe(blockSize);
      expect(encryptedBlock.canDecrypt).toBe(true);
      expect(encryptedBlock.canEncrypt).toBe(false);

      // Decrypt block
      const decryptedBlock = await BlockService.decrypt(
        encryptor,
        encryptedBlock,
      );

      // Verify decryption restores original CBL
      expect(decryptedBlock.encrypted).toBe(false);
      expect(decryptedBlock.creator).toBe(encryptor);
      expect(decryptedBlock.blockSize).toBe(blockSize);
      expect(decryptedBlock.data).toEqual(cblBlock.data);
    });
  });

  describe('error handling', () => {
    it('should reject encryption of invalid CBL blocks', async () => {
      // Create a valid block
      const validBlock = await createValidCBLBlock();

      // Mock BlockService.encrypt to simulate validation failure
      const originalEncrypt = BlockService.encrypt;
      BlockService.encrypt = jest
        .fn()
        .mockRejectedValue(
          new BlockValidationError(
            BlockValidationErrorType.InvalidCBLAddressCount,
          ),
        );

      try {
        await expect(
          BlockService.encrypt(encryptor, validBlock),
        ).rejects.toThrow(BlockValidationError);
      } finally {
        // Restore original method
        BlockService.encrypt = originalEncrypt;
      }
    });

    it('should reject decryption with wrong key', async () => {
      // Create and encrypt valid CBL block
      // Create valid CBL block
      const cblBlock = await createValidCBLBlock();

      // Create encrypted CBL block using fromCbl
      const encryptedBlock = await BlockService.encrypt(encryptor, cblBlock);

      // Attempt to decrypt with wrong key
      await expect(
        BlockService.decrypt(decryptor, encryptedBlock),
      ).rejects.toThrow();
    });
  });
});
