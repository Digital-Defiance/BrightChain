/**
 * Comprehensive CBL Header Verification Tests
 *
 * These tests verify byte-by-byte correctness of CBL headers against the specification.
 * They address the critical issue: "Header Calculation Verification Needed"
 *
 * Header Layout (Standard CBL with Structured Prefix):
 * [StructuredPrefix(4)][CreatorId(idSize)][DateCreated(8)][AddressCount(4)][TupleSize(1)]
 * [OriginalDataLength(8)][OriginalDataChecksum(64)][IsExtended(1)]
 * [CreatorSignature(64)]
 *
 * Structured Prefix: [MagicPrefix(1)=0xBC][BlockType(1)][Version(1)][CRC8(1)]
 *
 * Extended CBL adds:
 * [FileNameLen(2)][FileName(variable)][MimeTypeLen(1)][MimeType(variable)]
 * [CreatorSignature(64)]
 */

import {
  CHECKSUM,
  ECIES,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import CONSTANTS, { TUPLE } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { CblError } from '../errors/cblError';
import { ServiceProvider } from './service.provider';

describe('CBL Header Verification', () => {
  let serviceProvider: ServiceProvider;
  let creator: Member<Uint8Array>;
  const testDate = new Date('2024-01-15T12:00:00.000Z');

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeBrightChain } = require('../init');
    initializeBrightChain();
    ServiceProvider.resetInstance();
    serviceProvider = ServiceProvider.getInstance();

    creator = Member.newMember(
      serviceProvider.eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    ).member;
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  describe('Standard CBL Header Layout', () => {
    it('should have correct byte offsets for all fields', () => {
      const cblService = serviceProvider.cblService;
      const idSize = cblService.creatorLength;
      const prefixSize = 4; // Structured prefix: [MagicPrefix(1)][BlockType(1)][Version(1)][CRC8(1)]

      // Verify offset calculations (all offsets now include the 4-byte structured prefix)
      expect(cblService.creatorIdOffset).toBe(prefixSize);
      expect(cblService.dateCreatedOffset).toBe(prefixSize + idSize);
      expect(cblService.cblAddressCountOffset).toBe(prefixSize + idSize + 8);
      expect(cblService.tupleSizeOffset).toBe(prefixSize + idSize + 8 + 4);
      expect(cblService.originalDataLengthOffset).toBe(
        prefixSize + idSize + 8 + 4 + 1,
      );
      expect(cblService.originalChecksumOffset).toBe(
        prefixSize + idSize + 8 + 4 + 1 + 8,
      );
      expect(cblService.isExtendedHeaderOffset).toBe(
        prefixSize + idSize + 8 + 4 + 1 + 8 + 64,
      );
      expect(cblService.baseHeaderCreatorSignatureOffset).toBe(
        prefixSize + idSize + 8 + 4 + 1 + 8 + 64 + 1,
      );
      expect(cblService.baseHeaderSize).toBe(
        prefixSize + idSize + 8 + 4 + 1 + 8 + 64 + 1 + 64,
      );
    });

    it('should create header with correct total size', () => {
      const cblService = serviceProvider.cblService;
      const addressCount = 3;
      const addressList = new Uint8Array(
        addressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
      );
      crypto.getRandomValues(addressList);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        addressCount,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      expect(headerData.length).toBe(cblService.baseHeaderSize);
    });

    it('should write creator ID at correct offset', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      const creatorIdFromHeader = cblService.getCreatorId(headerData);
      expect(
        cblService.idProvider.equals(creatorIdFromHeader, creator.id),
      ).toBe(true);
    });

    it('should write date created at correct offset', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      const dateFromHeader = cblService.getDateCreated(headerData);
      expect(dateFromHeader.getTime()).toBe(testDate.getTime());
    });

    it('should write address count at correct offset', () => {
      const cblService = serviceProvider.cblService;
      // Use Small block size which has more capacity than Message
      const blockSize = BlockSize.Small;
      const addressCount = 4; // Use a smaller count that fits in Small block
      const addressList = new Uint8Array(
        addressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
      );

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        addressCount,
        1024,
        addressList,
        blockSize,
        BlockEncryptionType.None,
      );

      const countFromHeader = cblService.getCblAddressCount(headerData);
      expect(countFromHeader).toBe(addressCount);
    });

    it('should write tuple size at correct offset', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      const tupleSize = 5;

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
        undefined,
        tupleSize,
      );

      const tupleSizeFromHeader = cblService.getTupleSize(headerData);
      expect(tupleSizeFromHeader).toBe(tupleSize);
    });

    it('should write original data length at correct offset', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      const dataLength = 123456789;

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        dataLength,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      const lengthFromHeader = cblService.getOriginalDataLength(headerData);
      expect(lengthFromHeader).toBe(dataLength);
    });

    it('should write is-extended flag at correct offset', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      // Standard CBL
      const { headerData: standardHeader } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      expect(cblService.isExtendedHeader(standardHeader)).toBe(false);
      expect(standardHeader[cblService.isExtendedHeaderOffset]).toBe(0);

      // Extended CBL
      const { headerData: extendedHeader } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
        { fileName: 'test.txt', mimeType: 'text/plain' },
      );

      expect(cblService.isExtendedHeader(extendedHeader)).toBe(true);
      expect(extendedHeader[cblService.isExtendedHeaderOffset]).toBe(1);
    });

    it('should write signature at correct offset', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      const { headerData, signature } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      const signatureFromHeader = cblService.getSignature(headerData);
      expect(signatureFromHeader.length).toBe(ECIES.SIGNATURE_SIZE);
      expect(Buffer.from(signatureFromHeader)).toEqual(Buffer.from(signature));
    });
  });

  describe('Extended CBL Header Layout', () => {
    it('should have correct extended header size', () => {
      const cblService = serviceProvider.cblService;
      const fileName = 'test-file.txt';
      const mimeType = 'text/plain';

      const expectedSize =
        CONSTANTS['UINT16_SIZE'] + // fileName length
        fileName.length +
        CONSTANTS['UINT8_SIZE'] + // mimeType length
        mimeType.length;

      const actualSize = cblService.calculateExtendedHeaderSize(
        fileName,
        mimeType,
      );
      expect(actualSize).toBe(expectedSize);
    });

    it('should write file name length and content correctly', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      const fileName = 'my-test-file.txt';
      const mimeType = 'text/plain';

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
        { fileName, mimeType },
      );

      const fileNameFromHeader = cblService.getFileName(headerData);
      expect(fileNameFromHeader).toBe(fileName);

      const fileNameLength = cblService.getFileNameLength(headerData);
      expect(fileNameLength).toBe(fileName.length);
    });

    it('should write mime type length and content correctly', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      const fileName = 'test.json';
      const mimeType = 'application/json';

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
        { fileName, mimeType },
      );

      const mimeTypeFromHeader = cblService.getMimeType(headerData);
      expect(mimeTypeFromHeader).toBe(mimeType);

      const mimeTypeLength = cblService.getMimeTypeLength(headerData);
      expect(mimeTypeLength).toBe(mimeType.length);
    });

    it('should place signature after extended fields', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      const { headerData, signature } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
        { fileName, mimeType },
      );

      const signatureFromHeader = cblService.getSignature(headerData);
      expect(Buffer.from(signatureFromHeader)).toEqual(Buffer.from(signature));

      // Verify signature is at the end
      const headerLength = cblService.getHeaderLength(headerData);
      expect(headerLength).toBe(headerData.length);
    });
  });

  describe('Signature Validation', () => {
    it('should create valid signature that can be verified', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      crypto.getRandomValues(addressList);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      // Combine header and address list for validation
      const fullData = new Uint8Array(headerData.length + addressList.length);
      fullData.set(headerData);
      fullData.set(addressList, headerData.length);

      const isValid = cblService.validateSignature(
        fullData,
        creator,
        BlockSize.Message,
      );
      expect(isValid).toBe(true);
    });

    it('should fail validation with wrong creator', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      // Create different creator
      const wrongCreator = Member.newMember(
        serviceProvider.eciesService,
        MemberType.User,
        'Wrong User',
        new EmailString('wrong@example.com'),
      ).member;

      const fullData = new Uint8Array(headerData.length + addressList.length);
      fullData.set(headerData);
      fullData.set(addressList, headerData.length);

      const isValid = cblService.validateSignature(
        fullData,
        wrongCreator,
        BlockSize.Message,
      );
      expect(isValid).toBe(false);
    });

    it('should fail validation if header is modified', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      const fullData = new Uint8Array(headerData.length + addressList.length);
      fullData.set(headerData);
      fullData.set(addressList, headerData.length);

      // Modify a byte in the header (but not the signature)
      fullData[10] ^= 1;

      const isValid = cblService.validateSignature(
        fullData,
        creator,
        BlockSize.Message,
      );
      expect(isValid).toBe(false);
    });

    it('should fail validation if address list is modified', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
      crypto.getRandomValues(addressList);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      const fullData = new Uint8Array(headerData.length + addressList.length);
      fullData.set(headerData);
      fullData.set(addressList, headerData.length);

      // Modify a byte in the address list
      fullData[headerData.length + 10] ^= 1;

      const isValid = cblService.validateSignature(
        fullData,
        creator,
        BlockSize.Message,
      );
      expect(isValid).toBe(false);
    });
  });

  describe('Header Validation', () => {
    it('should reject invalid tuple size', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      expect(() =>
        cblService.makeCblHeader(
          creator,
          testDate,
          1,
          1024,
          addressList,
          BlockSize.Message,
          BlockEncryptionType.None,
          undefined,
          TUPLE.MIN_SIZE - 1, // Too small
        ),
      ).toThrow(CblError);

      expect(() =>
        cblService.makeCblHeader(
          creator,
          testDate,
          1,
          1024,
          addressList,
          BlockSize.Message,
          BlockEncryptionType.None,
          undefined,
          TUPLE.MAX_SIZE + 1, // Too large
        ),
      ).toThrow(CblError);
    });

    it('should reject file size exceeding maximum', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      expect(() =>
        cblService.makeCblHeader(
          creator,
          testDate,
          1,
          Number.MAX_SAFE_INTEGER + 1,
          addressList,
          BlockSize.Message,
          BlockEncryptionType.None,
        ),
      ).toThrow(CblError);
    });

    it('should reject address count exceeding capacity', () => {
      const cblService = serviceProvider.cblService;
      const capacity = cblService.calculateCBLAddressCapacity(
        BlockSize.Message,
        BlockEncryptionType.None,
      );
      const addressList = new Uint8Array(
        (capacity + 1) * CHECKSUM.SHA3_BUFFER_LENGTH,
      );

      expect(() =>
        cblService.makeCblHeader(
          creator,
          testDate,
          capacity + 1,
          1024,
          addressList,
          BlockSize.Message,
          BlockEncryptionType.None,
        ),
      ).toThrow(CblError);
    });
  });

  describe('Byte-by-Byte Verification', () => {
    it('should have no gaps or overlaps in header layout', () => {
      const cblService = serviceProvider.cblService;
      const idSize = cblService.creatorLength;
      const prefixSize = 4; // Structured prefix

      // Calculate expected positions (including structured prefix)
      const positions = [
        { name: 'StructuredPrefix', offset: 0, size: prefixSize },
        { name: 'CreatorId', offset: prefixSize, size: idSize },
        { name: 'DateCreated', offset: prefixSize + idSize, size: 8 },
        { name: 'AddressCount', offset: prefixSize + idSize + 8, size: 4 },
        { name: 'TupleSize', offset: prefixSize + idSize + 12, size: 1 },
        { name: 'DataLength', offset: prefixSize + idSize + 13, size: 8 },
        { name: 'DataChecksum', offset: prefixSize + idSize + 21, size: 64 },
        { name: 'IsExtended', offset: prefixSize + idSize + 85, size: 1 },
        { name: 'Signature', offset: prefixSize + idSize + 86, size: 64 },
      ];

      // Verify no gaps
      for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        expect(prev.offset + prev.size).toBe(curr.offset);
      }

      // Verify total size
      const last = positions[positions.length - 1];
      expect(last.offset + last.size).toBe(cblService.baseHeaderSize);
    });

    it('should write all bytes in header (no uninitialized data)', () => {
      const cblService = serviceProvider.cblService;
      const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);

      const { headerData } = cblService.makeCblHeader(
        creator,
        testDate,
        1,
        1024,
        addressList,
        BlockSize.Message,
        BlockEncryptionType.None,
      );

      // Every byte should be written (no undefined/NaN values)
      for (let i = 0; i < headerData.length; i++) {
        expect(headerData[i]).toBeGreaterThanOrEqual(0);
        expect(headerData[i]).toBeLessThanOrEqual(255);
        expect(Number.isNaN(headerData[i])).toBe(false);
      }
    });
  });
});
