/**
 * Errors Module for BrightChain
 *
 * This module exports all error classes and type guards for the BrightChain library.
 *
 * @module errors
 *
 * @example
 * ```typescript
 * import {
 *   BrightChainError,
 *   ChecksumError,
 *   ChecksumErrorType,
 *   EnhancedValidationError,
 *   isBrightChainError,
 *   isChecksumError,
 *   isEnhancedValidationError
 * } from 'brightchain-lib';
 *
 * try {
 *   // ... operation
 * } catch {
 *   if (isChecksumError(error)) {
 *     console.error(`Checksum error (${error.checksumErrorType}): ${error.message}`);
 *   } else if (isEnhancedValidationError(error)) {
 *     console.error(`Validation failed for '${error.field}': ${error.message}`);
 *   } else if (isBrightChainError(error)) {
 *     console.error(`BrightChain error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 */

// ============================================================================
// Base Error Classes
// ============================================================================
/**
 * Base error class for all BrightChain errors.
 * @see {@link BrightChainError}
 * @see {@link isBrightChainError}
 */
export * from './brightChainError';

/**
 * Typed error base class (legacy pattern).
 * @see {@link TypedError}
 */
export * from './typedError';

/**
 * Typed error with reason (legacy pattern).
 * @see {@link TypedWithReasonError}
 */
export * from './typedWithReasonError';

// ============================================================================
// Validation Errors
// ============================================================================
/**
 * Enhanced validation error with field context.
 * @see {@link EnhancedValidationError}
 * @see {@link isEnhancedValidationError}
 */
export * from './enhancedValidationError';

/**
 * Legacy validation error class.
 * @see {@link ValidationError}
 */
export * from './validationError';

// ============================================================================
// Checksum Errors
// ============================================================================
/**
 * Checksum-related errors.
 * @see {@link ChecksumError}
 * @see {@link ChecksumErrorType}
 * @see {@link isChecksumError}
 */
export * from './checksumError';

/**
 * Checksum mismatch error.
 */
export * from './checksumMismatch';

// ============================================================================
// Type Guards
// ============================================================================
/**
 * Centralized type guards for all error types.
 * @see {@link isBrightChainError}
 * @see {@link isChecksumError}
 * @see {@link isEnhancedValidationError}
 * @see {@link isValidationError}
 * @see {@link isEciesError}
 * @see {@link isCblError}
 * @see {@link isFecError}
 * @see {@link isTypedError}
 * @see {@link isAnyBrightChainError}
 */
export * from './typeGuards';

// ============================================================================
// Block Errors
// ============================================================================
/**
 * Block-related errors.
 */
export * from './block';
export * from './blockServiceError';
export * from './invalidBlockSize';
export * from './invalidBlockSizeLength';

// ============================================================================
// Buffer Errors
// ============================================================================
/**
 * Buffer-related errors.
 */
export * from './bufferError';

// ============================================================================
// CBL (Constituent Block List) Errors
// ============================================================================
/**
 * CBL-related errors.
 */
export * from './cblError';
export * from './extendedCblError';

// ============================================================================
// Cryptography Errors
// ============================================================================
/**
 * ECIES encryption errors.
 */
export * from './eciesError';

/**
 * Symmetric encryption errors.
 */
export * from './symmetricError';

/**
 * Multi-encrypted block errors.
 */
export * from './multiEncryptedError';

/**
 * Isolated key errors.
 */
export * from './isolatedKeyError';

// ============================================================================
// FEC (Forward Error Correction) Errors
// ============================================================================
/**
 * FEC-related errors.
 */
export * from './fecError';

// ============================================================================
// Document Errors
// ============================================================================
/**
 * Document-related errors.
 */
export * from './document';

// ============================================================================
// Member Errors
// ============================================================================
/**
 * Member-related errors.
 */
export * from './memberError';

// ============================================================================
// Tuple Errors
// ============================================================================
/**
 * Tuple-related errors.
 */
export * from './handleTupleError';
export * from './invalidTupleCount';
export * from './memoryTupleError';
export * from './tupleError';

// ============================================================================
// Pool Errors
// ============================================================================

/**
 * Pool deletion errors.
 */
export * from './poolDeletionError';

// ============================================================================
// Storage Errors
// ============================================================================
/**
 * Store-related errors.
 */
export * from './storeError';

/**
 * Secure storage errors.
 */
export * from './secureStorage';

// ============================================================================
// Quorum Errors
// ============================================================================
/**
 * Quorum-related errors.
 */
export * from './quorumError';

// ============================================================================
// Sealing Errors
// ============================================================================
/**
 * Sealing-related errors.
 */
export * from './sealingError';

// ============================================================================
// Whitening Errors
// ============================================================================
/**
 * Whitening-related errors.
 */
export * from './whitenedError';

// ============================================================================
// Stream Errors
// ============================================================================
/**
 * Stream-related errors.
 */
export * from './streamError';

// ============================================================================
// System Errors
// ============================================================================
/**
 * System keyring errors.
 */
export * from './systemKeyringError';

// ============================================================================
// Serialization Errors
// ============================================================================
/**
 * Serialization and hydration errors.
 */
export * from './failedToHydrate';
export * from './failedToSerialize';

// ============================================================================
// Lifecycle Errors
// ============================================================================
/**
 * Disposed resource errors.
 */
export * from './disposed';

// ============================================================================
// Authentication Errors
// ============================================================================
/**
 * Authentication and credential errors.
 */
export * from './invalidCredentials';
export * from './invalidIDFormat';
export * from './invalidSessionID';
export * from './userNotFound';

// ============================================================================
// Factory Pattern Errors
// ============================================================================
/**
 * Factory pattern violation errors.
 * @see {@link FactoryPatternViolationError}
 * @see {@link isFactoryPatternViolationError}
 */
export * from './factoryPatternViolationError';

// ============================================================================
// Miscellaneous Errors
// ============================================================================
/**
 * Metadata mismatch errors.
 */
export * from './metadataMismatch';

/**
 * Missing validated data errors.
 */
export * from './missingValidatedData';

/**
 * Not implemented errors.
 */
export * from './notImplemented';

// ============================================================================
// Block Fetch Errors
// ============================================================================
/**
 * Block fetch errors (remote block retrieval).
 * @see {@link BlockFetchError}
 * @see {@link PoolMismatchError}
 * @see {@link FetchTimeoutError}
 */
export * from './blockFetchError';

// ============================================================================
// Message Passing Errors
// ============================================================================
/**
 * Message passing system errors.
 */
export * from './messaging';
