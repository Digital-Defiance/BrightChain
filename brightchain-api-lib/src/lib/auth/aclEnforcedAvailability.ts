/**
 * ACL-enforced wrappers for availability services (gossip, reconciliation, discovery).
 *
 * These lightweight wrappers use the same ACLProvider interface and PermissionDeniedError
 * from the ACLEnforcedBlockStore, applying permission checks to gossip announcements,
 * reconciliation exchanges, and discovery queries.
 *
 * @see Requirements 11.5, 11.6, 11.7
 */

import { hasPermission, PoolPermission } from '@brightchain/brightchain-lib';

import { ACLProvider, PermissionDeniedError } from './aclEnforcedBlockStore';

/**
 * Filters incoming gossip announcements by checking the announcing node's
 * Write or Replicate permission in the target pool's ACL.
 *
 * @see Requirement 11.5
 */
export class ACLEnforcedGossipFilter {
  constructor(private readonly aclProvider: ACLProvider) {}

  /**
   * Check whether a gossip announcement from the given node should be accepted
   * for the given pool. The announcing node must have Write or Replicate permission.
   */
  async shouldAcceptAnnouncement(
    poolId: string,
    announcingNodeId: string,
  ): Promise<boolean> {
    const acl = await this.aclProvider.getACL(poolId);
    return (
      hasPermission(acl, announcingNodeId, PoolPermission.Write) ||
      hasPermission(acl, announcingNodeId, PoolPermission.Replicate)
    );
  }
}

/**
 * Wraps reconciliation to verify both the current node and the peer node
 * have Replicate permission in the target pool's ACL.
 *
 * @see Requirement 11.6
 */
export class ACLEnforcedReconciliation {
  constructor(
    private readonly aclProvider: ACLProvider,
    private readonly currentNodeId: string,
  ) {}

  /**
   * Verify that both the current node and the peer have Replicate permission
   * for the given pool. Throws PermissionDeniedError if either lacks permission.
   */
  async verifyReconciliationPermission(
    poolId: string,
    peerNodeId: string,
  ): Promise<void> {
    const acl = await this.aclProvider.getACL(poolId);

    if (!hasPermission(acl, this.currentNodeId, PoolPermission.Replicate)) {
      const member = acl.members.find((m) => m.nodeId === this.currentNodeId);
      throw new PermissionDeniedError(
        poolId,
        this.currentNodeId,
        PoolPermission.Replicate,
        member ? member.permissions : [],
      );
    }

    if (!hasPermission(acl, peerNodeId, PoolPermission.Replicate)) {
      const member = acl.members.find((m) => m.nodeId === peerNodeId);
      throw new PermissionDeniedError(
        poolId,
        peerNodeId,
        PoolPermission.Replicate,
        member ? member.permissions : [],
      );
    }
  }
}

/**
 * Wraps discovery to verify the querying node has Read permission
 * in the target pool's ACL.
 *
 * @see Requirement 11.7
 */
export class ACLEnforcedDiscovery {
  constructor(private readonly aclProvider: ACLProvider) {}

  /**
   * Verify that the querying node has Read permission for the given pool.
   * Throws PermissionDeniedError if the node lacks permission.
   */
  async verifyDiscoveryPermission(
    poolId: string,
    queryingNodeId: string,
  ): Promise<void> {
    const acl = await this.aclProvider.getACL(poolId);
    if (!hasPermission(acl, queryingNodeId, PoolPermission.Read)) {
      const member = acl.members.find((m) => m.nodeId === queryingNodeId);
      throw new PermissionDeniedError(
        poolId,
        queryingNodeId,
        PoolPermission.Read,
        member ? member.permissions : [],
      );
    }
  }
}
