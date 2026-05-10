/**
 * Document Store Interface
 *
 * Defines the IDocumentStore interface for CRUD operations on Composition
 * and DocumentReference resources stored as encrypted blocks in a dedicated
 * BrightChain document data pool.
 *
 * @module documentation/store/documentStore
 */

import type { ICompositionResource } from '../compositionResource';
import type { IDocumentReferenceResource } from '../documentReferenceResource';

/**
 * Document data store interface for Composition and DocumentReference resources.
 *
 * Provides typed CRUD, versioning, and pool identification for clinical
 * documents stored as encrypted blocks on BrightChain.
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 */
export interface IDocumentStore<TID = string> {
  /** Encrypt and store a Composition resource, returning the new block ID */
  storeComposition(
    composition: ICompositionResource<TID>,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /** Retrieve and decrypt a Composition resource by block ID */
  retrieveComposition(
    blockId: TID,
    decryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<ICompositionResource<TID>>;

  /** Update a Composition resource, linking the new version to the previous block */
  updateComposition(
    composition: ICompositionResource<TID>,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /** Encrypt and store a DocumentReference resource, returning the new block ID */
  storeDocumentReference(
    docRef: IDocumentReferenceResource<TID>,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /** Retrieve and decrypt a DocumentReference resource by block ID */
  retrieveDocumentReference(
    blockId: TID,
    decryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<IDocumentReferenceResource<TID>>;

  /** Update a DocumentReference resource, linking the new version to the previous block */
  updateDocumentReference(
    docRef: IDocumentReferenceResource<TID>,
    encryptionKeys: Uint8Array,
    memberId: TID,
  ): Promise<TID>;

  /** Soft-delete a document resource by ID */
  delete(resourceId: string, memberId: TID): Promise<void>;

  /** Get ordered version history (block IDs) for a document resource */
  getVersionHistory(resourceId: string): Promise<TID[]>;

  /** Get the dedicated document data pool identifier */
  getPoolId(): string;
}
