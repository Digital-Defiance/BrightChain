/**
 * ACL-enforced block store wrapper.
 *
 * Wraps an IPooledBlockStore and checks ACL permissions before delegating
 * pool-scoped operations (get, put, delete). This is a lightweight middleware
 * pattern — it only wraps the key operations that need ACL checks.
 *
 * @see Requirements 11.4, 10.3, 10.4
 */

import type {
  BlockStoreOptions,
  IPoolACL,
  IPooledBlockStore,
  PoolId,
} from '@brightchain/brightchain-lib';
import { hasPermission, PoolPermission } from '@brightchain/brightchain-lib';

/**
 * Error thrown when a node lacks the required permission for a pool operation.
 * Includes the required permission, actual permissions, pool ID, and node ID
 * for diagnostic purposes.
 *
 * @see Requirement 10.6
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly poolId: string,
    public readonly nodeId: string,
    public readonly requiredPermission: PoolPermission,
    public readonly actualPermissions: PoolPermission[],
  ) {
    super(
      `Permission denied: ${requiredPermission} required for pool ${poolId}, node ${nodeId} has [${actualPermissions.join(', ')}]`,
    );
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Provider interface for retrieving the ACL for a given pool.
 * Implementations may load ACLs from the block store, cache, or any other source.
 */
export interface ACLProvider {
  getACL(poolId: string): Promise<IPoolACL<string>>;
}

/**
 * Lightweight wrapper around an IPooledBlockStore that enforces ACL permissions
 * before delegating pool-scoped operations.
 *
 * - getFromPool: requires Read permission
 * - putInPool: requires Write permission
 * - deleteFromPool: requires Write permission
 *
 * @see Requirements 11.4, 10.3, 10.4
 */
export class ACLEnforcedBlockStore {
  constructor(
    private readonly inner: IPooledBlockStore,
    private readonly aclProvider: ACLProvider,
    private readonly currentNodeId: string,
  ) {}

  /**
   * Retrieve a block from a pool after verifying Read permission.
   */
  async getFromPool(pool: PoolId, hash: string): Promise<Uint8Array> {
    await this.checkPermission(pool, PoolPermission.Read);
    return this.inner.getFromPool(pool, hash);
  }

  /**
   * Store a block in a pool after verifying Write permission.
   */
  async putInPool(
    pool: PoolId,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<string> {
    await this.checkPermission(pool, PoolPermission.Write);
    return this.inner.putInPool(pool, data, options);
  }

  /**
   * Delete a block from a pool after verifying Write permission.
   */
  async deleteFromPool(pool: PoolId, hash: string): Promise<void> {
    await this.checkPermission(pool, PoolPermission.Write);
    return this.inner.deleteFromPool(pool, hash);
  }

  /**
   * Check that the current node has the required permission for the given pool.
   * Throws PermissionDeniedError if the permission check fails.
   */
  private async checkPermission(
    poolId: string,
    required: PoolPermission,
  ): Promise<void> {
    const acl = await this.aclProvider.getACL(poolId);
    if (!hasPermission(acl, this.currentNodeId, required)) {
      const member = acl.members.find((m) => m.nodeId === this.currentNodeId);
      const actual = member ? member.permissions : [];
      throw new PermissionDeniedError(
        poolId,
        this.currentNodeId,
        required,
        actual,
      );
    }
  }
}
