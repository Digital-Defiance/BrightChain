/**
 * Property-based tests for HMAC determinism in MnemonicHmacService.
 *
 * Feature: user-provided-mnemonic-brightchain, Property 4: HMAC determinism
 *
 * MnemonicHmacService.getMnemonicHmac computes an HMAC-SHA256 of a mnemonic
 * phrase using a secret key wrapped in a SecureBuffer. This HMAC is used to
 * check mnemonic uniqueness without storing the plaintext mnemonic.
 *
 * We test two properties:
 * 1. Determinism: the same mnemonic always produces the same HMAC hex string.
 * 2. Collision resistance: different mnemonics produce different HMAC hex strings.
 *
 * No database is needed — we only exercise the pure getMnemonicHmac method.
 *
 * **Validates: Requirements 3.1**
 */

import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import { randomBytes } from 'crypto';
import * as fc from 'fast-check';
import { MnemonicHmacService } from '../../lib/services/mnemonic-hmac.service';

/** Valid BIP39 word counts */
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24] as const;

/**
 * Arbitrary that generates a single word-like token (lowercase a-z, 3-8 chars).
 */
const wordArb = fc
  .array(
    fc.integer({ min: 0x61, max: 0x7a }).map((c) => String.fromCharCode(c)),
    { minLength: 3, maxLength: 8 },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary that generates a mnemonic-like phrase with a specific word count.
 */
function mnemonicWithWordCount(count: number): fc.Arbitrary<string> {
  return fc
    .array(wordArb, { minLength: count, maxLength: count })
    .map((words) => words.join(' '));
}

/**
 * Arbitrary that generates a valid-format mnemonic (12, 15, 18, 21, or 24 words).
 */
const validMnemonicArb = fc.oneof(
  ...VALID_WORD_COUNTS.map((n) => mnemonicWithWordCount(n)),
);

/**
 * Arbitrary that generates a pair of distinct valid-format mnemonics.
 */
const distinctMnemonicPairArb = fc
  .tuple(validMnemonicArb, validMnemonicArb)
  .filter(([a, b]) => a !== b);

/**
 * Creates a MnemonicHmacService instance for testing with a given secret.
 */
function createTestService(secretBytes: Uint8Array): MnemonicHmacService {
  const hmacSecret = new SecureBuffer(secretBytes);
  return new MnemonicHmacService(hmacSecret);
}

describe('Feature: user-provided-mnemonic-brightchain, Property 4: HMAC determinism', () => {
  let sharedSecret: Uint8Array;

  beforeAll(() => {
    sharedSecret = randomBytes(32);
  });

  /**
   * Property 4a: Computing the HMAC of the same mnemonic twice with the same
   * secret produces identical hex strings.
   *
   * **Validates: Requirements 3.1**
   */
  it('should produce identical HMAC hex strings for the same mnemonic', () => {
    fc.assert(
      fc.property(validMnemonicArb, (mnemonic) => {
        const service = createTestService(sharedSecret);
        try {
          const secureStr1 = new SecureString(mnemonic);
          const secureStr2 = new SecureString(mnemonic);
          try {
            const hmac1 = service.getMnemonicHmac(secureStr1);
            const hmac2 = service.getMnemonicHmac(secureStr2);
            expect(hmac1).toBe(hmac2);
            // HMAC-SHA256 produces a 64-char hex string
            expect(hmac1).toHaveLength(64);
            expect(hmac1).toMatch(/^[0-9a-f]{64}$/);
          } finally {
            secureStr1.dispose();
            secureStr2.dispose();
          }
        } finally {
          service.dispose();
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4b: Different mnemonics produce different HMAC hex strings
   * (collision resistance).
   *
   * **Validates: Requirements 3.1**
   */
  it('should produce different HMAC hex strings for different mnemonics', () => {
    fc.assert(
      fc.property(distinctMnemonicPairArb, ([mnemonicA, mnemonicB]) => {
        const service = createTestService(sharedSecret);
        try {
          const secureA = new SecureString(mnemonicA);
          const secureB = new SecureString(mnemonicB);
          try {
            const hmacA = service.getMnemonicHmac(secureA);
            const hmacB = service.getMnemonicHmac(secureB);
            expect(hmacA).not.toBe(hmacB);
          } finally {
            secureA.dispose();
            secureB.dispose();
          }
        } finally {
          service.dispose();
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4c: HMAC is deterministic across separate service instances
   * constructed with the same secret.
   *
   * **Validates: Requirements 3.1**
   */
  it('should produce the same HMAC across separate service instances with the same secret', () => {
    fc.assert(
      fc.property(validMnemonicArb, (mnemonic) => {
        const service1 = createTestService(sharedSecret);
        const service2 = createTestService(sharedSecret);
        try {
          const secureStr1 = new SecureString(mnemonic);
          const secureStr2 = new SecureString(mnemonic);
          try {
            const hmac1 = service1.getMnemonicHmac(secureStr1);
            const hmac2 = service2.getMnemonicHmac(secureStr2);
            expect(hmac1).toBe(hmac2);
          } finally {
            secureStr1.dispose();
            secureStr2.dispose();
          }
        } finally {
          service1.dispose();
          service2.dispose();
        }
      }),
      { numRuns: 100 },
    );
  });
});
