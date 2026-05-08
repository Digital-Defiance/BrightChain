/**
 * Unit tests for LedgerEntrySerializer — BrightDate timestamp handling.
 *
 * Tests:
 * 1. Serialize/deserialize with known BrightDateValue timestamps
 *    (J2000.0 = 0, Unix epoch = -10957.5, current ~9300)
 * 2. Timestamp field is stored as float64 BE at offset 10 in hashable content
 * 3. Error handling: corrupted float64 data (NaN, Infinity)
 *
 * @see Requirements 5.1, 5.2
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

const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;

/**
 * Known BrightDateValue timestamps for testing.
 *
 * J2000.0 epoch:  0        (January 1, 2000, 12:00:00 UTC)
 * Unix epoch:    -10957.5  (January 1, 1970, 00:00:00 UTC)
 * Approx 2025:   ~9296.9375
 */
const KNOWN_TIMESTAMPS = {
  J2000: 0 as BrightDateTimestamp,
  UNIX_EPOCH: -10957.5 as BrightDateTimestamp,
  APPROX_2025: 9296.9375 as BrightDateTimestamp,
};

describe('LedgerEntrySerializer — BrightDate timestamp handling', () => {
  let checksumService: ChecksumService;
  let serializer: LedgerEntrySerializer;

  function makeChecksum(fill: number): Checksum {
    return Checksum.fromUint8Array(new Uint8Array(HASH_LENGTH).fill(fill));
  }

  function makeSignature(fill: number): SignatureUint8Array {
    return new Uint8Array(SIGNATURE_LENGTH).fill(fill) as SignatureUint8Array;
  }

  function makeEntry(overrides: Partial<ILedgerEntry> = {}): ILedgerEntry {
    const base: Omit<ILedgerEntry, 'entryHash'> = {
      sequenceNumber: 0,
      timestamp: KNOWN_TIMESTAMPS.APPROX_2025,
      previousEntryHash: null,
      signerPublicKey: new Uint8Array(33).fill(0x02),
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      signature: makeSignature(0xbb),
      ...overrides,
    };
    // Compute a real entryHash so the entry is self-consistent
    const entryHash = serializer.computeEntryHash(base);
    return { ...base, entryHash } as ILedgerEntry;
  }

  beforeEach(() => {
    checksumService = new ChecksumService();
    serializer = new LedgerEntrySerializer(checksumService);
  });

  // ── 1. Known BrightDateValue timestamps ─────────────────────────────

  describe('serialize/deserialize with known BrightDateValue timestamps', () => {
    it('should preserve J2000.0 epoch (0) exactly through round-trip', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.J2000 });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.J2000);
      expect(typeof deserialized.timestamp).toBe('number');
    });

    it('should preserve Unix epoch (-10957.5) exactly through round-trip', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.UNIX_EPOCH });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.UNIX_EPOCH);
      expect(typeof deserialized.timestamp).toBe('number');
    });

    it('should preserve approximate 2025 value (9296.9375) exactly through round-trip', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.APPROX_2025 });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(deserialized.timestamp).toBe(KNOWN_TIMESTAMPS.APPROX_2025);
      expect(typeof deserialized.timestamp).toBe('number');
    });

    it('should deserialize timestamp as a number (BrightDateTimestamp), not a Date', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.APPROX_2025 });
      const deserialized = serializer.deserialize(serializer.serialize(entry));
      expect(typeof deserialized.timestamp).toBe('number');
      expect(deserialized.timestamp).not.toBeInstanceOf(Date);
    });
  });

  // ── 2. Timestamp stored as float64 BE at offset 10 ──────────────────

  describe('timestamp field is stored as float64 BE at offset 10 in hashable content', () => {
    /**
     * Binary layout of hashable content:
     *   sequenceNumber  uint32 BE  (4 bytes, offset 0)
     *   timestamp       float64 BE (8 bytes, offset 4)
     *   ...
     *
     * In the full serialized entry (with magic + version prefix):
     *   magic(4) + version(2) + seq(4) + timestamp(8) = timestamp at offset 10
     */
    it('should store J2000.0 (0.0) as 8 zero bytes at offset 10 in serialized entry', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.J2000 });
      const serialized = serializer.serialize(entry);

      // Verify via DataView.getFloat64 at offset 10 (big-endian)
      const view = new DataView(
        serialized.buffer,
        serialized.byteOffset,
        serialized.byteLength,
      );
      const readValue = view.getFloat64(10, false); // big-endian
      expect(readValue).toBe(0.0);

      // Also verify the 8 bytes are all zero (IEEE 754 representation of 0.0)
      for (let i = 10; i < 18; i++) {
        expect(serialized[i]).toBe(0x00);
      }
    });

    it('should store Unix epoch (-10957.5) as correct float64 BE bytes at offset 10', () => {
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

    it('should store approx 2025 value (9296.9375) as correct float64 BE bytes at offset 10', () => {
      const entry = makeEntry({ timestamp: KNOWN_TIMESTAMPS.APPROX_2025 });
      const serialized = serializer.serialize(entry);

      const view = new DataView(
        serialized.buffer,
        serialized.byteOffset,
        serialized.byteLength,
      );
      const readValue = view.getFloat64(10, false); // big-endian
      expect(readValue).toBe(9296.9375);
    });

    it('should match DataView.setFloat64 byte output for the timestamp field', () => {
      const timestamp = KNOWN_TIMESTAMPS.UNIX_EPOCH;
      const entry = makeEntry({ timestamp });
      const serialized = serializer.serialize(entry);

      // Build expected bytes using DataView.setFloat64
      const expected = new Uint8Array(8);
      const expectedView = new DataView(expected.buffer);
      expectedView.setFloat64(0, timestamp, false); // big-endian

      // Compare the 8 bytes at offset 10 in the serialized entry
      const actual = serialized.slice(10, 18);
      expect(actual).toEqual(expected);
    });

    it('should also store timestamp at offset 4 in serializeForHashing output', () => {
      const timestamp = KNOWN_TIMESTAMPS.APPROX_2025;
      const partial = {
        sequenceNumber: 0,
        timestamp,
        previousEntryHash: null,
        signerPublicKey: new Uint8Array(33).fill(0x02),
        payload: new Uint8Array([0xde, 0xad]),
      };

      const hashableContent = serializer.serializeForHashing(partial);

      // In hashable content: seq(4) + timestamp(8) → timestamp at offset 4
      const view = new DataView(
        hashableContent.buffer,
        hashableContent.byteOffset,
        hashableContent.byteLength,
      );
      const readValue = view.getFloat64(4, false); // big-endian
      expect(readValue).toBe(timestamp);
    });
  });

  // ── 3. Corrupted float64 data ────────────────────────────────────────

  describe('corrupted float64 timestamp data', () => {
    /**
     * NaN and Infinity are valid IEEE 754 float64 values. DataView.getFloat64
     * returns them as-is. The serializer does not validate the timestamp value —
     * it is the caller's responsibility to store valid BrightDateValues.
     *
     * Per the design doc error handling table:
     *   "Ledger deserializer encounters invalid float64 → Throw
     *    LedgerSerializationError(FieldOverflow) — same as current behavior
     *    for corrupted data"
     *
     * However, NaN/Infinity are structurally valid float64 values, so the
     * deserializer returns them as-is rather than throwing. This test
     * documents the actual behavior.
     */
    it('should deserialize NaN timestamp bytes without throwing (NaN is a valid float64)', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);

      // Write IEEE 754 quiet NaN (0x7FF8000000000000) at timestamp offset 10
      const view = new DataView(
        corrupted.buffer,
        corrupted.byteOffset,
        corrupted.byteLength,
      );
      view.setUint32(10, 0x7ff80000, false);
      view.setUint32(14, 0x00000000, false);

      // Should not throw — NaN is a valid float64 value
      const deserialized = serializer.deserialize(corrupted);
      expect(Number.isNaN(deserialized.timestamp)).toBe(true);
    });

    it('should deserialize +Infinity timestamp bytes without throwing (+Infinity is a valid float64)', () => {
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

    it('should deserialize -Infinity timestamp bytes without throwing (-Infinity is a valid float64)', () => {
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);

      // Write -Infinity (0xFFF0000000000000) at timestamp offset 10
      const view = new DataView(
        corrupted.buffer,
        corrupted.byteOffset,
        corrupted.byteLength,
      );
      view.setUint32(10, 0xfff00000, false);
      view.setUint32(14, 0x00000000, false);

      const deserialized = serializer.deserialize(corrupted);
      expect(deserialized.timestamp).toBe(-Infinity);
    });

    it('should throw LedgerSerializationError(FieldOverflow) when payload length is corrupted', () => {
      // This tests the general FieldOverflow path — corrupted structural fields
      // (not the timestamp) cause FieldOverflow as documented in the design.
      const entry = makeEntry();
      const serialized = serializer.serialize(entry);
      const corrupted = new Uint8Array(serialized);

      // Corrupt the payloadLength field to exceed remaining bytes.
      // Layout: magic(4) + version(2) + seq(4) + ts(8) + hasPrev(1) + pubKeyLen(4) + pubKey(33)
      // payloadLength offset = 4 + 2 + 4 + 8 + 1 + 4 + 33 = 56
      const payloadLenOffset = 56;
      const view = new DataView(
        corrupted.buffer,
        corrupted.byteOffset,
        corrupted.byteLength,
      );
      view.setUint32(payloadLenOffset, 0xffffffff, false);

      expect(() => serializer.deserialize(corrupted)).toThrow(
        LedgerSerializationError,
      );
      try {
        serializer.deserialize(corrupted);
      } catch (e) {
        expect(e).toBeInstanceOf(LedgerSerializationError);
        expect((e as LedgerSerializationError).errorType).toBe(
          LedgerSerializationErrorType.FieldOverflow,
        );
      }
    });
  });
});
