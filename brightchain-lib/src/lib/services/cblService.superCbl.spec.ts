/**
 * Unit Tests for Binary SuperCBL Format
 *
 * These tests validate the binary SuperCBL header creation and parsing.
 *
 * @module services/cblService.superCbl.spec
 * @see Requirements 11.1-11.8
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { faker } from '@faker-js/faker';
import { BLOCK_HEADER, StructuredBlockType } from '../constants';
import { BlockSize } from '../enumerations/blockSize';
import { Checksum } from '../types/checksum';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('Binary SuperCBL Format - Unit Tests', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let member: Member;

  beforeAll(() => {
    checksumService = new ChecksumService();
    const eciesService = ServiceProvider.getInstance().eciesService;
    const idProvider = ServiceProvider.getInstance().idProvider;
    cblService = new CBLService(checksumService, eciesService, idProvider);

    const { member: m } = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    );
    member = m;
  });

  describe('SuperCBL Header Creation', () => {
    it('should create a valid SuperCBL header with correct magic bytes', () => {
      const dateCreated = new Date();
      const subCblCount = 3;
      const totalBlockCount = 1000;
      const depth = 1;
      const originalDataLength = 1000000;
      const originalDataChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

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

      // Verify magic prefix and block type
      expect(headerData[0]).toBe(BLOCK_HEADER.MAGIC_PREFIX);
      expect(headerData[1]).toBe(StructuredBlockType.SuperCBL);
      expect(headerData[2]).toBe(BLOCK_HEADER.VERSION);
    });

    it('should create a SuperCBL that can be recognized by isSuperCbl', () => {
      const dateCreated = new Date();
      const subCblCount = 3;
      const originalDataChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

      const subCblChecksums: Checksum[] = [];
      for (let i = 0; i < subCblCount; i++) {
        subCblChecksums.push(
          Checksum.fromUint8Array(new Uint8Array(64).fill(i)),
        );
      }

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

      expect(cblService.isSuperCbl(fullData)).toBe(true);
    });
  });

  describe('SuperCBL Signature Validation', () => {
    it('should validate signature for a freshly created SuperCBL', () => {
      const dateCreated = new Date();
      const subCblCount = 3;
      const originalDataChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

      const subCblChecksums: Checksum[] = [];
      for (let i = 0; i < subCblCount; i++) {
        subCblChecksums.push(
          Checksum.fromUint8Array(new Uint8Array(64).fill(i)),
        );
      }

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

      // Validate signature
      const isValid = cblService.validateSuperCblSignature(
        fullData,
        member,
        BlockSize.Medium,
      );
      expect(isValid).toBe(true);
    });
  });

  describe('SuperCBL Parsing', () => {
    it('should parse a SuperCBL header without signature validation', () => {
      const dateCreated = new Date();
      const subCblCount = 3;
      const originalDataChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

      const subCblChecksums: Checksum[] = [];
      for (let i = 0; i < subCblCount; i++) {
        subCblChecksums.push(
          Checksum.fromUint8Array(new Uint8Array(64).fill(i)),
        );
      }

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

      // Parse without signature validation
      const parsed = cblService.parseSuperCblHeader(fullData);

      expect(parsed.subCblCount).toBe(subCblCount);
      expect(parsed.totalBlockCount).toBe(1000);
      expect(parsed.depth).toBe(1);
      expect(parsed.originalDataLength).toBe(1000000);
    });

    it('should parse a SuperCBL header with signature validation', () => {
      const dateCreated = new Date();
      const subCblCount = 3;
      const originalDataChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

      const subCblChecksums: Checksum[] = [];
      for (let i = 0; i < subCblCount; i++) {
        subCblChecksums.push(
          Checksum.fromUint8Array(new Uint8Array(64).fill(i)),
        );
      }

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

      // Parse with signature validation - must pass the same blockSize used during creation
      const parsed = cblService.parseSuperCblHeader(
        fullData,
        member,
        BlockSize.Medium,
      );

      expect(parsed.subCblCount).toBe(subCblCount);
    });
  });
});
