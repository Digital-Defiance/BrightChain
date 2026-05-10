/**
 * Patient Store Interface
 *
 * Defines the IPatientStore interface for persisting encrypted Patient
 * resources as blocks in a dedicated BrightChain pool.
 *
 * @see Requirement 6: Decentralized Storage on BrightChain
 * @module stores/patientStore
 */

import type { IPatientResource } from '../fhir/patientResource';

/**
 * Interface for storing and retrieving encrypted patient records
 * in a dedicated BrightChain pool.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IPatientStore<TID = string> {
  /**
   * Encrypt and store a patient resource, returning the block ID.
   * @param patient - The patient resource to store
   * @param encryptionKeys - ECIES encryption keys
   * @returns The block ID of the stored encrypted block
   */
  store(
    patient: IPatientResource<TID>,
    encryptionKeys: Uint8Array,
  ): Promise<TID>;

  /**
   * Retrieve and decrypt a patient resource by block ID.
   * @param blockId - The block ID to retrieve
   * @param decryptionKeys - ECIES decryption keys
   * @returns The decrypted patient resource
   */
  retrieve(
    blockId: TID,
    decryptionKeys: Uint8Array,
  ): Promise<IPatientResource<TID>>;

  /**
   * Get the version history (list of block IDs) for a patient.
   * @param patientId - The FHIR patient ID
   * @returns Array of block IDs ordered by version
   */
  getVersionHistory(patientId: string): Promise<TID[]>;

  /**
   * Get the pool ID for the patient data pool.
   * @returns The pool identifier string
   */
  getPoolId(): string;
}
