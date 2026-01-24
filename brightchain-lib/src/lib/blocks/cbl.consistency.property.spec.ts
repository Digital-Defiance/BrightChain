/**
 * @fileoverview Property-based tests for CBL consistency
 *
 * **Feature: block-security-hardening**
 * **Property 3: CBL Address Count Consistency**
 * **Property 4: CBL Serialization Round-Trip**
 * **Validates: Requirements 2.1, 2.3, 2.5**
 *
 * This test suite verifies that:
 * - For any valid CBL block, accessing `cblAddressCount` multiple times SHALL
 *   return the same value, and the value SHALL match the count derived from
 *   parsing the raw address data.
 * - For any valid CBL block, serializing to bytes and reconstructing SHALL
 *   produce a CBL with identical `cblAddressCount`, `originalDataLength`, and `addresses`.
 */

import { ConstituentBlockListBlock } from './cbl';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { ServiceProvider } from '../services/service.provider';
import {
  arraysEqual,
  EmailString,
  Member,
  MemberType,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('Feature: block-security-hardening, CBL Consistency Property Tests', () => {
  const blockSize = BlockSize.Message;
  let creator: Member;

  beforeAll(() => {
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'TestCreator',
      new EmailString('test@example.com'),
    ).member;
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  describe('Property 3: CBL Address Count Consistency', () => {
    /**
     * Property: For any valid CBL block, accessing `cblAddressCount` multiple times
     * SHALL return the same value, and the value SHALL match the count derived from
     * parsing the raw address data.
     *
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should return consistent address count across multiple accesses', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a small number of addresses (1-3 to fit in Message block size)
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService = ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`test-block-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL header and data
            const addressList = Buffer.concat(blockAddresses);
            const fileDataLength = 1024;
            const dateCreated = new Date();

            const { headerData } = cblService.makeCblHeader(
              creator,
              dateCreated,
              blockAddresses.length,
              fileDataLength,
              addressList,
              blockSize,
              BlockEncryptionType.None,
            );

            // Combine header and address list and pad to block size
            const data = Buffer.concat([headerData, addressList]);
            const padding = Buffer.alloc(blockSize - (data.length % blockSize));
            const paddedData = Buffer.concat([data, padding]);

            // Create CBL block
            const cbl = new ConstituentBlockListBlock(paddedData, creator);

            // Access cblAddressCount multiple times
            const count1 = cbl.cblAddressCount;
            const count2 = cbl.cblAddressCount;
            const count3 = cbl.cblAddressCount;

            // All accesses should return the same value
            expect(count1).toBe(count2);
            expect(count2).toBe(count3);

            // The count should match the expected address count
            expect(count1).toBe(addressCount);

            // The count should match what the service parses from raw data
            const parsedCount = cblService.getCblAddressCount(cbl.data);
            expect(count1).toBe(parsedCount);

            // The count should match the actual addresses array length
            expect(cbl.addresses.length).toBe(count1);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property: The cached address count should match the count derived from
     * parsing the raw address data directly.
     *
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should have cached count matching raw data parsing', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a small number of addresses (1-3 to fit in Message block size)
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService = ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`consistency-test-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL
            const addressList = Buffer.concat(blockAddresses);
            const fileDataLength = 2048;

            const { headerData } = cblService.makeCblHeader(
              creator,
              new Date(),
              blockAddresses.length,
              fileDataLength,
              addressList,
              blockSize,
              BlockEncryptionType.None,
            );

            const data = Buffer.concat([headerData, addressList]);
            const padding = Buffer.alloc(blockSize - (data.length % blockSize));
            const paddedData = Buffer.concat([data, padding]);

            const cbl = new ConstituentBlockListBlock(paddedData, creator);

            // Get the raw data and parse it directly
            const rawData = cbl.data;
            const parsedCountFromRaw = cblService.getCblAddressCount(rawData);

            // The CBL's cached count should match
            expect(cbl.cblAddressCount).toBe(parsedCountFromRaw);

            // Both should match the original address count
            expect(parsedCountFromRaw).toBe(addressCount);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 4: CBL Serialization Round-Trip', () => {
    /**
     * Property: For any valid CBL block, serializing to bytes and reconstructing
     * SHALL produce a CBL with identical `cblAddressCount`, `originalDataLength`,
     * and `addresses`.
     *
     * **Validates: Requirements 2.5**
     */
    it('should preserve all CBL properties through serialization round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a small number of addresses (1-3 to fit in Message block size)
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 512, max: 4096 }),
          async (addressCount, fileDataLength) => {
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService = ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`roundtrip-test-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL header and data
            const addressList = Buffer.concat(blockAddresses);
            const dateCreated = new Date();

            const { headerData } = cblService.makeCblHeader(
              creator,
              dateCreated,
              blockAddresses.length,
              fileDataLength,
              addressList,
              blockSize,
              BlockEncryptionType.None,
            );

            // Combine header and address list and pad to block size
            const data = Buffer.concat([headerData, addressList]);
            const padding = Buffer.alloc(blockSize - (data.length % blockSize));
            const paddedData = Buffer.concat([data, padding]);

            // Create original CBL block
            const originalCbl = new ConstituentBlockListBlock(paddedData, creator);

            // Serialize: Get the raw data from the CBL
            const serializedData = originalCbl.data;

            // Deserialize: Create a new CBL from the serialized data
            const deserializedCbl = new ConstituentBlockListBlock(
              serializedData,
              creator,
            );

            // Verify cblAddressCount is preserved
            expect(deserializedCbl.cblAddressCount).toBe(originalCbl.cblAddressCount);

            // Verify originalDataLength is preserved
            expect(deserializedCbl.originalDataLength).toBe(originalCbl.originalDataLength);

            // Verify addresses are preserved
            const originalAddresses = originalCbl.addresses;
            const deserializedAddresses = deserializedCbl.addresses;

            expect(deserializedAddresses.length).toBe(originalAddresses.length);

            for (let i = 0; i < originalAddresses.length; i++) {
              expect(
                arraysEqual(
                  new Uint8Array(deserializedAddresses[i].toUint8Array()),
                  new Uint8Array(originalAddresses[i].toUint8Array()),
                ),
              ).toBe(true);
            }

            // Verify checksum is preserved (block identity)
            expect(
              uint8ArrayToHex(deserializedCbl.idChecksum.toUint8Array()),
            ).toBe(uint8ArrayToHex(originalCbl.idChecksum.toUint8Array()));

            // Verify tuple size is preserved
            expect(deserializedCbl.tupleSize).toBe(originalCbl.tupleSize);

            // Verify block size is preserved
            expect(deserializedCbl.blockSize).toBe(originalCbl.blockSize);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property: For any valid CBL, the signature should be preserved and
     * remain valid after serialization round-trip.
     *
     * **Validates: Requirements 2.5**
     */
    it('should preserve signature validity through serialization round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService = ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`signature-test-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL
            const addressList = Buffer.concat(blockAddresses);
            const fileDataLength = 1024;

            const { headerData } = cblService.makeCblHeader(
              creator,
              new Date(),
              blockAddresses.length,
              fileDataLength,
              addressList,
              blockSize,
              BlockEncryptionType.None,
            );

            const data = Buffer.concat([headerData, addressList]);
            const padding = Buffer.alloc(blockSize - (data.length % blockSize));
            const paddedData = Buffer.concat([data, padding]);

            // Create original CBL
            const originalCbl = new ConstituentBlockListBlock(paddedData, creator);

            // Serialize and deserialize
            const serializedData = originalCbl.data;
            const deserializedCbl = new ConstituentBlockListBlock(
              serializedData,
              creator,
            );

            // Verify signature is preserved (byte-for-byte)
            expect(
              arraysEqual(
                new Uint8Array(deserializedCbl.creatorSignature),
                new Uint8Array(originalCbl.creatorSignature),
              ),
            ).toBe(true);

            // Verify signature validation still works
            expect(deserializedCbl.validateSignature()).toBe(
              originalCbl.validateSignature(),
            );
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property: For any valid CBL, the creator information should be preserved
     * through serialization round-trip.
     *
     * **Validates: Requirements 2.5**
     */
    it('should preserve creator information through serialization round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService = ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`creator-test-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL
            const addressList = Buffer.concat(blockAddresses);
            const fileDataLength = 1024;

            const { headerData } = cblService.makeCblHeader(
              creator,
              new Date(),
              blockAddresses.length,
              fileDataLength,
              addressList,
              blockSize,
              BlockEncryptionType.None,
            );

            const data = Buffer.concat([headerData, addressList]);
            const padding = Buffer.alloc(blockSize - (data.length % blockSize));
            const paddedData = Buffer.concat([data, padding]);

            // Create original CBL
            const originalCbl = new ConstituentBlockListBlock(paddedData, creator);

            // Serialize and deserialize
            const serializedData = originalCbl.data;
            const deserializedCbl = new ConstituentBlockListBlock(
              serializedData,
              creator,
            );

            // Verify creator ID is preserved
            expect(
              arraysEqual(
                new Uint8Array(cblService.idProvider.toBytes(deserializedCbl.creatorId)),
                new Uint8Array(cblService.idProvider.toBytes(originalCbl.creatorId)),
              ),
            ).toBe(true);

            // Verify creator object is preserved
            expect(deserializedCbl.creator).toBeDefined();
            if (deserializedCbl.creator && originalCbl.creator) {
              expect(
                arraysEqual(
                  new Uint8Array(cblService.idProvider.toBytes(deserializedCbl.creator.id)),
                  new Uint8Array(cblService.idProvider.toBytes(originalCbl.creator.id)),
                ),
              ).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
