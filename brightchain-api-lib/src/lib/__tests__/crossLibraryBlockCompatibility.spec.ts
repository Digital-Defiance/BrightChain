/**
 * @fileoverview Cross-Library Block Compatibility Tests
 *
 * These tests verify that blocks created in brightchain-lib can be properly
 * consumed by brightchain-api-lib and vice versa. This ensures binary
 * compatibility across the library boundary.
 *
 * Block Types Tested:
 * - RawDataBlock: Basic data storage blocks
 * - CBL Headers: Block references with structured headers
 * - RandomBlock: Random data blocks for whitening
 *
 * Test Categories:
 * 1. Serialization Round-Trip: Create in lib → serialize → deserialize in api-lib
 * 2. Checksum Consistency: Same data produces same checksums across libraries
 * 3. Block Store Operations: Store from lib, retrieve in api-lib
 * 4. Header Format Compatibility: CBL headers parsed correctly across libraries
 */

import {
  BlockDataType,
  BlockEncryptionType,
  BlockSize,
  BlockType,
  CBLService,
  Checksum,
  ChecksumService,
  CONSTANTS,
  initializeBrightChain,
  RandomBlock,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
  XorService,
} from '@brightchain/brightchain-lib';
import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';

describe('Cross-Library Block Compatibility', () => {
  let checksumService: ChecksumService;
  let cblService: CBLService<PlatformID>;
  let testMember: Member<PlatformID>;
  let diskStore: DiskBlockAsyncStore;
  let testDir: string;

  beforeAll(async () => {
    // Initialize BrightChain library before running tests
    initializeBrightChain();

    // Initialize service provider - use the same pattern as brightchain-lib tests
    const serviceProvider = ServiceProvider.getInstance<PlatformID>();
    ServiceLocator.setServiceProvider(serviceProvider);

    // Create services using the same pattern as cblService.spec.ts
    checksumService = new ChecksumService();
    const eciesService = serviceProvider.eciesService;
    const idProvider = serviceProvider.idProvider;
    cblService = new CBLService<PlatformID>(
      checksumService,
      eciesService,
      idProvider,
    );

    // Create test member using the same pattern
    const { member } = Member.newMember<PlatformID>(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
    testMember = member;

    // Create temp directory for disk store
    testDir = join(tmpdir(), `cross-lib-test-${Date.now()}`);
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    diskStore = new DiskBlockAsyncStore({
      storePath: testDir,
      blockSize: BlockSize.Small,
    });
  });

  afterAll(async () => {
    ServiceLocator.reset();
    // Clean up temp directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('RawDataBlock Compatibility', () => {
    it('should create RawDataBlock in brightchain-lib and verify checksum consistency', () => {
      const testData = randomBytes(100);
      const block = new RawDataBlock(BlockSize.Small, testData);

      // Verify block properties
      expect(block.blockSize).toBe(BlockSize.Small);
      expect(block.blockType).toBe(BlockType.RawData);
      expect(block.idChecksum).toBeInstanceOf(Checksum);

      // Verify checksum is deterministic
      const block2 = new RawDataBlock(BlockSize.Small, testData);
      expect(block.idChecksum.equals(block2.idChecksum)).toBe(true);
    });

    it('should store RawDataBlock from brightchain-lib in DiskBlockAsyncStore', async () => {
      const testData = randomBytes(100);
      const block = new RawDataBlock(BlockSize.Small, testData);

      // Store in disk store (api-lib)
      await diskStore.setData(block);

      // Verify block can be retrieved
      const hasBlock = await diskStore.has(block.idChecksum);
      expect(hasBlock).toBe(true);

      // Retrieve and verify data
      const retrieved = await diskStore.getData(block.idChecksum);
      expect(retrieved.blockSize).toBe(block.blockSize);
      expect(retrieved.idChecksum.equals(block.idChecksum)).toBe(true);
    });

    it('should handle empty data blocks with padding', () => {
      const emptyData = new Uint8Array(0);
      const block = new RawDataBlock(BlockSize.Small, emptyData);

      // Empty data gets padded to block size
      expect(block.blockSize).toBe(BlockSize.Small);
      // The block should have a valid checksum
      expect(block.idChecksum).toBeInstanceOf(Checksum);
    });

    it('should handle maximum size data blocks', () => {
      const maxData = randomBytes(BlockSize.Small);
      const block = new RawDataBlock(BlockSize.Small, maxData);

      expect(block.data.length).toBe(BlockSize.Small);
    });
  });

  describe('RandomBlock Compatibility', () => {
    it('should create RandomBlock in brightchain-lib and store in api-lib', async () => {
      const randomBlock = RandomBlock.new(BlockSize.Small);

      expect(randomBlock.blockType).toBe(BlockType.Random);
      expect(randomBlock.blockSize).toBe(BlockSize.Small);

      // Store in disk store
      const rawBlock = new RawDataBlock(
        BlockSize.Small,
        randomBlock.data,
        new Date(),
        randomBlock.idChecksum,
      );
      await diskStore.setData(rawBlock);

      // Verify retrieval
      const hasBlock = await diskStore.has(randomBlock.idChecksum);
      expect(hasBlock).toBe(true);
    });

    it('should generate unique random blocks', () => {
      const block1 = RandomBlock.new(BlockSize.Small);
      const block2 = RandomBlock.new(BlockSize.Small);

      // Random blocks should have different checksums (with overwhelming probability)
      expect(block1.idChecksum.equals(block2.idChecksum)).toBe(false);
    });
  });

  describe('CBL Header Format Compatibility', () => {
    it('should create CBL header with structured format in brightchain-lib', () => {
      const addressList = Buffer.alloc(0);
      const result = cblService.makeCblHeader(
        testMember,
        new Date(),
        2, // addressCount
        200, // originalDataLength
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
      );

      expect(result.headerData).toBeDefined();
      expect(result.headerData.length).toBeGreaterThan(0);
    });

    it('should verify CBL magic bytes (0xBC prefix)', () => {
      const addressList = Buffer.alloc(0);
      const result = cblService.makeCblHeader(
        testMember,
        new Date(),
        1, // addressCount
        100, // originalDataLength
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
      );

      // Check that CBL header starts with magic prefix
      expect(result.headerData[0]).toBe(0xbc);
    });

    it('should parse CBL header correctly across libraries', () => {
      const testDate = new Date();
      const addressCount = 5;
      const dataLength = 1000;
      const addressList = Buffer.alloc(0);

      const result = cblService.makeCblHeader(
        testMember,
        testDate,
        addressCount,
        dataLength,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
      );

      // Parse header using CBLService
      const parsedHeader = cblService.parseBaseHeader(result.headerData);

      expect(parsedHeader.cblAddressCount).toBe(addressCount);
      expect(Number(parsedHeader.originalDataLength)).toBe(dataLength);
    });

    it('should preserve creator ID in CBL header', () => {
      const addressList = Buffer.alloc(0);
      const result = cblService.makeCblHeader(
        testMember,
        new Date(),
        1,
        100,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
      );

      const creatorId = cblService.getCreatorId(Buffer.from(result.headerData));
      expect(creatorId.toString()).toBe(testMember.id.toString());
    });

    it('should preserve date in CBL header', () => {
      const testDate = new Date('2024-01-01T00:00:00Z');
      const addressList = Buffer.alloc(0);
      const result = cblService.makeCblHeader(
        testMember,
        testDate,
        1,
        100,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
      );

      const parsedDate = cblService.getDateCreated(
        Buffer.from(result.headerData),
      );
      expect(parsedDate.getTime()).toBe(testDate.getTime());
    });
  });

  describe('Checksum Consistency', () => {
    it('should produce identical checksums for same data across libraries', () => {
      const testData = Buffer.from('test data for checksum consistency');

      // Calculate checksum using ChecksumService
      const checksum1 = checksumService.calculateChecksum(testData);
      const checksum2 = checksumService.calculateChecksum(testData);

      expect(checksum1.equals(checksum2)).toBe(true);
    });

    it('should produce different checksums for different data', () => {
      const data1 = Buffer.from('data 1');
      const data2 = Buffer.from('data 2');

      const checksum1 = checksumService.calculateChecksum(data1);
      const checksum2 = checksumService.calculateChecksum(data2);

      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should handle Checksum serialization round-trip', () => {
      const testData = randomBytes(100);
      const checksum = checksumService.calculateChecksum(testData);

      // Serialize to hex
      const hex = checksum.toHex();

      // Deserialize from hex
      const restored = Checksum.fromHex(hex);

      expect(checksum.equals(restored)).toBe(true);
    });

    it('should handle Checksum buffer round-trip', () => {
      const testData = randomBytes(100);
      const checksum = checksumService.calculateChecksum(testData);

      // Serialize to buffer
      const buffer = checksum.toBuffer();

      // Deserialize from buffer
      const restored = Checksum.fromBuffer(buffer);

      expect(checksum.equals(restored)).toBe(true);
    });
  });

  describe('Block Store Operations', () => {
    it('should store block in DiskBlockAsyncStore (api-lib) and verify existence', async () => {
      const testData = randomBytes(100);
      const block = new RawDataBlock(BlockSize.Small, testData);

      await diskStore.setData(block);

      const exists = await diskStore.has(block.idChecksum);
      expect(exists).toBe(true);
    });

    it('should handle block deletion consistently', async () => {
      const testData = randomBytes(100);
      const block = new RawDataBlock(BlockSize.Small, testData);

      // Store and verify
      await diskStore.setData(block);
      expect(await diskStore.has(block.idChecksum)).toBe(true);

      // Delete and verify
      await diskStore.deleteData(block.idChecksum);
      expect(await diskStore.has(block.idChecksum)).toBe(false);
    });

    it('should retrieve block data correctly', async () => {
      const testData = randomBytes(100);
      const block = new RawDataBlock(BlockSize.Small, testData);

      await diskStore.setData(block);

      const retrieved = await diskStore.getData(block.idChecksum);

      // Verify the retrieved block has the same checksum
      expect(retrieved.idChecksum.equals(block.idChecksum)).toBe(true);
      expect(retrieved.blockSize).toBe(block.blockSize);
    });
  });

  describe('Block Size Handling', () => {
    const blockSizes = [
      BlockSize.Tiny,
      BlockSize.Small,
      BlockSize.Medium,
      BlockSize.Large,
    ];

    blockSizes.forEach((size) => {
      it(`should handle BlockSize ${size} consistently`, () => {
        // Create data that fits within the block size
        const dataSize = Math.min(100, size);
        const testData = randomBytes(dataSize);
        const block = new RawDataBlock(size, testData);

        expect(block.blockSize).toBe(size);
        // RawDataBlock stores data as-is (not padded)
        expect(block.data.length).toBe(dataSize);
      });
    });
  });

  describe('Block Type Enumeration Consistency', () => {
    it('should have consistent BlockType values across libraries', () => {
      // Verify key block types are defined
      expect(BlockType.Unknown).toBeDefined();
      expect(BlockType.RawData).toBeDefined();
      expect(BlockType.Random).toBeDefined();
      expect(BlockType.ConstituentBlockList).toBeDefined();
    });

    it('should have consistent BlockDataType values', () => {
      expect(BlockDataType.RawData).toBeDefined();
      expect(BlockDataType.EphemeralStructuredData).toBeDefined();
    });
  });

  describe('XOR Operations Compatibility', () => {
    it('should perform XOR operations consistently using XorService', () => {
      const data1 = randomBytes(BlockSize.Small);
      const data2 = randomBytes(BlockSize.Small);

      // XOR using XorService static method
      const result = XorService.xor(data1, data2);

      // Verify XOR properties: A XOR B XOR B = A
      const restored = XorService.xor(result, data2);
      expect(Buffer.from(restored).equals(Buffer.from(data1))).toBe(true);
    });

    it('should handle XOR with multiple arrays', () => {
      const arrays = [
        randomBytes(BlockSize.Small),
        randomBytes(BlockSize.Small),
        randomBytes(BlockSize.Small),
      ];

      // XOR all arrays using static method
      let result: Uint8Array = new Uint8Array(arrays[0]);
      for (let i = 1; i < arrays.length; i++) {
        result = XorService.xor(result, arrays[i]);
      }

      // Verify result has correct length
      expect(result.length).toBe(BlockSize.Small);
    });
  });

  describe('Constants Consistency', () => {
    it('should have consistent TUPLE constants', () => {
      expect(CONSTANTS.TUPLE).toBeDefined();
      expect(typeof CONSTANTS.TUPLE.SIZE).toBe('number');
    });

    it('should have consistent CBL constants', () => {
      expect(CONSTANTS.CBL).toBeDefined();
    });
  });

  describe('Extended CBL Header Compatibility', () => {
    it('should create extended CBL header with file metadata', () => {
      const addressList = Buffer.alloc(0);
      const result = cblService.makeCblHeader(
        testMember,
        new Date(),
        1,
        100,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
        { fileName: 'test.txt', mimeType: 'text/plain' },
      );

      expect(result.headerData).toBeDefined();
      expect(cblService.isExtendedHeader(Buffer.from(result.headerData))).toBe(
        true,
      );
    });

    it('should parse extended header file name', () => {
      const fileName = 'test-file.txt';
      const mimeType = 'text/plain';
      const addressList = Buffer.alloc(0);

      const result = cblService.makeCblHeader(
        testMember,
        new Date(),
        1,
        100,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
        { fileName, mimeType },
      );

      const parsedFileName = cblService.getFileName(
        Buffer.from(result.headerData),
      );
      expect(parsedFileName).toBe(fileName);
    });

    it('should parse extended header MIME type', () => {
      const fileName = 'test-file.txt';
      const mimeType = 'application/json';
      const addressList = Buffer.alloc(0);

      const result = cblService.makeCblHeader(
        testMember,
        new Date(),
        1,
        100,
        addressList,
        BlockSize.Small,
        BlockEncryptionType.None,
        { fileName, mimeType },
      );

      const parsedMimeType = cblService.getMimeType(
        Buffer.from(result.headerData),
      );
      expect(parsedMimeType).toBe(mimeType);
    });
  });

  describe('SuperCBL Header Compatibility', () => {
    it('should create SuperCBL header with correct magic bytes', () => {
      // Create checksums using the same pattern as existing tests
      const subCblCount = 2;
      const subCblChecksums: Checksum[] = [];
      for (let i = 0; i < subCblCount; i++) {
        subCblChecksums.push(
          Checksum.fromUint8Array(new Uint8Array(64).fill(i)),
        );
      }
      const originalChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

      const result = cblService.makeSuperCblHeader(
        testMember,
        new Date(),
        subCblCount, // subCblCount
        10, // totalBlockCount
        1, // depth
        1000, // originalDataLength
        originalChecksum,
        subCblChecksums,
        BlockSize.Small,
      );

      expect(result.headerData).toBeDefined();
      // SuperCBL magic bytes: 0xBC 0x03
      expect(result.headerData[0]).toBe(0xbc);
      expect(result.headerData[1]).toBe(0x03);
    });

    it('should parse SuperCBL header correctly', () => {
      // Create checksums using the same pattern as existing tests
      const subCblCount = 3;
      const subCblChecksums: Checksum[] = [];
      for (let i = 0; i < subCblCount; i++) {
        subCblChecksums.push(
          Checksum.fromUint8Array(new Uint8Array(64).fill(i)),
        );
      }
      const originalChecksum = Checksum.fromUint8Array(
        new Uint8Array(64).fill(0xab),
      );

      const totalBlockCount = 15;
      const originalDataLength = 5000;
      const depth = 2;

      const result = cblService.makeSuperCblHeader(
        testMember,
        new Date(),
        subCblCount,
        totalBlockCount,
        depth,
        originalDataLength,
        originalChecksum,
        subCblChecksums,
        BlockSize.Small,
      );

      // Combine header with address data (same pattern as existing tests)
      const addressData = new Uint8Array(subCblCount * 64);
      for (let i = 0; i < subCblCount; i++) {
        addressData.set(subCblChecksums[i].toUint8Array(), i * 64);
      }
      const fullData = new Uint8Array(
        result.headerData.length + addressData.length,
      );
      fullData.set(result.headerData, 0);
      fullData.set(addressData, result.headerData.length);

      const parsed = cblService.parseSuperCblHeader(fullData);

      expect(parsed.subCblCount).toBe(subCblCount);
      expect(parsed.totalBlockCount).toBe(totalBlockCount);
      expect(parsed.depth).toBe(depth);
      expect(Number(parsed.originalDataLength)).toBe(originalDataLength);
    });
  });
});
