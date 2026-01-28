/**
 * BrightChain Library
 *
 * This is the main entry point for the BrightChain library.
 * All public APIs are exported from this module.
 *
 * @packageDocumentation
 * @module brightchain-lib
 */

// Initialize BrightChain configuration first
import './init';

// ============================================================================
// Types
// ============================================================================
/**
 * Type definitions and type guards.
 *
 * Includes:
 * - Checksum: Unified checksum class for Buffer/Uint8Array handling
 * - isChecksum: Type guard for Checksum instances
 * - ChecksumBuffer: (deprecated) Use Checksum class instead
 * - ChecksumUint8Array: (deprecated) Use Checksum class instead
 *
 * @see {@link Checksum}
 * @see {@link isChecksum}
 */
export * from './types';

// ============================================================================
// Errors
// ============================================================================
/**
 * Error classes and type guards for error handling.
 *
 * Includes:
 * - BrightChainError: Base error class for all BrightChain errors
 * - ChecksumError: Checksum-related errors with ChecksumErrorType
 * - EnhancedValidationError: Validation errors with field context
 * - Type guards: isBrightChainError, isChecksumError, isEnhancedValidationError, etc.
 *
 * @see {@link BrightChainError}
 * @see {@link ChecksumError}
 * @see {@link EnhancedValidationError}
 */
export * from './errors';

// ============================================================================
// Utilities
// ============================================================================
/**
 * Utility classes and functions.
 *
 * Includes:
 * - Validator: Input validation utilities for services
 * - Checksum conversion utilities (deprecated, use Checksum class methods)
 *
 * @see {@link Validator}
 */
export * from './utils';

// ============================================================================
// Enumerations
// ============================================================================
/**
 * Enumeration types for block types, sizes, encryption, etc.
 */
export * from './enumerations';

/**
 * Human-readable translations for enumeration values.
 */
export * from './enumeration-translations';

// ============================================================================
// Interfaces
// ============================================================================
/**
 * Interface definitions for data structures and contracts.
 */
export * from './interfaces';

// ============================================================================
// Core Components
// ============================================================================
/**
 * Block-related classes and utilities.
 */
export * from './blocks';
export * from './encryptedBlockMetadata';

/**
 * Service implementations for BrightChain operations.
 */
export * from './services';
export {
  getGlobalServiceProvider,
  setGlobalServiceProvider,
} from './services/globalServiceProvider';

/**
 * Factory classes for object creation.
 */
export * from './factories';

/**
 * Document handling and management.
 */
export * from './documents';

// ============================================================================
// Storage
// ============================================================================
/**
 * Data store implementations.
 */
export * from './stores';

/**
 * Access control and permissions.
 */
export * from './access';

// ============================================================================
// Cryptography
// ============================================================================
/**
 * Key management and cryptographic operations.
 */
export * from './keys';

// ============================================================================
// Schemas
// ============================================================================
/**
 * Validation schemas.
 */
export * from './schemas';

// ============================================================================
// Infrastructure
// ============================================================================
/**
 * CPU-related utilities.
 */
export * from './cpus';

/**
 * Debugging utilities.
 */
export * from './debug';

/**
 * Logging utilities for block operations.
 */
export * from './logging';

/**
 * Security utilities for audit logging and rate limiting.
 */
export * from './security';

/**
 * Internationalization support.
 */
export * from './i18n';

// ============================================================================
// Direct Exports from Root Files
// ============================================================================
/**
 * Main BrightChain class and configuration.
 */
export * from './brightChain';
export * from './browserConfig';
export * from './constants';
export * from './init';

/**
 * Currency and email utilities.
 */
export * from './currencyCode';
export * from './emailString';

/**
 * Cryptographic utilities.
 */
export * from './drbg';
export * from './ecies-config';
export * from './isolatedKeyModInverse';

/**
 * Quorum and data record handling.
 */
export * from './quorum';
export * from './quorumDataRecord';
export * from './quorumDataRecordDto';

/**
 * Secure storage utilities.
 */
export * from './secureHeapStorage';
export * from './secureKeyStorage';
export * from './systemKeyring';

/**
 * Shared types and utilities.
 */
export * from './sharedTypes';

/**
 * Stream utilities.
 */
export * from './primeTupleGeneratorStream';

/**
 * Operation cost calculations.
 */
export * from './operationCost';

/**
 * Energy economy system.
 */
export * from './energyAccount';
export * from './energyConsts';
export * from './stores/energyAccountStore';
export * from './stores/energyLedger';
