/**
 * @fileoverview Unit tests for TcblReader.
 *
 * Tests: list entries, get by index, get by name, checksum mismatch,
 * not-found errors, compressed archive, uncompressed archive.
 *
 * @see Requirement 5, 7.7
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';
import { ServiceProvider } from '../../services/service.provider';
import { initializeTestServices } from '../../test/service.initializer.helper';
import { RawDataBlock } from '../rawData';
import { TcblBuilder } from './tcblBuilder';
import { TcblReader } from './tcblReader';

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

describe('TcblReader', () => {
  let creator: Member<Uint8Array>;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test-reader',
      new EmailString('reader@test.com'),
    ).member;
  });

  describe('uncompressed archive', () => {
    it('should open and list entries from an uncompressed TCBL', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store, undefined, {
        compress: false,
      });

      const entries: ITcblEntryInput[] = [
        {
          fileName: 'file1.txt',
          mimeType: 'text/plain',
          data: new Uint8Array([10, 20, 30]),
        },
        {
          fileName: 'image.png',
          mimeType: 'image/png',
          data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        },
      ];

      for (const entry of entries) {
        await builder.addEntry(entry);
      }
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      const listed = reader.listEntries();
      expect(listed).toHaveLength(2);
      expect(listed[0].fileName).toBe('file1.txt');
      expect(listed[0].mimeType).toBe('text/plain');
      expect(listed[0].originalDataLength).toBe(3);
      expect(listed[1].fileName).toBe('image.png');
      expect(listed[1].mimeType).toBe('image/png');
      expect(listed[1].originalDataLength).toBe(4);
    });
  });

  describe('compressed archive', () => {
    it('should open and list entries from a compressed TCBL', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store, undefined, {
        compress: true,
      });

      await builder.addEntry({
        fileName: 'compressed.bin',
        mimeType: 'application/octet-stream',
        data: new Uint8Array([1, 2, 3, 4, 5]),
      });
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      const listed = reader.listEntries();
      expect(listed).toHaveLength(1);
      expect(listed[0].fileName).toBe('compressed.bin');
      expect(listed[0].originalDataLength).toBe(5);
    });
  });

  describe('getEntryByIndex', () => {
    it('should retrieve entry data by index', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      const data1 = new Uint8Array([10, 20, 30]);
      const data2 = new Uint8Array([40, 50, 60, 70]);

      await builder.addEntry({
        fileName: 'first.bin',
        mimeType: 'application/octet-stream',
        data: data1,
      });
      await builder.addEntry({
        fileName: 'second.bin',
        mimeType: 'application/octet-stream',
        data: data2,
      });
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      const result0 = await reader.getEntryByIndex(0);
      expect(Array.from(result0)).toEqual(Array.from(data1));

      const result1 = await reader.getEntryByIndex(1);
      expect(Array.from(result1)).toEqual(Array.from(data2));
    });

    it('should throw EntryNotFound for out-of-range index', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await builder.addEntry({
        fileName: 'only.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1]),
      });
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      await expect(reader.getEntryByIndex(5)).rejects.toThrow(TcblError);
      try {
        await reader.getEntryByIndex(5);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.EntryNotFound);
      }
    });

    it('should throw EntryNotFound for negative index', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await builder.addEntry({
        fileName: 'only.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1]),
      });
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      await expect(reader.getEntryByIndex(-1)).rejects.toThrow(TcblError);
      try {
        await reader.getEntryByIndex(-1);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.EntryNotFound);
      }
    });
  });

  describe('getEntryByName', () => {
    it('should retrieve entry data by file name', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      const data = new Uint8Array([99, 88, 77]);
      await builder.addEntry({
        fileName: 'target.dat',
        mimeType: 'application/octet-stream',
        data,
      });
      await builder.addEntry({
        fileName: 'other.dat',
        mimeType: 'application/octet-stream',
        data: new Uint8Array([1, 2]),
      });
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      const result = await reader.getEntryByName('target.dat');
      expect(Array.from(result)).toEqual(Array.from(data));
    });

    it('should throw EntryNotFound for non-existent file name', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await builder.addEntry({
        fileName: 'exists.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1]),
      });
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      await expect(reader.getEntryByName('does-not-exist.txt')).rejects.toThrow(
        TcblError,
      );
      try {
        await reader.getEntryByName('does-not-exist.txt');
      } catch (e) {
        expect((e as TcblError).errorType).toBe(TcblErrorType.EntryNotFound);
      }
    });
  });

  describe('manifest checksum validation', () => {
    it('should throw ManifestChecksumMismatch on corrupted manifest', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await builder.addEntry({
        fileName: 'test.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([1, 2, 3]),
      });
      const tcbl = await builder.build();

      // Corrupt the payload in the store: find the payload block
      // (last address) and tamper with its manifest data
      const addresses = tcbl.addresses;
      const payloadAddress = addresses[addresses.length - 1];
      const payloadBlock = await store.getData(payloadAddress);
      const corruptedData = new Uint8Array(payloadBlock.data);
      // Corrupt a byte in the manifest area (after the compression flag byte)
      if (corruptedData.length > 10) {
        corruptedData[10] ^= 0xff;
      }

      // Replace the block in the store with corrupted data
      const corruptedBlock = new RawDataBlock(
        blockSize,
        corruptedData,
        undefined,
        payloadAddress,
      );
      // Override the store's getData to return corrupted block for the payload
      const originalGetData = store.getData;
      (store as unknown as Record<string, unknown>)['getData'] = jest.fn(
        async (key: { toString(): string }) => {
          if (key.toString() === payloadAddress.toString()) {
            return corruptedBlock;
          }
          return (
            originalGetData as (key: { toString(): string }) => Promise<unknown>
          )(key);
        },
      );

      // Create a fresh TCBL block with the same data (to reset cached manifest)
      const { TarballConstituentBlockListBlock } = await import('./tcbl');
      const freshTcbl = new TarballConstituentBlockListBlock(
        tcbl.data,
        (tcbl as unknown as Record<string, unknown>)[
          '_creator'
        ] as Member<Uint8Array>,
        blockSize,
      );

      const reader = new TcblReader(freshTcbl, store);
      await expect(reader.open()).rejects.toThrow(TcblError);
      try {
        await reader.open();
      } catch (e) {
        expect((e as TcblError).errorType).toBe(
          TcblErrorType.ManifestChecksumMismatch,
        );
      }
    });
  });

  describe('pre-open guard', () => {
    it('should throw if listEntries is called before open()', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      expect(() => reader.listEntries()).toThrow(TcblError);
    });

    it('should throw if getEntryByIndex is called before open()', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await expect(reader.getEntryByIndex(0)).rejects.toThrow(TcblError);
    });

    it('should throw if getEntryByName is called before open()', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await expect(reader.getEntryByName('any')).rejects.toThrow(TcblError);
    });
  });

  describe('empty archive', () => {
    it('should handle an empty archive correctly', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      expect(reader.listEntries()).toHaveLength(0);
      await expect(reader.getEntryByIndex(0)).rejects.toThrow(TcblError);
      await expect(reader.getEntryByName('any')).rejects.toThrow(TcblError);
    });
  });

  describe('compressed round-trip', () => {
    it('should round-trip multiple entries through compressed build and read', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store, undefined, {
        compress: true,
      });

      const entries: ITcblEntryInput[] = [
        {
          fileName: 'a.txt',
          mimeType: 'text/plain',
          data: new Uint8Array([1, 2, 3]),
        },
        {
          fileName: 'b.bin',
          mimeType: 'application/octet-stream',
          data: new Uint8Array([4, 5, 6, 7, 8]),
        },
      ];

      for (const entry of entries) {
        await builder.addEntry(entry);
      }
      const tcbl = await builder.build();

      const reader = new TcblReader(tcbl, store);
      await reader.open();

      const listed = reader.listEntries();
      expect(listed).toHaveLength(2);

      for (let i = 0; i < entries.length; i++) {
        const data = await reader.getEntryByIndex(i);
        expect(Array.from(data)).toEqual(Array.from(entries[i].data));

        const dataByName = await reader.getEntryByName(entries[i].fileName);
        expect(Array.from(dataByName)).toEqual(Array.from(entries[i].data));
      }
    });
  });
});
