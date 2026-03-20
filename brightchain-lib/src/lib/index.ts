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

/**
 * Platform-agnostic crypto utilities (browser + Node.js).
 */
export * from './crypto';

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
 * BrightTrust and data record handling.
 */
export * from './brightTrust';
export * from './brightTrustDataRecord';
export * from './brightTrustDataRecordDto';

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

// ============================================================================
// Database Engine (platform-agnostic core)
// ============================================================================
/**
 * Core database engine modules: query engine, update engine, cursor, indexing,
 * aggregation, schema validation, transactions, Collection, and InMemoryDatabase.
 *
 * Uses named re-exports to avoid collisions with existing top-level exports:
 * - ValidationError (./errors) vs db ValidationError → re-exported as DbValidationError
 * - SchemaType (./types) vs db SchemaType → re-exported as DbSchemaType
 * - ValidationFieldError, FieldSchema, BsonDocument, DocumentId already exported
 *   via ./interfaces — skipped here to avoid ambiguous re-export errors
 */
export {
  // db errors (ValidationError renamed to avoid collision with top-level ValidationError)
  BrightDbError,
  BulkWriteError,
  // collection
  Collection,
  // indexing
  CollectionIndex,
  // cursor
  Cursor,
  // transaction
  DbSession,
  ValidationError as DbValidationError,
  DocumentNotFoundError,
  DuplicateKeyError,
  // inMemoryDatabase
  InMemoryDatabase,
  // inMemoryHeadRegistry
  InMemoryHeadRegistry,
  IndexError,
  IndexManager,
  TransactionError,
  WriteConcernError,
  applyDefaults,
  applyProjection,
  // updateEngine
  applyUpdate,
  calculateBlockId,
  compareValues,
  createDefaultUuidGenerator,
  deepEquals,
  getTextSearchFields,
  isOperatorUpdate,
  matchesFilter,
  // aggregation
  runAggregation,
  // queryEngine
  setTextSearchFields,
  sortDocuments,
  tokenize,
  validateDocument,
  type BulkWriteOperationError,
  type CollectionResolver,
  type CollectionSchema,
  type CommitCallback,
  // schemaValidation (SchemaType renamed to avoid collision with top-level SchemaType)
  type SchemaType as DbSchemaType,
  type InMemoryDatabaseOptions,
  type JournalOp,
  type RollbackCallback,
  // uuidGenerator
  type UuidGenerator,
  type WriteConcernSpec,
} from './db';

// Re-export suite-core-lib storage/query types that the db engine uses,
// so consumers get them from @brightchain/brightchain-lib without a direct
// suite-core-lib dependency.
export type {
  AggregationStage,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeEvent,
  ChangeEventType,
  ChangeListener,
  ClientSession,
  CollectionOptions,
  CollectionSchemaFieldType,
  CursorSession,
  DeleteResult,
  FilterOperator,
  FilterQuery,
  FindOptions,
  IClientSession,
  IndexOptions,
  IndexSpec,
  InsertManyResult,
  InsertOneResult,
  LogicalOperators,
  ProjectionSpec,
  ReadPreference,
  ReplaceResult,
  SortSpec,
  TextIndexOptions,
  UpdateOperators,
  UpdateOptions,
  UpdateQuery,
  UpdateResult,
  WriteConcern,
  WriteOptions,
} from '@digitaldefiance/suite-core-lib';
