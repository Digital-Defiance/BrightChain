import fc from 'fast-check';
import {
  constantTimeXor,
  constantTimeXorMultiple,
  XorLengthMismatchError,
} from './constantTimeXor';

/**
 * Property-based tests for constant-time XOR operations
 * Feature: block-security-hardening
 * Validates Requirements 1.1, 1.2, 1.3, 1.5
 */
describe('Feature: block-security-hardening, Property 1: XOR Operation Correctness (Round-Trip)', () => {
  /**
   * Property 1a: XOR is self-inverse
   * For any two equal-length byte arrays A and B:
   * (A ⊕ B) ⊕ B = A
   *
   * This is the fundamental property of XOR that makes it useful for encryption.
   * Validates Requirements 1.1, 1.2, 1.3, 1.5
   */
  it('Property 1a: XOR round-trip returns original data', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 1024 }),
        fc.uint8Array({ minLength: 1, maxLength: 1024 }),
        (arrayA, arrayB) => {
          // Ensure arrays are same length
          const length = Math.min(arrayA.length, arrayB.length);
          const a = arrayA.slice(0, length);
          const b = arrayB.slice(0, length);

          // XOR twice should return original
          const encrypted = constantTimeXor(a, b);
          const decrypted = constantTimeXor(encrypted, b);

          // Verify round-trip
          expect(decrypted).toEqual(a);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: XOR is commutative
   * For any two equal-length byte arrays A and B:
   * A ⊕ B = B ⊕ A
   *
   * Validates Requirements 1.1, 1.2
   */
  it('Property 1b: XOR is commutative', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 1024 }),
        fc.uint8Array({ minLength: 1, maxLength: 1024 }),
        (arrayA, arrayB) => {
          // Ensure arrays are same length
          const length = Math.min(arrayA.length, arrayB.length);
          const a = arrayA.slice(0, length);
          const b = arrayB.slice(0, length);

          const ab = constantTimeXor(a, b);
          const ba = constantTimeXor(b, a);

          expect(ab).toEqual(ba);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: XOR is associative
   * For any three equal-length byte arrays A, B, and C:
   * (A ⊕ B) ⊕ C = A ⊕ (B ⊕ C)
   *
   * Validates Requirements 1.1, 1.2
   */
  it('Property 1c: XOR is associative', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        (arrayA, arrayB, arrayC) => {
          // Ensure arrays are same length
          const length = Math.min(arrayA.length, arrayB.length, arrayC.length);
          const a = arrayA.slice(0, length);
          const b = arrayB.slice(0, length);
          const c = arrayC.slice(0, length);

          const ab_c = constantTimeXor(constantTimeXor(a, b), c);
          const a_bc = constantTimeXor(a, constantTimeXor(b, c));

          expect(ab_c).toEqual(a_bc);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1d: XOR with self produces zeros
   * For any byte array A:
   * A ⊕ A = 0
   *
   * Validates Requirements 1.1, 1.2
   */
  it('Property 1d: XOR with self produces all zeros', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (array) => {
        const result = constantTimeXor(array, array);
        const allZeros = result.every((byte) => byte === 0);
        expect(allZeros).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e: XOR with zeros returns original
   * For any byte array A:
   * A ⊕ 0 = A
   *
   * Validates Requirements 1.1, 1.2
   */
  it('Property 1e: XOR with zeros returns original', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (array) => {
        const zeros = new Uint8Array(array.length);
        const result = constantTimeXor(array, zeros);
        expect(result).toEqual(array);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1f: Length mismatch throws descriptive error
   * For any two arrays of different lengths, XOR should throw XorLengthMismatchError
   *
   * Validates Requirements 1.4
   */
  it('Property 1f: Length mismatch throws descriptive error', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 2, maxLength: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (array, lengthDiff) => {
          // Ensure we actually create a different length
          const newLength = Math.max(1, array.length - lengthDiff);
          if (newLength === array.length) {
            return; // Skip if lengths would be the same
          }

          const shorterArray = array.slice(0, newLength);

          expect(() => constantTimeXor(array, shorterArray)).toThrow(
            XorLengthMismatchError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1g: Multiple XOR is equivalent to sequential XOR
   * For any arrays [A, B, C]:
   * constantTimeXorMultiple([A, B, C]) = (A ⊕ B) ⊕ C
   *
   * Validates Requirements 1.1, 1.3
   */
  it('Property 1g: Multiple XOR equals sequential XOR', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 256 }), {
          minLength: 2,
          maxLength: 5,
        }),
        (arrays) => {
          // Ensure all arrays are same length
          const length = Math.min(...arrays.map((a) => a.length));
          const sameLength = arrays.map((a) => a.slice(0, length));

          // Multiple XOR
          const multiResult = constantTimeXorMultiple(sameLength);

          // Sequential XOR
          let seqResult: Uint8Array = sameLength[0];
          for (let i = 1; i < sameLength.length; i++) {
            seqResult = constantTimeXor(seqResult, sameLength[i]);
          }

          expect(multiResult).toEqual(seqResult);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1h: Multiple XOR round-trip
   * For any arrays [A, B, C]:
   * ((A ⊕ B ⊕ C) ⊕ B ⊕ C) = A
   *
   * Validates Requirements 1.1, 1.3, 1.5
   */
  it('Property 1h: Multiple XOR round-trip returns original', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 256 }), {
          minLength: 1,
          maxLength: 4,
        }),
        (original, keys) => {
          // Ensure all arrays are same length
          const length = Math.min(
            original.length,
            ...keys.map((k) => k.length),
          );
          const data = original.slice(0, length);
          const sameKeys = keys.map((k) => k.slice(0, length));

          // Encrypt with multiple keys
          const encrypted = constantTimeXorMultiple([data, ...sameKeys]);

          // Decrypt with same keys
          const decrypted = constantTimeXorMultiple([encrypted, ...sameKeys]);

          expect(decrypted).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1i: Empty array input throws error
   * constantTimeXorMultiple should throw when given empty array
   *
   * Validates Requirements 1.4
   */
  it('Property 1i: Empty array input throws error', () => {
    expect(() => constantTimeXorMultiple([])).toThrow(
      /Error_XorAtLeastOneArrayRequired/,
    );
  });

  /**
   * Property 1j: Multiple XOR length mismatch throws error
   * For any arrays with different lengths, constantTimeXorMultiple should throw
   *
   * Validates Requirements 1.4
   */
  it('Property 1j: Multiple XOR length mismatch throws error', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), {
          minLength: 2,
          maxLength: 5,
        }),
        fc.integer({ min: 1, max: 50 }),
        (arrays, lengthDiff) => {
          // Make one array different length
          const modified = [...arrays];
          const lastIdx = modified.length - 1;
          modified[lastIdx] = modified[lastIdx].slice(
            0,
            Math.max(1, modified[lastIdx].length - lengthDiff),
          );

          // Should throw if lengths differ
          if (modified[0].length !== modified[lastIdx].length) {
            expect(() => constantTimeXorMultiple(modified)).toThrow(
              XorLengthMismatchError,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
