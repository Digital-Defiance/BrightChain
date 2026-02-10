/**
 * MemberIdentityProofService — companion service for managing identity proofs
 * associated with BrightChain members.
 *
 * Since {@link Member} is an external class from `@digitaldefiance/ecies-lib`,
 * this service follows the same companion-service pattern as
 * {@link MemberPaperKeyService}: it maintains an in-memory store of identity
 * proofs keyed by member ID, with full audit logging.
 *
 * Requirements: 4.5, 4.7
 */

import { v4 as uuidv4 } from 'uuid';

import { VerificationStatus } from '../../enumerations/verificationStatus';
import { IIdentityProof } from '../../interfaces/identity/identityProof';

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when a proof operation references a proof that does not exist.
 */
export class ProofNotFoundError extends Error {
  constructor(proofId: string) {
    super(`Identity proof not found: ${proofId}`);
    this.name = 'ProofNotFoundError';
  }
}

/**
 * Error thrown when attempting to revoke an already-revoked proof.
 */
export class ProofAlreadyRevokedError extends Error {
  constructor(proofId: string) {
    super(`Identity proof already revoked: ${proofId}`);
    this.name = 'ProofAlreadyRevokedError';
  }
}

// ─── Audit types ────────────────────────────────────────────────────────────

/**
 * Actions that can be recorded in the identity proof audit log.
 */
export type ProofAuditAction = 'added' | 'revoked' | 'verified' | 'failed';

/**
 * A single entry in the identity proof audit log.
 *
 * @remarks
 * The audit log is append-only and provides a complete history of
 * proof lifecycle events for a member.
 */
export interface IProofAuditEntry<TId = string> {
  /** Unique identifier for this audit entry */
  id: TId;

  /** The proof this entry relates to */
  proofId: TId;

  /** The action that was performed */
  action: ProofAuditAction;

  /** When the action occurred */
  timestamp: Date;

  /** Optional reason or context for the action */
  reason?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Companion service for managing identity proofs associated with members.
 *
 * Maintains an in-memory store of identity proofs keyed by member ID,
 * with full audit logging. Provides methods to add, revoke, and query
 * proofs without modifying the external Member class.
 *
 * @example
 * ```typescript
 * const service = new MemberIdentityProofService();
 *
 * // Add a proof
 * service.addProof(memberId, proof);
 *
 * // Get all verified proofs
 * const verified = service.getVerifiedProofs(memberId);
 *
 * // Revoke a proof
 * service.revokeProof(memberId, proofId, 'Account compromised');
 * ```
 */
export class MemberIdentityProofService<TId = string> {
  /**
   * Identity proofs keyed by member ID.
   */
  private readonly proofsByMember = new Map<TId, IIdentityProof<TId>[]>();

  /**
   * Append-only audit log keyed by member ID.
   */
  private readonly auditLogByMember = new Map<TId, IProofAuditEntry<TId>[]>();

  /**
   * Factory for generating unique IDs.
   */
  private readonly idFactory: () => TId;

  constructor(idFactory?: () => TId) {
    this.idFactory = idFactory ?? (() => uuidv4() as TId);
  }

  /**
   * Add an identity proof for a member.
   *
   * Stores the proof and appends an 'added' entry to the audit log.
   *
   * **Validates: Requirement 4.5**
   *
   * @param memberId - The member this proof belongs to
   * @param proof    - The identity proof to add
   */
  addProof(memberId: TId, proof: IIdentityProof<TId>): void {
    const proofs = this.proofsByMember.get(memberId) ?? [];
    proofs.push({ ...proof });
    this.proofsByMember.set(memberId, proofs);

    this.appendAuditEntry(memberId, proof.id, 'added');
  }

  /**
   * Revoke an identity proof.
   *
   * Sets the proof's verification status to REVOKED and records
   * a revokedAt timestamp. Appends a 'revoked' entry to the audit log.
   *
   * **Validates: Requirement 4.7**
   *
   * @param memberId - The member who owns the proof
   * @param proofId  - The proof to revoke
   * @param reason   - Optional reason for revocation
   * @throws {ProofNotFoundError} If the proof does not exist
   * @throws {ProofAlreadyRevokedError} If the proof is already revoked
   */
  revokeProof(memberId: TId, proofId: TId, reason?: string): void {
    const proof = this.findProof(memberId, proofId);

    if (proof.verificationStatus === VerificationStatus.REVOKED) {
      throw new ProofAlreadyRevokedError(String(proofId));
    }

    proof.verificationStatus = VerificationStatus.REVOKED;
    proof.revokedAt = new Date();

    this.appendAuditEntry(memberId, proofId, 'revoked', reason);
  }

