/**
 * @fileoverview Unit tests for Collection.findWithAvailability
 *
 * Tests:
 * 1. All-local query returns complete result (isComplete=true, pendingBlocks=[])
 * 2. Mixed availability returns partial result with correct pending blocks
 * 3. Read concern propagation to underlying store
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import {
  AvailabilityState,
  BlockSize,
  Checksum,
  PendingBlockError,
  RawDataBlock,
  ReadConcern,
} from '@brightchain/brightchain-lib';
import { Collection, HeadRegistry } from './collection';
import { BsonDocument } from './types';

// --- Helpers ---

/** Generate a valid 128-char hex string (64 bytes for SHA3-512) */
function fakeHex(seed: number): string {
  const hex = seed.toString(16).padStart(2, '0');
  return hex.repeat(64);
}

/** Encode a document as a Uint8Array the same way Collection stores it */
function encodeDoc(doc: Record<string, unknown>): Uint8Array {
  return new Uint8Array(Buffer.from(JSON.stringify(doc), 'utf8'));
}

/** Create a mock RawDataBlock whose `.data` returns the given Uint8Array. */
function mockRawDataBlock(data: Uint8Array): RawDataBlock {
  return { data } as never;
}

/**
 * Build a minimal mock store with `isInPartitionMode` so Collection
 * detects it as a read-concern-aware store.
 */
function createMockStore() {
  return {
    blockSize: BlockSize.Small,
    isInPartitionMode: jest.fn().mockReturnValue(false),
    getData: jest.fn() as jest.Mock,
    get: jest.fn() as jest.Mock,
    has: jest.fn().mockResolvedValue(false),
    setData: jest.fn().mockResolvedValue(undefined),
    deleteData: jest.fn().mockResolvedValue(undefined),
    getRandomBlocks: jest.fn().mockResolvedValue([]),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getMetadata: jest.fn().mockResolvedValue(null),
    updateMetadata: jest.fn().mockResolvedValue(undefined),
    generateParityBlocks: jest.fn().mockResolvedValue([]),
    getParityBlocks: jest.fn().mockResolvedValue([]),
    recoverBlock: jest.fn().mockResolvedValue({ success: false }),
    verifyBlockIntegrity: jest.fn().mockResolvedValue(true),
    getBlocksPendingReplication: jest.fn().mockResolvedValue([]),
    getUnderReplicatedBlocks: jest.fn().mockResolvedValue([]),
    recordReplication: jest.fn().mockResolvedValue(undefined),
    recordReplicaLoss: jest.fn().mockResolvedValue(undefined),
    brightenBlock: jest.fn().mockResolvedValue({
      brightenedBlockId: '',
      randomBlockIds: [],
    }),
    storeCBLWithWhitening: jest.fn().mockResolvedValue({
      blockId1: '',
      blockId2: '',
      magnetUrl: '',
    }),
    retrieveCBL: jest.fn().mockResolvedValue(new Uint8Array(0)),
    parseCBLMagnetUrl: jest.fn().mockReturnValue({
      blockId1: '',
      blockId2: '',
      blockSize: 0,
    }),
    generateCBLMagnetUrl: jest.fn().mockReturnValue(''),
  };
}

/**
 * Create a Collection with pre-populated docIndex entries by seeding
 * a meta block through the HeadRegistry + store.get path.
 */
function createSeededCollection(
  store: ReturnType<typeof createMockStore>,
  docs: Array<{
    logicalId: string;
    blockId: string;
    doc: Record<string, unknown>;
  }>,
): Collection<BsonDocument> {
  const headRegistry = HeadRegistry.createIsolated();
  const mappings: Record<string, string> = {};
  for (const entry of docs) {
    mappings[entry.logicalId] = entry.blockId;
  }
  const meta = { mappings, indexes: {} };
  const metaData = encodeDoc(meta);
  const metaBlockId = fakeHex(0xff);

  headRegistry.setHead('testdb', 'testcol', metaBlockId);

  store.get.mockImplementation((checksumOrString: Checksum | string) => {
    const key =
      typeof checksumOrString === 'string'
        ? checksumOrString
        : checksumOrString.toString();
    if (key === metaBlockId) {
      return { fullData: metaData };
    }
    throw new Error('Block not found: ' + key);
  });

  return new Collection<BsonDocument>(
    'testcol',
    store as never,
    'testdb',
    headRegistry,
  );
}

