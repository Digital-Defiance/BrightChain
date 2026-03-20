/**
 * @fileoverview Unit tests for TCBL transparent detection and polymorphic handling.
 *
 * Tests:
 * - Detect TCBL from raw data via isTarballCblData
 * - isTcbl type guard returns true/false correctly
 * - CBL consumer accepts TCBL transparently (polymorphism)
 * - detectBlockFormat recognises TarballCBL structured header
 *
 * @see Requirement 6 (Transparent Detection and Polymorphic Handling)
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BLOCK_HEADER, StructuredBlockType } from '../../constants';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { BlockSize } from '../../enumerations/blockSize';
import { BlockType } from '../../enumerations/blockType';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import {
  detectBlockFormat,
  isTarballCblData,
} from '../../services/blockFormatService';
import { ServiceProvider } from '../../services/service.provider';
import { initializeTestServices } from '../../test/service.initializer.helper';
import { ConstituentBlockListBlock } from '../cbl';
import { RawDataBlock } from '../rawData';
import { TarballConstituentBlockListBlock, isTcbl } from './tcbl';
import { TcblBuilder } from './tcblBuilder';

// Mock CBLBase to avoid signature validation issues in tests
jest.mock('../cblBase', () => {
  const originalModule = jest.requireActual('../cblBase');
  originalModule.CBLBase.prototype.validateSignature = jest
    .fn()
    .mockReturnValue(true);
  return originalModule;
});

// Mock @digitaldefiance/bzip2-wasm since it uses ESM/import.meta which Jest cannot handle
jest.mock('@digitaldefiance/bzip2-wasm', () => {
  return {
    __esModule: true,
    default: class MockBZip2 {
      async init() {
        /* no-op */
      }
      compress(data: Uint8Array): Uint8Array {
        const result = new Uint8Array(data.length + 1);
        result[0] = 0xff;
        result.set(data, 1);
        return result;
      }
      decompress(data: Uint8Array, _length: number): Uint8Array {
        return data.subarray(1);
      }
    },
  };
});

jest.setTimeout(30000);

/**
 * Create a minimal mock IBlockStore that stores blocks in memory.
 */
function createMockBlockStore(blockSize: BlockSize): IBlockStore {
  const store = new Map<string, RawDataBlock>();
  return {
    blockSize,
    has: jest.fn(async (key) => store.has(key.toString())),
    getData: jest.fn(async (key) => {
      const block = store.get(key.toString());
      if (!block) throw new Error(`Block not found: ${key}`);
      return block;
    }),
    setData: jest.fn(async (block: RawDataBlock) => {
      store.set(block.idChecksum.toString(), block);
    }),
    deleteData: jest.fn(),
    getRandomBlocks: jest.fn(async () => []),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    getMetadata: jest.fn(async () => null),
    updateMetadata: jest.fn(),
    generateParityBlocks: jest.fn(async () => []),
    getParityBlocks: jest.fn(async () => []),
    recoverBlock: jest.fn(),
    verifyBlockIntegrity: jest.fn(async () => true),
    getBlocksPendingReplication: jest.fn(async () => []),
    getUnderReplicatedBlocks: jest.fn(async () => []),
    recordReplication: jest.fn(),
    recordReplicaLoss: jest.fn(),
    brightenBlock: jest.fn(),
    storeCBLWithWhitening: jest.fn(),
    retrieveCBL: jest.fn(),
    parseCBLMagnetUrl: jest.fn(),
    generateCBLMagnetUrl: jest.fn(),
  } as unknown as IBlockStore;
}

