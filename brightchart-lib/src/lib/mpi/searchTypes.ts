/**
 * MPI Search and Matching Types
 *
 * Defines interfaces and enums for patient search parameters,
 * search results, match candidates, and match classification.
 *
 * @see https://build.fhir.org/patient.html#search
 * @module mpi/searchTypes
 */

import { AdministrativeGender } from '../fhir/enumerations';
import { IPatientResource } from '../fhir/patientResource';

/**
 * Match classification based on Match_Score thresholds.
 *
 * - Certain:  score >= 0.95
 * - Probable: score >= 0.80
 * - Possible: score >= 0.60
 * - Unlikely: score <  0.60
 */
export enum MatchClassification {
  Certain = 'certain',
  Probable = 'probable',
  Possible = 'possible',
  Unlikely = 'unlikely',
}

/**
 * Parameters for searching patients by demographic criteria.
 * All fields are optional; any combination may be provided.
 */
export interface IPatientSearchParams {
  /** Family (last) name — supports exact, prefix, and phonetic match */
  family?: string;
  /** Given (first) name — supports exact, prefix, and phonetic match */
  given?: string;
  /** Date of birth (FHIR date: YYYY, YYYY-MM, or YYYY-MM-DD) */
  birthDate?: string;
  /** Administrative gender */
  gender?: AdministrativeGender;
  /** Identifier value (e.g. MRN, SSN) */
  identifier?: string;
  /** Telecom value (phone number, email, etc.) */
  telecom?: string;
  /** Address city */
  addressCity?: string;
  /** Address state */
  addressState?: string;
  /** Address postal code */
  addressPostalCode?: string;
}

/**
 * A single search result entry with the matched patient resource.
 */
export interface IPatientSearchResultEntry<TID = string> {
  /** The matched patient resource */
  patient: IPatientResource<TID>;
}

/**
 * Search result set returned by the MPI search operation.
 */
export interface IPatientSearchResult<TID = string> {
  /** Array of matching patient entries, ordered by relevance */
  entries: IPatientSearchResultEntry<TID>[];
  /** Total number of matching records (may exceed entries.length for paging) */
  total: number;
}

/**
 * A candidate match returned by duplicate detection.
 */
export interface IMatchCandidate<TID = string> {
  /** The candidate patient resource */
  patient: IPatientResource<TID>;
  /** Similarity score between 0.0 and 1.0 */
  matchScore: number;
  /** Classification derived from the match score */
  matchClassification: MatchClassification;
}
