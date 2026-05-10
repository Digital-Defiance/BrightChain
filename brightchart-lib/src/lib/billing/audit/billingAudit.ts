/**
 * Billing Audit Interfaces
 *
 * Extends the clinical audit entry with billing-specific fields
 * for claim status, submission events, and payment amounts.
 *
 * @see Requirements 17.1, 17.2, 17.3, 17.4
 * @module billing/audit/billingAudit
 */

import type { IClinicalAuditEntry } from '../../clinical/audit/clinicalAudit';
import type { ClaimStatus } from '../enumerations';
import type { IMoney } from '../moneyType';

/**
 * Billing audit entry extending the clinical audit entry with
 * billing-specific fields.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 17.2
 */
export interface IBillingAuditEntry<TID = string>
  extends IClinicalAuditEntry<TID> {
  /** Current claim status at the time of the audit event */
  claimStatus: ClaimStatus;
  /** Submission event description (e.g. 'submitted', 'voided', 'eligibility-check') */
  submissionEvent: string;
  /** Payment amount associated with this audit event */
  paymentAmount: IMoney;
}

/**
 * Billing audit logger interface for recording all billing operations.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirements 17.1, 17.3, 17.4
 */
export interface IBillingAuditLogger<TID = string> {
  /** Log a billing audit entry. Entries are append-only. */
  log(entry: IBillingAuditEntry<TID>): Promise<void>;
}
