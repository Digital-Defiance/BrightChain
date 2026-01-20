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
