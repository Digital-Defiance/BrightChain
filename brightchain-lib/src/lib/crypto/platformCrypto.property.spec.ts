import fc from 'fast-check';
import { getRandomBytes, sha1Hash, sha1HashBytes } from './platformCrypto';

/**
 * Property-based tests for platform-agnostic crypto utilities
 * Feature: api-lib-to-lib-migration
 * Validates Requirements 11.1, 11.4
 */

/**
 * Property 26: Platform Crypto Random Bytes
 * For any requested length N, getRandomBytes SHALL return a Uint8Array of exactly N bytes.
 *
 * **Validates: Requirements 11.1**
 */
describe('Feature: api-lib-to-lib-migration, Property 26: Platform Crypto Random Bytes', () => {
  /**
   * Property 26a: getRandomBytes returns exactly N bytes for any valid length
   */
  it('Property 26a: getRandomBytes returns exactly N bytes for any valid length', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (length) => {
        const bytes = getRandomBytes(length);

        // Must be a Uint8Array
        expect(bytes).toBeInstanceOf(Uint8Array);

        // Must have exactly the requested length
        expect(bytes.length).toBe(length);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 26b: getRandomBytes returns different values for successive calls
   * (with high probability for non-trivial lengths)
   */
  it('Property 26b: getRandomBytes returns different values for successive calls (length >= 8)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 8, max: 1000 }), (length) => {
        const bytes1 = getRandomBytes(length);
        const bytes2 = getRandomBytes(length);

        // Both should be Uint8Arrays of the correct length
        expect(bytes1.length).toBe(length);
        expect(bytes2.length).toBe(length);

        // They should be different (with overwhelming probability for length >= 8)
        // Convert to hex strings for comparison
        const hex1 = Array.from(bytes1)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        const hex2 = Array.from(bytes2)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        expect(hex1).not.toBe(hex2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 26c: getRandomBytes handles edge case of zero length
   */
  it('Property 26c: getRandomBytes handles zero length', () => {
    const bytes = getRandomBytes(0);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(0);
  });

  /**
   * Property 26d: getRandomBytes throws for negative length
   */
  it('Property 26d: getRandomBytes throws for negative length', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: -1 }), (length) => {
        expect(() => getRandomBytes(length)).toThrow(
          'Length must be non-negative',
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 26e: getRandomBytes handles large lengths (chunking for browser)
   * Tests lengths that exceed the Web Crypto API limit of 65,536 bytes
   */
  it('Property 26e: getRandomBytes handles large lengths requiring chunking', () => {
    fc.assert(
      fc.property(fc.integer({ min: 65537, max: 200000 }), (length) => {
        const bytes = getRandomBytes(length);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(length);
      }),
      { numRuns: 10 }, // Fewer runs for large allocations
    );
  });

  /**
   * Property 26f: All byte values are within valid range [0, 255]
   */
  it('Property 26f: All byte values are within valid range [0, 255]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (length) => {
        const bytes = getRandomBytes(length);

        for (let i = 0; i < bytes.length; i++) {
          expect(bytes[i]).toBeGreaterThanOrEqual(0);
          expect(bytes[i]).toBeLessThanOrEqual(255);
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 27: Platform Crypto SHA-1
 * For any known input string, sha1Hash SHALL produce the correct SHA-1 hash
 * (verifiable against test vectors).
 *
 * **Validates: Requirements 11.4**
 */
describe('Feature: api-lib-to-lib-migration, Property 27: Platform Crypto SHA-1', () => {
  /**
   * Known SHA-1 test vectors from various sources
   * These are well-known test vectors for SHA-1 verification
   */
  const sha1TestVectors: Array<{ input: string; expected: string }> = [
    // Empty string
    { input: '', expected: 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709' },
    // Single character
    { input: 'a', expected: '86F7E437FAA5A7FCE15D1DDCB9EAEAEA377667B8' },
    // Common test string
    { input: 'abc', expected: 'A9993E364706816ABA3E25717850C26C9CD0D89D' },
    // Longer string
    {
      input: 'message digest',
      expected: 'C12252CEDA8BE8994D5FA0290A47231C1D16AAE3',
    },
    // Alphabet
    {
      input: 'abcdefghijklmnopqrstuvwxyz',
      expected: '32D10C7B8CF96570CA04CE37F2A19D84240D3A89',
    },
    // Password (common use case for breach detection)
    { input: 'password', expected: '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8' },
    // Numbers
    { input: '123456', expected: '7C4A8D09CA3762AF61E59520943DC26494F8941B' },
    // Mixed case and numbers
    {
      input: 'The quick brown fox jumps over the lazy dog',
      expected: '2FD4E1C67A2D28FCED849EE1BB76E7391B93EB12',
    },
  ];

  /**
   * Property 27a: sha1Hash produces correct hash for known test vectors
   */
  it('Property 27a: sha1Hash produces correct hash for known test vectors', () => {
    for (const { input, expected } of sha1TestVectors) {
      const result = sha1Hash(input);
      expect(result).toBe(expected);
    }
  });

  /**
   * Property 27b: sha1Hash returns uppercase hexadecimal string of 40 characters
   */
  it('Property 27b: sha1Hash returns uppercase hexadecimal string of 40 characters', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (input) => {
        const hash = sha1Hash(input);

        // SHA-1 produces 160 bits = 20 bytes = 40 hex characters
        expect(hash.length).toBe(40);

        // Should be uppercase hexadecimal
        expect(hash).toMatch(/^[0-9A-F]{40}$/);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27c: sha1Hash is deterministic - same input always produces same output
   */
  it('Property 27c: sha1Hash is deterministic - same input always produces same output', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (input) => {
        const hash1 = sha1Hash(input);
        const hash2 = sha1Hash(input);

        expect(hash1).toBe(hash2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27d: sha1Hash produces different outputs for different inputs
   * (with high probability for non-trivial inputs)
   */
  it('Property 27d: sha1Hash produces different outputs for different inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (input1, input2) => {
          // Skip if inputs are the same
          fc.pre(input1 !== input2);

          const hash1 = sha1Hash(input1);
          const hash2 = sha1Hash(input2);

          // Different inputs should produce different hashes
          expect(hash1).not.toBe(hash2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27e: sha1Hash accepts Uint8Array input and produces correct output
   */
  it('Property 27e: sha1Hash accepts Uint8Array input and produces correct output', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 1000 }), (input) => {
        const hash = sha1Hash(input);

        // Should be valid SHA-1 hash format
        expect(hash.length).toBe(40);
        expect(hash).toMatch(/^[0-9A-F]{40}$/);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27f: sha1Hash string and Uint8Array inputs produce same output for equivalent data
   */
  it('Property 27f: sha1Hash string and Uint8Array inputs produce same output for equivalent data', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (input) => {
        const hashFromString = sha1Hash(input);
        const hashFromBytes = sha1Hash(new TextEncoder().encode(input));

        expect(hashFromString).toBe(hashFromBytes);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27g: sha1HashBytes returns Uint8Array of exactly 20 bytes
   */
  it('Property 27g: sha1HashBytes returns Uint8Array of exactly 20 bytes', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (input) => {
        const hashBytes = sha1HashBytes(input);

        // SHA-1 produces 160 bits = 20 bytes
        expect(hashBytes).toBeInstanceOf(Uint8Array);
        expect(hashBytes.length).toBe(20);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27h: sha1Hash and sha1HashBytes are consistent
   */
  it('Property 27h: sha1Hash and sha1HashBytes are consistent', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (input) => {
        const hashString = sha1Hash(input);
        const hashBytes = sha1HashBytes(input);

        // Convert bytes to uppercase hex string
        const bytesToHex = Array.from(hashBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();

        expect(hashString).toBe(bytesToHex);
      }),
      { numRuns: 100 },
    );
  });
});
