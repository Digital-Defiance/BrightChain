/**
 * Checksum utility functions for working with Checksum class and legacy types.
 *
 * This module provides utility functions for converting between different
 * checksum representations and working with both the new Checksum class
 * and legacy Uint8Array checksums.
 *
 * @module utils/checksumUtils
 *
 * @example
 * ```typescript
 * import { uint8ArrayToHex, hexToChecksum } from 'brightchain-lib';
 *
 * // Convert Checksum to hex
 * const hex = uint8ArrayToHex(checksum);
 *
 * // Convert Uint8Array to hex
 * const hex2 = uint8ArrayToHex(uint8Array);
 *
 * // Convert hex to Checksum
 * const checksum = hexToChecksum(hex);
 * ```
 *
 * @see Requirements 5.1, 5.2, 5.4
 */

import { uint8ArrayToHex as eciesUint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { Checksum } from '../types/checksum';

/**
 * Convert Checksum or Uint8Array to hex string.
 *
 * This function provides a unified interface for converting both Checksum
 * instances and Uint8Array to hex strings. It handles the type checking
 * internally and delegates to the appropriate conversion method.
 *
 * @param data - The Checksum or Uint8Array to convert
 * @returns The hex string representation
 *
 * @example
 * ```typescript
 * // With Checksum
 * const checksum = Checksum.fromBuffer(buffer);
 * const hex = uint8ArrayToHex(checksum); // Uses checksum.toHex()
 *
 * // With Uint8Array
 * const array = new Uint8Array([1, 2, 3]);
 * const hex2 = uint8ArrayToHex(array); // Uses ecies-lib conversion
 * ```
 *
 * @see Requirement 5.1
 */
export function uint8ArrayToHex(data: Checksum | Uint8Array): string {
  if (data instanceof Checksum) {
    return data.toHex();
  }
  return eciesUint8ArrayToHex(data);
}

/**
 * Convert hex string to Checksum.
 *
 * This function creates a Checksum instance from a hex string.
 * It validates the hex string format and length.
 *
 * @param hex - The hex string to convert
 * @returns A new Checksum instance
 * @throws ChecksumError if hex string is invalid or wrong length
 *
 * @example
 * ```typescript
 * const hex = 'a1b2c3d4...'; // 128 hex characters = 64 bytes
 * const checksum = hexToChecksum(hex);
 * ```
 *
 * @see Requirement 5.2
 */
export function hexToChecksum(hex: string): Checksum {
  return Checksum.fromHex(hex);
}

/**
 * Convert Checksum to Uint8Array.
 *
 * This function extracts the underlying Uint8Array from a Checksum instance.
 * Returns a copy to maintain immutability.
 *
 * @param checksum - The Checksum to convert
 * @returns A new Uint8Array containing the checksum data
 *
 * @example
 * ```typescript
 * const checksum = Checksum.fromBuffer(buffer);
 * const array = checksumToUint8Array(checksum);
 * ```
 *
 * @see Requirement 5.4
 */
export function checksumToUint8Array(checksum: Checksum): Uint8Array {
  return checksum.toUint8Array();
}

/**
 * Convert Checksum to Buffer.
 *
 * This function extracts the underlying data as a Buffer from a Checksum instance.
 *
 * @param checksum - The Checksum to convert
 * @returns A new Buffer containing the checksum data
 *
 * @example
 * ```typescript
 * const checksum = Checksum.fromUint8Array(array);
 * const buffer = checksumToBuffer(checksum);
 * ```
 *
 * @see Requirement 5.4
 */
export function checksumToBuffer(checksum: Checksum): Buffer {
  return checksum.toBuffer();
}
