/**
 * @fileoverview Validation result types for the blockchain ledger.
 *
 * Defines the error type union, individual validation error descriptor,
 * and the overall validation result returned by LedgerChainValidator.
 *
 * @see Design: Block Chain Ledger — IValidationResult / IValidationError
 * @see Requirements 8.3
 */

/** Discriminated union of ledger validation error types. */
export type LedgerValidationErrorType =
  | 'hash_mismatch'
  | 'signature_invalid'
  | 'sequence_gap'
  | 'genesis_invalid'
  | 'previous_hash_mismatch'
  | 'deserialization_error'
  | 'unauthorized_signer'
  | 'unauthorized_governance'
  | 'quorum_not_met'
  | 'governance_safety_violation'
  | 'invalid_governance_payload'
  | 'merkle_root_mismatch';

/** Describes a single validation failure at a specific entry. */
export interface ILedgerValidationError {
  /** The sequenceNumber of the entry that failed validation. */
  readonly sequenceNumber: number;
  /** The category of validation failure. */
  readonly errorType: LedgerValidationErrorType;
  /** Human-readable description of the failure. */
  readonly message: string;
}

/** Result of validating a ledger chain or sub-range. */
export interface IValidationResult {
  /** Whether the validated portion of the chain is intact. */
  readonly isValid: boolean;
  /** Number of entries that were checked. */
  readonly entriesChecked: number;
  /** Array of error descriptors (empty when isValid is true). */
  readonly errors: readonly ILedgerValidationError[];
}
