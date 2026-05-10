/**
 * Clinical Store Interface
 *
 * Defines the IClinicalStore interface for CRUD operations on clinical
 * resources stored as encrypted blocks in a dedicated BrightChain pool.
 *
 * @module clinical/store/clinicalStore
 */

import type { ClinicalResource } from '../resources/index';

/**
 * Generic clinical data store interface.
 *
 * Provides CRUD, versioning, and pool identification for clinical resources
 * stored as encrypted blocks on BrightChain.
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @typeParam TResource - The clinical resource type being stored
 */
export interface IClinicalStore<
  TID = string,
  TResource extends ClinicalResource<TID> = ClinicalResource<TID>,
> {
  /** Encrypt and store a clinical resource, returning the new block ID */
  store(
    resource: TResource,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /** Retrieve and decrypt a clinical resource by block ID */
  retrieve(
    blockId: TID,
    decryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TResource>;

  /** Update a clinical resource, linking the new version to the previous block */
  update(
    resource: TResource,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /** Soft-delete a clinical resource by ID */
  delete(resourceId: string, memberId: TID): Promise<void>;

  /** Get ordered version history (block IDs) for a resource */
  getVersionHistory(resourceId: string): Promise<TID[]>;

  /** Get the dedicated clinical data pool identifier */
  getPoolId(): string;
}
