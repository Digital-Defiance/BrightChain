/**
 * Document Audit Interfaces
 *
 * Extends the clinical audit entry with document-specific fields for
 * document status, attestation mode, and amendment reason. Provides
 * a logger interface for recording all document operations including
 * signing events.
 *
 * @module documentation/audit/documentAudit
 */

import type { IClinicalAuditEntry } from '../../clinical/audit/clinicalAudit';
import type {
  AttestationMode,
  CompositionStatus,
  DocumentReferenceStatus,
} from '../enumerations';

/**
 * Document audit entry extending the clinical audit entry with
 * document-specific fields for status tracking and signing events.
 */
export interface IDocumentAuditEntry<TID = string>
  extends IClinicalAuditEntry<TID> {
  /** Current document status at time of audit */
  documentStatus: CompositionStatus | DocumentReferenceStatus;
  /** Attestation mode (present for sign/cosign operations) */
  attestationMode?: AttestationMode;
  /** Reason for amendment (present for amend operations) */
  amendmentReason?: string;
}

/**
 * Document audit logger interface for recording all document operations.
 */
export interface IDocumentAuditLogger<TID = string> {
  logCreate(resourceId: string, memberId: TID): Promise<void>;
  logRead(resourceId: string, memberId: TID): Promise<void>;
  logUpdate(resourceId: string, memberId: TID): Promise<void>;
  logDelete(resourceId: string, memberId: TID): Promise<void>;
  logSearch(params: unknown, memberId: TID): Promise<void>;
  logSign(
    resourceId: string,
    mode: AttestationMode,
    memberId: TID,
  ): Promise<void>;
  logCosign(resourceId: string, memberId: TID): Promise<void>;
  logAmend(resourceId: string, reason: string, memberId: TID): Promise<void>;
}
