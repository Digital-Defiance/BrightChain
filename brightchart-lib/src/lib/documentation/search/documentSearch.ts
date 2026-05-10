/**
 * Document Search Interfaces
 *
 * Defines search parameters, result types, and the search engine interface
 * for querying Composition and DocumentReference resources using hashed
 * field indexes.
 *
 * @module documentation/search/documentSearch
 */

import type { ICodeableConcept } from '../../fhir/datatypes';
import type { ICompositionResource } from '../compositionResource';
import type { IDocumentReferenceResource } from '../documentReferenceResource';
import type {
  CompositionStatus,
  DocumentReferenceStatus,
} from '../enumerations';

/**
 * Search parameters for querying clinical documents.
 */
export interface IDocumentSearchParams {
  /** Patient ID (required) */
  patientId: string;
  /** Optional encounter ID filter */
  encounterId?: string;
  /** Optional document type filter (LOINC code string or full CodeableConcept) */
  type?: string | ICodeableConcept;
  /** Optional status filter */
  status?: CompositionStatus | DocumentReferenceStatus;
  /** Optional author practitioner reference */
  author?: string;
  /** Optional date range filter */
  dateRange?: { start?: string; end?: string };
  /** Optional category filter (string or CodeableConcept) */
  category?: string | ICodeableConcept;
  /** Pagination offset */
  offset?: number;
  /** Page size */
  count?: number;
}

/**
 * Paginated search result for clinical documents.
 */
export interface IDocumentSearchResult<TID = string> {
  /** Matching documents (Compositions and/or DocumentReferences) */
  entries: (ICompositionResource<TID> | IDocumentReferenceResource<TID>)[];
  /** Total number of matches */
  total: number;
  /** Current offset */
  offset: number;
  /** Page size */
  count: number;
}

/**
 * Document search engine interface for indexing and querying documents.
 */
export interface IDocumentSearchEngine<TID = string> {
  /** Search for documents matching the given parameters */
  search(
    params: IDocumentSearchParams,
    memberId: TID,
  ): Promise<IDocumentSearchResult<TID>>;

  /** Add a Composition to the search index */
  indexComposition(composition: ICompositionResource<TID>): Promise<void>;

  /** Add a DocumentReference to the search index */
  indexDocumentReference(
    docRef: IDocumentReferenceResource<TID>,
  ): Promise<void>;

  /** Remove a document from the search index */
  removeIndex(resourceId: string): Promise<void>;
}
