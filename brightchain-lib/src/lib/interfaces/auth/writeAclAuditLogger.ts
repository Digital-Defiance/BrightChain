/**
 * @fileoverview Write ACL Audit Logger interface for BrightDB
 *
 * Defines the structured audit logging interface for all write ACL
 * events: authorized writes, rejected writes, ACL modifications,
 * capability token issuance, capability token usage, and security events.
 *
 * @see BrightDB Write ACLs design, WriteAclAuditLogger section
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { IAclScope } from './writeAcl';

/**
 * Structured audit logger for write ACL events.
 *
 * Records all authorization decisions and ACL management operations
 * for security auditing and access pattern review. Each log entry
 * includes the actor's public key, the operation type, the target
 * scope, and a timestamp.
 *
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */
export interface IWriteAclAuditLogger {
  /**
   * Log a successful authorized write in Restricted_Mode.
   *
   * @param writerPublicKey - Hex-encoded public key of the authorized writer
   * @param dbName - Target database name
   * @param collectionName - Target collection name
   * @param blockId - New head block ID that was written
   * @see Requirements 11.1
   */
  logAuthorizedWrite(
    writerPublicKey: string,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): void;

  /**
   * Log a rejected write due to authorization failure.
   *
   * @param requesterPublicKey - Hex-encoded public key of the rejected requester
   * @param dbName - Target database name
   * @param collectionName - Target collection name
   * @param reason - Human-readable reason for rejection
   * @see Requirements 11.2
   */
  logRejectedWrite(
    requesterPublicKey: string,
    dbName: string,
    collectionName: string,
    reason: string,
  ): void;

  /**
   * Log a Write ACL modification (add/remove writer or admin, mode change).
   *
   * @param adminPublicKey - Hex-encoded public key of the acting ACL administrator
   * @param changeType - Type of modification (e.g. 'addWriter', 'removeWriter', 'addAdmin', 'removeAdmin', 'setWriteMode')
   * @param affectedMember - Hex-encoded public key of the member affected by the change
   * @param dbName - Target database name
   * @param collectionName - Optional target collection name (undefined for database-level)
   * @see Requirements 11.3
   */
  logAclModification(
    adminPublicKey: string,
    changeType: string,
    affectedMember: string,
    dbName: string,
    collectionName?: string,
  ): void;

  /**
   * Log the issuance of a capability token.
   *
   * @param granteePublicKey - Hex-encoded public key of the token recipient
   * @param scope - ACL scope the token grants access to
   * @param expiresAt - Token expiration timestamp
   * @param grantorPublicKey - Hex-encoded public key of the issuing ACL administrator
   * @see Requirements 11.4
   */
  logCapabilityTokenIssued(
    granteePublicKey: string,
    scope: IAclScope,
    expiresAt: Date,
    grantorPublicKey: string,
  ): void;

  /**
   * Log the usage of a capability token for a write operation.
   *
   * @param granteePublicKey - Hex-encoded public key of the token holder
   * @param scope - ACL scope the token was issued for
   * @param dbName - Target database name
   * @param collectionName - Target collection name
   * @param blockId - Block ID written using the token
   * @see Requirements 11.5
   */
  logCapabilityTokenUsed(
    granteePublicKey: string,
    scope: IAclScope,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): void;

  /**
   * Log a security-relevant event (e.g. tampered ACL document, sync rejection).
   *
   * @param event - Short event identifier or description
   * @param details - Arbitrary structured details about the event
   */
  logSecurityEvent(event: string, details: Record<string, unknown>): void;
}
