/**
 * Typed error classes for brightchain-db.
 *
 * Provides MongoDB-compatible error names and structured properties
 * so consumers can catch and classify errors programmatically.
 */

// ── Base ──

/**
 * Base class for all brightchain-db errors.
 */
export class BrightChainDbError extends Error {
  /** Numeric error code (MongoDB-style) */
  public readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'BrightChainDbError';
    this.code = code;
  }
}

// ── Document errors ──

/**
 * Thrown when a document is not found by _id.
 */
export class DocumentNotFoundError extends BrightChainDbError {
  public readonly documentId: string;
  public readonly collection: string;

  constructor(collection: string, documentId: string) {
    super(
      `Document not found: collection "${collection}", _id "${documentId}"`,
      404,
    );
    this.name = 'DocumentNotFoundError';
    this.collection = collection;
    this.documentId = documentId;
  }
}

// ── Duplicate key (re-export from indexing for convenience, but also provide the typed base) ──

/**
 * Thrown when a unique index constraint is violated.
 * (Re-exported from indexing.ts — use `DuplicateKeyError` from there for the canonical class.)
 */

// ── Validation errors ──

/**
 * Thrown when a document fails schema validation.
 */
export class ValidationError extends BrightChainDbError {
  /** Field-level validation failures */
  public readonly validationErrors: ValidationFieldError[];
  public readonly collection: string;

  constructor(collection: string, errors: ValidationFieldError[]) {
    const summary = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    super(
      `Document failed validation for collection "${collection}": ${summary}`,
      121, // MongoDB error code for DocumentValidationFailure
    );
    this.name = 'ValidationError';
    this.collection = collection;
    this.validationErrors = errors;
  }
}

export interface ValidationFieldError {
  field: string;
  message: string;
  value?: unknown;
}

// ── Transaction errors ──

/**
 * Thrown when a transaction operation is invalid (e.g. commit without active txn).
 */
export class TransactionError extends BrightChainDbError {
  public readonly sessionId?: string;

  constructor(message: string, sessionId?: string) {
    super(message, 251); // MongoDB error code for NoSuchTransaction
    this.name = 'TransactionError';
    this.sessionId = sessionId;
  }
}

// ── Index errors ──

/**
 * Thrown when an index operation fails.
 */
export class IndexError extends BrightChainDbError {
  public readonly indexName?: string;

  constructor(message: string, indexName?: string) {
    super(message, 86); // MongoDB error code for IndexKeySpecsConflict
    this.name = 'IndexError';
    this.indexName = indexName;
  }
}

// ── Write concern errors ──

/**
 * Thrown when a write concern cannot be satisfied.
 */
export class WriteConcernError extends BrightChainDbError {
  public readonly writeConcern: WriteConcernSpec;

  constructor(message: string, writeConcern: WriteConcernSpec) {
    super(message, 64); // MongoDB error code for WriteConcernFailed
    this.name = 'WriteConcernError';
    this.writeConcern = writeConcern;
  }
}

/** Write concern specification */
export interface WriteConcernSpec {
  /** Number of acknowledgments required (1 = primary only, 'majority' = majority) */
  w?: number | 'majority';
  /** Timeout in ms for write concern acknowledgment */
  wtimeoutMS?: number;
  /** Whether to wait for journal sync */
  journal?: boolean;
}

// ── Bulk write errors ──

/**
 * Thrown when one or more operations in a bulk write fail.
 */
export class BulkWriteError extends BrightChainDbError {
  /** The individual write errors indexed by operation position */
  public readonly writeErrors: BulkWriteOperationError[];
  /** Count of operations that succeeded */
  public readonly successCount: number;

  constructor(writeErrors: BulkWriteOperationError[], successCount: number) {
    super(
      `Bulk write operation failed: ${writeErrors.length} error(s), ${successCount} succeeded`,
      65, // MongoDB BulkWriteError code
    );
    this.name = 'BulkWriteError';
    this.writeErrors = writeErrors;
    this.successCount = successCount;
  }
}

export interface BulkWriteOperationError {
  index: number;
  code: number;
  message: string;
}
