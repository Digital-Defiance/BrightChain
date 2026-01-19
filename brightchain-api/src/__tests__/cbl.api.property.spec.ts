/**
 * @fileoverview Property-based tests for CBL API round-trip
 *
 * **Feature: backend-blockstore-quorum, Property 24: CBL API Round-Trip**
 * **Validates: Requirements 14.1, 14.2**
 *
 * This test suite verifies that:
 * - POSTing to /api/cbl and then GETting /api/cbl/:id returns the same block addresses
 * - CBL creation and retrieval is consistent
 *
 * Note: Since the API layer is a thin wrapper around CBLStore, these tests
 * verify the service layer integration rather than HTTP transport.
 */

/* eslint-disable @nx/enforce-module-boundaries */
import { DiskCBLStore } from '@brightchain/brightchain-api-lib/lib/stores/diskCBLStore';
import { ConstituentBlockListBlock } from '@brightchain/brightchain-lib/lib/blocks/cbl';
import { BlockEncryptionType } from '@brightchain/brightchain-lib/lib/enumerations/blockEncryptionType';
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { MemberType } from '@brightchain/brightchain-lib/lib/enumerations/memberType';
import { StoreErrorType } from '@brightchain/brightchain-lib/lib/enumerations/storeErrorType';
import { StoreError } from '@brightchain/brightchain-lib/lib/errors/storeError';
import { ServiceProvider } from '@brightchain/brightchain-lib/lib/services/service.provider';
import {
  arraysEqual,
  EmailString,
  getEnhancedIdProvider,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('CBL API Round-Trip Property Tests', () => {
  // Use Message block size like the existing tests
  const blockSize = BlockSize.Message;
  let creator: Member;

  // Initialize once before all tests
  beforeAll(() => {
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'TestCreator',
      new EmailString('test@example.com'),
    ).member;
  });

  describe('Property 24: CBL API Round-Trip', () => {
    /**
     * Property: For any valid set of block addresses, POSTing to /api/cbl
     * and then GETting /api/cbl/:id SHALL return the same block addresses.
     *
     * This test verifies the CBLStore layer that backs the API endpoints.
     *
     * **Validates: Requirements 14.1, 14.2**
     */
    it('should store and retrieve CBL with correct block addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a small number of addresses (1-3 to fit in Message block size)
          fc.integer({ min: 1, max: 3 }),
          async (addressCount) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-cbl-roundtrip-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const store = new DiskCBLStore({
                storePath: iterTestDir,
                blockSize,
              });

              // Set active user on store
              store.setActiveUser(creator);

              // Get services
              const cblService = ServiceProvider.getInstance().cblService;
              const checksumService =
                ServiceProvider.getInstance().checksumService;

              // Generate random block addresses (checksums)
              const blockAddresses: Buffer[] = [];
              for (let i = 0; i < addressCount; i++) {
                const checksum = checksumService.calculateChecksum(
                  Buffer.from(`test-block-${Date.now()}-${i}`),
                );
                blockAddresses.push(Buffer.from(checksum.toBuffer()));
              }

              // Create CBL header and data using Buffer.concat like the existing tests
              const addressList = Buffer.concat(blockAddresses);
              const fileDataLength = 1024; // Made-up value for testing

              const { headerData } = cblService.makeCblHeader(
                creator,
                new Date(),
                blockAddresses.length,
                fileDataLength,
                addressList,
                blockSize,
                BlockEncryptionType.None,
              );

              // Combine header and address list and pad to block size
              const data = Buffer.concat([headerData, addressList]);
              const padding = Buffer.alloc(
                blockSize - (data.length % blockSize),
              );
              const paddedData = Buffer.concat([data, padding]);

              // Create CBL block
              const cbl = new ConstituentBlockListBlock(paddedData, creator);

              // Store the CBL (simulates POST /api/cbl)
              await store.set(cbl.idChecksum, cbl);

              // Verify the CBL exists
              const exists = store.has(cbl.idChecksum);
              expect(exists).toBe(true);

              // Retrieve the CBL (simulates GET /api/cbl/:id)
              const retrievedCbl = await store.get(
                cbl.idChecksum,
                (id: PlatformID) => {
                  const provider = getEnhancedIdProvider();
                  if (provider.equals(creator.id, id)) {
                    return Promise.resolve(creator);
                  }
                  throw new StoreError(StoreErrorType.KeyNotFound);
                },
              );

              // Verify the addresses match
              const retrievedAddresses = retrievedCbl.addresses;
              expect(retrievedAddresses.length).toBe(blockAddresses.length);

              for (let i = 0; i < blockAddresses.length; i++) {
                expect(
                  arraysEqual(
                    new Uint8Array(retrievedAddresses[i].toUint8Array()),
                    new Uint8Array(blockAddresses[i]),
                  ),
                ).toBe(true);
              }

              // Verify creator ID matches
              expect(retrievedCbl.creator).toBeDefined();
              if (retrievedCbl.creator) {
                expect(retrievedCbl.creator.id).toEqual(creator.id);
              }
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: For any CBL, the address count in metadata SHALL match
     * the actual number of addresses stored.
     *
     * **Validates: Requirements 14.2**
     */
    it('should have consistent address count in CBL metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // 1-3 addresses
          async (addressCount) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-cbl-count-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const store = new DiskCBLStore({
                storePath: iterTestDir,
                blockSize,
              });

              store.setActiveUser(creator);

              // Get services
              const cblService = ServiceProvider.getInstance().cblService;
              const checksumService =
                ServiceProvider.getInstance().checksumService;

              // Generate random block addresses
              const blockAddresses: Buffer[] = [];
              for (let i = 0; i < addressCount; i++) {
                const checksum = checksumService.calculateChecksum(
                  Buffer.from(`test-block-${Date.now()}-${i}`),
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
              const padding = Buffer.alloc(
                blockSize - (data.length % blockSize),
              );
              const paddedData = Buffer.concat([data, padding]);

              const cbl = new ConstituentBlockListBlock(paddedData, creator);

              await store.set(cbl.idChecksum, cbl);

              // Retrieve and verify
              const retrievedCbl = await store.get(
                cbl.idChecksum,
                (id: PlatformID) => {
                  const provider = getEnhancedIdProvider();
                  if (provider.equals(creator.id, id)) {
                    return Promise.resolve(creator);
                  }
                  throw new StoreError(StoreErrorType.KeyNotFound);
                },
              );

              // Verify address count matches
              expect(retrievedCbl.cblAddressCount).toBe(addressCount);
              expect(retrievedCbl.addresses.length).toBe(addressCount);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
