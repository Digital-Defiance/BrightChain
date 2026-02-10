/**
 * Member Paper Key Service for the BrightChain identity system.
 *
 * Manages paper key metadata lifecycle for members. Since {@link Member}
 * is an external class from `@digitaldefiance/ecies-lib` and cannot be
 * modified directly, this service acts as a companion that tracks paper
 * key metadata (creation, usage, revocation) keyed by member ID.
 *
 * Follows the same stateful-service pattern used by
 * {@link ConversationService}, {@link PermissionService}, and other
 * BrightChain services that manage in-memory state with `Map`s.
 *
 * Requirements: 1.5, 1.6, 1.7
 */

import { v4 as uuidv4 } from 'uuid';

import { PaperKeyPurpose } from '../../enumerations/paperKeyPurpose';
import { IPaperKeyMetadata } from '../../interfaces/identity/paperKey';

/**
 * Error thrown when a paper key operation references a key that does not exist.
 */
export class PaperKeyNotFoundError extends Error {
  constructor(paperKeyId: string) {
    super(`Paper key not found: ${paperKeyId}`);
    this.name = 'PaperKeyNotFoundError';
  }
}

/**
 * Error thrown when attempting to use or modify an already-revoked paper key.
 */
export class PaperKeyRevokedError extends Error {
  constructor(paperKeyId: string) {
    super(`Paper key has been revoked: ${paperKeyId}`);
    this.name = 'PaperKeyRevokedError';
  }
}

/**
 * Error thrown when attempting to mark an already-used paper key as used again.
 */
export class PaperKeyAlreadyUsedError extends Error {
  constructor(paperKeyId: string) {
    super(`Paper key has already been used: ${paperKeyId}`);
    this.name = 'PaperKeyAlreadyUsedError';
  }
}

/**
 * Immutable audit log entry recorded for every paper key state change.
 *
 * @remarks
 * Audit entries are append-only. They capture who performed the action,
 * what changed, and when. This satisfies Requirement 1.7 (revocation
 * with audit logging) and Requirement 1.9 (recovery event logging).
 */
export interface IPaperKeyAuditEntry<TId = string> {
  /** Unique identifier for this audit entry */
  id: string;

  /** The paper key this entry relates to */
  paperKeyId: TId;

  /** The member who owns the paper key */
  memberId: TId;

  /** The action that was performed */
  action: 'created' | 'used' | 'revoked';

  /** When the action occurred */
  timestamp: Date;

  /** Optional reason for the action (e.g. revocation reason) */
  reason?: string;

  /** Optional device ID associated with the action */
  deviceId?: TId;
}

/**
 * Service that manages paper key metadata for members.
 *
 * Since {@link Member} from `@digitaldefiance/ecies-lib` is an external
 * class, this service provides the `addPaperKey()`, `markPaperKeyUsed()`,
 * and `revokePaperKey()` operations specified in the task, tracking
 * metadata externally keyed by member ID.
 *
 * The generic `TId` parameter follows the project convention of allowing
 * `string` for frontend DTOs and `GuidV4Buffer` for backend usage.
 *
 * @example
 * ```typescript
 * const service = new MemberPaperKeyService();
 *
 * // Add a paper key for a member
 * const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
 *
 * // Mark it as used during device provisioning
 * service.markPaperKeyUsed(memberId, metadata.id, 'device-abc');
 *
 * // Revoke it
 * service.revokePaperKey(memberId, metadata.id, 'Compromised');
 *
 * // Query audit trail
 * const auditLog = service.getAuditLog(memberId);
 * ```
 */
export class MemberPaperKeyService<TId = string> {
  /**
   * Paper key metadata keyed by member ID.
   * Each member can have multiple paper keys.
   */
  private readonly paperKeysByMember = new Map<TId, IPaperKeyMetadata<TId>[]>();

