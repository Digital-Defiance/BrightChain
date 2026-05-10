/**
 * Property test: Public key PEM encoding round-trip.
 *
 * **Property 4: Public key PEM encoding round-trip**
 * **Validates: Requirements 3.2, 8.1, 8.2, 8.3**
 *
 * For any valid 33-byte compressed secp256k1 public key (first byte 0x02 or
 * 0x03, remaining 32 bytes arbitrary), calling compressedKeyToPem(key) and
 * then pemToCompressedKey(pem) SHALL produce a byte sequence identical to the
 * original key.
 */

import * as fc from 'fast-check';
import {
  compressedKeyToPem,
  pemToCompressedKey,
} from '../../middleware/compressed-key-to-pem';

// ── Generators ──────────────────────────────────────────────────────

/**
 * Generates a valid 33-byte compressed secp256k1 public key.
 *
 * The first byte is constrained to 0x02 or 0x03 (the two valid prefix bytes
 * for compressed EC points indicating even/odd Y coordinate). The remaining
 * 32 bytes are arbitrary, representing the X coordinate.
 */
const compressedKeyArb: fc.Arbitrary<Uint8Array> = fc
  .record({
    prefix: fc.constantFrom(0x02, 0x03),
    xCoord: fc.uint8Array({ minLength: 32, maxLength: 32 }),
  })
  .map(({ prefix, xCoord }) => {
    const key = new Uint8Array(33);
    key[0] = prefix;
    key.set(xCoord, 1);
    return key;
  });

// ── Property Test ───────────────────────────────────────────────────

describe('Feature: digitalburnbag-wcap-signing, Property 4: Public key PEM encoding round-trip', () => {
  it('pemToCompressedKey(compressedKeyToPem(key)) produces byte-identical output', () => {
    fc.assert(
      fc.property(compressedKeyArb, (key) => {
        const pem = compressedKeyToPem(key);
        const roundTripped = pemToCompressedKey(pem);

        // Decoding must succeed
        expect(roundTripped).toBeDefined();

        // Length must match
        expect(roundTripped!.length).toBe(key.length);

        // Every byte must be identical
        for (let i = 0; i < key.length; i++) {
          expect(roundTripped![i]).toBe(key[i]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
