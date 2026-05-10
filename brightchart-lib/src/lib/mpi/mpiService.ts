/**
 * Master Patient Index (MPI) Service Interface
 *
 * Defines the `IMPIService<TID>` interface providing CRUD, search,
 * duplicate detection, and merge operations for patient records.
 *
 * @see https://build.fhir.org/patient.html
 * @module mpi/mpiService
 */

import { IOperationOutcome } from '../fhir/operationOutcome';
import { IPatientResource } from '../fhir/patientResource';
import { IMergeResult } from './mergeTypes';
import {
  IMatchCandidate,
  IPatientSearchParams,
  IPatientSearchResult,
} from './searchTypes';

/**
 * Master Patient Index service interface.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 */
export interface IMPIService<TID = string> {
  /**
   * Create a new patient record.
   * Assigns a unique FHIR id, sets meta.versionId to "1",
   * encrypts and stores the record, and returns the created resource.
   */
  createPatient(
    patient: IPatientResource<TID>,
    memberId: TID,
  ): Promise<IPatientResource<TID>>;

  /**
   * Retrieve a patient record by id.
   * Returns the decrypted Patient resource or an OperationOutcome
   * if the patient is not found.
   */
  getPatient(
    id: string,
    memberId: TID,
  ): Promise<IPatientResource<TID> | IOperationOutcome>;

  /**
   * Update an existing patient record.
   * Increments meta.versionId, stores a new encrypted block,
   * and returns the updated resource or an OperationOutcome on failure.
   */
  updatePatient(
    patient: IPatientResource<TID>,
    memberId: TID,
  ): Promise<IPatientResource<TID> | IOperationOutcome>;

  /**
   * Soft-delete a patient record by marking it inactive.
   * Returns the deactivated resource or an OperationOutcome if not found.
   */
  deletePatient(
    id: string,
    memberId: TID,
  ): Promise<IPatientResource<TID> | IOperationOutcome>;

  /**
   * Search for patients by demographic criteria.
   * Results are filtered by the requesting member's ACL permissions.
   */
  searchPatients(
    params: IPatientSearchParams,
    memberId: TID,
  ): Promise<IPatientSearchResult<TID>>;

  /**
   * Find potential duplicate records for a given patient.
   * Returns candidates with match scores and classifications.
   */
  findDuplicates(
    patient: IPatientResource<TID>,
    memberId: TID,
  ): Promise<IMatchCandidate<TID>[]>;

  /**
   * Merge two patient records (source into target).
   * Marks the source as inactive with a "replaced-by" link,
   * adds a "replaces" link on the target, and creates a merge record.
   * Returns the merge result or an OperationOutcome on failure.
   */
  mergePatients(
    sourceId: string,
    targetId: string,
    memberId: TID,
  ): Promise<IMergeResult<TID> | IOperationOutcome>;
}
