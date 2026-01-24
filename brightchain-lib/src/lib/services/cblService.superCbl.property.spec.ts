/**
 * Property-Based Tests for Binary SuperCBL Format
 *
 * These tests validate universal properties of the binary SuperCBL format
 * using fast-check for property-based testing.
 *
 * Property 16: Binary SuperCBL Round-Trip
 * Property 17: SuperCBL Signature Validity
 *
 * @module services/cblService.superCbl.property.spec
 * @see Requirements 11.1-11.8
 */

import * as fc from 'fast-check';
import {
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { faker } from '@faker-js/faker';
import { BlockSize } from '../enumerations/blockSize';
import { BLOCK_HEADER, StructuredBlockType } from '../constants';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { Checksum } from '../types/checksum';
import { ServiceProvider } from './service.provider';

describe('Binary SuperCBL Format - Property Tests', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;

  beforeAll(() => {
    checksumService = new ChecksumService();
    const eciesService = ServiceProvider.getInstance().eciesService;
    cblService = new CBLService(checksumService, eciesService);
  });

  /**
   * Generate a valid member with private key for signing
   */
  function generateMember(): Member {
    const { member } = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    );
    return member;
  }

  /**
   * Generate a random checksum
   */
  function generateChecksum(): fc.Arbitrary<Checksum> {
    return fc.uint8Array({ minLength: 64, maxLength: 64 }).map((bytes) =>
      Checksum.fromUint8Array(bytes),
    );
  }

  /**
   * Get the ID provider from the service
   */
  function getIdProvider() {
    return cblService.idProvider;
  }

  describe('Property 16: Binary SuperCBL Round-Trip', () => {
    /**
     * Property 16: Binary SuperCBL Round-Trip
     *
     * For any SuperCBL created with the binary format, serializing and
     * deserializing SHALL preserve: BlockType (0x03), SubCblCount,
     * TotalBlockCount, Depth, and all sub-CBL checksums.
     *
     * Validates: Requirements 11.1, 11.2, 11.3, 11.5
     */
    it('should preserve all SuperCBL fields through round-trip', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // subCblCount
          fc.integer({ min: 1, max: 1000000 }), // totalBlockCount
          fc.integer({ min: 1, max: 100 }), // depth
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - 1 }), // originalDataLength
          generateChecksum(), // originalDataChecksum
          (subCblCount, totalBlockCount, depth, originalDataLength, originalDataChecksum) => {
            const member = generateMember();
            const dateCreated = new Date();

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              totalBlockCount,
              depth,
              originalDataLength,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Verify magic prefix and block type
            expect(fullData[0]).toBe(BLOCK_HEADER.MAGIC_PREFIX);
            expect(fullData[1]).toBe(StructuredBlockType.SuperCBL);
            expect(fullData[2]).toBe(BLOCK_HEADER.VERSION);

            // Verify it's recognized as a SuperCBL
            expect(cblService.isSuperCbl(fullData)).toBe(true);

            // Parse the header - must pass the same blockSize used during creation
            const parsed = cblService.parseSuperCblHeader(fullData, member, BlockSize.Medium);

            // Verify all fields are preserved
            expect(parsed.subCblCount).toBe(subCblCount);
            expect(parsed.totalBlockCount).toBe(totalBlockCount);
            expect(parsed.depth).toBe(depth);
            expect(parsed.originalDataLength).toBe(originalDataLength);
            expect(parsed.originalDataChecksum.equals(originalDataChecksum)).toBe(true);

            // Verify sub-CBL checksums are preserved
            expect(parsed.subCblChecksums).toBeDefined();
            expect(parsed.subCblChecksums!.length).toBe(subCblCount);
            for (let i = 0; i < subCblCount; i++) {
              expect(parsed.subCblChecksums![i].equals(subCblChecksums[i])).toBe(true);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should preserve creator ID through round-trip', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // subCblCount
          generateChecksum(), // originalDataChecksum
          (subCblCount, originalDataChecksum) => {
            const member = generateMember();
            const dateCreated = new Date();

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              1000,
              1,
              1000000,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Parse the header - must pass the same blockSize used during creation
            const parsed = cblService.parseSuperCblHeader(fullData, member, BlockSize.Medium);

            // Verify creator ID is preserved
            expect(getIdProvider().equals(parsed.creatorId, member.id)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should preserve date created through round-trip (within 1 second tolerance)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          generateChecksum(),
          (dateCreated, originalDataChecksum) => {
            const member = generateMember();
            const subCblCount = 3;

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              1000,
              1,
              1000000,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Parse the header - must pass the same blockSize used during creation
            const parsed = cblService.parseSuperCblHeader(fullData, member, BlockSize.Medium);

            // Verify date is preserved (within 1 second tolerance due to millisecond truncation)
            const timeDiff = Math.abs(
              parsed.dateCreated.getTime() - dateCreated.getTime(),
            );
            expect(timeDiff).toBeLessThan(1000);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 17: SuperCBL Signature Validity', () => {
    /**
     * Property 17: SuperCBL Signature Validity
     *
     * For any SuperCBL created by a member with a private key, the signature
     * SHALL be verifiable using the creator's public key. Modifying any
     * header field SHALL cause signature verification to fail.
     *
     * Validates: Requirements 11.4, 11.6
     */
    it('should create valid signatures that can be verified', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // subCblCount
          fc.integer({ min: 1, max: 1000000 }), // totalBlockCount
          fc.integer({ min: 1, max: 50 }), // depth
          generateChecksum(), // originalDataChecksum
          (subCblCount, totalBlockCount, depth, originalDataChecksum) => {
            const member = generateMember();
            const dateCreated = new Date();

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              totalBlockCount,
              depth,
              1000000,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Verify signature is valid
            const isValid = cblService.validateSuperCblSignature(
              fullData,
              member,
              BlockSize.Medium,
            );
            expect(isValid).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should fail signature verification when header content is modified', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // subCblCount
          fc.integer({ min: 4, max: 100 }), // corruptIndex (after prefix, in header content)
          generateChecksum(), // originalDataChecksum
          (subCblCount, corruptIndex, originalDataChecksum) => {
            const member = generateMember();
            const dateCreated = new Date();

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              1000,
              1,
              1000000,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Corrupt a byte in the header content (after prefix, before signature)
            // The header size is superCblHeaderSize, signature is at the end
            const signatureOffset = cblService.superCblHeaderSize - 64;
            const maxCorruptIndex = Math.min(corruptIndex, signatureOffset - 1);
            const actualCorruptIndex = Math.max(4, maxCorruptIndex); // After prefix
            
            fullData[actualCorruptIndex] = (fullData[actualCorruptIndex] + 1) % 256;

            // Signature verification should fail
            const isValid = cblService.validateSuperCblSignature(
              fullData,
              member,
              BlockSize.Medium,
            );
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should fail signature verification with wrong creator', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // subCblCount
          generateChecksum(), // originalDataChecksum
          (subCblCount, originalDataChecksum) => {
            const member = generateMember();
            const wrongMember = generateMember(); // Different member
            const dateCreated = new Date();

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header with original member
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              1000,
              1,
              1000000,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Verify signature fails with wrong member
            const isValid = cblService.validateSuperCblSignature(
              fullData,
              wrongMember,
              BlockSize.Medium,
            );
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should fail signature verification when address data is modified', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // subCblCount (at least 2 for meaningful test)
          fc.integer({ min: 0, max: 63 }), // byteIndex within a checksum
          generateChecksum(), // originalDataChecksum
          (subCblCount, byteIndex, originalDataChecksum) => {
            const member = generateMember();
            const dateCreated = new Date();

            // Generate sub-CBL checksums
            const subCblChecksums: Checksum[] = [];
            for (let i = 0; i < subCblCount; i++) {
              const bytes = new Uint8Array(64);
              for (let j = 0; j < 64; j++) {
                bytes[j] = (i * 64 + j) % 256;
              }
              subCblChecksums.push(Checksum.fromUint8Array(bytes));
            }

            // Create SuperCBL header
            const { headerData } = cblService.makeSuperCblHeader(
              member,
              dateCreated,
              subCblCount,
              1000,
              1,
              1000000,
              originalDataChecksum,
              subCblChecksums,
              BlockSize.Medium,
            );

            // Combine header with address data
            const addressData = new Uint8Array(subCblCount * 64);
            for (let i = 0; i < subCblCount; i++) {
              addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
            }
            const fullData = new Uint8Array(headerData.length + addressData.length);
            fullData.set(headerData, 0);
            fullData.set(addressData, headerData.length);

            // Corrupt a byte in the address data
            const addressDataOffset = headerData.length;
            const corruptIndex = addressDataOffset + byteIndex;
            fullData[corruptIndex] = (fullData[corruptIndex] + 1) % 256;

            // Signature verification should fail
            const isValid = cblService.validateSuperCblSignature(
              fullData,
              member,
              BlockSize.Medium,
            );
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
