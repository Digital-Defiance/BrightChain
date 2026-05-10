/**
 * Patient Search Index Interface
 *
 * Defines the IPatientSearchIndex interface for indexing and querying
 * patient demographic field hashes without decrypting stored blocks.
 *
 * @see Requirement 4 (AC 6): Search index of unencrypted demographic field hashes
 * @module stores/patientSearchIndex
 */

import type { IPatientResource } from '../fhir/patientResource';
import type { IPatientSearchParams } from '../mpi/searchTypes';

/**
 * Interface for maintaining a search index of hashed patient demographics.
 *
 * Enables search without decrypting every stored Patient_Resource block.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IPatientSearchIndex<TID = string> {
  /**
   * Index a patient's demographic fields (as hashes) for search.
   * @param patient - The patient resource to index
   */
  indexPatient(patient: IPatientResource<TID>): Promise<void>;

  /**
   * Search the index using demographic parameters.
   * @param params - Search parameters to match against indexed hashes
   * @returns Array of matching patient ID and block ID pairs
   */
  search(
    params: IPatientSearchParams,
  ): Promise<Array<{ patientId: string; blockId: TID }>>;

  /**
   * Remove a patient's index entries.
   * @param patientId - The FHIR patient ID to remove from the index
   */
  removeIndex(patientId: string): Promise<void>;
}
