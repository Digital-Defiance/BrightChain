/**
 * Property-based tests for LedgerEntrySerializer — BrightDate timestamp round-trip.
 *
 * Feature: brightdate-default-timestamp, Property 8: Ledger Serialization Round-Trip
 *
 * For any valid ILedgerEntry with a BrightDateValue timestamp,
 * `deserialize(serialize(entry)).timestamp` SHALL equal the original
 * `entry.timestamp` exactly (float64 bit-exact round-trip through DataView).
 *
 * **Validates: Requirements 5.1, 5.2**
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import { ILedgerEntry } from '../../interfaces/ledger/ledgerEntry';
import { ChecksumService } from '../../services/checksum.service';
import { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { Checksum } from '../../types/checksum';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

const HASH_LENGTH = 64;
const SIGNATURE_LENGTH = 64;

jest.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Custom Generators
// ---------------------------------------------------------------------------

/**
 * Generates a valid ILedgerEntry with a BrightDateValue timestamp.
 * Uses computeEntryHash() to produce a real SHA3-512 hash over the hashable
 * content. Signature is a fixed 64-byte Uint8Array (serializer doesn't validate).
 */
function arbLedgerEntryWithBrightDate(): fc.Arbitrary<ILedgerEntry> {
  const checksumService = new ChecksumService();
  const serializer = new LedgerEntrySerializer(checksumService);

  return fc
    .record({
      sequenceNumber: fc.integer({ min: 0, max: 0xffffffff }),
      // BrightDateValue: decimal days since J2000.0
      timestamp: fc.double({
        min: -365250,
        max: 365250,
        noNaN: true,
        noDefaultInfinity: true,
      }),
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
      payload: fc
        .array(fc.integer({ min: 0, max: 255 }), {
          minLength: 0,
          maxLength: 256,
        })
        .map((arr) => new Uint8Array(arr)),
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

      const timestamp = fields.timestamp as BrightDateTimestamp;

      const partial = {
        sequenceNumber: fields.sequenceNumber,
        timestamp,
        previousEntryHash,
        signerPublicKey: fields.signerPublicKey,
        payload: fields.payload,
      };

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
// Property 8: Ledger Serialization Round-Trip
// ---------------------------------------------------------------------------

describe(
  'Feature: brightdate-default-timestamp, Property 8: Ledger Serialization Round-Trip',
  () => {
    const checksumService = new ChecksumService();
    const serializer = new LedgerEntrySerializer(checksumService);

    /**
     * **Validates: Requirements 5.1, 5.2**
     *
     * For any valid ILedgerEntry with a BrightDateValue timestamp,
     * `deserialize(serialize(entry)).timestamp` SHALL equal the original
     * `entry.timestamp` exactly (float64 bit-exact round-trip through DataView).
     */
    it('deserialize(serialize(entry)).timestamp equals original timestamp exactly for any BrightDateValue', () => {
      fc.assert(
        fc.property(arbLedgerEntryWithBrightDate(), (entry) => {
          const serialized = serializer.serialize(entry);
          const deserialized = serializer.deserialize(serialized);

          // Exact equality — float64 round-trip through DataView must be bit-exact
          expect(deserialized.timestamp).toBe(entry.timestamp);
        }),
        { numRuns: 100 },
      );
    });
  },
);
