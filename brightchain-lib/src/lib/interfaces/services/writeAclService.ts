/**
 * @fileoverview Write ACL Service interface for BrightDB
 *
 * Defines the platform-agnostic service interface for ACL operations,
 * including write mode queries, ACL document retrieval, write proof
 * verification, capability token validation, and membership checks.
 *
 * @see BrightDB Write ACLs design, IWriteAclService section
 * @see Requirements 10.1, 10.2, 10.3
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { WriteMode } from '../../enumerations/writeMode';
import { IAclDocument } from '../auth/aclDocument';
import { ICapabilityToken } from '../auth/capabilityToken';
import { IWriteProof } from '../auth/writeProof';

/**
 * Platform-agnostic service interface for Write ACL operations.
 *
 * Provides query and verification methods used by the head registry
 * authorization layer (AuthorizedHeadRegistry) to enforce write access
 * control. Implementations manage ACL state, resolve scoped ACLs,
 * and verify cryptographic proofs and capability tokens.
 *
 * Uses the generic TID pattern for frontend/backend DTO compatibility,
 * consistent with IPoolACL<TId>, MemberDocument<TID>, etc.
 *
 * @template TID - Platform ID type (Uint8Array for backend, string for frontend)
 * @see Requirements 10.1, 10.2, 10.3
 */
export interface IWriteAclService<TID extends PlatformID = Uint8Array> {
  /**
   * Get the effective write mode for a database or collection.
   *
   * Resolves the ACL scope: collection-level overrides database-level.
   * Returns Open mode if no ACL is configured.
   *
   * @param dbName - The database name
   * @param collectionName - Optional collection name for collection-level scope
   * @returns The effective WriteMode for the given scope
   */
  getWriteMode(dbName: string, collectionName?: string): WriteMode;

  /**
   * Retrieve the active ACL document for a database or collection.
   *
   * Returns undefined if no ACL document exists for the given scope,
   * which implies Open mode.
   *
   * @param dbName - The database name
   * @param collectionName - Optional collection name for collection-level scope
   * @returns The active ACL document, or undefined if none is configured
   */
  getAclDocument(
    dbName: string,
    collectionName?: string,
  ): IAclDocument<TID> | undefined;

  /**
   * Verify a write proof against the active ACL for a specific write operation.
   *
   * Checks that the signature in the proof verifies against the signer's
   * public key over SHA-256(dbName + ":" + collectionName + ":" + blockId),
   * and that the signer is an authorized writer in the active ACL.
   *
   * @param proof - The write proof to verify
   * @param dbName - The target database name
   * @param collectionName - The target collection name
   * @param blockId - The block ID being written as the new head
   * @returns True if the proof is valid and the signer is authorized
   */
  verifyWriteProof(
    proof: IWriteProof<TID>,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<boolean>;

  /**
   * Verify a capability token for temporary write access.
   *
   * Checks that the grantor's signature is valid, the token has not
   * expired, and the grantor is a current ACL administrator.
   *
   * @param token - The capability token to verify
   * @returns True if the token is valid and not expired
   */
  verifyCapabilityToken(token: ICapabilityToken<TID>): Promise<boolean>;

  /**
   * Check whether a public key belongs to an authorized writer
   * for the given database or collection scope.
   *
   * @param publicKey - The public key to check
   * @param dbName - The database name
   * @param collectionName - Optional collection name for collection-level scope
   * @returns True if the public key is in the authorized writers list
   */
  isAuthorizedWriter(
    publicKey: TID,
    dbName: string,
    collectionName?: string,
  ): boolean;

  /**
   * Check whether a public key belongs to an ACL administrator
   * for the given database or collection scope.
   *
   * @param publicKey - The public key to check
   * @param dbName - The database name
   * @param collectionName - Optional collection name for collection-level scope
   * @returns True if the public key is in the ACL administrators list
   */
  isAclAdministrator(
    publicKey: TID,
    dbName: string,
    collectionName?: string,
  ): boolean;
}
