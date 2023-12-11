/**
 * @fileoverview Write ACL interfaces for BrightDB
 *
 * Defines the core ACL data structures for controlling write access
 * to the head registry at database and collection level.
 *
 * @see BrightDB Write ACLs design, IWriteAcl section
 * @see Requirements 10.1
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { WriteMode } from '../../enumerations/writeMode';

/**
 * Scope at which a Write ACL applies.
 *
 * - Database-level: all collections inherit the ACL.
 * - Collection-level: overrides the database-level ACL for a specific collection.
 */
export interface IAclScope {
  dbName: string;
  collectionName?: string; // undefined = database-level scope
}

/**
 * Core Write ACL data structure.
 *
 * Controls which members are authorized to update the head registry
 * for a given database or collection.
 *
 * Uses the generic TID pattern for frontend/backend DTO compatibility,
 * consistent with IPoolACL<TId>, MemberDocument<TID>, etc.
 *
 * @template TID - Platform ID type (Uint8Array for backend, string for frontend)
 * @see Requirements 10.1
 */
export interface IWriteAcl<TID extends PlatformID = Uint8Array> {
  writeMode: WriteMode;
  authorizedWriters: TID[];
  aclAdministrators: TID[];
  scope: IAclScope;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  creatorPublicKey: TID;
}
