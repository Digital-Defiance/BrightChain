/**
 * Unified Checksum class that handles both Buffer and Uint8Array representations.
 *
 * This class provides a consistent interface for working with checksums,
 * eliminating the need for manual type conversions between Buffer and Uint8Array.
 *
 * @example
 * ```typescript
 * // Create from Buffer
 * const checksum1 = Checksum.fromBuffer(buffer);
 *
 * // Create from Uint8Array
 * const checksum2 = Checksum.fromUint8Array(uint8Array);
 *
 * // Create from hex string
 * const checksum3 = Checksum.fromHex('a1b2c3...');
 *
 * // Compare checksums
 * if (checksum1.equals(checksum2)) {
 *   console.log('Checksums match');
 * }
 *
 * // Convert to different formats
 * const buffer = checksum1.toBuffer();
 * const uint8Array = checksum1.toUint8Array();
 * const hex = checksum1.toHex();
 * ```
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { CHECKSUM, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from '../enumerations';
import { ChecksumError, ChecksumErrorType } from '../errors/checksumError';
import { translate } from '../i18n';

// Re-export ChecksumErrorType for backward compatibility
export { ChecksumErrorType } from '../errors/checksumError';

/**
 * Unified checksum class that handles both Buffer and Uint8Array representations.
 *
 * The class uses Uint8Array internally for efficiency and provides conversion
 * methods to Buffer and hex string formats.
 *
 * @remarks
 * - The constructor is private; use factory methods to create instances
 * - All checksums must be exactly SHA3_BUFFER_LENGTH bytes (64 bytes for SHA3-512)
 * - The equals() method performs byte-by-byte comparison
 * - toString() is an alias for toHex()
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class Checksum {
  /**
   * Internal storage for checksum data.
   * Uses Uint8Array for efficiency.
   */
  private readonly data: Uint8Array;

  /**
   * Private constructor to enforce factory pattern.
   *
   * @param data - The checksum data as Uint8Array
   * @throws ChecksumError if data length is not equal to SHA3_BUFFER_LENGTH
   *
   * @internal
   */
  private constructor(data: Uint8Array) {
    if (data.length !== CHECKSUM.SHA3_BUFFER_LENGTH) {
      throw new ChecksumError(
        ChecksumErrorType.InvalidLength,
        translate(BrightChainStrings.Checksum_InvalidTemplate, {
          EXPECTED: CHECKSUM.SHA3_BUFFER_LENGTH,
          LENGTH: data.length,
        }),
        {
          actualLength: data.length,
          expectedLength: CHECKSUM.SHA3_BUFFER_LENGTH,
        },
      );
    }
    // Create a copy to ensure immutability
    this.data = new Uint8Array(data);
  }

  /**
   * Create a Checksum from a Buffer.
   *
   * @param buffer - The buffer containing checksum data
   * @returns A new Checksum instance
   * @throws ChecksumError if buffer length is not equal to SHA3_BUFFER_LENGTH
   *
   * @example
   * ```typescript
   * const buffer = Buffer.from('a'.repeat(128), 'hex'); // 64 bytes
   * const checksum = Checksum.fromBuffer(buffer);
   * ```
   *
   * @see Requirement 1.2
   */
  static fromBuffer(buffer: Buffer): Checksum {
    return new Checksum(new Uint8Array(buffer));
  }

  /**
   * Create a Checksum from a Uint8Array.
   *
   * @param array - The Uint8Array containing checksum data
   * @returns A new Checksum instance
   * @throws ChecksumError if array length is not equal to SHA3_BUFFER_LENGTH
   *
   * @example
   * ```typescript
   * const array = new Uint8Array(64);
   * crypto.getRandomValues(array);
   * const checksum = Checksum.fromUint8Array(array);
   * ```
   *
   * @see Requirement 1.2
   */
  static fromUint8Array(array: Uint8Array): Checksum {
    return new Checksum(array);
  }

  /**
   * Create a Checksum from a hex string.
   *
   * @param hex - The hex string representation of the checksum
   * @returns A new Checksum instance
   * @throws ChecksumError if hex string is invalid or results in wrong length
   *
   * @example
   * ```typescript
   * const hex = 'a1b2c3d4...'; // 128 hex characters = 64 bytes
   * const checksum = Checksum.fromHex(hex);
   * ```
   *
   * @see Requirement 1.2
   */
  static fromHex(hex: string): Checksum {
    // Validate hex string format
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      throw new ChecksumError(
        ChecksumErrorType.InvalidHex,
        translate(BrightChainStrings.Checksum_InvalidHexString),
        { input: hex.substring(0, 20) + (hex.length > 20 ? '...' : '') },
      );
    }

    // Check if hex string has correct length (2 hex chars per byte)
    const expectedHexLength = CHECKSUM.SHA3_BUFFER_LENGTH * 2;
    if (hex.length !== expectedHexLength) {
      throw new ChecksumError(
        ChecksumErrorType.InvalidLength,
        translate(BrightChainStrings.Checksum_InvalidHexStringTemplate, {
          EXPECTED: expectedHexLength,
          LENGTH: hex.length,
        }),
        { actualLength: hex.length, expectedLength: expectedHexLength },
      );
    }

    // Browser-safe: convert hex to Uint8Array
    const bytes = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
    for (let i = 0; i < CHECKSUM.SHA3_BUFFER_LENGTH; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return new Checksum(bytes);
  }

  /**
   * Compare this checksum with another for equality.
   *
   * Performs a byte-by-byte comparison of the underlying data.
   *
   * @param other - The other Checksum to compare with
   * @returns true if the checksums are equal, false otherwise
   *
   * @example
   * ```typescript
   * const checksum1 = Checksum.fromBuffer(buffer1);
   * const checksum2 = Checksum.fromBuffer(buffer2);
   * if (checksum1.equals(checksum2)) {
   *   console.log('Checksums match');
   * }
   * ```
   *
   * @see Requirement 1.3
   */
  equals(other: Checksum): boolean {
    if (this.data.length !== other.data.length) {
      return false;
    }
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== other.data[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Convert the checksum to a Buffer.
   *
   * @returns A new Buffer containing the checksum data
   *
   * @example
   * ```typescript
   * const checksum = Checksum.fromHex(hexString);
   * const buffer = checksum.toBuffer();
   * ```
   *
   * @see Requirement 1.5
   */
  toBuffer(): Buffer {
    return Buffer.from(this.data);
  }

  /**
   * Convert the checksum to a Uint8Array.
   *
   * @returns A new Uint8Array containing the checksum data
   *
   * @remarks
   * Returns a copy of the internal data to maintain immutability.
   *
   * @example
   * ```typescript
   * const checksum = Checksum.fromBuffer(buffer);
   * const array = checksum.toUint8Array();
   * ```
   *
   * @see Requirement 1.5
   */
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.data);
  }

  /**
   * Convert the checksum to a lowercase hex string.
   *
   * @returns The checksum as a lowercase hex string
   *
   * @example
   * ```typescript
   * const checksum = Checksum.fromBuffer(buffer);
   * const hex = checksum.toHex(); // 'a1b2c3d4...'
   * ```
   *
   * @see Requirement 1.4
   */
  toHex(): string {
    return uint8ArrayToHex(this.toUint8Array());
  }

  /**
   * Convert the checksum to a string representation.
   *
   * This is an alias for toHex() for consistent behavior.
   *
   * @returns The checksum as a lowercase hex string
   *
   * @example
   * ```typescript
   * const checksum = Checksum.fromBuffer(buffer);
   * console.log(`Checksum: ${checksum}`); // Uses toString() implicitly
   * ```
   *
   * @see Requirement 1.4
   */
  toString(): string {
    return this.toHex();
  }

  /**
   * Get the length of the checksum in bytes.
   *
   * @returns The length of the checksum data in bytes
   */
  get length(): number {
    return this.data.length;
  }
}

/**
 * Type guard to check if a value is a Checksum instance.
 *
 * @param value - The value to check
 * @returns true if the value is a Checksum instance
 *
 * @example
 * ```typescript
 * if (isChecksum(value)) {
 *   // value is narrowed to Checksum type
 *   console.log(value.toHex());
 * }
 * ```
 *
 * @see Requirement 14.1
 */
export function isChecksum(value: unknown): value is Checksum {
  return value instanceof Checksum;
}
