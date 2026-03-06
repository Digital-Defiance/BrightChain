/**
 * @fileoverview ACL Document interface for BrightDB
 *
 * Defines the signed, versioned ACL document structure stored in the
 * block store. Extends IWriteAcl with block-store metadata for
 * persistence, signature verification, and version chaining.
 *
 * @see BrightDB Write ACLs design, IAclDocument section
 * @see Requirements 10.5
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IWriteAcl } from './writeAcl';

/**
 * Signed, versioned ACL document stored in the block store.
 *
 * Extends the core Write ACL data structure with block-store metadata:
 * a document ID (block ID), the creating/modifying administrator's
 * signature, and an optional link to the previous version for
 * version chaining and auditability.
 *
 * Uses the generic TID pattern for frontend/backend DTO compatibility,
 * consistent with IPoolACL<TId>, MemberDocument<TID>, etc.
 *
 * @template TID - Platform ID type (Uint8Array for backend, string for frontend)
 * @see Requirements 10.5
 */
export interface IAclDocument<TID extends PlatformID = Uint8Array>
  extends IWriteAcl<TID> {
  documentId: string; // block ID in the block store
  creatorSignature: Uint8Array; // signature of the creating/modifying admin
  previousVersionBlockId?: string; // chain to previous version
}
