/**
 * Checksum-related error class for the BrightChain library.
 *
 * This error is thrown when checksum operations fail, such as:
 * - Invalid checksum length
 * - Invalid hex string format
 * - Conversion failures between formats
 * - Comparison failures
 *
 * @example
 * ```typescript
 * import { ChecksumError, ChecksumErrorType } from './checksumError';
 *
 * // Throwing a checksum error
 * throw new ChecksumError(
 *   ChecksumErrorType.InvalidLength,
 *   'Checksum must be 64 bytes',
 *   { actualLength: 32, expectedLength: 64 }
 * );
 *
 * // Catching and handling checksum errors
 * try {
 *   const checksum = Checksum.fromHex(invalidHex);
 * } catch {
 *   if (isChecksumError(error)) {
 *     console.error(`Checksum error (${error.checksumErrorType}): ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirements 1.7, 4.1
 */

import { BrightChainError } from './brightChainError';

/**
 * Enumeration of checksum error types.
 *
 * @remarks
 * This enum categorizes the different types of checksum-related errors
 * that can occur during checksum operations.
 */
export enum ChecksumErrorType {
  /** The checksum data has an invalid length */
  InvalidLength = 'InvalidLength',

  /** The hex string contains invalid characters */
  InvalidHex = 'InvalidHex',

  /** Conversion between formats (Buffer, Uint8Array, hex) failed */
  ConversionFailed = 'ConversionFailed',

  /** Comparison between checksums failed unexpectedly */
  ComparisonFailed = 'ComparisonFailed',
}

/**
 * Error class for checksum-related errors.
 *
 * Extends BrightChainError to provide consistent error handling
 * with additional checksum-specific error type information.
 *
 * @remarks
 * - The `checksumErrorType` property identifies the specific type of checksum error
 * - The `context` property can include additional details like actual/expected values
 * - Use the `isChecksumError` type guard for type-safe error handling
 *
 * @see Requirements 1.7, 4.1
 */
export class ChecksumError extends BrightChainError {
  /**
   * Creates a new ChecksumError instance.
   *
   * @param checksumErrorType - The specific type of checksum error
   * @param message - Human-readable error message
   * @param context - Optional additional context for debugging
   *
   * @example
   * ```typescript
   * // Invalid length error
   * throw new ChecksumError(
   *   ChecksumErrorType.InvalidLength,
   *   `Checksum must be 64 bytes, got 32 bytes`,
   *   { actualLength: 32, expectedLength: 64 }
   * );
   *
   * // Invalid hex error
   * throw new ChecksumError(
   *   ChecksumErrorType.InvalidHex,
   *   'Invalid hex string: contains non-hexadecimal characters',
   *   { input: 'xyz123' }
   * );
   * ```
   */
  constructor(
    public readonly checksumErrorType: ChecksumErrorType,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super('Checksum', message, { checksumErrorType, ...context });
  }
}

/**
 * Type guard to check if a value is a ChecksumError instance.
 *
 * @param error - The value to check
 * @returns true if the value is a ChecksumError instance
 *
 * @example
 * ```typescript
 * try {
 *   const checksum = Checksum.fromHex(hexString);
 * } catch {
 *   if (isChecksumError(error)) {
 *     // error is narrowed to ChecksumError type
 *     switch (error.checksumErrorType) {
 *       case ChecksumErrorType.InvalidLength:
 *         console.error('Invalid checksum length');
 *         break;
 *       case ChecksumErrorType.InvalidHex:
 *         console.error('Invalid hex format');
 *         break;
 *       default:
 *         console.error('Checksum error:', error.message);
 *     }
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isChecksumError(error: unknown): error is ChecksumError {
  return error instanceof ChecksumError;
}
