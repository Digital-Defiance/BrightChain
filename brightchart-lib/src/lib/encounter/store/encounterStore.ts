/**
 * Encounter Store Interface
 *
 * Defines the IEncounterStore interface for CRUD operations on encounter
 * resources stored as encrypted blocks in a dedicated BrightChain pool.
 * Follows the IClinicalStore pattern from Module 2.
 *
 * @see Requirement 5: Encounter Data Store
 * @module encounter/store/encounterStore
 */

import type { IEncounterResource } from '../encounterResource';

/**
 * Interface for storing and retrieving encrypted encounter records
 * in a dedicated BrightChain pool, separate from the Patient_Store
 * and Clinical_Store pools.
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 */
export interface IEncounterStore<TID = string> {
  /**
   * Encrypt and store an encounter resource, returning the new block ID.
   *
   * Validates that the patient reference (subject field) contains a valid
   * IPatientResource.id that exists in the Patient_Store. Returns a FHIR
   * OperationOutcome with severity "error" and code "not-found" if the
   * patient reference is invalid.
   *
   * @param encounter - The encounter resource to store
   * @param encryptionKeys - ECIES encryption keys
   * @param memberId - The BrightChain member performing the operation
   * @returns The block ID of the stored encrypted block
   */
  store(
    encounter: IEncounterResource<TID>,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /**
   * Retrieve and decrypt an encounter resource by block ID.
   *
   * @param blockId - The block ID to retrieve
   * @param decryptionKeys - ECIES decryption keys
   * @param memberId - The BrightChain member performing the operation
   * @returns The decrypted encounter resource
   */
  retrieve(
    blockId: TID,
    decryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<IEncounterResource<TID>>;

  /**
   * Update an encounter resource, storing a new version block linked
   * to the previous version's block ID for version history.
   *
   * @param encounter - The updated encounter resource
   * @param encryptionKeys - ECIES encryption keys
   * @param memberId - The BrightChain member performing the operation
   * @returns The block ID of the new version block
   */
  update(
    encounter: IEncounterResource<TID>,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /**
   * Soft-delete an encounter resource by ID.
   *
   * @param encounterId - The FHIR encounter ID to delete
   * @param memberId - The BrightChain member performing the operation
   */
  delete(encounterId: string, memberId: TID): Promise<void>;

  /**
   * Get the ordered version history (block IDs) for an encounter.
   *
   * @param encounterId - The FHIR encounter ID
   * @returns Array of block IDs ordered by version
   */
  getVersionHistory(encounterId: string): Promise<TID[]>;

  /**
   * Get the dedicated encounter data pool identifier.
   *
   * @returns The pool identifier string
   */
  getPoolId(): string;
}
