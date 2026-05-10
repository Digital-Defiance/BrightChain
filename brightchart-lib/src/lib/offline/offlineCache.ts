/**
 * Offline Cache Interface
 *
 * Defines the IOfflineCache interface for locally caching encrypted
 * patient records for offline access. Plaintext patient data is never
 * persisted — only encrypted form is stored locally.
 *
 * @see Requirement 11: Offline-Capable Patient Data Access
 * @module offline/offlineCache
 */

import type { IPatientResource } from '../fhir/patientResource';

/**
 * Interface for caching encrypted patient records locally,
 * enabling offline access to critical patient identity data.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IOfflineCache<TID = string> {
  /**
   * Cache an encrypted patient record locally.
   * The implementation MUST store the patient in encrypted form only.
   * @param patient - The patient resource to cache
   * @param encryptionKeys - ECIES encryption keys for local storage
   */
  cachePatient(
    patient: IPatientResource<TID>,
    encryptionKeys: Uint8Array,
  ): Promise<void>;

  /**
   * Retrieve a cached patient record by ID, decrypting it for use.
   * @param id - The FHIR patient ID
   * @param decryptionKeys - ECIES decryption keys
   * @returns The decrypted patient resource, or null if not cached
   */
  getCachedPatient(
    id: string,
    decryptionKeys: Uint8Array,
  ): Promise<IPatientResource<TID> | null>;

  /**
   * List all patient IDs currently in the local cache.
   * @returns Array of cached patient ID strings
   */
  listCachedPatientIds(): Promise<string[]>;

  /**
   * Clear all cached patient records from local storage.
   */
  clearCache(): Promise<void>;

  /**
   * Get the last-synced timestamp for a specific cached patient.
   * @param patientId - The FHIR patient ID
   * @returns The last-synced Date, or null if the patient is not cached
   */
  getLastSynced(patientId: string): Promise<Date | null>;
}
