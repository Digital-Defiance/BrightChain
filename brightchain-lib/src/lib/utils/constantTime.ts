import { timingSafeEqual } from 'crypto';

/**
 * Constant-time comparison utilities for security-sensitive operations.
 * These functions prevent timing attacks by ensuring comparison time
 * is independent of input values.
 */

/**
 * Compare two Uint8Arrays in constant time
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

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Compare two buffers in constant time
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

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
