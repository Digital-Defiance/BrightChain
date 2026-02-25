/**
 * @fileoverview Unit tests for TcblBuilder.
 *
 * Tests: empty archive, single entry, multiple entries,
 * with compression, without compression.
 *
 * @see Requirement 4, 7.7
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BLOCK_HEADER, StructuredBlockType } from '../../constants';
import { BlockSize } from '../../enumerations/blockSize';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';
import { ServiceProvider } from '../../services/service.provider';
import { initializeTestServices } from '../../test/service.initializer.helper';
import { RawDataBlock } from '../rawData';
import { TcblBuilder } from './tcblBuilder';

// Mock CBLBase to avoid signature validation issues in tests
jest.mock('../cblBase', () => {
  const originalModule = jest.requireActual('../cblBase');
  originalModule.CBLBase.prototype.validateSignature = jest
    .fn()
    .mockReturnValue(true);
  return originalModule;
});

// Mock bzip2-wasm since it uses ESM/import.meta which Jest cannot handle
jest.mock('bzip2-wasm', () => {
  return {
    __esModule: true,
    default: class MockBZip2 {
      async init() {
        /* no-op */
      }
      compress(data: Uint8Array): Uint8Array {
        // Simple mock: prefix with a marker byte so we can detect compression
        const result = new Uint8Array(data.length + 1);
        result[0] = 0xff; // marker
        result.set(data, 1);
        return result;
      }
      decompress(data: Uint8Array, _length: number): Uint8Array {
        // Strip the marker byte
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

describe('TcblBuilder', () => {
  let creator: Member<Uint8Array>;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test-builder',
      new EmailString('builder@test.com'),
    ).member;
  });

  describe('empty archive', () => {
    it('should build a valid TCBL with no entries', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      // Verify header bytes
      expect(tcbl.data[0]).toBe(BLOCK_HEADER.MAGIC_PREFIX);
      expect(tcbl.data[1]).toBe(StructuredBlockType.TarballCBL);

      // Verify payload
      expect(tcbl.isCompressed).toBe(false);
      expect(tcbl.manifest.version).toBe(1);
      expect(tcbl.manifest.entryCount).toBe(0);
      expect(tcbl.manifest.entries).toHaveLength(0);
    });
  });

  describe('single entry', () => {
    it('should build a TCBL with one entry and store data in block store', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      const data = new Uint8Array([10, 20, 30, 40, 50]);
      await builder.addEntry({
        fileName: 'hello.txt',
        mimeType: 'text/plain',
        data,
      });

      const tcbl = await builder.build();

      // Block store should have been called for entry data + payload
      expect(store.setData).toHaveBeenCalledTimes(2);

      // Verify manifest
      expect(tcbl.manifest.entryCount).toBe(1);
      expect(tcbl.manifest.entries).toHaveLength(1);
      expect(tcbl.manifest.entries[0].fileName).toBe('hello.txt');
      expect(tcbl.manifest.entries[0].mimeType).toBe('text/plain');
      expect(tcbl.manifest.entries[0].originalDataLength).toBe(5);
      expect(tcbl.isCompressed).toBe(false);
    });
  });

  describe('multiple entries', () => {
    it('should build a TCBL with multiple entries preserving order', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      const entries: ITcblEntryInput[] = [
        {
          fileName: 'file1.bin',
          mimeType: 'application/octet-stream',
          data: new Uint8Array([1, 2, 3]),
        },
        {
          fileName: 'image.png',
          mimeType: 'image/png',
          data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        },
        {
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        },
      ];

      for (const entry of entries) {
        await builder.addEntry(entry);
      }

      const tcbl = await builder.build();

      // 3 entry blocks + 1 payload block
      expect(store.setData).toHaveBeenCalledTimes(4);

      expect(tcbl.manifest.entryCount).toBe(3);
      expect(tcbl.manifest.entries).toHaveLength(3);
      for (let i = 0; i < entries.length; i++) {
        expect(tcbl.manifest.entries[i].fileName).toBe(entries[i].fileName);
        expect(tcbl.manifest.entries[i].mimeType).toBe(entries[i].mimeType);
        expect(tcbl.manifest.entries[i].originalDataLength).toBe(
          entries[i].data.length,
        );
      }
    });
  });

  describe('without compression', () => {
    it('should set compression flag to 0x00', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store, undefined, {
        compress: false,
      });

      await builder.addEntry({
        fileName: 'test.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1, 2, 3]),
      });

      const tcbl = await builder.build();
      expect(tcbl.isCompressed).toBe(false);
    });
  });

  describe('with compression', () => {
    it('should set compression flag to 0x01 and compress payload', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store, undefined, {
        compress: true,
      });

      await builder.addEntry({
        fileName: 'test.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1, 2, 3]),
      });

      const tcbl = await builder.build();
      expect(tcbl.isCompressed).toBe(true);
      // The header should still be valid
      expect(tcbl.data[0]).toBe(BLOCK_HEADER.MAGIC_PREFIX);
      expect(tcbl.data[1]).toBe(StructuredBlockType.TarballCBL);
    });
  });

  describe('validation', () => {
    it('should reject entries with path traversal in file name', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await expect(
        builder.addEntry({
          fileName: '../evil.txt',
          mimeType: 'text/plain',
          data: new Uint8Array([1]),
        }),
      ).rejects.toThrow(TcblError);

      try {
        await builder.addEntry({
          fileName: '../evil.txt',
          mimeType: 'text/plain',
          data: new Uint8Array([1]),
        });
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.PathTraversal);
      }
    });

    it('should reject entries with MIME type too long', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await expect(
        builder.addEntry({
          fileName: 'file.bin',
          mimeType: 'x'.repeat(200),
          data: new Uint8Array([1]),
        }),
      ).rejects.toThrow(TcblError);
    });
  });
});
