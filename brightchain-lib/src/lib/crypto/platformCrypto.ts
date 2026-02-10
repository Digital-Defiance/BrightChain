/**
 * Platform-agnostic crypto utilities for browser and Node.js environments.
 *
 * This module provides cryptographic functions that work in both browser and Node.js
 * environments, abstracting away the differences between Web Crypto API and Node.js crypto.
 *
 * @module platformCrypto
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { sha1 } from '@noble/hashes/sha1';

/**
 * Interface for platform-agnostic crypto operations.
 */
export interface IPlatformCrypto {
  /**
   * Generate cryptographically secure random bytes.
   * @param length - Number of bytes to generate
   * @returns Uint8Array of random bytes
   */
  randomBytes(length: number): Uint8Array;

  /**
   * Compute SHA-1 hash of input data.
   * @param data - String or Uint8Array to hash
   * @returns Uint8Array containing the hash
   */
  sha1(data: string | Uint8Array): Uint8Array;
}

/**
 * Detects whether the code is running in a browser environment.
 *
 * @returns true if running in a browser with Web Crypto API available
 * @see Requirement 11.5
 */
export function isBrowserEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.getRandomValues === 'function'
  );
}

/**
 * Detects whether the code is running in a Node.js environment.
 *
 * @returns true if running in Node.js
 * @see Requirement 11.5
 */
export function isNodeEnvironment(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  );
}

/**
 * Generate cryptographically secure random bytes.
 *
 * Uses Web Crypto API (crypto.getRandomValues) in browser environments
 * and Node.js crypto.randomBytes in Node.js environments.
 *
 * Handles the Web Crypto API limit of 65,536 bytes per call by chunking
 * large requests.
 *
 * @param length - Number of bytes to generate (must be non-negative)
 * @returns Uint8Array of cryptographically secure random bytes
 * @throws Error if length is negative
 * @see Requirements 11.1, 11.2, 11.3
 *
 * @example
 * ```typescript
 * const bytes = getRandomBytes(32);
 * console.log(bytes.length); // 32
 * ```
 */
export function getRandomBytes(length: number): Uint8Array {
  if (length < 0) {
    throw new Error('Length must be non-negative');
  }

  if (length === 0) {
    return new Uint8Array(0);
  }

  if (isBrowserEnvironment()) {
    // Browser environment - use Web Crypto API
    // Web Crypto API has a limit of 65,536 bytes per call
    const MAX_BYTES = 65536;

    if (length <= MAX_BYTES) {
      const bytes = new Uint8Array(length);
      window.crypto.getRandomValues(bytes);
      return bytes;
    }

    // For larger sizes, chunk the requests
    const result = new Uint8Array(length);
    let offset = 0;

    while (offset < length) {
      const chunkSize = Math.min(MAX_BYTES, length - offset);
      const chunk = new Uint8Array(chunkSize);
      window.crypto.getRandomValues(chunk);
      result.set(chunk, offset);
      offset += chunkSize;
    }

    return result;
  } else {
    // Node.js environment - use crypto.randomBytes
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto');
    return new Uint8Array(randomBytes(length));
  }
}

/**
 * Compute SHA-1 hash of input data.
 *
 * Uses @noble/hashes for cross-platform SHA-1 implementation that works
 * in both browser and Node.js environments.
 *
 * @param data - String or Uint8Array to hash
 * @returns Uppercase hexadecimal string representation of the SHA-1 hash
 * @see Requirement 11.4
 *
 * @example
 * ```typescript
 * const hash = sha1Hash('password');
 * console.log(hash); // '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8'
 * ```
 */
export function sha1Hash(data: string | Uint8Array): string {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = sha1(bytes);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Compute SHA-1 hash of input data and return as Uint8Array.
 *
 * Uses @noble/hashes for cross-platform SHA-1 implementation that works
 * in both browser and Node.js environments.
 *
 * @param data - String or Uint8Array to hash
 * @returns Uint8Array containing the SHA-1 hash (20 bytes)
 * @see Requirement 11.4
 *
 * @example
 * ```typescript
 * const hashBytes = sha1HashBytes('password');
 * console.log(hashBytes.length); // 20
 * ```
 */
export function sha1HashBytes(data: string | Uint8Array): Uint8Array {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return sha1(bytes);
}

/**
 * Default implementation of IPlatformCrypto interface.
 *
 * Provides a class-based wrapper around the standalone functions
 * for use cases that prefer object-oriented patterns.
 */
export class PlatformCrypto implements IPlatformCrypto {
  /**
   * Generate cryptographically secure random bytes.
   * @param length - Number of bytes to generate
   * @returns Uint8Array of random bytes
   */
  randomBytes(length: number): Uint8Array {
    return getRandomBytes(length);
  }

  /**
   * Compute SHA-1 hash of input data.
   * @param data - String or Uint8Array to hash
   * @returns Uint8Array containing the hash
   */
  sha1(data: string | Uint8Array): Uint8Array {
    return sha1HashBytes(data);
  }
}
