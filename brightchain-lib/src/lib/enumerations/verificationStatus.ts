/**
 * Verification status enumeration for the BrightChain identity system.
 * Tracks the lifecycle state of an identity proof verification.
 *
 * Requirements: 4.5, 4.10
 */

export enum VerificationStatus {
  /** Proof has been created but not yet verified */
  PENDING = 'pending',

  /** Proof has been successfully verified */
  VERIFIED = 'verified',

  /** Proof verification failed (e.g. URL unreachable or content mismatch) */
  FAILED = 'failed',

  /** Proof was explicitly revoked by the member */
  REVOKED = 'revoked',
}
