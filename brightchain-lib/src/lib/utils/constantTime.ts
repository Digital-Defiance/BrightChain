/**
 * Constant-time comparison utilities to prevent timing attacks.
 *
 * These functions ensure that comparison operations take the same amount of time
 * regardless of where differences occur in the data, preventing timing-based
 * side-channel attacks.
 *
 * @see Requirements 8.1, 8.2 (Security)
 */

/**
 * Constant-time comparison of two Uint8Arrays.
 *
 * This function compares two arrays byte-by-byte in constant time,
 * meaning the execution time does not depend on where the first
 * difference occurs.
 *
 * @param a - First array to compare
 * @param b - Second array to compare
 * @returns true if arrays are equal, false otherwise
 *
 * @remarks
 * - Always compares all bytes, even after finding a difference
 * - Returns false if lengths differ (length comparison is not constant-time)
 * - Uses bitwise operations to avoid branching
 *
 * @example
 * ```typescript
 * const key1 = new Uint8Array([1, 2, 3, 4]);
 * const key2 = new Uint8Array([1, 2, 3, 4]);
 * const key3 = new Uint8Array([1, 2, 3, 5]);
 *
 * constantTimeEqual(key1, key2); // true
 * constantTimeEqual(key1, key3); // false
 * ```
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Length comparison is not constant-time, but this is acceptable
  // as length is typically not secret information
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  // XOR all bytes and accumulate differences
  // This ensures we always process all bytes regardless of where differences occur
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  // Convert diff to boolean: 0 means equal, non-zero means different
  // Using bitwise operations to avoid branching
  return diff === 0;
}

/**
 * Constant-time comparison of two hex strings.
 *
 * Converts hex strings to Uint8Arrays and performs constant-time comparison.
 *
 * @param a - First hex string to compare
 * @param b - Second hex string to compare
 * @returns true if hex strings represent equal data, false otherwise
 *
 * @throws Error if either string is not valid hexadecimal
 *
 * @example
 * ```typescript
 * const hash1 = 'deadbeef';
 * const hash2 = 'deadbeef';
 * const hash3 = 'deadbee0';
 *
 * constantTimeEqualHex(hash1, hash2); // true
 * constantTimeEqualHex(hash1, hash3); // false
 * ```
 */
export function constantTimeEqualHex(a: string, b: string): boolean {
  // Validate hex strings
  if (!/^[0-9a-fA-F]*$/.test(a) || !/^[0-9a-fA-F]*$/.test(b)) {
    throw new Error('Invalid hexadecimal string');
  }

  // Length comparison (not constant-time, but acceptable)
  if (a.length !== b.length) {
    return false;
  }

  // Convert to bytes
  const bytesA = hexToBytes(a);
  const bytesB = hexToBytes(b);

  return constantTimeEqual(bytesA, bytesB);
}

/**
 * Convert a hex string to Uint8Array.
 *
 * @param hex - Hex string to convert
 * @returns Uint8Array representation
 * @internal
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time selection between two values based on a condition.
 *
 * This function selects between two values without branching,
 * ensuring constant-time execution regardless of the condition.
 *
 * @param condition - Boolean condition (0 or 1)
 * @param trueValue - Value to return if condition is true
 * @param falseValue - Value to return if condition is false
 * @returns Selected value
 *
 * @remarks
 * - Condition must be 0 or 1 (not just falsy/truthy)
 * - Uses bitwise operations to avoid branching
 *
 * @example
 * ```typescript
 * const result = constantTimeSelect(1, 42, 0); // returns 42
 * const result2 = constantTimeSelect(0, 42, 0); // returns 0
 * ```
 */
export function constantTimeSelect(
  condition: number,
  trueValue: number,
  falseValue: number,
): number {
  // Ensure condition is 0 or 1
  const mask = -(condition & 1);
  return (mask & trueValue) | (~mask & falseValue);
}

/**
 * Constant-time comparison of two numbers.
 *
 * @param a - First number to compare
 * @param b - Second number to compare
 * @returns true if numbers are equal, false otherwise
 *
 * @remarks
 * - Only works correctly for 32-bit integers
 * - Uses bitwise operations to avoid branching
 *
 * @example
 * ```typescript
 * constantTimeEqualNumber(42, 42); // true
 * constantTimeEqualNumber(42, 43); // false
 * ```
 */
export function constantTimeEqualNumber(a: number, b: number): boolean {
  // XOR the numbers - result is 0 if equal
  const diff = (a ^ b) >>> 0; // Unsigned right shift to ensure 32-bit

  // Check if diff is zero without branching
  // If diff is 0, all bits are 0, so (diff | -diff) >>> 31 is 0
  // If diff is non-zero, at least one bit is set, so (diff | -diff) >>> 31 is 1
  return (diff | -diff) >>> 31 === 0;
}

/**
 * Constant-time check if a byte array is all zeros.
 *
 * @param data - Array to check
 * @returns true if all bytes are zero, false otherwise
 *
 * @example
 * ```typescript
 * constantTimeIsZero(new Uint8Array([0, 0, 0])); // true
 * constantTimeIsZero(new Uint8Array([0, 1, 0])); // false
 * ```
 */
export function constantTimeIsZero(data: Uint8Array): boolean {
  let result = 0;

  // OR all bytes together
  for (let i = 0; i < data.length; i++) {
    result |= data[i];
  }

  // result is 0 only if all bytes were 0
  return result === 0;
}
