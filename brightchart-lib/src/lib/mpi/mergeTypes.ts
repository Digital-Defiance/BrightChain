/**
 * MPI Merge Types
 *
 * Defines interfaces for patient record merge results and
 * the auditable merge record.
 *
 * @module mpi/mergeTypes
 */

import { IPatientResource } from '../fhir/patientResource';

/**
 * Auditable record of a patient merge operation.
 *
 * Documents which records were merged, who authorized it,
 * which fields were combined, and a cryptographic signature.
 */
export interface IMergeRecord<TID = string> {
  /** FHIR id of the source (superseded) patient */
  sourceId: string;
  /** FHIR id of the target (surviving) patient */
  targetId: string;
  /** Member ID of the BrightChain member who authorized the merge */
  authorizedBy: TID;
  /** Timestamp when the merge was performed */
  timestamp: Date;
  /** List of field paths that were combined from source into target */
  combinedFields: string[];
  /** Cryptographic signature from the authorizing member's ECIES key */
  signature: Uint8Array;
}

/**
 * Result of a successful patient merge operation.
 */
export interface IMergeResult<TID = string> {
  /** The surviving (target) patient resource after merge */
  survivingPatient: IPatientResource<TID>;
  /** The auditable merge record */
  mergeRecord: IMergeRecord<TID>;
}
