/**
 * Constant-time XOR operations to prevent timing attacks.
 *
 * These functions ensure that XOR operations take the same amount of time
 * regardless of input byte values, preventing timing-based side-channel attacks.
 * This is critical for security-sensitive operations like whitening/brightening
 * in the Owner-Free Filesystem.
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5 (Security - Constant-Time XOR)
 */

/**
 * Custom error for XOR length mismatches.
 * Provides descriptive error messages for debugging.
 */
export class XorLengthMismatchError extends Error {
  constructor(lengthA: number, lengthB: number, context?: string) {
    const contextStr = context ? ` in ${context}` : '';
    super(
      `XOR requires equal-length arrays${contextStr}: a.length=${lengthA}, b.length=${lengthB}`,
    );
    this.name = 'XorLengthMismatchError';
  }
}

/**
 * Perform constant-time XOR of two equal-length byte arrays.
 *
 * This function XORs two arrays byte-by-byte in constant time,
 * meaning the execution time does not depend on the byte values.
 * This prevents timing attacks that could leak information about
 * the data being processed.
 *
 * Properties:
 * - Self-inverse: constantTimeXor(constantTimeXor(A, B), B) = A
 * - Commutative: constantTimeXor(A, B) = constantTimeXor(B, A)
 * - Associative: constantTimeXor(constantTimeXor(A, B), C) = constantTimeXor(A, constantTimeXor(B, C))
 *
 * @param a - First array to XOR
 * @param b - Second array to XOR (must be same length as a)
 * @returns New Uint8Array containing the XOR result (a ⊕ b)
 * @throws {XorLengthMismatchError} if arrays have different lengths
 *
 * @remarks
 * - Always processes all bytes without early exit
 * - Uses no conditional branches based on data values
 * - Length validation is not constant-time (acceptable as length is not secret)
 *
 * @example
 * ```typescript
 * const data = new Uint8Array([1, 2, 3, 4]);
 * const key = new Uint8Array([5, 6, 7, 8]);
 * const encrypted = constantTimeXor(data, key);
 * const decrypted = constantTimeXor(encrypted, key); // Returns original data
 * ```
 */
export function constantTimeXor(
  a: Uint8Array,
  b: Uint8Array,
): Uint8Array {
  // Length validation (not constant-time, but length is typically not secret)
  if (a.length !== b.length) {
    throw new XorLengthMismatchError(a.length, b.length, 'constantTimeXor');
  }

  const result = new Uint8Array(a.length);

  // XOR all bytes without any conditional branches based on values
  // This ensures constant-time execution regardless of input data
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }

  return result;
}

/**
 * Perform constant-time XOR of multiple equal-length byte arrays.
 *
 * This function XORs multiple arrays together in constant time.
 * Used for brightening operations where a source block is XORed
 * with multiple random blocks.
 *
 * @param arrays - Array of Uint8Arrays to XOR together (all must be same length)
 * @returns New Uint8Array containing the XOR of all input arrays
 * @throws {Error} if no arrays provided
 * @throws {XorLengthMismatchError} if arrays have different lengths
 *
 * @remarks
 * - Always processes all bytes in all arrays without early exit
 * - Uses no conditional branches based on data values
 * - Validates all array lengths before processing
 *
 * @example
 * ```typescript
 * const source = new Uint8Array([1, 2, 3, 4]);
 * const random1 = new Uint8Array([5, 6, 7, 8]);
 * const random2 = new Uint8Array([9, 10, 11, 12]);
 * const whitened = constantTimeXorMultiple([source, random1, random2]);
 * ```
 */
export function constantTimeXorMultiple(arrays: Uint8Array[]): Uint8Array {
  if (arrays.length === 0) {
    throw new Error('At least one array must be provided for XOR');
  }

  const length = arrays[0].length;

  // Verify all arrays have the same length
  // This validation is not constant-time, but array lengths are not secret
  for (let i = 1; i < arrays.length; i++) {
    if (arrays[i].length !== length) {
      throw new XorLengthMismatchError(
        length,
        arrays[i].length,
        `constantTimeXorMultiple at index ${i}`,
      );
    }
  }

  const result = new Uint8Array(length);

  // XOR all arrays together without conditional branches based on values
  // Process each byte position across all arrays
  for (let i = 0; i < length; i++) {
    let xorValue = 0;
    // XOR all arrays at position i
    for (const arr of arrays) {
      xorValue ^= arr[i];
    }
    result[i] = xorValue;
  }

  return result;
}