  /**
   * Update the verification status of a proof.
   *
   * Used after checking a proof URL to record whether verification
   * succeeded or failed.
   *
   * @param memberId - The member who owns the proof
   * @param proofId  - The proof to update
   * @param verified - Whether verification succeeded
   */
  updateVerificationStatus(
    memberId: TId,
    proofId: TId,
    verified: boolean,
  ): void {
    const proof = this.findProof(memberId, proofId);

    if (proof.verificationStatus === VerificationStatus.REVOKED) {
      return; // Don't update revoked proofs
    }

    proof.verificationStatus = verified
      ? VerificationStatus.VERIFIED
      : VerificationStatus.FAILED;
    proof.lastCheckedAt = new Date();

    if (verified) {
      proof.verifiedAt = new Date();
    }

    this.appendAuditEntry(memberId, proofId, verified ? 'verified' : 'failed');
  }

  /**
   * Get all identity proofs for a member.
   *
   * @param memberId - The member to query
   * @returns Read-only array of identity proofs (empty if none exist)
   */
  getProofs(memberId: TId): ReadonlyArray<IIdentityProof<TId>> {
    return this.proofsByMember.get(memberId) ?? [];
  }

  /**
   * Get only verified identity proofs for a member.
   *
   * **Validates: Requirement 4.5**
   *
   * @param memberId - The member to query
   * @returns Read-only array of verified identity proofs
   */
  getVerifiedProofs(memberId: TId): ReadonlyArray<IIdentityProof<TId>> {
    const proofs = this.proofsByMember.get(memberId) ?? [];
    return proofs.filter(
      (p) => p.verificationStatus === VerificationStatus.VERIFIED,
    );
  }

  /**
   * Get a specific proof by ID.
   *
   * @param memberId - The member who owns the proof
   * @param proofId  - The proof to retrieve
   * @returns The identity proof
   * @throws {ProofNotFoundError} If the proof does not exist
   */
  getProof(memberId: TId, proofId: TId): IIdentityProof<TId> {
    return this.findProof(memberId, proofId);
  }

  /**
   * Get the audit log for a member's identity proofs.
   *
   * @param memberId - The member to query
   * @returns Read-only array of audit entries (empty if none exist)
   */
  getAuditLog(memberId: TId): ReadonlyArray<IProofAuditEntry<TId>> {
    return this.auditLogByMember.get(memberId) ?? [];
  }

  /**
   * Check whether a proof is revoked.
   *
   * @param memberId - The member who owns the proof
   * @param proofId  - The proof to check
   * @returns `true` if the proof is revoked
   * @throws {ProofNotFoundError} If the proof does not exist
   */
  isRevoked(memberId: TId, proofId: TId): boolean {
    const proof = this.findProof(memberId, proofId);
    return proof.verificationStatus === VerificationStatus.REVOKED;
  }

  /**
   * Get the count of proofs for a member, optionally filtered by status.
   *
   * @param memberId - The member to query
   * @param status   - Optional status filter
   * @returns The number of matching proofs
   */
  getProofCount(memberId: TId, status?: VerificationStatus): number {
    const proofs = this.proofsByMember.get(memberId) ?? [];
    if (!status) return proofs.length;
    return proofs.filter((p) => p.verificationStatus === status).length;
  }

  /**
   * Remove all data for a member. Useful for testing.
   *
   * @param memberId - The member whose data to clear
   */
  clearMemberData(memberId: TId): void {
    this.proofsByMember.delete(memberId);
    this.auditLogByMember.delete(memberId);
  }

  // ─── Private helpers ────────────────────────────────────────────────

  private findProof(memberId: TId, proofId: TId): IIdentityProof<TId> {
    const proofs = this.proofsByMember.get(memberId) ?? [];
    const proof = proofs.find((p) => p.id === proofId);
    if (!proof) {
      throw new ProofNotFoundError(String(proofId));
    }
    return proof;
  }

  private appendAuditEntry(
    memberId: TId,
    proofId: TId,
    action: ProofAuditAction,
    reason?: string,
  ): void {
    const entries = this.auditLogByMember.get(memberId) ?? [];
    entries.push({
      id: this.idFactory(),
      proofId,
      action,
      timestamp: new Date(),
      reason,
    });
    this.auditLogByMember.set(memberId, entries);
  }
}
