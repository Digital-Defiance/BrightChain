/**
 * @fileoverview Integration tests for TCBL storage operations.
 *
 * Verifies that TCBL data flows correctly through the existing block store
 * operations: storeCBLWithWhitening → retrieveCBL → TcblReader parsing.
 *
 * @see Requirement 8 (TCBL Storage and Retrieval)
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';
import { isTarballCblData } from '../../services/blockFormatService';
import { ServiceProvider } from '../../services/service.provider';
import { ServiceLocator } from '../../services/serviceLocator';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { initializeTestServices } from '../../test/service.initializer.helper';
import { TarballConstituentBlockListBlock } from './tcbl';
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
        result[0] = 0xff; // marker
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

describe('TCBL Storage Integration', () => {
  let creator: Member<Uint8Array>;
  // The builder creates TCBL blocks at BlockSize.Small (4096 bytes).
  // storeCBLWithWhitening adds a 4-byte length prefix + padding, so the
  // whitening store needs a larger block size to accommodate the padded data.
  const entryBlockSize = BlockSize.Small;
  const whiteningBlockSize = BlockSize.Medium;

  beforeAll(() => {
    initializeTestServices();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test-storage',
      new EmailString('storage@test.com'),
    ).member;
  });

  describe('storeCBLWithWhitening accepts TCBL data (Req 8.1, 8.3)', () => {
    it('should store TCBL data via whitening without errors', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      await builder.addEntry({
        fileName: 'hello.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([72, 101, 108, 108, 111]),
      });
      const tcbl = await builder.build();

      // The TCBL's raw data should be storable via whitening
      const result = await whiteningStore.storeCBLWithWhitening(tcbl.data);

      expect(result.blockId1).toBeDefined();
      expect(result.blockId2).toBeDefined();
      expect(result.magnetUrl).toContain('magnet:?');
    });
  });

  describe('retrieveCBL returns parseable TCBL data (Req 8.2, 8.4)', () => {
    it('should retrieve TCBL data that is detected as TCBL', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      await builder.addEntry({
        fileName: 'data.bin',
        mimeType: 'application/octet-stream',
        data: new Uint8Array([1, 2, 3, 4, 5]),
      });
      const tcbl = await builder.build();

      const result = await whiteningStore.storeCBLWithWhitening(tcbl.data);
      const retrieved = await whiteningStore.retrieveCBL(
        result.blockId1,
        result.blockId2,
      );

      // Retrieved data should be detected as TCBL
      expect(isTarballCblData(retrieved)).toBe(true);

      // Retrieved data should match original
      expect(Array.from(retrieved)).toEqual(Array.from(tcbl.data));
    });

    it('should reconstruct a TarballConstituentBlockListBlock from retrieved data', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      await builder.addEntry({
        fileName: 'test.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([10, 20, 30]),
      });
      const tcbl = await builder.build();

      const result = await whiteningStore.storeCBLWithWhitening(tcbl.data);
      const retrieved = await whiteningStore.retrieveCBL(
        result.blockId1,
        result.blockId2,
      );

      // Should be able to construct a TCBL block from retrieved data
      const reconstructed = new TarballConstituentBlockListBlock(
        retrieved,
        creator,
        entryBlockSize,
      );
      expect(reconstructed).toBeInstanceOf(TarballConstituentBlockListBlock);
    });
  });

  describe('full round-trip: build → store → retrieve → read → extract (Req 8.1–8.4)', () => {
    it('should round-trip a single-entry uncompressed TCBL', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      const originalData = new Uint8Array([42, 84, 126, 168, 210]);
      await builder.addEntry({
        fileName: 'single.bin',
        mimeType: 'application/octet-stream',
        data: originalData,
      });
      const tcbl = await builder.build();

      // Store via whitening
      const whiteningResult = await whiteningStore.storeCBLWithWhitening(
        tcbl.data,
      );

      // Retrieve
      const retrieved = await whiteningStore.retrieveCBL(
        whiteningResult.blockId1,
        whiteningResult.blockId2,
      );

      // Reconstruct TCBL block
      const reconstructed = new TarballConstituentBlockListBlock(
        retrieved,
        creator,
        entryBlockSize,
      );

      // Read with TcblReader — use the original entryStore which has the entry data
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      // Verify manifest
      const entries = reader.listEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe('single.bin');
      expect(entries[0].mimeType).toBe('application/octet-stream');
      expect(entries[0].originalDataLength).toBe(5);

      // Extract and verify data
      const extracted = await reader.getEntryByIndex(0);
      expect(Array.from(extracted)).toEqual(Array.from(originalData));

      const extractedByName = await reader.getEntryByName('single.bin');
      expect(Array.from(extractedByName)).toEqual(Array.from(originalData));
    });

    it('should round-trip a multi-entry TCBL preserving all entries', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      const inputs: ITcblEntryInput[] = [
        {
          fileName: 'readme.md',
          mimeType: 'text/markdown',
          data: new Uint8Array([35, 32, 72, 105]),
        },
        {
          fileName: 'logo.png',
          mimeType: 'image/png',
          data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]),
        },
        {
          fileName: 'config.json',
          mimeType: 'application/json',
          data: new Uint8Array([123, 125]),
        },
      ];

      for (const input of inputs) {
        await builder.addEntry(input);
      }
      const tcbl = await builder.build();

      // Store and retrieve via whitening
      const whiteningResult = await whiteningStore.storeCBLWithWhitening(
        tcbl.data,
      );
      const retrieved = await whiteningStore.retrieveCBL(
        whiteningResult.blockId1,
        whiteningResult.blockId2,
      );

      // Reconstruct and read
      const reconstructed = new TarballConstituentBlockListBlock(
        retrieved,
        creator,
        entryBlockSize,
      );
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      // Verify all entries
      const entries = reader.listEntries();
      expect(entries).toHaveLength(3);

      for (let i = 0; i < inputs.length; i++) {
        expect(entries[i].fileName).toBe(inputs[i].fileName);
        expect(entries[i].mimeType).toBe(inputs[i].mimeType);
        expect(entries[i].originalDataLength).toBe(inputs[i].data.length);

        const extracted = await reader.getEntryByIndex(i);
        expect(Array.from(extracted)).toEqual(Array.from(inputs[i].data));

        const extractedByName = await reader.getEntryByName(inputs[i].fileName);
        expect(Array.from(extractedByName)).toEqual(Array.from(inputs[i].data));
      }
    });

    it('should round-trip a compressed TCBL', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(
        creator,
        entryBlockSize,
        entryStore,
        undefined,
        { compress: true },
      );

      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      await builder.addEntry({
        fileName: 'compressed.dat',
        mimeType: 'application/octet-stream',
        data: originalData,
      });
      const tcbl = await builder.build();
      expect(tcbl.isCompressed).toBe(true);

      // Store and retrieve via whitening
      const whiteningResult = await whiteningStore.storeCBLWithWhitening(
        tcbl.data,
      );
      const retrieved = await whiteningStore.retrieveCBL(
        whiteningResult.blockId1,
        whiteningResult.blockId2,
      );

      // Reconstruct and read
      const reconstructed = new TarballConstituentBlockListBlock(
        retrieved,
        creator,
        entryBlockSize,
      );
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      const entries = reader.listEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe('compressed.dat');

      const extracted = await reader.getEntryByIndex(0);
      expect(Array.from(extracted)).toEqual(Array.from(originalData));
    });
  });
});
