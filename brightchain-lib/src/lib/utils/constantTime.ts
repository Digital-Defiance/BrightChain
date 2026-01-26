/**
 * Constant-time comparison utilities for security-sensitive operations.
 * These functions prevent timing attacks by ensuring comparison time
 * is independent of input values.
 *
 * Uses a pure JavaScript implementation for browser compatibility.
 */

/**
 * Compare two Uint8Arrays in constant time.
 * This implementation XORs all bytes and accumulates differences,
 * ensuring the comparison time is independent of where differences occur.
 *
 * @param a First array
 * @param b Second array
 * @returns true if arrays are equal, false otherwise
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  if (a.length === 0) {
    return true;
  }

  // XOR all bytes and accumulate - this ensures we always check all bytes
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Compare two buffers in constant time.
 * This implementation XORs all bytes and accumulates differences,
 * ensuring the comparison time is independent of where differences occur.
 *
 * @param a First buffer
 * @param b Second buffer
 * @returns true if buffers are equal, false otherwise
 */
export function constantTimeEqualBuffer(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  if (a.length === 0) {
    return true;
  }

  // XOR all bytes and accumulate - this ensures we always check all bytes
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Compare two arrays in constant time (converts to Uint8Array)
 * @param a First array
 * @param b Second array
 * @returns true if arrays are equal, false otherwise
 */
export function constantTimeEqualArray(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  if (a.length === 0) {
    return true;
  }

  return constantTimeEqual(new Uint8Array(a), new Uint8Array(b));
}
