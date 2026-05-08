/**
 * Unit tests for LedgerEntrySerializer.
 *
 * @see Requirements 2.1–2.7, 5.1, 5.2
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../../errors/ledgerSerializationError';
import { ILedgerEntry } from '../../interfaces/ledger/ledgerEntry';
import { ChecksumService } from '../../services/checksum.service';
import { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { Checksum } from '../../types/checksum';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

/** Magic bytes: "LEDG" in ASCII = 0x4C454447 */
const _MAGIC = 0x4c454447;
const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;
const MIN_ENTRY_SIZE = 184;

/**
 * Known BrightDateValue timestamps for testing.
 *
 * J2000.0 epoch: 0 (January 1, 2000, 12:00:00 UTC)
 * Unix epoch:   -10957.5 (January 1, 1970, 00:00:00 UTC)
 * Approx 2025:  ~9300
 */
const KNOWN_TIMESTAMPS = {
  J2000: 0 as BrightDateTimestamp,
  UNIX_EPOCH: -10957.5 as BrightDateTimestamp,
  APPROX_2025: 9296.9375 as BrightDateTimestamp,
  NEGATIVE: -365250 as BrightDateTimestamp,
  POSITIVE: 365250 as BrightDateTimestamp,
};

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
      timestamp: KNOWN_TIMESTAMPS.APPROX_2025,
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
      expect(deserialized.timestamp).toBe(entry.timestamp);
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
        timestamp: KNOWN_TIMESTAMPS.UNIX_EPOCH,
        payload: new Uint8Array([1, 2, 3]),
      });
      const serialized = serializer.serialize(entry);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.sequenceNumber).toBe(5);
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.UNIX_EPOCH);
      expect(deserialized.previousEntryHash).not.toBeNull();
      expect(
        deserialized.previousEntryHash!.equals(entry.previousEntryHash!),
      ).toBe(true);
      expect(deserialized.payload).toEqual(new Uint8Array([1, 2, 3]));
    });
  });

  // ── Known BrightDateValue timestamps ────────────────────────────────

  describe('known BrightDateValue timestamps are preserved exactly', () => {
    it('should preserve J2000.0 epoch (0) exactly', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.J2000 });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.J2000);
    });

    it('should preserve Unix epoch (-10957.5) exactly', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.UNIX_EPOCH });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.UNIX_EPOCH);
    });

    it('should preserve approximate 2025 value (9296.9375) exactly', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.APPROX_2025 });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.APPROX_2025);
    });

    it('should preserve large negative BrightDateValue (-365250) exactly', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.NEGATIVE });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.NEGATIVE);
    });

    it('should preserve large positive BrightDateValue (365250) exactly', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.POSITIVE });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.POSITIVE);
    });
  });

  // ── Timestamp field is a number (BrightDateTimestamp) ───────────────

  describe('timestamp field type', () => {
    it('should deserialize timestamp as a number (BrightDateTimestamp), not a Date', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.APPROX_2025 });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(typeof deserialized.timestamp).toBe('number');
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
        throw new Error('Expected LedgerSerializationError');
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
        throw new Error('Expected LedgerSerializationError');
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
        throw new Error('Expected LedgerSerializationError');
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
        throw new Error('Expected LedgerSerializationError');
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.FieldOverflow,
        );
      }
    });
  });

  // ── Corrupted float64 timestamp data ────────────────────────────────

  describe('corrupted float64 timestamp data', () => {
    /**
     * NaN and Infinity are valid IEEE 754 float64 values and will be
     * deserialized as-is by DataView.getFloat64. The serializer does not
     * validate the timestamp value — it is the caller's responsibility to
     * ensure valid BrightDateValues are stored. This test documents the
     * current behavior.
     */
    it('should deserialize NaN timestamp bytes without throwing (NaN is valid float64)', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);
      // Write NaN (0x7FF8000000000000) at timestamp offset (magic 4 + version 2 + seq 4 = offset 10)
      const view = new DataView(
        corrupted.buffer,
        corrupted.byteOffset,
        corrupted.byteLength,
      );
      // IEEE 754 quiet NaN: 0x7FF8000000000000
      view.setUint32(10, 0x7ff80000, false);
      view.setUint32(14, 0x00000000, false);

      const deserialized = serializer.deserialize(corrupted);
      expect(Number.isNaN(deserialized.timestamp)).toBe(true);
    });

    it('should deserialize +Infinity timestamp bytes without throwing (Infinity is valid float64)', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);
      // Write +Infinity (0x7FF0000000000000) at timestamp offset 10
      const view = new DataView(
        corrupted.buffer,
        corrupted.byteOffset,
        corrupted.byteLength,
      );
      view.setUint32(10, 0x7ff00000, false);
      view.setUint32(14, 0x00000000, false);

      const deserialized = serializer.deserialize(corrupted);
      expect(deserialized.timestamp).toBe(Infinity);
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

    it('should encode timestamp as float64 big-endian', () => {
      // Use J2000.0 = 0.0 — all zero bytes in float64
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.J2000 });
      const serialized = serializer.serialize(entry);

      // timestamp starts at offset 10 (magic 4 + version 2 + seq 4)
      const view = new DataView(
        serialized.buffer,
        serialized.byteOffset,
        serialized.byteLength,
      );
      const readValue = view.getFloat64(10, false); // big-endian
      expect(readValue).toBe(0.0);
    });

    it('should encode Unix epoch (-10957.5) as float64 big-endian', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.UNIX_EPOCH });
      const serialized = serializer.serialize(entry);

      const view = new DataView(
        serialized.buffer,
        serialized.byteOffset,
        serialized.byteLength,
      );
      const readValue = view.getFloat64(10, false); // big-endian
      expect(readValue).toBe(-10957.5);
    });
  });

  // ── computeEntryHash consistency ────────────────────────────────────

  describe('computeEntryHash', () => {
    it('should produce a hash consistent with serializeForHashing output', () => {
      const partial = {
        sequenceNumber: 0,
        timestamp: KNOWN_TIMESTAMPS.APPROX_2025,
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
        timestamp: KNOWN_TIMESTAMPS.UNIX_EPOCH,
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
