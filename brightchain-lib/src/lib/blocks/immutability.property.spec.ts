import {
  EmailString,
  GuidV4Uint8Array,
  IMemberWithMnemonic,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { EncryptedBlock } from './encrypted';
import { EphemeralBlock } from './ephemeral';

/**
 * Property-based tests for block immutability
 * Feature: block-security-hardening
 * Property 9: Block Immutability
 * Validates Requirements 6.1, 6.2, 6.3, 6.4
 */
describe('Feature: block-security-hardening, Property 9: Block Immutability', () => {
  let testMember: IMemberWithMnemonic<GuidV4Uint8Array>;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    const eciesService =
      ServiceProvider.getInstance<GuidV4Uint8Array>().eciesService;
    testMember = Member.newMember<GuidV4Uint8Array>(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );

    // Verify the test member was created correctly
    expect(testMember.member).toBeDefined();
    expect(testMember.member.publicKey).toBeDefined();
    expect(testMember.member.publicKey.length).toBe(33);
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  it('Property 9a: EphemeralBlock data remains consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        async (data) => {
          const blockSize = BlockSize.Small;
          const paddedData = new Uint8Array(blockSize);
          paddedData.set(data.slice(0, Math.min(data.length, blockSize)));

          const checksum =
            ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
              paddedData,
            );

          const metadata = new EphemeralBlockMetadata<GuidV4Uint8Array>(
            blockSize,
            BlockType.Random,
            BlockDataType.RawData,
            data.length,
            testMember.member,
            new Date(),
          );

          const block = new EphemeralBlock<GuidV4Uint8Array>(
            BlockType.Random,
            BlockDataType.RawData,
            paddedData,
            checksum,
            metadata,
            true,
            true,
          );

          const data1 = block.data;
          const data2 = block.data;
          const data3 = block.data;

          expect(data1).toBe(data2);
          expect(data2).toBe(data3);
          expect(Array.from(data1)).toEqual(Array.from(data2));
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 9b: EncryptedBlock cached encryption details remain consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 5, maxLength: 10 }),
        async (plaintext) => {
          // Use Message block size (64 bytes) with very small data (5-10 bytes)
          // to ensure the encrypted result fits within the block
          const blockSize = BlockSize.Message;
          const paddedData = new Uint8Array(blockSize);
          paddedData.set(
            plaintext.slice(0, Math.min(plaintext.length, blockSize)),
          );

          const checksum =
            ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
              paddedData,
            );

          const metadata = new EphemeralBlockMetadata<GuidV4Uint8Array>(
            blockSize,
            BlockType.Random,
            BlockDataType.RawData,
            plaintext.length,
            testMember.member,
            new Date(),
          );

          const ephemeralBlock = new EphemeralBlock<GuidV4Uint8Array>(
            BlockType.Random,
            BlockDataType.RawData,
            paddedData,
            checksum,
            metadata,
            true,
            true,
          );

          // Only test blocks that can be encrypted
          if (!ephemeralBlock.canEncrypt()) {
            return; // Skip this test case
          }

          // Verify the creator has a public key before attempting encryption
          expect(ephemeralBlock.creator).toBeDefined();
          expect(ephemeralBlock.creator?.publicKey).toBeDefined();
          expect(ephemeralBlock.creator?.publicKey.length).toBe(33);

          const encryptedBlock = await ephemeralBlock.encrypt<
            EncryptedBlock<GuidV4Uint8Array>
          >(BlockType.EncryptedOwnedDataBlock, [testMember.member]);

          const details1 = encryptedBlock.encryptionDetails;
          const details2 = encryptedBlock.encryptionDetails;
          const details3 = encryptedBlock.encryptionDetails;

          expect(details1).toBe(details2);
          expect(details2).toBe(details3);
          expect(Object.isFrozen(details1)).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Property 9d: Block checksum remains valid after construction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        async (data) => {
          const blockSize = BlockSize.Small;
          const paddedData = new Uint8Array(blockSize);
          paddedData.set(data.slice(0, Math.min(data.length, blockSize)));

          const checksum =
            ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
              paddedData,
            );

          const metadata = new EphemeralBlockMetadata<GuidV4Uint8Array>(
            blockSize,
            BlockType.Random,
            BlockDataType.RawData,
            data.length,
            testMember.member,
            new Date(),
          );

          const block = new EphemeralBlock<GuidV4Uint8Array>(
            BlockType.Random,
            BlockDataType.RawData,
            paddedData,
            checksum,
            metadata,
            true,
            true,
          );

          const initialChecksum = block.idChecksum;
          const blockData1 = block.data;
          const blockData2 = block.data;
          const currentChecksum = block.idChecksum;

          expect(currentChecksum.equals(initialChecksum)).toBe(true);
          await expect(block.validateAsync()).resolves.not.toThrow();
          expect(() => block.validateSync()).not.toThrow();
          expect(Array.from(blockData1)).toEqual(Array.from(blockData2));
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 9e: Block metadata remains consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        async (data) => {
          const blockSize = BlockSize.Small;
          const paddedData = new Uint8Array(blockSize);
          paddedData.set(data.slice(0, Math.min(data.length, blockSize)));

          const checksum =
            ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
              paddedData,
            );

          const metadata = new EphemeralBlockMetadata<GuidV4Uint8Array>(
            blockSize,
            BlockType.Random,
            BlockDataType.RawData,
            data.length,
            testMember.member,
            new Date(),
          );

          const block = new EphemeralBlock<GuidV4Uint8Array>(
            BlockType.Random,
            BlockDataType.RawData,
            paddedData,
            checksum,
            metadata,
            true,
            true,
          );

          const size1 = block.blockSize;
          const size2 = block.blockSize;
          const type1 = block.blockType;
          const type2 = block.blockType;
          const dataType1 = block.blockDataType;
          const dataType2 = block.blockDataType;
          const checksum1 = block.idChecksum;
          const checksum2 = block.idChecksum;

          expect(size1).toBe(size2);
          expect(type1).toBe(type2);
          expect(dataType1).toBe(dataType2);
          expect(checksum1.equals(checksum2)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
