/**
 * Unit tests for Ledger class.
 *
 * @see Requirements 5.1–5.6, 6.1–6.6, 7.1–7.5
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../../blocks/rawData';
import { BlockSize } from '../../enumerations/blockSize';
import { LedgerError, LedgerErrorType } from '../../errors/ledgerError';
import { ILedgerSigner } from '../../interfaces/ledger/ledgerSigner';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ChecksumService } from '../../services/checksum.service';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { Ledger } from '../ledger';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

describe('Ledger', () => {
  let store: MemoryBlockStore;
  let serializer: LedgerEntrySerializer;
  let ledger: Ledger;
  let mockSigner: ILedgerSigner;

  beforeEach(() => {
    store = new MemoryBlockStore(BlockSize.Small);
    serializer = new LedgerEntrySerializer(new ChecksumService());
    ledger = new Ledger(store, BlockSize.Small, serializer, 'test-ledger');
    mockSigner = {
      publicKey: new Uint8Array(33).fill(0x02),
      sign: (_data: Uint8Array) =>
        new Uint8Array(64).fill(0xaa) as SignatureUint8Array,
    };
  });

  // ── Append to empty ledger creates genesis entry ────────────────────

  describe('append to empty ledger creates genesis entry', () => {
    it('should create a genesis entry with sequenceNumber 0 and null previousEntryHash', async () => {
      const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const checksum = await ledger.append(payload, mockSigner);

      expect(ledger.length).toBe(1);
      expect(ledger.head).not.toBeNull();

      const entry = await ledger.getEntry(0);
      expect(entry.sequenceNumber).toBe(0);
      expect(entry.previousEntryHash).toBeNull();
      expect(entry.payload).toEqual(payload);
      expect(entry.signerPublicKey).toEqual(mockSigner.publicKey);

      // The returned checksum should be valid in the store
      const exists = await store.has(checksum);
      expect(exists).toBe(true);
    });
  });

  // ── Append increments length and updates head ───────────────────────

  describe('append increments length and updates head', () => {
    it('should increment length and update head after each append', async () => {
      expect(ledger.length).toBe(0);
      expect(ledger.head).toBeNull();

      await ledger.append(new Uint8Array([1]), mockSigner);
      expect(ledger.length).toBe(1);
      const head1 = ledger.head;
      expect(head1).not.toBeNull();

      await ledger.append(new Uint8Array([2]), mockSigner);
      expect(ledger.length).toBe(2);
      const head2 = ledger.head;
      expect(head2).not.toBeNull();
      // Head should change after second append
      expect(head2!.equals(head1!)).toBe(false);

      await ledger.append(new Uint8Array([3]), mockSigner);
      expect(ledger.length).toBe(3);
    });
  });

  // ── getEntry retrieves correct entry by sequenceNumber ──────────────

  describe('getEntry retrieves correct entry by sequenceNumber', () => {
    it('should retrieve each entry with correct payload and sequenceNumber', async () => {
      const payloads = [
        new Uint8Array([0x01]),
        new Uint8Array([0x02, 0x03]),
        new Uint8Array([0x04, 0x05, 0x06]),
      ];

      for (const p of payloads) {
        await ledger.append(p, mockSigner);
      }

      for (let i = 0; i < payloads.length; i++) {
        const entry = await ledger.getEntry(i);
        expect(entry.sequenceNumber).toBe(i);
        expect(entry.payload).toEqual(payloads[i]);
      }
    });
  });

  // ── getEntry throws for invalid sequenceNumber ──────────────────────

  describe('getEntry throws for invalid sequenceNumber', () => {
    it('should throw LedgerError for sequenceNumber that does not exist', async () => {
      await ledger.append(new Uint8Array([1]), mockSigner);

      await expect(ledger.getEntry(5)).rejects.toThrow(LedgerError);
      await expect(ledger.getEntry(-1)).rejects.toThrow(LedgerError);

      try {
        await ledger.getEntry(99);
        throw new Error('Expected LedgerError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerError);
        expect((e as LedgerError).errorType).toBe(
          LedgerErrorType.EntryNotFound,
        );
      }
    });
  });

  // ── getEntries returns ordered range ────────────────────────────────

  describe('getEntries returns ordered range', () => {
    it('should return entries in sequenceNumber order for a valid range', async () => {
      for (let i = 0; i < 5; i++) {
        await ledger.append(new Uint8Array([i]), mockSigner);
      }

      const entries = await ledger.getEntries(1, 3);
      expect(entries.length).toBe(3);
      expect(entries[0].sequenceNumber).toBe(1);
      expect(entries[1].sequenceNumber).toBe(2);
      expect(entries[2].sequenceNumber).toBe(3);

      // Payloads should match
      expect(entries[0].payload).toEqual(new Uint8Array([1]));
      expect(entries[1].payload).toEqual(new Uint8Array([2]));
      expect(entries[2].payload).toEqual(new Uint8Array([3]));
    });
  });

  // ── getEntries throws for invalid range ─────────────────────────────

  describe('getEntries throws for invalid range', () => {
    it('should throw LedgerError when start > end', async () => {
      await ledger.append(new Uint8Array([1]), mockSigner);
      await ledger.append(new Uint8Array([2]), mockSigner);

      try {
        await ledger.getEntries(2, 0);
        throw new Error('Expected LedgerError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerError);
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidRange);
      }
    });

    it('should throw LedgerError when range is out of bounds', async () => {
      await ledger.append(new Uint8Array([1]), mockSigner);

      try {
        await ledger.getEntries(0, 5);
        throw new Error('Expected LedgerError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerError);
        expect((e as LedgerError).errorType).toBe(LedgerErrorType.InvalidRange);
      }
    });

    it('should throw LedgerError for negative start', async () => {
      await ledger.append(new Uint8Array([1]), mockSigner);

      await expect(ledger.getEntries(-1, 0)).rejects.toThrow(LedgerError);
    });
  });

  // ── getLatestEntry returns last entry or null for empty ledger ──────

  describe('getLatestEntry', () => {
    it('should return null for an empty ledger', async () => {
      const latest = await ledger.getLatestEntry();
      expect(latest).toBeNull();
    });

    it('should return the last appended entry', async () => {
      await ledger.append(new Uint8Array([0x01]), mockSigner);
      await ledger.append(new Uint8Array([0x02]), mockSigner);
      await ledger.append(new Uint8Array([0x03]), mockSigner);

      const latest = await ledger.getLatestEntry();
      expect(latest).not.toBeNull();
      expect(latest!.sequenceNumber).toBe(2);
      expect(latest!.payload).toEqual(new Uint8Array([0x03]));
    });
  });

  // ── Metadata block persistence and load ─────────────────────────────

  describe('metadata block is persisted and can be used to load ledger', () => {
    it('should persist metadata and load ledger with same length, head, and entries', async () => {
      const payloads = [
        new Uint8Array([0x10, 0x20]),
        new Uint8Array([0x30, 0x40]),
        new Uint8Array([0x50, 0x60]),
      ];

      for (const p of payloads) {
        await ledger.append(p, mockSigner);
      }

      const originalLength = ledger.length;
      const originalHead = ledger.head;

      // Load from the same store
      const loaded = await Ledger.load(
        store,
        BlockSize.Small,
        serializer,
        'test-ledger',
      );

      expect(loaded.length).toBe(originalLength);
      expect(loaded.head).not.toBeNull();
      expect(loaded.head!.equals(originalHead!)).toBe(true);

      // Verify all entries are retrievable with identical payloads
      for (let i = 0; i < payloads.length; i++) {
        const entry = await loaded.getEntry(i);
        expect(entry.sequenceNumber).toBe(i);
        expect(entry.payload).toEqual(payloads[i]);
      }
    });
  });

  // ── Load from empty BlockStore creates empty ledger ─────────────────

  describe('load from empty BlockStore creates empty ledger', () => {
    it('should return an empty ledger when metadata block is not found', async () => {
      const emptyStore = new MemoryBlockStore(BlockSize.Small);
      const loaded = await Ledger.load(
        emptyStore,
        BlockSize.Small,
        serializer,
        'nonexistent-ledger',
      );

      expect(loaded.length).toBe(0);
      expect(loaded.head).toBeNull();

      const latest = await loaded.getLatestEntry();
      expect(latest).toBeNull();
    });
  });

  // ── Append failure leaves ledger in previous consistent state ───────

  describe('append failure leaves ledger in previous consistent state', () => {
    it('should not update length or head when BlockStore.setData throws', async () => {
      // First, append one entry successfully
      await ledger.append(new Uint8Array([0x01]), mockSigner);
      const lengthBefore = ledger.length;
      const headBefore = ledger.head;

      // Create a failing store that throws on setData
      const failingStore: IBlockStore = {
        ...store,
        setData: async (_block: RawDataBlock) => {
          throw new Error('Simulated BlockStore failure');
        },
        has: store.has.bind(store),
        getData: store.getData.bind(store),
        deleteData: store.deleteData.bind(store),
        getRandomBlocks: store.getRandomBlocks.bind(store),
        get: store.get.bind(store),
        put: store.put.bind(store),
        delete: store.delete.bind(store),
        getMetadata: store.getMetadata.bind(store),
        updateMetadata: store.updateMetadata.bind(store),
        generateParityBlocks: store.generateParityBlocks.bind(store),
        getParityBlocks: store.getParityBlocks.bind(store),
        recoverBlock: store.recoverBlock.bind(store),
        verifyBlockIntegrity: store.verifyBlockIntegrity.bind(store),
        getBlocksPendingReplication:
          store.getBlocksPendingReplication.bind(store),
        getUnderReplicatedBlocks: store.getUnderReplicatedBlocks.bind(store),
        recordReplication: store.recordReplication.bind(store),
        recordReplicaLoss: store.recordReplicaLoss.bind(store),
        brightenBlock: store.brightenBlock.bind(store),
        storeCBLWithWhitening: store.storeCBLWithWhitening.bind(store),
        retrieveCBL: store.retrieveCBL.bind(store),
        parseCBLMagnetUrl: store.parseCBLMagnetUrl.bind(store),
        generateCBLMagnetUrl: store.generateCBLMagnetUrl.bind(store),
        supportedBlockSizes: store.supportedBlockSizes,
        blockSize: store.blockSize,
      };

      // Create a new ledger with the failing store, pre-populated with one entry
      const failingLedger = new Ledger(
        failingStore,
        BlockSize.Small,
        serializer,
        'fail-ledger',
      );

      // Append to the failing ledger should throw
      await expect(
        failingLedger.append(new Uint8Array([0x02]), mockSigner),
      ).rejects.toThrow('Simulated BlockStore failure');

      // The failing ledger should remain at length 0 (it was freshly created)
      expect(failingLedger.length).toBe(0);
      expect(failingLedger.head).toBeNull();

      // The original ledger should be unaffected
      expect(ledger.length).toBe(lengthBefore);
      expect(ledger.head!.equals(headBefore!)).toBe(true);
    });
  });

  // ── Chain linking correctness ───────────────────────────────────────

  describe('chain linking', () => {
    it('should link entries via previousEntryHash correctly', async () => {
      await ledger.append(new Uint8Array([1]), mockSigner);
      await ledger.append(new Uint8Array([2]), mockSigner);
      await ledger.append(new Uint8Array([3]), mockSigner);

      const entry0 = await ledger.getEntry(0);
      const entry1 = await ledger.getEntry(1);
      const entry2 = await ledger.getEntry(2);

      // Genesis has null previousEntryHash
      expect(entry0.previousEntryHash).toBeNull();
      // Entry 1 links to entry 0
      expect(entry1.previousEntryHash).not.toBeNull();
      expect(entry1.previousEntryHash!.equals(entry0.entryHash)).toBe(true);
      // Entry 2 links to entry 1
      expect(entry2.previousEntryHash).not.toBeNull();
      expect(entry2.previousEntryHash!.equals(entry1.entryHash)).toBe(true);
    });
  });
});
