/**
 * @fileoverview Pool Discovery Service
 *
 * Discovers pools across connected peers by querying their pool lists,
 * filtering by ACL and encryption, deduplicating results, and maintaining
 * a cache of remote pool metadata updated via gossip announcements.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 8.3
 */

import {
  BlockAnnouncement,
  IPoolACL,
  IPoolDiscoveryResult,
  IPoolInfo,
  PoolPermission,
  hasPermission,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';

import { PoolACLStore } from '../auth/poolAclStore';
import { PoolEncryptionService } from '../encryption/poolEncryptionService';
import { IMemberContext } from '../middlewares/authentication';
import { IPeerProvider } from './gossipService';

/**
 * A cached entry for a remote pool discovered via gossip or direct query.
 */
export interface IRemotePoolEntry {
  poolId: string;
  blockCount: number;
  totalSize: number;
  encrypted: boolean;
  encryptedMetadata?: string;
  hostingNodes: Set<string>;
  lastUpdated: Date;
}

/**
 * Interface for querying a peer's pool list.
 * Abstracts the network call so the service can be tested without real peers.
 */
export interface IPoolQueryProvider {
  /**
   * Query a peer for its list of pools.
   * Returns pool info objects or throws on timeout/unreachable.
   */
  queryPeerPools(
    peerId: string,
    timeoutMs: number,
  ): Promise<IPoolInfo<string>[]>;
}

/**
 * Configuration for the pool discovery service.
 */
export interface PoolDiscoveryConfig {
  /** Timeout in ms for querying a single peer. Default 5000. */
  queryTimeoutMs: number;
  /** Maximum number of concurrent peer queries. Default 10. */
  maxConcurrentQueries: number;
}

const DEFAULT_POOL_DISCOVERY_CONFIG: PoolDiscoveryConfig = {
  queryTimeoutMs: 5000,
  maxConcurrentQueries: 10,
};

/**
 * Pool Discovery Service
 *
 * Discovers pools across connected peers, respecting ACL and encryption
 * constraints. Maintains a gossip-driven cache of remote pool metadata.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 8.3
 */
export class PoolDiscoveryService {
  private readonly remotePoolCache: Map<string, IRemotePoolEntry> = new Map();
  private readonly config: PoolDiscoveryConfig;

  constructor(
    private readonly peerProvider: IPeerProvider,
    private readonly _poolAclStore: PoolACLStore,
    private readonly _poolEncryptionService: PoolEncryptionService,
    private readonly poolQueryProvider: IPoolQueryProvider,
    private readonly aclLookup: (
      poolId: string,
    ) => IPoolACL<string> | undefined,
    config?: Partial<PoolDiscoveryConfig>,
  ) {
    this.config = { ...DEFAULT_POOL_DISCOVERY_CONFIG, ...config };
  }

  /**
   * Discover pools across all connected peers.
   * Queries each peer, filters by ACL and encryption, deduplicates,
   * and returns aggregated results.
   *
   * @param memberContext - The requesting member's context for ACL filtering
   * @returns Aggregated pool discovery result
   * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async discoverPools(
    memberContext: IMemberContext,
  ): Promise<IPoolDiscoveryResult<string>> {
    const connectedPeers = this.peerProvider.getConnectedPeerIds();
    const queriedPeers: string[] = [];
    const unreachablePeers: string[] = [];
    const poolMap = new Map<string, IPoolInfo<string>>();

    // Query peers with concurrency limit
    const batches = this.batchArray(
      connectedPeers,
      this.config.maxConcurrentQueries,
    );

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (peerId) => {
          const pools = await this.poolQueryProvider.queryPeerPools(
            peerId,
            this.config.queryTimeoutMs,
          );
          return { peerId, pools };
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { peerId, pools } = result.value;
          queriedPeers.push(peerId);

          for (const pool of pools) {
            const authorized = this.isPoolAuthorized(pool, memberContext);
            if (!authorized) continue;

            const existing = poolMap.get(pool.poolId);
            if (existing) {
              // Deduplicate: merge hosting nodes
              const mergedNodes = new Set([
                ...existing.hostingNodes,
                ...pool.hostingNodes,
                peerId,
              ]);
              poolMap.set(pool.poolId, {
                ...existing,
                hostingNodes: Array.from(mergedNodes),
                // Take the larger counts (more recent data)
                blockCount: Math.max(existing.blockCount, pool.blockCount),
                totalSize: Math.max(existing.totalSize, pool.totalSize),
              });
            } else {
              const hostingNodes = new Set([...pool.hostingNodes, peerId]);
              poolMap.set(pool.poolId, {
                ...pool,
                hostingNodes: Array.from(hostingNodes),
              });
            }
          }
        } else {
          // Extract peerId from the batch by index
          const index = results.indexOf(result);
          unreachablePeers.push(batch[index]);
        }
      }
    }

    return {
      pools: Array.from(poolMap.values()),
      queriedPeers,
      unreachablePeers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle an incoming pool announcement from gossip.
   * Updates the remote pool cache with the announced pool metadata.
   *
   * @param announcement - The pool announcement from gossip
   * @see Requirements 8.3
   */
  handlePoolAnnouncement(announcement: BlockAnnouncement): void {
    if (announcement.type !== 'pool_announce' || !announcement.poolId) return;

    const poolId = announcement.poolId;
    const existing = this.remotePoolCache.get(poolId);

    if (existing) {
      existing.hostingNodes.add(announcement.nodeId);
      if (announcement.poolAnnouncement) {
        existing.blockCount = announcement.poolAnnouncement.blockCount;
        existing.totalSize = announcement.poolAnnouncement.totalSize;
        existing.encrypted = announcement.poolAnnouncement.encrypted;
        existing.encryptedMetadata =
          announcement.poolAnnouncement.encryptedMetadata;
      }
      existing.lastUpdated = new Date();
    } else {
      const metadata = announcement.poolAnnouncement;
      this.remotePoolCache.set(poolId, {
        poolId,
        blockCount: metadata?.blockCount ?? 0,
        totalSize: metadata?.totalSize ?? 0,
        encrypted: metadata?.encrypted ?? false,
        encryptedMetadata: metadata?.encryptedMetadata,
        hostingNodes: new Set([announcement.nodeId]),
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Handle an incoming pool removal from gossip.
   * Removes the announcing node from the pool's hosting nodes.
   * If no hosting nodes remain, removes the pool from cache entirely.
   *
   * @param poolId - The pool being removed
   * @param nodeId - The node removing the pool
   * @see Requirements 8.3
   */
  handlePoolRemoval(poolId: string, nodeId: string): void {
    const existing = this.remotePoolCache.get(poolId);
    if (!existing) return;

    existing.hostingNodes.delete(nodeId);
    if (existing.hostingNodes.size === 0) {
      this.remotePoolCache.delete(poolId);
    }
  }

  /**
   * Get the current remote pool cache.
   */
  getRemotePoolCache(): Map<string, IRemotePoolEntry> {
    return this.remotePoolCache;
  }

  /**
   * Clear all cached pool entries for a specific peer.
   * Called when a peer disconnects.
   *
   * @param peerId - The peer whose cache entries should be cleared
   */
  clearPeerCache(peerId: string): void {
    for (const [poolId, entry] of this.remotePoolCache) {
      entry.hostingNodes.delete(peerId);
      if (entry.hostingNodes.size === 0) {
        this.remotePoolCache.delete(poolId);
      }
    }
  }

  /**
   * Check if a pool is authorized for the requesting member.
   * Admin/System members see all pools.
   * Regular users see pools where they have Read permission or the pool is public.
   * Encrypted pools without decryption keys are excluded.
   *
   * @see Requirements 7.2, 7.3
   */
  private isPoolAuthorized(
    pool: IPoolInfo<string>,
    memberContext: IMemberContext,
  ): boolean {
    // Admin/System can see all pools
    if (
      memberContext.type === MemberType.Admin ||
      memberContext.type === MemberType.System
    ) {
      return true;
    }

    // Public read pools are visible to everyone
    if (pool.publicRead) {
      return true;
    }

    // Check ACL for Read permission
    const acl = this.aclLookup(pool.poolId);
    if (
      acl &&
      hasPermission(acl, memberContext.memberId, PoolPermission.Read)
    ) {
      return true;
    }

    // Encrypted pools without access are excluded (Req 7.3)
    return false;
  }

  /**
   * Split an array into batches of a given size.
   */
  private batchArray<T>(arr: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < arr.length; i += batchSize) {
      batches.push(arr.slice(i, i + batchSize));
    }
    return batches;
  }
}
