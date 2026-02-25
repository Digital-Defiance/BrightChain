/**
 * @fileoverview ChainedAuditLogEntry interface.
 *
 * Extends AuditLogEntry with hash chain fields for tamper-evident audit logging.
 * Each entry is signed by the node that created it and references the previous
 * entry's hash, forming a hash chain persisted via storeCBLWithWhitening.
 *
 * @see Design: Immutable Chained Audit Log
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { QuorumAuditLogEntry } from './auditLogEntry';

/**
 * A tamper-evident audit log entry linked in a hash chain.
 */
export interface ChainedAuditLogEntry extends QuorumAuditLogEntry {
  /** SHA-3 hash of the previous entry's serialized form. Null for the genesis entry. */
  previousEntryHash: string | null;
  /** SHA-3 hash of this entry's content (excluding signature and blockIds). */
  contentHash: string;
  /** ECIES signature of contentHash by the node operator's key. */
  signature: SignatureUint8Array;
  /** First CBL block ID from storeCBLWithWhitening. */
  blockId1: string;
  /** Second CBL block ID from storeCBLWithWhitening. */
  blockId2: string;
}
