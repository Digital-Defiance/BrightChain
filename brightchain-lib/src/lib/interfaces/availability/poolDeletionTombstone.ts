/**
 * @fileoverview Pool Deletion Tombstone Interface
 *
 * Defines the interface for tracking deleted pools across the network.
 * When a pool is deleted on one node, a tombstone is propagated via gossip
 * to prevent re-creation of deleted pool data on other nodes.
 *
 * @see Requirements 2.5
 */

import { PoolId } from '../storage/pooledBlockStore';

/**
 * A time-limited record indicating that a pool has been deleted.
 * Propagated via gossip to prevent re-creation of deleted pool data.
 *
 * @see Requirements 2.5, 2.6
 */
export interface IPoolDeletionTombstone {
  /** The deleted pool's ID */
  poolId: PoolId;

  /** When the deletion was recorded */
  deletedAt: Date;

  /** When this tombstone expires (after which the pool ID can be reused) */
  expiresAt: Date;

  /** The node that originated the deletion */
  originNodeId: string;
}

/**
 * Configuration for pool deletion tombstone behavior.
 *
 * @see Requirements 2.5
 */
export interface PoolDeletionTombstoneConfig {
  /** How long tombstones persist before expiring. Default: 7 days */
  tombstoneTtlMs: number;
}

/**
 * Default tombstone configuration: 7 days TTL.
 */
export const DEFAULT_TOMBSTONE_CONFIG: PoolDeletionTombstoneConfig = {
  tombstoneTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};
