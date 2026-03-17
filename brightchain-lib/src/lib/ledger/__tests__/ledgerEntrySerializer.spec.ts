/**
 * Unit tests for LedgerEntrySerializer.
 *
 * @see Requirements 2.1–2.7
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../../errors/ledgerSerializationError';
import { ILedgerEntry } from '../../interfaces/ledger/ledgerEntry';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

/** Magic bytes: "LEDG" in ASCII = 0x4C454447 */
const _MAGIC = 0x4c454447;
const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;
const MIN_ENTRY_SIZE = 184;

describe('LedgerEntrySerializer', () => {
  let checksumService: ChecksumService;
  let serializer: LedgerEntrySerializer;

  /** Create a fake 64-byte Checksum filled with a given byte value. */
  function makeChecksum(fill: number): Checksum {
    return Checksum.fromUint8Array(new Uint8Array(HASH_LENGTH).fill(fill));
  }

  /** Create a fake 64-byte SignatureUint8Array filled with a given byte value. */
  function makeSignature(fill: number): SignatureUint8Array {
    return new Uint8Array(SIGNATURE_LENGTH).fill(fill) as SignatureUint8Array;
  }

  /** Build a minimal valid ILedgerEntry for testing. */
  function makeEntry(overrides: Partial<ILedgerEntry> = {}): ILedgerEntry {
    return {
      sequenceNumber: 0,
      timestamp: new Date(1700000000000),
      previousEntryHash: null,
      signerPublicKey: new Uint8Array(33).fill(0x02), // compressed pubkey
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      entryHash: makeChecksum(0xaa),
      signature: makeSignature(0xbb),
      ...overrides,
    };
  }

  beforeEach(() => {
    checksumService = new ChecksumService();
    serializer = new LedgerEntrySerializer(checksumService);
  });

  // ── Serialization of genesis entry ──────────────────────────────────

  describe('serialize / deserialize genesis entry (previousEntryHash null)', () => {
    it('should round-trip a genesis entry with all fields preserved', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.sequenceNumber).toBe(entry.sequenceNumber);
      expect(deserialized.timestamp.getTime()).toBe(entry.timestamp.getTime());
      expect(deserialized.previousEntryHash).toBeNull();
      expect(deserialized.signerPublicKey).toEqual(entry.signerPublicKey);
      expect(deserialized.payload).toEqual(entry.payload);
      expect(deserialized.entryHash.equals(entry.entryHash)).toBe(true);
      expect(new Uint8Array(deserialized.signature)).toEqual(
        new Uint8Array(entry.signature),
      );
    });
  });

  // ── Serialization of non-genesis entry ──────────────────────────────

  describe('serialize / deserialize non-genesis entry (previousEntryHash present)', () => {
    it('should round-trip a non-genesis entry with previousEntryHash preserved', () => {
      const entry = makeEntry({
        sequenceNumber: 5,
        previousEntryHash: makeChecksum(0xcc),
        timestamp: new Date(1700001000000),
        payload: new Uint8Array([1, 2, 3]),
      });
      const serialized = serializer.serialize(entry);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.sequenceNumber).toBe(5);
      expect(deserialized.timestamp.getTime()).toBe(1700001000000);
      expect(deserialized.previousEntryHash).not.toBeNull();
      expect(
        deserialized.previousEntryHash!.equals(entry.previousEntryHash!),
      ).toBe(true);
      expect(deserialized.payload).toEqual(new Uint8Array([1, 2, 3]));
    });
  });

  // ── Deserialization error: data too short ───────────────────────────

  describe('deserialization rejects data shorter than minimum entry size', () => {
    it('should throw DataTooShort for empty data', () => {
      expect(() => serializer.deserialize(new Uint8Array(0))).toThrow(
        LedgerSerializationError,
      );
    });

    it('should throw DataTooShort for data just under minimum size', () => {
      const tooShort = new Uint8Array(MIN_ENTRY_SIZE - 1);
      try {
        serializer.deserialize(tooShort);
        fail('Expected LedgerSerializationError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.DataTooShort,
        );
      }
    });
  });

  // ── Deserialization error: invalid magic bytes ──────────────────────

  describe('deserialization rejects invalid magic bytes', () => {
    it('should throw InvalidMagic when magic bytes are wrong', () => {
      // Serialize a valid entry, then corrupt the magic bytes
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);
      // Overwrite magic with 0x00000000
      corrupted[0] = 0x00;
      corrupted[1] = 0x00;
      corrupted[2] = 0x00;
      corrupted[3] = 0x00;

      try {
        serializer.deserialize(corrupted);
        fail('Expected LedgerSerializationError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.InvalidMagic,
        );
      }
    });
  });

  // ── Deserialization error: unsupported version ──────────────────────

  describe('deserialization rejects unsupported version', () => {
    it('should throw UnsupportedVersion when version is not 0x0001', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);
      // Version is at offset 4-5 (uint16 BE). Set to 0x00FF.
      corrupted[4] = 0x00;
      corrupted[5] = 0xff;

      try {
        serializer.deserialize(corrupted);
        fail('Expected LedgerSerializationError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.UnsupportedVersion,
        );
      }
    });
  });

  // ── Deserialization error: truncated field lengths ──────────────────

  describe('deserialization rejects truncated field lengths', () => {
    it('should throw FieldOverflow when payloadLength exceeds remaining bytes', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const buf = new Uint8Array(serialized);

      // Find the payloadLength field and inflate it.
      // Layout after magic(4) + version(2):
      //   seq(4) + ts(8) + hasPrev(1) + [prevHash(0|64)] + pubKeyLen(4) + pubKey(33)
      // For genesis (no prevHash): offset of payloadLength = 6 + 4 + 8 + 1 + 4 + 33 = 56
      const payloadLenOffset = 6 + 4 + 8 + 1 + 0 + 4 + 33;
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      // Set payloadLength to a huge value
      view.setUint32(payloadLenOffset, 0xffffffff, false);

      try {
        serializer.deserialize(buf);
        fail('Expected LedgerSerializationError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.FieldOverflow,
        );
      }
    });
  });

  // ── Big-endian byte order for sequenceNumber and timestamp ──────────

  describe('big-endian byte order', () => {
    it('should encode sequenceNumber as uint32 big-endian', () => {
      const entry = makeEntry({ sequenceNumber: 0x01020304 });
      const serialized = serializer.serialize(entry);

      // sequenceNumber starts at offset 6 (after magic 4 + version 2)
      expect(serialized[6]).toBe(0x01);
      expect(serialized[7]).toBe(0x02);
      expect(serialized[8]).toBe(0x03);
      expect(serialized[9]).toBe(0x04);
    });

    it('should encode timestamp as uint64 big-endian', () => {
      // Use a timestamp whose ms value has known byte representation.
      // 0x0000018B_3E5FC000 = 1700000000000 in decimal
      const ts = new Date(1700000000000);
      const entry = makeEntry({ timestamp: ts });
      const serialized = serializer.serialize(entry);

      // timestamp starts at offset 10 (magic 4 + version 2 + seq 4)
      const view = new DataView(
        serialized.buffer,
        serialized.byteOffset,
        serialized.byteLength,
      );
      const readMs = view.getBigUint64(10, false); // big-endian
      expect(readMs).toBe(BigInt(1700000000000));
    });
  });

  // ── computeEntryHash consistency ────────────────────────────────────

  describe('computeEntryHash', () => {
    it('should produce a hash consistent with serializeForHashing output', () => {
      const partial = {
        sequenceNumber: 0,
        timestamp: new Date(1700000000000),
        previousEntryHash: null,
        signerPublicKey: new Uint8Array(33).fill(0x02),
        payload: new Uint8Array([0xde, 0xad]),
      };

      const hash = serializer.computeEntryHash(partial);
      const hashableBytes = serializer.serializeForHashing(partial);
      const expectedHash = checksumService.calculateChecksum(hashableBytes);

      expect(hash.equals(expectedHash)).toBe(true);
    });

    it('should produce the same hash when called twice with the same input', () => {
      const partial = {
        sequenceNumber: 42,
        timestamp: new Date(1700000000000),
        previousEntryHash: makeChecksum(0x11),
        signerPublicKey: new Uint8Array(33).fill(0x03),
        payload: new Uint8Array([1, 2, 3, 4, 5]),
      };

      const hash1 = serializer.computeEntryHash(partial);
      const hash2 = serializer.computeEntryHash(partial);
      expect(hash1.equals(hash2)).toBe(true);
    });
  });
});
