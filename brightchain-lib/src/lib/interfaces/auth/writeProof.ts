/**
 * @fileoverview Write Proof interface for BrightDB
 *
 * Defines the cryptographic proof structure that accompanies
 * head registry mutations in Restricted_Mode and Owner_Only_Mode.
 * The signature is computed over SHA-256(dbName + ":" + collectionName + ":" + blockId).
 *
 * @see BrightDB Write ACLs design, IWriteProof section
 * @see Requirements 10.2
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Cryptographic proof authorizing a head registry write.
 *
 * Submitted alongside head registry mutations (setHead, removeHead,
 * mergeHeadUpdate) to prove the requester is an Authorized_Writer
 * or the database/collection creator.
 *
 * The signature covers the concatenation of dbName, collectionName,
 * and blockId, ensuring the proof is bound to a specific write operation.
 *
 * Uses the generic TID pattern for frontend/backend DTO compatibility,
 * consistent with IPoolACL<TId>, MemberDocument<TID>, etc.
 *
 * @template TID - Platform ID type (Uint8Array for backend, string for frontend)
 * @see Requirements 10.2
 */
export interface IWriteProof<TID extends PlatformID = Uint8Array> {
  signerPublicKey: TID;
  signature: Uint8Array; // ECDSA signature over (dbName + ":" + collectionName + ":" + blockId)
  dbName: string;
  collectionName: string;
  blockId: string;
}