  /**
   * Append-only audit log keyed by member ID.
   * Satisfies Requirement 1.7 (audit logging) and 1.9 (recovery event logging).
   */
  private readonly auditLogByMember = new Map<
    TId,
    IPaperKeyAuditEntry<TId>[]
  >();

  /**
   * Factory for generating unique IDs.
   * Defaults to UUID v4 cast to TId. Can be overridden for testing
   * or when TId is not a string.
   */
  private readonly idFactory: () => TId;

  constructor(idFactory?: () => TId) {
    this.idFactory = idFactory ?? (() => uuidv4() as TId);
  }

  /**
   * Register a new paper key for a member.
   *
   * Creates an {@link IPaperKeyMetadata} record and appends a 'created'
   * entry to the audit log.
   *
   * **Validates: Requirement 1.5** — Track paper key metadata
   *
   * @param memberId - The member this paper key belongs to
   * @param purpose  - The intended purpose of the paper key
   * @returns The newly created paper key metadata
   */
  addPaperKey(memberId: TId, purpose: PaperKeyPurpose): IPaperKeyMetadata<TId> {
    const metadata: IPaperKeyMetadata<TId> = {
      id: this.idFactory(),
      createdAt: new Date(),
      purpose,
    };

    const existing = this.paperKeysByMember.get(memberId) ?? [];
    existing.push(metadata);
    this.paperKeysByMember.set(memberId, existing);

    this.appendAuditEntry(memberId, metadata.id, 'created');

    return metadata;
  }

  /**
   * Mark a paper key as used (e.g. after device provisioning).
   *
   * Sets the `usedAt` timestamp and optionally associates a device ID.
   * A paper key can only be marked as used once and must not be revoked.
   *
   * **Validates: Requirement 1.6** — Mark paper keys as used after device provisioning
   *
   * @param memberId   - The member who owns the paper key
   * @param paperKeyId - The paper key to mark as used
   * @param deviceId   - Optional device ID that was provisioned
   * @throws {PaperKeyNotFoundError} If the paper key does not exist for this member
   * @throws {PaperKeyRevokedError} If the paper key has been revoked
   * @throws {PaperKeyAlreadyUsedError} If the paper key has already been used
   */
  markPaperKeyUsed(memberId: TId, paperKeyId: TId, deviceId?: TId): void {
    const metadata = this.findPaperKey(memberId, paperKeyId);

    if (metadata.revokedAt) {
      throw new PaperKeyRevokedError(String(paperKeyId));
    }

    if (metadata.usedAt) {
      throw new PaperKeyAlreadyUsedError(String(paperKeyId));
    }

    metadata.usedAt = new Date();
    if (deviceId !== undefined) {
      metadata.deviceId = deviceId;
    }

    this.appendAuditEntry(memberId, paperKeyId, 'used', undefined, deviceId);
  }

  /**
   * Revoke a paper key with audit logging.
   *
   * Sets the `revokedAt` timestamp and records the revocation reason
   * in the audit log. A revoked paper key cannot be used for recovery
   * or device provisioning.
   *
   * **Validates: Requirement 1.7** — Support paper key revocation with audit logging
   *
   * @param memberId   - The member who owns the paper key
   * @param paperKeyId - The paper key to revoke
   * @param reason     - Human-readable reason for revocation
   * @throws {PaperKeyNotFoundError} If the paper key does not exist for this member
   * @throws {PaperKeyRevokedError} If the paper key has already been revoked
   */
  revokePaperKey(memberId: TId, paperKeyId: TId, reason?: string): void {
    const metadata = this.findPaperKey(memberId, paperKeyId);

    if (metadata.revokedAt) {
      throw new PaperKeyRevokedError(String(paperKeyId));
    }

    metadata.revokedAt = new Date();

    this.appendAuditEntry(memberId, paperKeyId, 'revoked', reason);
  }

