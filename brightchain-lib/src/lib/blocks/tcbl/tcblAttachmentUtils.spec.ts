/**
 * @fileoverview Unit tests for the TCBL attachment utility function.
 *
 * Tests:
 * - TCBL attachment returns all manifest entries
 * - Plain CBL attachment returns a single generic entry
 *
 * @see Requirement 9.2 — TCBL attachments enumerate all entries
 * @see Requirement 9.3 — plain CBL attachments return single entry
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ServiceProvider } from '../../services/service.provider';
import { initializeTestServices } from '../../test/service.initializer.helper';
import { RawDataBlock } from '../rawData';
import { enumerateAttachmentEntries } from './tcblAttachmentUtils';
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

describe('enumerateAttachmentEntries', () => {
  let creator: Member<Uint8Array>;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test-attachment',
      new EmailString('attachment@test.com'),
    ).member;
  });

  describe('TCBL attachment (Req 9.2)', () => {
    it('should return all manifest entries for a TCBL attachment', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await builder.addEntry({
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      });
      await builder.addEntry({
        fileName: 'image.png',
        mimeType: 'image/png',
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      });

      const tcbl = await builder.build();

      // Store the TCBL block data in the store so enumerateAttachmentEntries can retrieve it
      const checksumService = ServiceProvider.getInstance().checksumService;
      const tcblChecksum = checksumService.calculateChecksum(tcbl.data);
      const tcblRawBlock = new RawDataBlock(
        blockSize,
        tcbl.data,
        undefined,
        tcblChecksum,
      );
      await store.setData(tcblRawBlock);

      const entries = await enumerateAttachmentEntries(tcblChecksum, store);

      expect(entries).toHaveLength(2);
      expect(entries[0].fileName).toBe('document.pdf');
      expect(entries[0].mimeType).toBe('application/pdf');
      expect(entries[0].originalDataLength).toBe(4);
      expect(entries[1].fileName).toBe('image.png');
      expect(entries[1].mimeType).toBe('image/png');
      expect(entries[1].originalDataLength).toBe(4);
    });

    it('should return entries for a single-entry TCBL', async () => {
      const store = createMockBlockStore(blockSize);
      const builder = new TcblBuilder(creator, blockSize, store);

      await builder.addEntry({
        fileName: 'only-file.txt',
        mimeType: 'text/plain',
        data: new Uint8Array([72, 101, 108, 108, 111]),
      });

      const tcbl = await builder.build();

      const checksumService = ServiceProvider.getInstance().checksumService;
      const tcblChecksum = checksumService.calculateChecksum(tcbl.data);
      const tcblRawBlock = new RawDataBlock(
        blockSize,
        tcbl.data,
        undefined,
        tcblChecksum,
      );
      await store.setData(tcblRawBlock);

      const entries = await enumerateAttachmentEntries(tcblChecksum, store);

      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe('only-file.txt');
      expect(entries[0].mimeType).toBe('text/plain');
      expect(entries[0].originalDataLength).toBe(5);
    });
  });

  describe('plain CBL attachment (Req 9.3)', () => {
    it('should return a single generic entry for a plain CBL attachment', async () => {
      const store = createMockBlockStore(blockSize);

      // Create a plain CBL (non-TCBL) block
      const cblService = ServiceProvider.getInstance().cblService;
      const { headerData } = cblService.makeCblHeader(
        creator,
        new Date(),
        0,
        0,
        new Uint8Array(0),
        blockSize,
        0, // BlockEncryptionType.None
      );

      const data = new Uint8Array(blockSize as number);
      data.set(headerData, 0);

      const checksumService = ServiceProvider.getInstance().checksumService;
      const checksum = checksumService.calculateChecksum(data);
      const rawBlock = new RawDataBlock(blockSize, data, undefined, checksum);
      await store.setData(rawBlock);

      const entries = await enumerateAttachmentEntries(checksum, store);

      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe('attachment');
      expect(entries[0].mimeType).toBe('application/octet-stream');
      expect(entries[0].originalDataLength).toBe(data.length);
      expect(entries[0].cblAddress.equals(checksum)).toBe(true);
    });
  });
});
