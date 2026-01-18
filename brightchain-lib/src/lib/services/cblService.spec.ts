import { EmailString, Member } from '@digitaldefiance/ecies-lib';
import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { CHECKSUM, TUPLE } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import MemberType from '../enumerations/memberType';
import { CblError } from '../errors/cblError';
import { Checksum } from '../types/checksum';
import { BlockCapacityCalculator } from './blockCapacity.service';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('CBLService', () => {
  let creator: Member;

  beforeAll(() => {
    const { member } = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    );
    creator = member;
  });

  function createTestServices() {
    const checksumService = new ChecksumService();
    const eciesService = ServiceProvider.getInstance().eciesService;
    const cblService = new CBLService(checksumService, eciesService);
    const capacityCalculator = new BlockCapacityCalculator(
      cblService,
      eciesService,
    );
    return { checksumService, eciesService, cblService, capacityCalculator };
  }

  function createTestAddressList(length = 3) {
    const addressList = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH * length);
    crypto.getRandomValues(addressList);
    return Buffer.from(addressList);
  }

  function createTestExtendedHeader(cblService: CBLService) {
    return cblService.makeCblHeader(
      creator,
      new Date(),
      1,
      100,
      Buffer.alloc(0),
      BlockSize.Small,
      BlockEncryptionType.None,
      { fileName: 'test.txt', mimeType: 'text/plain' },
    ).headerData;
  }

  describe('hasControlChars', () => {
    let cblService: CBLService;

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;
    });

    it('should return true if string contains control characters', () => {
      expect(cblService.hasControlChars('Hello\nWorld')).toBe(true);
      expect(cblService.hasControlChars('Hello\tWorld')).toBe(true);
      expect(cblService.hasControlChars('Hello\rWorld')).toBe(true);
      expect(cblService.hasControlChars('Hello\0World')).toBe(true);
    });

    it('should return false if string does not contain control characters', () => {
      expect(cblService.hasControlChars('Hello World')).toBe(false);
      expect(cblService.hasControlChars('Hello!@#$%^&*()World')).toBe(false);
      expect(cblService.hasControlChars('')).toBe(false);
    });
  });

  describe('Header Field Access', () => {
    let cblService: CBLService;
    let header: Buffer;
    const testDate = new Date('2024-01-01T00:00:00Z');
    const addressCount = 5;
    const dataLength = 1000;
    const tupleSize = 3;

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;
      const addressList = createTestAddressList(0);
      const result = cblService.makeCblHeader(
        creator,
        testDate,
        addressCount,
        dataLength,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
        undefined,
        tupleSize,
      );
      header = Buffer.from(result.headerData);
    });

    it('should correctly get creator ID', () => {
      const creatorId = cblService.getCreatorId(header);
      expect(creatorId.toString()).toBe(creator.id.toString());
    });

    it('should correctly get date created', () => {
      const date = cblService.getDateCreated(header);
      expect(date.getTime()).toBe(testDate.getTime());
    });

    it('should correctly get address count', () => {
      expect(cblService.getCblAddressCount(header)).toBe(addressCount);
    });

    it('should correctly get original data length', () => {
      expect(cblService.getOriginalDataLength(header)).toBe(dataLength);
    });

    it('should correctly get tuple size', () => {
      expect(cblService.getTupleSize(header)).toBe(tupleSize);
    });

    it('should correctly identify non-extended header', () => {
      expect(cblService.isExtendedHeader(header)).toBe(false);
    });
  });

  describe('Extended Header Operations', () => {
    let cblService: CBLService;
    let extendedHeader: Buffer;
    const fileName = 'test.txt';
    const mimeType = 'text/plain';

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;
      extendedHeader = Buffer.from(createTestExtendedHeader(cblService));
    });

    it('should correctly identify extended header', () => {
      expect(cblService.isExtendedHeader(extendedHeader)).toBe(true);
    });

    it('should correctly get file name length', () => {
      expect(cblService.getFileNameLength(extendedHeader)).toBe(
        fileName.length,
      );
    });

    it('should correctly get file name', () => {
      expect(cblService.getFileName(extendedHeader)).toBe(fileName);
    });

    it('should correctly get mime type length', () => {
      expect(cblService.getMimeTypeLength(extendedHeader)).toBe(
        mimeType.length,
      );
    });

    it('should correctly get mime type', () => {
      expect(cblService.getMimeType(extendedHeader)).toBe(mimeType);
    });

    it('should throw error when accessing extended fields on non-extended header', () => {
      const nonExtendedHeader = cblService.makeCblHeader(
        creator,
        new Date(),
        1,
        100,
        Buffer.alloc(0),
        BlockSize.Small,
        BlockEncryptionType.None,
      ).headerData;

      expect(() => cblService.getFileNameLength(nonExtendedHeader)).toThrow(
        CblError,
      );
      expect(() => cblService.getFileName(nonExtendedHeader)).toThrow(CblError);
      expect(() => cblService.getMimeTypeLength(nonExtendedHeader)).toThrow(
        CblError,
      );
      expect(() => cblService.getMimeType(nonExtendedHeader)).toThrow(CblError);
    });
  });

  describe('File Name Validation', () => {
    let cblService: CBLService;

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;
    });

    it('should throw error for empty file name', () => {
      expect(() => cblService.validateFileNameFormat('')).toThrow(
        'File name is required',
      );
      expect(() => cblService.validateFileNameFormat('   ')).toThrow(
        'File name cannot be empty',
      );
    });

    it('should throw error for file names with control characters', () => {
      expect(() => cblService.validateFileNameFormat('file\nname')).toThrow(
        'File name contains control characters',
      );
      expect(() => cblService.validateFileNameFormat('file\tname')).toThrow(
        'File name contains control characters',
      );
    });

    it('should throw error for file names with path traversal', () => {
      expect(() => cblService.validateFileNameFormat('../filename')).toThrow(
        'File name contains invalid character',
      );
      expect(() => cblService.validateFileNameFormat('folder/../file')).toThrow(
        'File name contains invalid character',
      );
    });

    it('should accept valid file names', () => {
      expect(() =>
        cblService.validateFileNameFormat('filename.txt'),
      ).not.toThrow();
      expect(() =>
        cblService.validateFileNameFormat('my-file_1.2.3.doc'),
      ).not.toThrow();
    });
  });

  describe('MIME Type Validation', () => {
    let cblService: CBLService;

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;
    });

    it('should throw error for empty mime type', () => {
      expect(() => cblService.validateMimeTypeFormat('')).toThrow(
        'MIME type is required',
      );
      expect(() => cblService.validateMimeTypeFormat('   ')).toThrow(
        'MIME type cannot be empty',
      );
    });

    it('should throw error for mime types with whitespace', () => {
      expect(() => cblService.validateMimeTypeFormat(' text/plain ')).toThrow(
        'MIME type cannot start or end with spaces',
      );
    });

    it('should throw error for uppercase mime types', () => {
      expect(() => cblService.validateMimeTypeFormat('TEXT/PLAIN')).toThrow(
        'MIME type must be lowercase',
      );
    });

    it('should throw error for invalid mime type format', () => {
      expect(() => cblService.validateMimeTypeFormat('invalid')).toThrow(
        'Invalid MIME type format',
      );
      expect(() => cblService.validateMimeTypeFormat('text/')).toThrow(
        'Invalid MIME type format',
      );
      expect(() => cblService.validateMimeTypeFormat('/plain')).toThrow(
        'Invalid MIME type format',
      );
    });

    it('should accept valid mime types', () => {
      expect(() =>
        cblService.validateMimeTypeFormat('text/plain'),
      ).not.toThrow();
      expect(() =>
        cblService.validateMimeTypeFormat('application/json'),
      ).not.toThrow();
      expect(() =>
        cblService.validateMimeTypeFormat('image/png'),
      ).not.toThrow();
    });
  });

  describe('Address Data Handling', () => {
    let cblService: CBLService;
    let header: Buffer;
    const addressCount = 3;
    let addresses: Buffer[];

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;

      // Create some test addresses
      addresses = Array(addressCount)
        .fill(null)
        .map(() => {
          const addr = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
          crypto.getRandomValues(addr);
          return Buffer.from(addr);
        });

      // Combine addresses into one buffer
      const addressList = Buffer.concat(addresses);

      const result = cblService.makeCblHeader(
        creator,
        new Date(),
        addressCount,
        1000,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
      );

      // Combine header with address list
      header = Buffer.concat([result.headerData, addressList]);
    });

    it('should correctly get address data', () => {
      const addressData = cblService.getAddressData(header);
      expect(addressData.length).toBe(
        addressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
      );

      // Verify each address in the data
      addresses.forEach((addr: Buffer, i: number) => {
        const extractedAddr = addressData.subarray(
          i * CHECKSUM.SHA3_BUFFER_LENGTH,
          (i + 1) * CHECKSUM.SHA3_BUFFER_LENGTH,
        );
        expect(Buffer.compare(extractedAddr, addr)).toBe(0);
      });
    });

    it('should correctly convert address data to addresses', () => {
      const extractedAddresses = cblService.addressDataToAddresses(header);
      expect(extractedAddresses.length).toBe(addressCount);

      // Verify each extracted address matches original
      extractedAddresses.forEach((addr: Checksum, i: number) => {
        expect(Buffer.compare(addr.toBuffer(), addresses[i])).toBe(0);
      });
    });
  });

  describe('Signature Validation', () => {
    let cblService: CBLService;
    let header: Buffer;
    let addressList: Buffer;
    const blockSize = BlockSize.Medium;

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;

      // Create a small address list
      const addressCount = 2;
      addressList = createTestAddressList(addressCount);

      // Create header and combine with address list
      const result = cblService.makeCblHeader(
        creator,
        new Date(),
        addressCount,
        1000,
        addressList,
        blockSize,
        BlockEncryptionType.None,
      );

      // Calculate total size needed
      const totalSize = result.headerData.length + addressList.length;
      const paddingSize = blockSize - (totalSize % blockSize);

      // Create final buffer with padding
      header = Buffer.alloc(totalSize + paddingSize, 0); // Fill with zeros
      Buffer.from(result.headerData).copy(header);
      addressList.copy(header, result.headerData.length);
    });

    it('should validate signature with correct creator', () => {
      expect(cblService.validateSignature(header, creator)).toBe(true);
    });

    it('should fail validation with wrong creator', () => {
      const { member: wrongCreator } = Member.newMember(
        ServiceProvider.getInstance().eciesService,
        MemberType.User,
        faker.person.fullName(),
        new EmailString(faker.internet.email()),
      );
      expect(cblService.validateSignature(header, wrongCreator)).toBe(false);
    });

    it('should fail validation with modified header', () => {
      // Modify the original data length in the header
      header.writeUInt32BE(2000, CBLService.HeaderOffsets.OriginalDataLength);
      expect(cblService.validateSignature(header, creator)).toBe(false);
    });

    it('should fail validation with modified address list', () => {
      // Get the original header length
      const headerLength = cblService.getHeaderLength(header);

      // Create a modified copy of the header
      const modifiedHeader = Buffer.from(header);

      // Modify the first byte of the first address
      modifiedHeader[headerLength] = (modifiedHeader[headerLength] + 1) % 256;

      expect(cblService.validateSignature(modifiedHeader, creator)).toBe(false);
    });
  });

  describe('CBL Address Capacity Calculation', () => {
    let cblService: CBLService;

    beforeEach(() => {
      const services = createTestServices();
      cblService = services.cblService;
    });

    it('should calculate correct capacity for basic CBL', () => {
      const capacity = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
      );
      expect(capacity).toBeGreaterThan(0);
      expect(capacity % TUPLE.SIZE).toBe(0); // Should be multiple of tuple size
    });

    it('should calculate correct capacity with encryption overhead', () => {
      const withEncryption = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.MultiRecipient,
      );
      const withoutEncryption = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
      );
      expect(withEncryption).toBeLessThan(withoutEncryption);
      expect(withEncryption % TUPLE.SIZE).toBe(0);
      expect(withoutEncryption % TUPLE.SIZE).toBe(0);
    });

    it('should calculate correct capacity with extended header', () => {
      const basicCapacity = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
      );
      const filename = `${randomBytes(120).toString('hex')}.txt`;
      const extendedCapacity = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
        {
          fileName: filename,
          mimeType: 'text/plain',
        },
      );
      expect(extendedCapacity).toBeLessThan(basicCapacity);
      expect(extendedCapacity % TUPLE.SIZE).toBe(0);
    });

    it('should handle different block sizes', () => {
      const capacitySmall = cblService.calculateCBLAddressCapacity(
        BlockSize.Small,
        BlockEncryptionType.None,
      );
      const capacityMedium = cblService.calculateCBLAddressCapacity(
        BlockSize.Medium,
        BlockEncryptionType.None,
      );
      const capacityLarge = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
      );

      expect(capacityMedium).toBeGreaterThan(capacitySmall);
      expect(capacityLarge).toBeGreaterThan(capacityMedium);
      expect(capacitySmall % TUPLE.SIZE).toBe(0);
      expect(capacityMedium % TUPLE.SIZE).toBe(0);
      expect(capacityLarge % TUPLE.SIZE).toBe(0);
    });

    it('should handle combined overhead', () => {
      const filename = `${randomBytes(120).toString('hex')}.txt`; // needs to be a long filename to affect aligned address capacity
      const basicCapacity = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
      );
      const withEncryption = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.MultiRecipient,
      );
      const withExtended = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.None,
        {
          fileName: filename,
          mimeType: 'text/plain',
        },
      );
      const withBoth = cblService.calculateCBLAddressCapacity(
        BlockSize.Large,
        BlockEncryptionType.MultiRecipient,
        {
          fileName: filename,
          mimeType: 'text/plain',
        },
      );

      expect(withEncryption).toBeLessThan(basicCapacity);
      expect(withExtended).toBeLessThan(basicCapacity);
      expect(withBoth).toBeLessThan(withEncryption);
      expect(withBoth).toBeLessThanOrEqual(withExtended);
      expect(withBoth % TUPLE.SIZE).toBe(0);
    });
  });
});