  /**
   * Get all paper key metadata for a member.
   *
   * Returns a shallow copy of the array to prevent external mutation.
   *
   * @param memberId - The member to query
   * @returns Array of paper key metadata (empty if none registered)
   */
  getPaperKeys(memberId: TId): ReadonlyArray<IPaperKeyMetadata<TId>> {
    return [...(this.paperKeysByMember.get(memberId) ?? [])];
  }

  /**
   * Get active (non-revoked) paper keys for a member.
   *
   * @param memberId - The member to query
   * @returns Array of active paper key metadata
   */
  getActivePaperKeys(memberId: TId): ReadonlyArray<IPaperKeyMetadata<TId>> {
    return this.getPaperKeys(memberId).filter((pk) => !pk.revokedAt);
  }

  /**
   * Get a single paper key by ID.
   *
   * @param memberId   - The member who owns the paper key
   * @param paperKeyId - The paper key to retrieve
   * @returns The paper key metadata
   * @throws {PaperKeyNotFoundError} If the paper key does not exist
   */
  getPaperKey(memberId: TId, paperKeyId: TId): IPaperKeyMetadata<TId> {
    return this.findPaperKey(memberId, paperKeyId);
  }

  /**
   * Get the full audit log for a member's paper keys.
   *
   * Returns a shallow copy of the array to prevent external mutation.
   *
   * **Validates: Requirement 1.7** — Audit logging
   *
   * @param memberId - The member to query
   * @returns Array of audit entries (empty if none recorded)
   */
  getAuditLog(memberId: TId): ReadonlyArray<IPaperKeyAuditEntry<TId>> {
    return [...(this.auditLogByMember.get(memberId) ?? [])];
  }

  /**
   * Check whether a specific paper key is revoked.
   *
   * @param memberId   - The member who owns the paper key
   * @param paperKeyId - The paper key to check
   * @returns `true` if the paper key has been revoked
   * @throws {PaperKeyNotFoundError} If the paper key does not exist
   */
  isRevoked(memberId: TId, paperKeyId: TId): boolean {
    return this.findPaperKey(memberId, paperKeyId).revokedAt !== undefined;
  }

  /**
   * Check whether a specific paper key has been used.
   *
   * @param memberId   - The member who owns the paper key
   * @param paperKeyId - The paper key to check
   * @returns `true` if the paper key has been used
   * @throws {PaperKeyNotFoundError} If the paper key does not exist
   */
  isUsed(memberId: TId, paperKeyId: TId): boolean {
    return this.findPaperKey(memberId, paperKeyId).usedAt !== undefined;
  }

  /**
   * Remove all paper key data for a member.
   *
   * Useful for testing or when a member is deleted.
   *
   * @param memberId - The member whose data should be cleared
   */
  clearMemberData(memberId: TId): void {
    this.paperKeysByMember.delete(memberId);
    this.auditLogByMember.delete(memberId);
  }

  /**
   * Look up a paper key by member ID and paper key ID.
   *
   * @throws {PaperKeyNotFoundError} If not found
   */
  private findPaperKey(memberId: TId, paperKeyId: TId): IPaperKeyMetadata<TId> {
    const keys = this.paperKeysByMember.get(memberId);
    if (!keys) {
      throw new PaperKeyNotFoundError(String(paperKeyId));
    }

    const found = keys.find((pk) => pk.id === paperKeyId);
    if (!found) {
      throw new PaperKeyNotFoundError(String(paperKeyId));
    }

    return found;
  }

  /**
   * Append an entry to the member's audit log.
   */
  private appendAuditEntry(
    memberId: TId,
    paperKeyId: TId,
    action: IPaperKeyAuditEntry<TId>['action'],
    reason?: string,
    deviceId?: TId,
  ): void {
    const entry: IPaperKeyAuditEntry<TId> = {
      id: uuidv4(),
      paperKeyId,
      memberId,
      action,
      timestamp: new Date(),
      reason,
      deviceId,
    };

    const existing = this.auditLogByMember.get(memberId) ?? [];
    existing.push(entry);
    this.auditLogByMember.set(memberId, existing);
  }
}
