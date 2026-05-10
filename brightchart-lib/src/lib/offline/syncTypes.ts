/**
 * Sync Types for Offline Cache
 *
 * Defines ISyncResult for capturing sync outcomes (including conflicts)
 * and ISyncStrategy for pluggable conflict resolution.
 *
 * @see Requirement 11: Offline-Capable Patient Data Access (AC 4)
 * @module offline/syncTypes
 */

import type { IPatientResource } from '../fhir/patientResource';

/**
 * Describes a version conflict detected during sync.
 */
export interface ISyncConflict {
  /** The FHIR patient ID with a conflict */
  patientId: string;
  /** The local meta.versionId */
  localVersionId: string;
  /** The remote meta.versionId */
  remoteVersionId: string;
}

/**
 * Result of a sync operation between the local offline cache
 * and the remote Patient_Store.
 *
 * @typeParam TID - The identifier type, defaults to string
 */
export interface ISyncResult<_TID = string> {
  /** Patient IDs that were successfully synced */
  syncedPatientIds: string[];
  /** Conflicts detected during sync (version mismatches) */
  conflicts: ISyncConflict[];
  /** Timestamp when the sync completed */
  timestamp: Date;
}

/**
 * Strategy interface for resolving conflicts during sync.
 * Implementations decide whether the local or remote version wins,
 * or produce a merged result.
 *
 * @typeParam TID - The identifier type, defaults to string
 */
export interface ISyncStrategy<TID = string> {
  /**
   * Resolve a conflict between a local and remote patient record.
   * @param local - The locally cached patient resource
   * @param remote - The remote patient resource from the Patient_Store
   * @returns The resolved patient resource to keep
   */
  resolveConflict(
    local: IPatientResource<TID>,
    remote: IPatientResource<TID>,
  ): IPatientResource<TID>;
}
