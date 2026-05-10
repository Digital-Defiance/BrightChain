/**
 * Order Search and Query Interfaces
 *
 * Defines the search parameter, result, and engine interfaces for
 * querying FHIR R4 ServiceRequest, MedicationRequest, and DiagnosticReport
 * resources stored on BrightChain.
 *
 * Follows the IEncounterSearchEngine hashed index pattern from Module 3.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4
 * @module orders/search/orderSearch
 */

import type { IDiagnosticReportResource } from '../diagnosticReportResource';
import type {
  DiagnosticReportStatus,
  MedicationRequestStatus,
  RequestPriority,
  ServiceRequestStatus,
} from '../enumerations';
import type { IMedicationRequestResource } from '../medicationRequestResource';
import type { IServiceRequestResource } from '../serviceRequestResource';

/**
 * Union of order resource types that can be searched.
 */
export type SearchableOrderResourceType =
  | 'ServiceRequest'
  | 'MedicationRequest'
  | 'DiagnosticReport';

/**
 * Union of all order/result status enumerations used in search filters.
 */
export type SearchableOrderStatus =
  | ServiceRequestStatus
  | MedicationRequestStatus
  | DiagnosticReportStatus;

/**
 * Union of all order/result resource interfaces returned by search.
 * Broader than the lifecycle `OrderResource` — includes DiagnosticReport.
 */
export type SearchableOrderResource<TID = string> =
  | IServiceRequestResource<TID>
  | IMedicationRequestResource<TID>
  | IDiagnosticReportResource<TID>;

/**
 * Search parameters for querying orders and results.
 *
 * `patientId` is required; all other fields are optional filters.
 * Supports pagination via `offset` and `count`.
 *
 * @see Requirement 9.1
 */
export interface IOrderSearchParams {
  /** Patient identifier (required) */
  patientId: string;

  /** Filter by encounter reference */
  encounterId?: string;

  /** Filter by FHIR resource type */
  resourceType?: SearchableOrderResourceType;

  /** Filter by one or more order/result statuses */
  status?: SearchableOrderStatus | SearchableOrderStatus[];

  /** Filter by order/result code (code string or system|code) */
  code?: string;

  /** Filter by date range (authoredOn / effectiveDateTime / issued) */
  dateRange?: {
    /** Inclusive start date (ISO 8601) */
    start?: string;
    /** Inclusive end date (ISO 8601) */
    end?: string;
  };

  /** Filter by requester reference */
  requesterId?: string;

  /** Filter by request priority */
  priority?: RequestPriority;

  /** Pagination offset (zero-based) */
  offset?: number;

  /** Maximum number of results to return */
  count?: number;
}

/**
 * Paginated search result set for order queries.
 *
 * @see Requirement 9.4
 */
export interface IOrderSearchResult<TID = string> {
  /** Matching order/result resources for the current page */
  entries: SearchableOrderResource<TID>[];

  /** Total number of matching resources across all pages */
  total: number;

  /** Current page offset */
  offset: number;

  /** Page size */
  count: number;
}

/**
 * Search engine interface for indexing and querying orders and results.
 *
 * Implementations maintain hashed search indexes for efficient lookup
 * while keeping order data encrypted at rest. Results are ordered by
 * date (most recent first) and filtered by the requesting member's
 * read permissions (ACL).
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @see Requirements 9.1–9.4
 */
export interface IOrderSearchEngine<TID = string> {
  /**
   * Search for orders/results matching the given parameters.
   *
   * Results are ordered by date (most recent first) and filtered
   * by the requesting member's read permissions.
   *
   * @param params - Search parameters (patientId required)
   * @param memberId - The requesting BrightChain member (for ACL filtering)
   * @returns Paginated search results
   */
  search(
    params: IOrderSearchParams,
    memberId: TID,
  ): Promise<IOrderSearchResult<TID>>;

  /**
   * Add or update the search index for an order/result resource.
   *
   * @param resource - The order or result resource to index
   */
  index(resource: SearchableOrderResource<TID>): Promise<void>;

  /**
   * Remove the search index entries for an order/result resource.
   *
   * @param resourceId - The resource id to remove from the index
   * @param resourceType - The FHIR resource type being removed
   */
  removeIndex(
    resourceId: string,
    resourceType: SearchableOrderResourceType,
  ): Promise<void>;
}
