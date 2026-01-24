/**
 * Utils Module for BrightChain
 *
 * This module exports utility classes and functions for the BrightChain library.
 *
 * @module utils
 *
 * @example
 * ```typescript
 * import { Validator, checksumToBuffer, checksumFromHex } from 'brightchain-lib';
 *
 * // Use Validator for input validation
 * Validator.validateBlockSize(params.blockSize, 'processBlock');
 * Validator.validateBlockType(params.blockType, 'processBlock');
 * Validator.validateRequired(params.data, 'data', 'processBlock');
 *
 * // Use checksum utilities (deprecated - prefer Checksum class methods)
 * const buffer = checksumToBuffer(checksum);
 * const checksum = checksumFromHex(hexString);
 * ```
 */

// ============================================================================
// Validation Utilities
// ============================================================================
/**
 * Input validation utilities for BrightChain services.
 *
 * Provides methods for validating:
 * - Block sizes
 * - Block types
 * - Encryption types
 * - Recipient counts
 * - Required fields
 * - Non-empty strings
 *
 * @see {@link Validator}
 */
export * from './validator';

// ============================================================================
// Checksum Utilities
// ============================================================================
/**
 * Checksum conversion utilities for working with Checksum class.
 *
 * Provides functions for converting between:
 * - Checksum and hex strings
 * - Checksum and Uint8Array
 * - Checksum and Buffer
 *
 * @see {@link checksumUtils}
 */
export * from './checksumUtils';

// ============================================================================
// XOR Utilities
// ============================================================================
/**
 * XOR utilities for CBL whitening operations.
 *
 * Provides functions for:
 * - XORing equal-length arrays
 * - Padding data to block size
 * - Unpadding CBL data
 *
 * @see {@link xorUtils}
 */
export * from './xorUtils';

// ============================================================================
// Constant-Time Utilities
// ============================================================================
/**
 * Constant-time comparison utilities for security-sensitive operations.
 *
 * Provides functions for:
 * - Constant-time equality comparison (Uint8Array, hex strings, numbers)
 * - Constant-time conditional selection
 * - Constant-time zero checking
 *
 * These utilities prevent timing-based side-channel attacks by ensuring
 * operations take the same amount of time regardless of input values.
 *
 * @see {@link constantTime}
 */
export * from './constantTime';

// ============================================================================
// Constant-Time XOR Utilities
// ============================================================================
/**
 * Constant-time XOR operations for security-sensitive operations.
 *
 * Provides functions for:
 * - Constant-time XOR of two arrays
 * - Constant-time XOR of multiple arrays
 *
 * These utilities prevent timing-based side-channel attacks by ensuring
 * XOR operations take the same amount of time regardless of input byte values.
 * Critical for whitening/brightening operations in the Owner-Free Filesystem.
 *
 * @see {@link constantTimeXor}
 */
export * from './constantTimeXor';

// ============================================================================
// Type Guard Utilities
// ============================================================================
/**
 * Type guard utilities for JSON deserialization.
 *
 * Provides functions for:
 * - Runtime type checking of JSON data
 * - Validating BlockMetadataJson structure
 * - Validating EphemeralBlockMetadataJson structure
 * - Parsing JSON with type safety
 *
 * These utilities ensure that JSON data conforms to expected TypeScript
 * interfaces before constructing objects, maintaining type safety at runtime.
 *
 * @see {@link typeGuards}
 */
export * from './typeGuards';

// ============================================================================
// Date Utilities
// ============================================================================
/**
 * Date handling utilities with timezone support.
 *
 * Provides functions for:
 * - Parsing dates from ISO 8601 strings and Unix timestamps
 * - Serializing dates to ISO 8601 format in UTC
 * - Validating dates (including future date checks)
 *
 * All dates are stored internally in UTC to ensure consistency across timezones.
 * These utilities provide robust date handling for block metadata timestamps.
 *
 * @see {@link dateUtils}
 */
export * from './dateUtils';