// --- Tests ---

describe('Collection.findWithAvailability', () => {
  describe('all-local query returns complete result', () => {
    it('should return isComplete=true and empty pendingBlocks when all docs are available', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const doc2 = { _id: 'id2', name: 'Bob' };
      const blockId1 = fakeHex(0x01);
      const blockId2 = fakeHex(0x02);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
        { logicalId: 'id2', blockId: blockId2, doc: doc2 },
      ]);

      store.getData.mockImplementation((checksum: Checksum) => {
        const hex = checksum.toHex();
        if (hex === blockId1)
          return Promise.resolve(mockRawDataBlock(encodeDoc(doc1)));
        if (hex === blockId2)
          return Promise.resolve(mockRawDataBlock(encodeDoc(doc2)));
        return Promise.reject(new Error('Unexpected block: ' + hex));
      });

      const result = await collection.findWithAvailability({});

      expect(result.isComplete).toBe(true);
      expect(result.pendingBlocks).toHaveLength(0);
      expect(result.documents).toHaveLength(2);
      expect(result.readConcern).toBe(ReadConcern.Local);
      const names = result.documents.map((d) => d['name']).sort();
      expect(names).toEqual(['Alice', 'Bob']);
    });

    it('should return isComplete=true with empty documents when collection is empty', async () => {
      const store = createMockStore();
      const collection = createSeededCollection(store, []);

      const result = await collection.findWithAvailability({});

      expect(result.isComplete).toBe(true);
      expect(result.pendingBlocks).toHaveLength(0);
      expect(result.documents).toHaveLength(0);
    });
  });

  describe('mixed availability returns partial result with correct pending blocks', () => {
    it('should return isComplete=false when some getData calls throw PendingBlockError', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const blockId1 = fakeHex(0x01);
      const blockId2 = fakeHex(0x02);
      const blockId3 = fakeHex(0x03);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
        { logicalId: 'id2', blockId: blockId2, doc: {} },
        { logicalId: 'id3', blockId: blockId3, doc: {} },
      ]);

      store.getData.mockImplementation((checksum: Checksum) => {
        const hex = checksum.toHex();
        if (hex === blockId1) {
          return Promise.resolve(mockRawDataBlock(encodeDoc(doc1)));
        }
        if (hex === blockId2) {
          return Promise.reject(
            new PendingBlockError(blockId2, AvailabilityState.Remote, [
              'node-a',
            ]),
          );
        }
        if (hex === blockId3) {
          return Promise.reject(
            new PendingBlockError(blockId3, AvailabilityState.Remote, [
              'node-b',
              'node-c',
            ]),
          );
        }
        return Promise.reject(new Error('Unexpected block: ' + hex));
      });

      const result = await collection.findWithAvailability(
        {},
        { readConcern: ReadConcern.Available },
      );

      expect(result.isComplete).toBe(false);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]['name']).toBe('Alice');
      expect(result.pendingBlocks).toHaveLength(2);
      expect(result.readConcern).toBe(ReadConcern.Available);

      const pendingIds = result.pendingBlocks.map((p) => p.blockId).sort();
      expect(pendingIds).toEqual([blockId2, blockId3].sort());

      const block2Pending = result.pendingBlocks.find(
        (p) => p.blockId === blockId2,
      );
      expect(block2Pending?.state).toBe(AvailabilityState.Remote);
      expect(block2Pending?.knownLocations).toEqual(['node-a']);

      const block3Pending = result.pendingBlocks.find(
        (p) => p.blockId === blockId3,
      );
      expect(block3Pending?.knownLocations).toEqual(['node-b', 'node-c']);
    });

    it('should skip non-PendingBlockError failures silently', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const blockId1 = fakeHex(0x01);
      const blockId2 = fakeHex(0x02);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
        { logicalId: 'id2', blockId: blockId2, doc: {} },
      ]);

      store.getData.mockImplementation((checksum: Checksum) => {
        const hex = checksum.toHex();
        if (hex === blockId1) {
          return Promise.resolve(mockRawDataBlock(encodeDoc(doc1)));
        }
        return Promise.reject(new Error('Block corrupted'));
      });

      const result = await collection.findWithAvailability({});

      expect(result.isComplete).toBe(true);
      expect(result.pendingBlocks).toHaveLength(0);
      expect(result.documents).toHaveLength(1);
    });

    it('should return all pending when every block throws PendingBlockError', async () => {
      const store = createMockStore();
      const blockId1 = fakeHex(0x01);
      const blockId2 = fakeHex(0x02);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: {} },
        { logicalId: 'id2', blockId: blockId2, doc: {} },
      ]);

      store.getData.mockImplementation((checksum: Checksum) => {
        const hex = checksum.toHex();
        return Promise.reject(
          new PendingBlockError(hex, AvailabilityState.Remote, ['node-x']),
        );
      });

      const result = await collection.findWithAvailability(
        {},
        { readConcern: ReadConcern.Available },
      );

      expect(result.isComplete).toBe(false);
      expect(result.documents).toHaveLength(0);
      expect(result.pendingBlocks).toHaveLength(2);
    });
  });

  describe('read concern propagation to underlying store', () => {
    it('should default to ReadConcern.Local when no readConcern is specified', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const blockId1 = fakeHex(0x01);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
      ]);

      store.getData.mockResolvedValue(mockRawDataBlock(encodeDoc(doc1)));
      await collection.findWithAvailability({});

      expect(store.getData).toHaveBeenCalledTimes(1);
      const [, readConcern] = store.getData.mock.calls[0];
      expect(readConcern).toBe(ReadConcern.Local);
    });

    it('should propagate ReadConcern.Available to store.getData', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const blockId1 = fakeHex(0x01);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
      ]);

      store.getData.mockResolvedValue(mockRawDataBlock(encodeDoc(doc1)));
      await collection.findWithAvailability(
        {},
        { readConcern: ReadConcern.Available },
      );

      expect(store.getData).toHaveBeenCalledTimes(1);
      const [checksum, readConcern] = store.getData.mock.calls[0];
      expect(readConcern).toBe(ReadConcern.Available);
      expect(checksum.toHex()).toBe(blockId1);
    });

    it('should propagate ReadConcern.Consistent to store.getData', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const blockId1 = fakeHex(0x01);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
      ]);

      store.getData.mockResolvedValue(mockRawDataBlock(encodeDoc(doc1)));
      await collection.findWithAvailability(
        {},
        { readConcern: ReadConcern.Consistent },
      );

      expect(store.getData).toHaveBeenCalledTimes(1);
      const [, readConcern] = store.getData.mock.calls[0];
      expect(readConcern).toBe(ReadConcern.Consistent);
    });

    it('should propagate the same readConcern to every getData call', async () => {
      const store = createMockStore();
      const doc1 = { _id: 'id1', name: 'Alice' };
      const doc2 = { _id: 'id2', name: 'Bob' };
      const blockId1 = fakeHex(0x01);
      const blockId2 = fakeHex(0x02);

      const collection = createSeededCollection(store, [
        { logicalId: 'id1', blockId: blockId1, doc: doc1 },
        { logicalId: 'id2', blockId: blockId2, doc: doc2 },
      ]);

      store.getData.mockImplementation((checksum: Checksum) => {
        const hex = checksum.toHex();
        if (hex === blockId1)
          return Promise.resolve(mockRawDataBlock(encodeDoc(doc1)));
        if (hex === blockId2)
          return Promise.resolve(mockRawDataBlock(encodeDoc(doc2)));
        return Promise.reject(new Error('Unexpected: ' + hex));
      });

      await collection.findWithAvailability(
        {},
        { readConcern: ReadConcern.Consistent },
      );

      for (const call of store.getData.mock.calls) {
        expect(call[1]).toBe(ReadConcern.Consistent);
      }
    });

    it('should include readConcern in the returned result', async () => {
      const store = createMockStore();
      const collection = createSeededCollection(store, []);

      const result = await collection.findWithAvailability(
        {},
        { readConcern: ReadConcern.Consistent },
      );

      expect(result.readConcern).toBe(ReadConcern.Consistent);
    });
  });
});
