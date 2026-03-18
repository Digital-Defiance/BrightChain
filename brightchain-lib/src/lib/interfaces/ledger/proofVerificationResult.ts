/**
 * @fileoverview Proof verification result interface for the blockchain ledger.
 *
 * Defines the result type returned by inclusion proof and consistency proof
 * verification operations.
 *
 * @see Design: Merkle Tree Commitment Layer — New Types
 * @see Requirements 4.1, 4.2, 4.3, 6.2, 6.3
 */

/**
 * Result of a proof verification operation.
 */
export interface IProofVerificationResult {
  /** Whether the proof verified successfully. */
  readonly isValid: boolean;
  /** Error message when isValid is false. */
  readonly error?: string;
}
