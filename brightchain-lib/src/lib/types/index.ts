/**
 * Types Module for BrightChain
 *
 * This module exports unified type classes and type guards for the BrightChain library.
 *
 * @module types
 *
 * @example
 * ```typescript
 * import { Checksum, isChecksum, ChecksumBuffer, ChecksumUint8Array } from 'brightchain-lib';
 *
 * // Create a checksum from different sources
 * const checksum1 = Checksum.fromBuffer(buffer);
 * const checksum2 = Checksum.fromUint8Array(uint8Array);
 * const checksum3 = Checksum.fromHex(hexString);
 *
 * // Use type guard
 * if (isChecksum(value)) {
 *   console.log(value.toHex());
 * }
 * ```
 */

/**
 * Checksum types and utilities.
 *
 * Exports:
 * - Checksum: Unified checksum class
 * - isChecksum: Type guard for Checksum instances
 * - ChecksumBuffer: (deprecated) Legacy type alias
 * - ChecksumUint8Array: (deprecated) Legacy type alias
 * - ChecksumErrorType: Re-exported from errors for convenience
 *
 * @see {@link Checksum}
 */
export * from './checksum';

/**
 * Enum translation types and utilities.
 *
 * Exports:
 * - EnumLanguageTranslation: Type for enum translations
 * - createTranslations: Helper function for creating type-safe translations
 *
 * @see {@link EnumLanguageTranslation}
 */
export * from './enumTranslation';
