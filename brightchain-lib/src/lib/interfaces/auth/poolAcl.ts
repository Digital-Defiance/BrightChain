import { PoolId } from '../storage/pooledBlockStore';

/**
 * Permission levels for pool access control.
 *
 * @see Requirements 10.1, 10.2
 */
export enum PoolPermission {
  Read = 'read',
  Write = 'write',
  Replicate = 'replicate',
  Admin = 'admin',
}

/**
 * A member entry in a pool ACL.
 * Generic TId for DTO flexibility (string for frontend, Uint8Array for backend).
 *
 * @see Requirement 11.2
 */
export interface IPoolACLMember<TId = string> {
  nodeId: TId;
  permissions: PoolPermission[];
  addedAt: Date;
  addedBy: TId;
}

/**
 * Pool Access Control List.
 * Stored as a signed document in the block store.
 *
 * @see Requirements 11.2, 11.3
 */
export interface IPoolACL<TId = string> {
  poolId: PoolId;
  owner: TId;
  members: IPoolACLMember<TId>[];
  publicRead: boolean;
  publicWrite: boolean;
  /** Block ID of the previous ACL version (for audit chain) */
  previousAclBlockId?: string;
  /** Signatures from admins who approved this ACL version */
  approvalSignatures: Array<{
    nodeId: TId;
    signature: Uint8Array;
  }>;
  /** Version number, incremented on each update */
  version: number;
  /** Timestamp of this ACL version */
  updatedAt: Date;
}

/**
 * Check if a node has a specific permission in a pool ACL.
 * Admin permission implies all other permissions.
 * Public flags grant access to non-members for Read/Write.
 *
 * @see Requirements 10.1, 10.5, 12.5, 12.6
 */
export function hasPermission<TId>(
  acl: IPoolACL<TId>,
  nodeId: TId,
  permission: PoolPermission,
): boolean {
  const member = acl.members.find((m) => m.nodeId === nodeId);
  if (!member) {
    if (permission === PoolPermission.Read && acl.publicRead) return true;
    if (permission === PoolPermission.Write && acl.publicWrite) return true;
    return false;
  }
  if (member.permissions.includes(PoolPermission.Admin)) return true;
  return member.permissions.includes(permission);
}

/**
 * Check if a quorum of admins have signed an ACL update.
 * Single-admin mode: no quorum required (always returns true).
 * Multi-admin: requires signatures from more than 50% of admins.
 *
 * @see Requirements 13.1, 13.2
 */
export function hasQuorum<TId>(acl: IPoolACL<TId>): boolean {
  const adminCount = acl.members.filter((m) =>
    m.permissions.includes(PoolPermission.Admin),
  ).length;
  if (adminCount <= 1) return true;
  const signatureCount = acl.approvalSignatures.length;
  return signatureCount > adminCount / 2;
}
