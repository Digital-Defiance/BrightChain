/**
 * Encounter Search and Query Interfaces
 *
 * Defines the search parameter, result, and engine interfaces for
 * querying FHIR R4 Encounter resources stored on BrightChain.
 * Follows the Clinical_Search_Engine hashed index pattern from Module 2.
 *
 * @see https://build.fhir.org/encounter.html#search
 * @module encounter/search/encounterSearch
 */

import { ICodeableConcept } from '../../fhir/datatypes';
import { IEncounterResource } from '../encounterResource';
import { EncounterStatus } from '../enumerations';

/**
 * Search parameters for querying encounters.
 *
 * `patientId` is required; all other fields are optional filters.
 * Supports pagination via `offset` and `count`.
 *
 * @see Requirement 6.1
 */
export interface IEncounterSearchParams {
  /** Patient identifier (required) */
  patientId: string;

  /** Filter by one or more FHIR encounter statuses */
  status?: EncounterStatus | EncounterStatus[];

  /** Filter by encounter class code(s) (HL7 v3 ActCode) */
  classCode?: string | string[];

  /** Filter by encounter type code or codeable concept */
  type?: string | ICodeableConcept;

  /** Filter by encounter period date range */
  dateRange?: {
    /** Inclusive start date (ISO 8601) */
    start?: string;
    /** Inclusive end date (ISO 8601) */
    end?: string;
  };

  /** Filter by participant (practitioner) reference */
  participantId?: string;

  /** Filter by location reference */
  locationId?: string;

  /** Pagination offset (zero-based) */
  offset?: number;

  /** Maximum number of results to return */
  count?: number;
}

/**
 * Paginated search result set for encounter queries.
 *
 * @see Requirement 6.6
 */
export interface IEncounterSearchResult<TID = string> {
  /** Matching encounter resources for the current page */
  entries: IEncounterResource<TID>[];

  /** Total number of matching encounters across all pages */
  total: number;

  /** Current page offset */
  offset: number;

  /** Page size */
  count: number;
}

/**
 * Search engine interface for indexing and querying encounters.
 *
 * Implementations maintain hashed search indexes for efficient
 * lookup while keeping encounter data encrypted at rest.
 *
 * @see Requirements 6.1–6.6
 */
export interface IEncounterSearchEngine<TID = string> {
  /**
   * Search for encounters matching the given parameters.
   * Results are ordered by period start date (most recent first)
   * and filtered by the requesting member's read permissions.
   *
   * @param params - Search parameters (patientId required)
   * @param memberId - The requesting BrightChain member
   * @returns Paginated search results
   */
  search(
    params: IEncounterSearchParams,
    memberId: TID,
  ): Promise<IEncounterSearchResult<TID>>;

  /**
   * Add or update the search index for an encounter.
   *
   * @param encounter - The encounter resource to index
   */
  indexEncounter(encounter: IEncounterResource<TID>): Promise<void>;

  /**
   * Remove the search index entries for an encounter.
   *
   * @param encounterId - The encounter id to remove from the index
   */
  removeIndex(encounterId: string): Promise<void>;
}
