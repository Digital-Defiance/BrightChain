/**
 * @fileoverview Capability Token interface for BrightDB
 *
 * Defines the time-limited, scope-limited token structure that grants
 * temporary write access to a member not on the permanent ACL.
 * The grantor signature is computed over
 * SHA-256(granteePublicKey + ":" + dbName + ":" + collectionName + ":" + expiresAt.toISOString()).
 *
 * @see BrightDB Write ACLs design, ICapabilityToken section
 * @see Requirements 10.3
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IAclScope } from './writeAcl';

/**
 * Time-limited token granting temporary write access.
 *
 * Issued by an ACL_Administrator to grant a member temporary write
 * access to a specific database or collection without permanently
 * modifying the Write ACL. The token is validated by verifying the
 * grantor's signature and checking the expiration timestamp.
 *
 * Uses the generic TID pattern for frontend/backend DTO compatibility,
 * consistent with IPoolACL<TId>, MemberDocument<TID>, etc.
 *
 * @template TID - Platform ID type (Uint8Array for backend, string for frontend)
 * @see Requirements 10.3
 */
export interface ICapabilityToken<TID extends PlatformID = Uint8Array> {
  granteePublicKey: TID;
  scope: IAclScope;
  expiresAt: Date;
  grantorSignature: Uint8Array;
  grantorPublicKey: TID;
}
