/**
 * Audit Log Interfaces
 *
 * Defines the IAuditLogEntry interface and AuditOperationType enum for
 * recording all patient identity operations in an append-only audit trail.
 *
 * @see Requirement 8: Audit Logging
 * @module audit/auditLog
 */

import type { IPatientSearchParams } from '../mpi/searchTypes';

/**
 * Types of operations that can be audited.
 */
export enum AuditOperationType {
  Create = 'Create',
  Read = 'Read',
  Update = 'Update',
  Delete = 'Delete',
  Search = 'Search',
  Merge = 'Merge',
}

/**
 * An append-only audit log entry recording a patient identity operation.
 *
 * Entries form a hash-linked chain per patient via `previousEntryBlockId`.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IAuditLogEntry<TID = string> {
  /** The type of operation performed */
  operationType: AuditOperationType;

  /** Patient ID affected (optional for Search operations) */
  patientId?: string;

  /** Search parameters used (only for Search operations) */
  searchParams?: IPatientSearchParams;

  /** BrightChain member ID who performed the operation */
  memberId: TID;

  /** Timestamp of the operation */
  timestamp: Date;

  /** Unique request identifier for correlation */
  requestId: string;

  /** Cryptographic signature from the operating member's ECIES key */
  signature: Uint8Array;

  /** Block ID of the previous audit entry for this patient (chain linking) */
  previousEntryBlockId?: TID;
}
