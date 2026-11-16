/**
 * The BrightDB v2.5 error registry. One list of stable categories shared by
 * the operation layer, every conformance adapter, and the corpus, so a case
 * can say "this step fails with DuplicateKey" and mean the same thing in
 * TypeScript, the browser, C++ and the service. Platform neutral.
 *
 * Not to be confused with `BrightDbError` in `../../errors.ts`, the v1 base
 * class with numeric MongoDB-style codes. v1 is unchanged.
 */

export const BRIGHTDB_ERROR_CATEGORIES = [
  // Validation (requirement 1)
  'InvalidFilter',
  'InvalidUpdate',
  'InvalidProjection',
  'InvalidSort',
  'InvalidPipeline',
  // Writes (requirement 4)
  'DuplicateKey',
  'ImmutableId',
  'DocumentTooLarge',
  'InvalidDocument',
  'AlreadyExists',
  'NotFound',
  // Indexes (requirement 8)
  'UniqueUnsupported',
  // Transactions and commits (requirements 6, 7)
  'TransactionNested',
  'TransactionClosed',
  'TransactionAborted',
  'CommitFailed',
  'CommitOutcomeUnknown',
  // Replication
  'WrongDatabase',
  // Resources
  'MemoryBoundExceeded',
  'Closed',
  'MissingBlock',
  // Adapters and service (requirements 15, 18)
  'Unsupported',
  'PermissionDenied',
  'AuthenticationFailed',
  // An error nothing classified. A corpus case must never expect this one.
  'Unknown',
] as const;

export type BrightDbErrorCategory = (typeof BRIGHTDB_ERROR_CATEGORIES)[number];

export function isBrightDbErrorCategory(
  value: unknown,
): value is BrightDbErrorCategory {
  return (
    typeof value === 'string' &&
    (BRIGHTDB_ERROR_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * The stable machine-readable codes that refine a category. An error may
 * carry no code, but one that does must use a code from this list, so the
 * model, every adapter and the corpus cannot drift apart on spelling. Add a
 * code here before using it anywhere.
 */
export const BRIGHTDB_ERROR_CODES = [
  // InvalidFilter
  'unknown_operator',
  'malformed_operand',
  'malformed_filter',
  // NotFound
  'unknown_saved_root',
  // Unsupported
  'unsupported_op',
  'unknown_profile',
] as const;

export type BrightDbErrorCode = (typeof BRIGHTDB_ERROR_CODES)[number];

export function isBrightDbErrorCode(
  value: unknown,
): value is BrightDbErrorCode {
  return (
    typeof value === 'string' &&
    (BRIGHTDB_ERROR_CODES as readonly string[]).includes(value)
  );
}

export interface BrightDbOperationErrorInit {
  /** A stable machine-readable code such as `unknown_operator`. */
  code: BrightDbErrorCode;
  /** The offending field path, when there is one. */
  path?: string;
  /** The offending operator, when there is one. */
  operator?: string;
  /** Extra context. Must never contain key material or credentials. */
  details?: Record<string, unknown>;
  cause?: unknown;
}

/** A typed error from the v2.5 operation layer. */
export class BrightDbOperationError extends Error {
  readonly code: BrightDbErrorCode;
  readonly path?: string;
  readonly operator?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    readonly category: BrightDbErrorCategory,
    message: string,
    init: BrightDbOperationErrorInit,
  ) {
    super(
      message,
      init.cause === undefined ? undefined : { cause: init.cause },
    );
    this.name = 'BrightDbOperationError';
    this.code = init.code;
    this.path = init.path;
    this.operator = init.operator;
    this.details = init.details;
  }
}

/** The serializable form of an error, as it appears in a corpus or a report. */
export interface NormalizedError {
  category: BrightDbErrorCategory;
  code?: BrightDbErrorCode;
  message: string;
}
