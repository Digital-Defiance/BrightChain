/**
 * Claim Lifecycle and Submission Interfaces
 *
 * Defines the claim lifecycle state machine, valid status transitions,
 * claim submission service, and submission result/status types.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4
 * @module billing/lifecycle
 */

import type { ICodeableConcept, IReference } from '../../fhir/datatypes';
import type { IClaimResource } from '../claimResource';
import type { ClaimStatus } from '../enumerations';

/**
 * Valid claim status transitions.
 *
 * - draft → active (submit)
 * - active → cancelled (void)
 * - any → entered-in-error
 *
 * @see Requirement 9.2
 */
export const CLAIM_STATUS_TRANSITIONS: ReadonlyMap<
  ClaimStatus,
  readonly ClaimStatus[]
> = new Map([
  [
    'draft' as ClaimStatus,
    ['active' as ClaimStatus, 'entered-in-error' as ClaimStatus] as const,
  ],
  [
    'active' as ClaimStatus,
    ['cancelled' as ClaimStatus, 'entered-in-error' as ClaimStatus] as const,
  ],
  ['cancelled' as ClaimStatus, ['entered-in-error' as ClaimStatus] as const],
  ['entered-in-error' as ClaimStatus, [] as const],
]);

/**
 * Claim lifecycle interface for managing claim status transitions.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 9.1
 */
export interface IClaimLifecycle<TID = string> {
  /**
   * Check whether a status transition is valid.
   * @param from - Current claim status
   * @param to - Target claim status
   * @returns True if the transition is valid
   */
  isValidTransition(from: ClaimStatus, to: ClaimStatus): boolean;

  /**
   * Transition a claim to a new status.
   * @param claim - The claim to transition
   * @param to - Target claim status
   * @param memberId - Member performing the transition
   * @returns The claim with updated status
   */
  transition(
    claim: IClaimResource<TID>,
    to: ClaimStatus,
    memberId: TID,
  ): IClaimResource<TID>;
}

/**
 * Result of a claim submission or void operation.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 9.4
 */
export interface IClaimSubmissionResult<_TID = string> {
  /** Whether the submission was successful */
  success: boolean;
  /** Submission tracking identifier */
  submissionId: string;
  /** Current claim status after submission */
  status: ClaimStatus;
  /** Errors encountered during submission (if any) */
  errors: string[];
}

/**
 * Status of a submitted claim in the adjudication pipeline.
 *
 * @see Requirement 9.4
 */
export interface IClaimSubmissionStatus<TID = string> {
  /** Claim identifier */
  claimId: string;
  /** Current submission status */
  status: 'submitted' | 'accepted' | 'rejected' | 'paid' | 'denied';
  /** Date/time of last status update */
  lastUpdated: Date;
  /** Reference to the adjudication result (EOB) if available */
  adjudicationResult?: IReference<TID>;
}

/**
 * Service interface for claim submission and status tracking.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 9.3
 */
export interface IClaimSubmissionService<TID = string> {
  /**
   * Submit a claim to the insurer.
   * @param claim - The claim to submit
   * @param memberId - Member performing the submission
   * @returns The submission result
   */
  submit(
    claim: IClaimResource<TID>,
    memberId: TID,
  ): Promise<IClaimSubmissionResult<TID>>;

  /**
   * Check the current status of a submitted claim.
   * @param claimId - Claim identifier
   * @returns The current submission status
   */
  checkStatus(claimId: string): Promise<IClaimSubmissionStatus<TID>>;

  /**
   * Void a previously submitted claim.
   * @param claimId - Claim identifier
   * @param reason - Reason for voiding
   * @param memberId - Member performing the void
   * @returns The void result
   */
  void(
    claimId: string,
    reason: ICodeableConcept,
    memberId: TID,
  ): Promise<IClaimSubmissionResult<TID>>;
}
