/**
 * @fileoverview Property-based tests for CBL serialization round-trip
 *
 * **Feature: backend-blockstore-quorum, Property 30: CBL Serialization Round-Trip**
 * **Validates: Requirements 16.3**
 *
 * This test suite verifies that:
 * - For any valid ConstituentBlockListBlock, serializing and then deserializing
 *   SHALL preserve all block addresses, creator information, and signature.
 */

import {
  BlockEncryptionType,
  BlockSize,
  ConstituentBlockListBlock,
  initializeBrightChain,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import {
  arraysEqual,
  EmailString,
  Member,
  MemberType,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('CBL Serialization Round-Trip Property Tests', () => {
  // Use Message block size like the existing tests
  const blockSize = BlockSize.Message;
  let creator: Member;

  // Initialize once before all tests
  beforeAll(() => {
    // Initialize BrightChain library before using ServiceProvider
    initializeBrightChain();
    
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'TestCreator',
      new EmailString('test@example.com'),
    ).member;
  });

  describe('Property 30: CBL Serialization Round-Trip', () => {
    /**
     * Property: For any valid ConstituentBlockListBlock, serializing and then
     * deserializing SHALL preserve all block addresses, creator information, and signature.
     *
     * **Validates: Requirements 16.3**
     */
    it('should preserve all CBL data through serialization round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a small number of addresses (1-3 to fit in Message block size)
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            // Get services
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService =
              ServiceProvider.getInstance().checksumService;

            // Generate random block addresses (checksums)
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

            // Create original CBL block
            const originalCbl = new ConstituentBlockListBlock(
              paddedData,
              creator,
            );

            // Serialize: Get the raw data from the CBL
            const serializedData = originalCbl.data;

            // Deserialize: Create a new CBL from the serialized data
            const deserializedCbl = new ConstituentBlockListBlock(
              serializedData,
              creator,
            );

            // Verify block addresses are preserved
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

            // Verify creator information is preserved
            expect(deserializedCbl.creator).toBeDefined();
            if (deserializedCbl.creator && originalCbl.creator) {
              expect(deserializedCbl.creator.id).toEqual(
                originalCbl.creator.id,
              );
            }

            // Verify signature is preserved
            expect(
              arraysEqual(
                new Uint8Array(deserializedCbl.creatorSignature),
                new Uint8Array(originalCbl.creatorSignature),
              ),
            ).toBe(true);

            // Verify other metadata is preserved
            expect(deserializedCbl.cblAddressCount).toBe(
              originalCbl.cblAddressCount,
            );
            expect(deserializedCbl.originalDataLength).toBe(
              originalCbl.originalDataLength,
            );
            expect(deserializedCbl.tupleSize).toBe(originalCbl.tupleSize);
            expect(deserializedCbl.blockSize).toBe(originalCbl.blockSize);

            // Verify checksum is preserved
            expect(
              uint8ArrayToHex(deserializedCbl.idChecksum.toUint8Array()),
            ).toBe(uint8ArrayToHex(originalCbl.idChecksum.toUint8Array()));
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: For any valid CBL, the header data should be parseable and
     * contain consistent information.
     *
     * **Validates: Requirements 16.3**
     */
    it('should have consistent header data after serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            // Get services
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService =
              ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`test-block-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL
            const addressList = Buffer.concat(blockAddresses);
            const fileDataLength = 2048;
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

            const data = Buffer.concat([headerData, addressList]);
            const padding = Buffer.alloc(blockSize - (data.length % blockSize));
            const paddedData = Buffer.concat([data, padding]);

            const cbl = new ConstituentBlockListBlock(paddedData, creator);

            // Parse the header from the serialized data
            const parsedHeader = cblService.parseBaseHeader(cbl.data, creator);

            // Verify header fields match CBL properties
            expect(parsedHeader.cblAddressCount).toBe(cbl.cblAddressCount);
            expect(parsedHeader.originalDataLength).toBe(
              cbl.originalDataLength,
            );
            expect(parsedHeader.tupleSize).toBe(cbl.tupleSize);

            // Verify date is within reasonable tolerance (1 second)
            const dateDiff = Math.abs(
              parsedHeader.dateCreated.getTime() - dateCreated.getTime(),
            );
            expect(dateDiff).toBeLessThan(1000);
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: For any valid CBL, the address data should be extractable
     * and match the original addresses.
     *
     * **Validates: Requirements 16.3**
     */
    it('should preserve address data through extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            // Get services
            const cblService = ServiceProvider.getInstance().cblService;
            const checksumService =
              ServiceProvider.getInstance().checksumService;

            // Generate random block addresses
            const blockAddresses: Buffer[] = [];
            for (let i = 0; i < addressCount; i++) {
              const checksum = checksumService.calculateChecksum(
                Buffer.from(`test-block-${Date.now()}-${Math.random()}-${i}`),
              );
              blockAddresses.push(Buffer.from(checksum.toBuffer()));
            }

            // Create CBL
            const addressList = Buffer.concat(blockAddresses);
            const fileDataLength = 512;

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

            // Extract address data using the service
            const extractedAddressData = cblService.getAddressData(cbl.data);
            const extractedAddresses = cblService.addressDataToAddresses(
              cbl.data,
            );

            // Verify extracted address data length
            expect(extractedAddressData.length).toBe(addressList.length);

            // Verify each extracted address matches the original
            expect(extractedAddresses.length).toBe(blockAddresses.length);

            for (let i = 0; i < blockAddresses.length; i++) {
              expect(
                arraysEqual(
                  new Uint8Array(extractedAddresses[i].toUint8Array()),
                  new Uint8Array(blockAddresses[i]),
                ),
              ).toBe(true);
            }
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
