/**
 * Clinical Search Interfaces
 *
 * Defines search parameters, result types, and the search engine interface
 * for querying clinical resources using hashed field indexes.
 *
 * @module clinical/search/clinicalSearch
 */

import type { ICodeableConcept } from '../../fhir/datatypes';
import type {
  ClinicalResource,
  ClinicalResourceType,
} from '../resources/index';

/**
 * Search parameters for querying clinical resources.
 */
export interface IClinicalSearchParams {
  /** Patient ID (required) */
  patientId: string;
  /** Resource type to search (required) */
  resourceType: ClinicalResourceType;
  /** Optional date range filter */
  dateRange?: { start?: string; end?: string };
  /** Optional code filter (string code or full CodeableConcept) */
  code?: string | ICodeableConcept;
  /** Optional status filter */
  status?: string;
  /** Optional category filter (string or CodeableConcept) */
  category?: string | ICodeableConcept;
  /** Pagination offset */
  offset?: number;
  /** Page size */
  count?: number;
}

/**
 * Paginated search result for clinical resources.
 */
export interface IClinicalSearchResult<TID = string> {
  /** Matching clinical resources */
  entries: ClinicalResource<TID>[];
  /** Total number of matches */
  total: number;
  /** Current offset */
  offset: number;
  /** Page size */
  count: number;
}

/**
 * Clinical search engine interface for indexing and querying resources.
 */
export interface IClinicalSearchEngine<TID = string> {
  /** Search for clinical resources matching the given parameters */
  search(
    params: IClinicalSearchParams,
    memberId: TID,
  ): Promise<IClinicalSearchResult<TID>>;
  /** Add a resource to the search index */
  indexResource(resource: ClinicalResource<TID>): Promise<void>;
  /** Remove a resource from the search index */
  removeIndex(resourceId: string): Promise<void>;
}
