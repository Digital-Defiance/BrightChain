/**
 * @fileoverview Write ACL Audit Logger implementation for BrightDB
 *
 * Structured audit logging for all write ACL events: authorized writes,
 * rejected writes, ACL modifications, capability token issuance,
 * capability token usage, and security events.
 *
 * Each log entry includes the actor's public key, operation type,
 * target scope, and timestamp.
 *
 * @see BrightDB Write ACLs design, WriteAclAuditLogger section
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type {
  IAclScope,
  IWriteAclAuditLogger,
} from '@brightchain/brightchain-lib';

/**
 * Operation types for audit log entries.
 */
export enum AuditOperationType {
  AuthorizedWrite = 'authorized_write',
  RejectedWrite = 'rejected_write',
  AclModification = 'acl_modification',
  CapabilityTokenIssued = 'capability_token_issued',
  CapabilityTokenUsed = 'capability_token_used',
  SecurityEvent = 'security_event',
}

/**
 * A single audit log entry.
 */
export interface IAuditLogEntry {
  /** Timestamp when the event was recorded */
  timestamp: Date;
  /** The type of operation */
  operationType: AuditOperationType;
  /** The actor's public key (hex-encoded), or empty for security events */
  actorPublicKey: string;
  /** Target scope (database and optional collection) */
  targetScope: IAclScope;
  /** Additional structured details about the event */
  details: Record<string, unknown>;
}

/**
 * Structured audit logger for write ACL events.
 *
 * Implements `IWriteAclAuditLogger` from brightchain-lib.
 * Stores log entries in an in-memory array for testability,
 * and provides retrieval methods for inspection.
 *
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */
export class WriteAclAuditLogger implements IWriteAclAuditLogger {
  private readonly entries: IAuditLogEntry[] = [];

  /**
   * Retrieve all audit log entries.
   */
  getEntries(): ReadonlyArray<IAuditLogEntry> {
    return this.entries;
  }

  /**
   * Get the total number of audit log entries.
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Clear all audit log entries.
   */
  clear(): void {
    this.entries.length = 0;
  }

  /**
   * Log a successful authorized write in Restricted_Mode.
   * @see Requirements 11.1
   */
  logAuthorizedWrite(
    writerPublicKey: string,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): void {
    this.entries.push({
      timestamp: new Date(),
      operationType: AuditOperationType.AuthorizedWrite,
      actorPublicKey: writerPublicKey,
      targetScope: { dbName, collectionName },
      details: { blockId },
    });
  }

  /**
   * Log a rejected write due to authorization failure.
   * @see Requirements 11.2
   */
  logRejectedWrite(
    requesterPublicKey: string,
    dbName: string,
    collectionName: string,
    reason: string,
  ): void {
    this.entries.push({
      timestamp: new Date(),
      operationType: AuditOperationType.RejectedWrite,
      actorPublicKey: requesterPublicKey,
      targetScope: { dbName, collectionName },
      details: { reason },
    });
  }

  /**
   * Log a Write ACL modification.
   * @see Requirements 11.3
   */
  logAclModification(
    adminPublicKey: string,
    changeType: string,
    affectedMember: string,
    dbName: string,
    collectionName?: string,
  ): void {
    this.entries.push({
      timestamp: new Date(),
      operationType: AuditOperationType.AclModification,
      actorPublicKey: adminPublicKey,
      targetScope: { dbName, collectionName },
      details: { changeType, affectedMember },
    });
  }

  /**
   * Log the issuance of a capability token.
   * @see Requirements 11.4
   */
  logCapabilityTokenIssued(
    granteePublicKey: string,
    scope: IAclScope,
    expiresAt: Date,
    grantorPublicKey: string,
  ): void {
    this.entries.push({
      timestamp: new Date(),
      operationType: AuditOperationType.CapabilityTokenIssued,
      actorPublicKey: grantorPublicKey,
      targetScope: scope,
      details: { granteePublicKey, expiresAt: expiresAt.toISOString() },
    });
  }

  /**
   * Log the usage of a capability token for a write operation.
   * @see Requirements 11.5
   */
  logCapabilityTokenUsed(
    granteePublicKey: string,
    scope: IAclScope,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): void {
    this.entries.push({
      timestamp: new Date(),
      operationType: AuditOperationType.CapabilityTokenUsed,
      actorPublicKey: granteePublicKey,
      targetScope: { dbName, collectionName },
      details: {
        tokenScope: scope,
        blockId,
      },
    });
  }

  /**
   * Log a security-relevant event.
   */
  logSecurityEvent(event: string, details: Record<string, unknown>): void {
    this.entries.push({
      timestamp: new Date(),
      operationType: AuditOperationType.SecurityEvent,
      actorPublicKey: (details['actorPublicKey'] as string) ?? '',
      targetScope: {
        dbName: (details['dbName'] as string) ?? '',
        collectionName: details['collectionName'] as string | undefined,
      },
      details: { event, ...details },
    });
  }
}