describe('TCBL Detection and Polymorphic Handling', () => {
  let creator: Member<Uint8Array>;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test-detection',
      new EmailString('detection@test.com'),
    ).member;
  });

  describe('isTarballCblData', () => {
    it('should return true for data with TCBL header (0xBC 0x07)', () => {
      const data = new Uint8Array([
        BLOCK_HEADER.MAGIC_PREFIX,
        StructuredBlockType.TarballCBL,
        0x01,
        0x00,
      ]);
      expect(isTarballCblData(data)).toBe(true);
    });

    it('should return false for data with regular CBL header (0xBC 0x02)', () => {
      const data = new Uint8Array([
        BLOCK_HEADER.MAGIC_PREFIX,
        StructuredBlockType.CBL,
        0x01,
        0x00,
      ]);
      expect(isTarballCblData(data)).toBe(false);
    });

    it('should return false for data with ExtendedCBL header', () => {
      const data = new Uint8Array([
        BLOCK_HEADER.MAGIC_PREFIX,
        StructuredBlockType.ExtendedCBL,
        0x01,
        0x00,
      ]);
      expect(isTarballCblData(data)).toBe(false);
    });

    it('should return false for data shorter than 2 bytes', () => {
      expect(isTarballCblData(new Uint8Array([0xbc]))).toBe(false);
      expect(isTarballCblData(new Uint8Array([]))).toBe(false);
    });

    it('should return false for data without magic prefix', () => {
      const data = new Uint8Array([0x00, StructuredBlockType.TarballCBL]);
      expect(isTarballCblData(data)).toBe(false);
    });
  });

  describe('isTcbl type guard', () => {
    it('should return true for TarballConstituentBlockListBlock instances', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      // tcbl is a TarballConstituentBlockListBlock which extends ConstituentBlockListBlock
      const cblRef: ConstituentBlockListBlock<Uint8Array> = tcbl;
      expect(isTcbl(cblRef)).toBe(true);
    });

    it('should narrow the type when used in a conditional', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      await builder.addEntry({
        fileName: 'test.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1, 2, 3]),
      });
      const tcbl = await builder.build();

      const cblRef: ConstituentBlockListBlock<Uint8Array> = tcbl;
      if (isTcbl(cblRef)) {
        // TypeScript should allow accessing TCBL-specific properties
        expect(cblRef.manifest).toBeDefined();
        expect(cblRef.entries).toHaveLength(1);
        expect(cblRef.entries[0].fileName).toBe('test.txt');
      } else {
        throw new Error('isTcbl should have returned true');
      }
    });

    it('should return false for plain ConstituentBlockListBlock instances', () => {
      // Build a plain CBL using the CBL service
      const cblService = ServiceProvider.getInstance().cblService;
      const header = cblService.makeCblHeader(
        creator,
        new Date(),
        0,
        0,
        new Uint8Array(0),
        blockSize,
        BlockEncryptionType.None,
      );

      const data = new Uint8Array(blockSize as number);
      data.set(header.headerData, 0);

      const cbl = new ConstituentBlockListBlock(data, creator, blockSize);
      expect(isTcbl(cbl)).toBe(false);
    });
  });

  describe('polymorphic CBL consumer acceptance (Req 6.5)', () => {
    it('TCBL should be assignable to ConstituentBlockListBlock reference', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      // This assignment must compile — TCBL is a subtype of CBL
      const cblRef: ConstituentBlockListBlock<Uint8Array> = tcbl;
      expect(cblRef).toBeInstanceOf(ConstituentBlockListBlock);
      expect(cblRef).toBeInstanceOf(TarballConstituentBlockListBlock);
    });

    it('TCBL should expose base CBL properties via CBL reference', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      const cblRef: ConstituentBlockListBlock<Uint8Array> = tcbl;
      // Base CBL properties should be accessible
      expect(cblRef.blockSize).toBe(blockSize);
      expect(cblRef.cblAddressCount).toBeDefined();
      expect(cblRef.data).toBeDefined();
    });
  });

  describe('detectBlockFormat recognises TarballCBL', () => {
    it('should map TarballCBL to BlockType.TarballConstituentBlockList', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      const result = detectBlockFormat(tcbl.data);
      expect(result.isStructured).toBe(true);
      expect(result.blockType).toBe(BlockType.TarballConstituentBlockList);
    });
  });
});
