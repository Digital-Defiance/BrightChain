/**
 * Eligibility Service Interface
 *
 * Defines the eligibility verification service for checking patient
 * insurance coverage in real-time.
 *
 * @see Requirements 10.1, 10.2
 * @module billing/eligibility
 */

import type {
  ICoverageEligibilityRequestResource,
  ICoverageEligibilityResponseResource,
} from '../eligibilityResources';

/**
 * Service interface for real-time insurance eligibility verification.
 *
 * Supports checking for active coverage, benefit details,
 * authorization requirements, and remaining benefits.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 10.1
 */
export interface IEligibilityService<TID = string> {
  /**
   * Check insurance eligibility for a patient.
   * @param request - The eligibility request
   * @param memberId - Member performing the check
   * @returns The eligibility response from the insurer
   */
  checkEligibility(
    request: ICoverageEligibilityRequestResource<TID>,
    memberId: TID,
  ): Promise<ICoverageEligibilityResponseResource<TID>>;

  /**
   * Retrieve eligibility check history for a patient and coverage.
   * @param patientId - Patient identifier
   * @param coverageId - Coverage identifier
   * @returns Array of past eligibility responses
   */
  getEligibilityHistory(
    patientId: string,
    coverageId: string,
  ): Promise<ICoverageEligibilityResponseResource<TID>[]>;
}
