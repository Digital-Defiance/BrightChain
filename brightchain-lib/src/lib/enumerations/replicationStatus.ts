/**
 * ReplicationStatus tracks the replication state of a block across nodes.
 *
 * Blocks can be replicated to multiple nodes for availability and fault tolerance.
 * This enum tracks whether a block has met its target replication factor.
 */
export enum ReplicationStatus {
  /**
   * Block has not yet been replicated to any remote nodes.
   * This is the initial state for newly stored blocks.
   */
  Pending = 'pending',

  /**
   * Block has been replicated to enough nodes to meet the target replication factor.
   * The block is considered fully available and fault-tolerant.
   */
  Replicated = 'replicated',

  /**
   * Block was previously replicated but now has fewer replicas than the target.
   * This can occur when replica nodes become unavailable.
   * The block should be re-replicated to restore fault tolerance.
   */
  UnderReplicated = 'under_replicated',

  /**
   * Replication of the block has failed.
   * This may occur due to network issues or lack of available nodes.
   * Manual intervention may be required.
   */
  Failed = 'failed',
}

/**
 * Default replication status for new blocks
 */
export const DefaultReplicationStatus = ReplicationStatus.Pending;

/**
 * Check if a block needs replication attention
 * @param status - The replication status to check
 * @returns True if the block needs replication work
 */
export function needsReplicationAttention(status: ReplicationStatus): boolean {
  return (
    status === ReplicationStatus.Pending ||
    status === ReplicationStatus.UnderReplicated ||
    status === ReplicationStatus.Failed
  );
}

export default ReplicationStatus;
