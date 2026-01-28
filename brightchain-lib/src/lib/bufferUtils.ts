/**
 * Utility functions to replace Node.js Buffer operations with browser-compatible Uint8Array operations
 */

import { BrightChainStrings } from './enumerations/brightChainStrings';
import { translate } from './i18n';

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Handle empty or invalid base64 strings
  if (!base64 || base64 === '0' || base64.length === 0) {
    return new Uint8Array(0);
  }

  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    // If base64 decoding fails, return empty array
    console.warn(
      translate(BrightChainStrings.Warning_BufferUtils_InvalidBase64String),
      base64,
      error,
    );
    return new Uint8Array(0);
  }
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

/**
 * Concatenate multiple Uint8Arrays
 */
export function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Write a 32-bit big-endian unsigned integer to a Uint8Array
 */
export function writeUInt32BE(
  value: number,
  buffer: Uint8Array,
  offset = 0,
): void {
  buffer[offset] = (value >>> 24) & 0xff;
  buffer[offset + 1] = (value >>> 16) & 0xff;
  buffer[offset + 2] = (value >>> 8) & 0xff;
  buffer[offset + 3] = value & 0xff;
}

/**
 * Read a 32-bit big-endian unsigned integer from a Uint8Array
 */
export function readUInt32BE(buffer: Uint8Array, offset = 0): number {
  return (
    ((buffer[offset] << 24) |
      (buffer[offset + 1] << 16) |
      (buffer[offset + 2] << 8) |
      buffer[offset + 3]) >>>
    0
  );
}

/**
 * Check if two Uint8Arrays are equal
 */
export function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Copy data from one Uint8Array to another
 */
export function copyUint8Array(
  source: Uint8Array,
  target: Uint8Array,
  targetOffset = 0,
): void {
  target.set(source, targetOffset);
}

/**
 * Convert Uint8Array to string (for text data)
 */
export function uint8ArrayToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Convert string to Uint8Array
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
