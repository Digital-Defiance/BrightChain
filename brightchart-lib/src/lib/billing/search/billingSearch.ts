/**
 * Billing Search Interfaces
 *
 * Defines search parameters, result types, and the search engine interface
 * for querying billing resources (Coverage, Claim, ExplanationOfBenefit).
 *
 * @see Requirements 14.1, 14.2, 14.3
 * @module billing/search/billingSearch
 */

import type { IPeriod } from '../../fhir/datatypes';
import type { ClaimUse } from '../enumerations';

/** Billing resource types that can be searched */
export type BillingResourceType = 'Coverage' | 'Claim' | 'ExplanationOfBenefit';

/**
 * Search parameters for querying billing resources.
 *
 * @see Requirement 14.1
 */
export interface IBillingSearchParams {
  /** Patient ID (required) */
  patientId: string;
  /** Resource type to search */
  resourceType?: BillingResourceType;
  /** Optional status filter */
  status?: string;
  /** Optional date range filter */
  dateRange?: IPeriod;
  /** Optional insurer ID filter */
  insurerId?: string;
  /** Optional claim use filter */
  claimUse?: ClaimUse;
  /** Pagination offset */
  offset?: number;
  /** Page size */
  count?: number;
}

/**
 * Paginated search result for billing resources.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 14.2
 */
export interface IBillingSearchResult<_TID = string> {
  /** Matching billing resources */
  results: unknown[];
  /** Total number of matches */
  total: number;
  /** Current offset */
  offset: number;
  /** Page size */
  count: number;
}

/**
 * Billing search engine interface for querying billing resources.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 14.3
 */
export interface IBillingSearchEngine<TID = string> {
  /** Search for billing resources matching the given parameters */
  search(
    params: IBillingSearchParams,
    memberId: TID,
  ): Promise<IBillingSearchResult<TID>>;
}
