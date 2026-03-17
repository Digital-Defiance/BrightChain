/**
 * Property-based tests for LedgerEntrySerializer.
 *
 * Feature: block-chain-ledger, Property 1: Serialization Round-Trip
 *
 * For any valid ILedgerEntry (with arbitrary payload, valid checksum, valid
 * signature, any sequence number, any timestamp, and any signer public key),
 * serializing the entry via serialize() and then deserializing the result via
 * deserialize() should produce an entry with identical field values.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import { ILedgerEntry } from '../../interfaces/ledger/ledgerEntry';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;

jest.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Custom Generators
// ---------------------------------------------------------------------------

/**
 * Generates a random Uint8Array payload up to maxSize bytes.
 */
function arbPayload(maxSize: number): fc.Arbitrary<Uint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: 0,
      maxLength: maxSize,
    })
    .map((arr) => new Uint8Array(arr));
}

/**
 * Generates a valid ILedgerEntry with consistent entryHash and a fake
 * 64-byte signature. Uses the serializer's computeEntryHash to produce
 * a real SHA3-512 hash over the hashable content.
 */
function arbLedgerEntry(): fc.Arbitrary<ILedgerEntry> {
  const checksumService = new ChecksumService();
  const serializer = new LedgerEntrySerializer(checksumService);

  return fc
    .record({
      sequenceNumber: fc.integer({ min: 0, max: 0xffffffff }),
      // Timestamp: use integer ms to avoid sub-ms precision loss
      timestampMs: fc.integer({ min: 0, max: 2_000_000_000_000 }),
      // Whether this entry has a previous hash (non-genesis)
      hasPrevious: fc.boolean(),
      // 64 random bytes for previousEntryHash (used only when hasPrevious)
      previousHashBytes: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: HASH_LENGTH,
          maxLength: HASH_LENGTH,
        })
        .map((arr) => new Uint8Array(arr)),
      // Signer public key: 33–65 bytes (compressed or uncompressed)
      signerPublicKey: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: 33,
          maxLength: 65,
        })
        .map((arr) => new Uint8Array(arr)),
      // Payload up to 256 bytes (keep small for speed)
      payload: arbPayload(256),
      // Fake 64-byte signature
      signatureBytes: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: SIGNATURE_LENGTH,
          maxLength: SIGNATURE_LENGTH,
        })
        .map((arr) => new Uint8Array(arr)),
    })
    .map((fields) => {
      const previousEntryHash = fields.hasPrevious
        ? Checksum.fromUint8Array(fields.previousHashBytes)
        : null;

      const timestamp = new Date(fields.timestampMs);

      // Build the partial entry (without entryHash and signature)
      const partial = {
        sequenceNumber: fields.sequenceNumber,
        timestamp,
        previousEntryHash,
        signerPublicKey: fields.signerPublicKey,
        payload: fields.payload,
      };

      // Compute a real entryHash using the serializer
      const entryHash = serializer.computeEntryHash(partial);
      const signature = fields.signatureBytes as SignatureUint8Array;

      return {
        ...partial,
        entryHash,
        signature,
      } as ILedgerEntry;
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Feature: block-chain-ledger, Property 1: Serialization Round-Trip', () => {
  const checksumService = new ChecksumService();
  const serializer = new LedgerEntrySerializer(checksumService);

  it('deserialize(serialize(entry)) produces identical field values for any valid ILedgerEntry', () => {
    fc.assert(
      fc.property(arbLedgerEntry(), (entry) => {
        const serialized = serializer.serialize(entry);
        const deserialized = serializer.deserialize(serialized);

        // sequenceNumber
        expect(deserialized.sequenceNumber).toBe(entry.sequenceNumber);

        // timestamp (to millisecond precision)
        expect(deserialized.timestamp.getTime()).toBe(
          entry.timestamp.getTime(),
        );

        // previousEntryHash
        if (entry.previousEntryHash === null) {
          expect(deserialized.previousEntryHash).toBeNull();
        } else {
          expect(deserialized.previousEntryHash).not.toBeNull();
          expect(
            deserialized.previousEntryHash!.equals(entry.previousEntryHash),
          ).toBe(true);
        }

        // entryHash
        expect(deserialized.entryHash.equals(entry.entryHash)).toBe(true);

        // signature (byte-by-byte)
        expect(new Uint8Array(deserialized.signature)).toEqual(
          new Uint8Array(entry.signature),
        );

        // signerPublicKey (byte-by-byte)
        expect(new Uint8Array(deserialized.signerPublicKey)).toEqual(
          new Uint8Array(entry.signerPublicKey),
        );

        // payload (byte-by-byte)
        expect(new Uint8Array(deserialized.payload)).toEqual(
          new Uint8Array(entry.payload),
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 Generator
// ---------------------------------------------------------------------------

/**
 * Generates partial entry fields (without entryHash and signature) for
 * Property 2 tests. Only the hashable fields are needed.
 */
function arbPartialEntry(): fc.Arbitrary<
  Omit<ILedgerEntry, 'entryHash' | 'signature'>
> {
  return fc
    .record({
      sequenceNumber: fc.integer({ min: 0, max: 0xffffffff }),
      timestampMs: fc.integer({ min: 0, max: 2_000_000_000_000 }),
      hasPrevious: fc.boolean(),
      previousHashBytes: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: HASH_LENGTH,
          maxLength: HASH_LENGTH,
        })
        .map((arr) => new Uint8Array(arr)),
      signerPublicKey: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: 33,
          maxLength: 65,
        })
        .map((arr) => new Uint8Array(arr)),
      payload: arbPayload(256),
    })
    .map((fields) => {
      const previousEntryHash = fields.hasPrevious
        ? Checksum.fromUint8Array(fields.previousHashBytes)
        : null;
      const timestamp = new Date(fields.timestampMs);

      return {
        sequenceNumber: fields.sequenceNumber,
        timestamp,
        previousEntryHash,
        signerPublicKey: fields.signerPublicKey,
        payload: fields.payload,
      };
    });
}

// ---------------------------------------------------------------------------
// Property 2 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 2: EntryHash Integrity
describe('Feature: block-chain-ledger, Property 2: EntryHash Integrity', () => {
  const checksumService = new ChecksumService();
  const serializer = new LedgerEntrySerializer(checksumService);

  /**
   * **Validates: Requirements 1.3, 2.5, 3.1**
   *
   * For any valid partial entry fields, computeEntryHash() should equal
   * ChecksumService.calculateChecksum(serializeForHashing(fields)).
   */
  it('computeEntryHash() equals SHA3-512 of serializeForHashing() output', () => {
    fc.assert(
      fc.property(arbPartialEntry(), (partial) => {
        const entryHash = serializer.computeEntryHash(partial);
        const hashableBytes = serializer.serializeForHashing(partial);
        const expectedHash = checksumService.calculateChecksum(hashableBytes);

        expect(entryHash.equals(expectedHash)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.3, 2.5, 3.1**
   *
   * Calling computeEntryHash twice with the same fields produces the
   * same hash (determinism).
   */
  it('computeEntryHash is deterministic — same fields always produce same hash', () => {
    fc.assert(
      fc.property(arbPartialEntry(), (partial) => {
        const hash1 = serializer.computeEntryHash(partial);
        const hash2 = serializer.computeEntryHash(partial);

        expect(hash1.equals(hash2)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9 Imports
// ---------------------------------------------------------------------------

import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../../errors/ledgerSerializationError';

// ---------------------------------------------------------------------------
// Property 9 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 9: Invalid Serialized Data Throws
describe('Feature: block-chain-ledger, Property 9: Invalid Serialized Data Throws', () => {
  const checksumService = new ChecksumService();
  const serializer = new LedgerEntrySerializer(checksumService);

  const MAGIC_BYTES = [0x4c, 0x45, 0x44, 0x47]; // "LEDG"
  const MIN_ENTRY_SIZE = 184;

  /**
   * **Validates: Requirements 2.7**
   *
   * Any Uint8Array shorter than 184 bytes causes deserialize() to throw
   * LedgerSerializationError with DataTooShort.
   */
  it('any Uint8Array shorter than 184 bytes causes deserialize() to throw LedgerSerializationError', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 255 }), {
          minLength: 0,
          maxLength: MIN_ENTRY_SIZE - 1,
        }),
        (bytes) => {
          const data = new Uint8Array(bytes);
          expect(() => serializer.deserialize(data)).toThrow(
            LedgerSerializationError,
          );
          try {
            serializer.deserialize(data);
          } catch (e) {
            expect(e).toBeInstanceOf(LedgerSerializationError);
            expect((e as LedgerSerializationError).errorType).toBe(
              LedgerSerializationErrorType.DataTooShort,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.7**
   *
   * Any Uint8Array of sufficient length but without magic bytes 0x4C454447
   * causes deserialize() to throw LedgerSerializationError with InvalidMagic.
   */
  it('any Uint8Array of sufficient length but without magic bytes causes deserialize() to throw with InvalidMagic', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: 0, max: 255 }), {
            minLength: MIN_ENTRY_SIZE,
            maxLength: 512,
          })
          .filter((bytes) => {
            // Ensure the first 4 bytes do NOT form the valid magic 0x4C454447
            return (
              bytes[0] !== MAGIC_BYTES[0] ||
              bytes[1] !== MAGIC_BYTES[1] ||
              bytes[2] !== MAGIC_BYTES[2] ||
              bytes[3] !== MAGIC_BYTES[3]
            );
          }),
        (bytes) => {
          const data = new Uint8Array(bytes);
          expect(() => serializer.deserialize(data)).toThrow(
            LedgerSerializationError,
          );
          try {
            serializer.deserialize(data);
          } catch (e) {
            expect(e).toBeInstanceOf(LedgerSerializationError);
            expect((e as LedgerSerializationError).errorType).toBe(
              LedgerSerializationErrorType.InvalidMagic,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.7**
   *
   * Any valid serialized entry with corrupted payloadLength (set to exceed
   * remaining bytes) causes deserialize() to throw LedgerSerializationError
   * with FieldOverflow.
   */
  it('valid serialized entry with corrupted payloadLength causes deserialize() to throw with FieldOverflow', () => {
    fc.assert(
      fc.property(
        arbLedgerEntry(),
        fc.integer({ min: 1, max: 0xffffff }),
        (entry, extraLength) => {
          const serialized = serializer.serialize(entry);

          // Find the payloadLength field in the serialized data and corrupt it.
          // Layout after magic(4) + version(2):
          //   sequenceNumber(4) + timestamp(8) + hasPrev(1) + [prevHash(64)] + pubKeyLen(4) + pubKey(var) + payloadLen(4) + payload(var) + hash(64) + sig(64)
          const hasPrev = entry.previousEntryHash !== null;
          const pubKeyLen = entry.signerPublicKey.length;

          // Offset of payloadLength within the serialized buffer:
          // magic(4) + version(2) + seq(4) + ts(8) + hasPrev(1) + prevHash(0|64) + pubKeyLen(4) + pubKey(var)
          const payloadLenOffset =
            4 + 2 + 4 + 8 + 1 + (hasPrev ? 64 : 0) + 4 + pubKeyLen;

          // Create a corrupted copy
          const corrupted = new Uint8Array(serialized);
          const view = new DataView(
            corrupted.buffer,
            corrupted.byteOffset,
            corrupted.byteLength,
          );

          // Read the current payload length and set it to something that exceeds remaining bytes
          const _currentPayloadLen = view.getUint32(payloadLenOffset, false);
          const remainingAfterPayloadLen =
            corrupted.length - payloadLenOffset - 4;
          // Set payloadLength to more than what remains (accounting for hash + sig that follow)
          const corruptedPayloadLen = remainingAfterPayloadLen + extraLength;
          view.setUint32(payloadLenOffset, corruptedPayloadLen, false);

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
        },
      ),
      { numRuns: 100 },
    );
  });
});
