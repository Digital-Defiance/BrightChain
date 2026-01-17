/* eslint-disable @nx/enforce-module-boundaries */
/**
 * @fileoverview Discovery Protocol Implementation
 *
 * Implements block discovery across the network using Bloom filter pre-checks,
 * concurrent query limiting, result caching, and latency-based node preference.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import {
  BloomFilter,
  DiscoveryConfig,
  DiscoveryResult,
  IDiscoveryProtocol,
  ILocationRecord,
  PeerQueryResult,
} from '@brightchain/brightchain-lib';

// Re-export DEFAULT_DISCOVERY_CONFIG from brightchain-lib for convenience
export { DEFAULT_DISCOVERY_CONFIG } from '@brightchain/brightchain-lib';

/**
 * Default discovery configuration values (local copy for use in this module).
 */
const defaultDiscoveryConfig: DiscoveryConfig = {
  queryTimeoutMs: 5000,
  maxConcurrentQueries: 10,
  cacheTtlMs: 60000,
  bloomFilterFalsePositiveRate: 0.01,
  bloomFilterHashCount: 7,
};

/**
 * Cached discovery entry with timestamp for TTL management.
 */
interface CacheEntry {
  locations: ILocationRecord[];
  cachedAt: number;
}

/**
 * Interface for peer network operations.
 * Abstracts network communication for discovery queries.
 */
export interface IPeerNetworkProvider {
  /**
   * Get all connected peer IDs.
   */
  getConnectedPeerIds(): string[];

  /**
   * Get the Bloom filter from a peer.
   *
   * @param peerId - The peer to get the Bloom filter from
   * @returns Promise resolving to the peer's Bloom filter
   */
  getPeerBloomFilter(peerId: string): Promise<BloomFilter>;

  /**
   * Query a peer for a specific block.
   *
   * @param peerId - The peer to query
   * @param blockId - The block ID to query for
   * @param timeoutMs - Query timeout in milliseconds
   * @returns Promise resolving to whether the peer has the block
   */
  queryPeerForBlock(
    peerId: string,
    blockId: string,
    timeoutMs: number,
  ): Promise<boolean>;
}

/**
 * Discovery Protocol Implementation
 *
 * Handles finding blocks across the network using:
 * - Bloom filter pre-checks to avoid unnecessary queries
 * - Concurrent query limiting to manage resources
 * - Result caching with TTL to reduce network traffic
 * - Latency-based node preference for optimal retrieval
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
export class DiscoveryProtocol implements IDiscoveryProtocol {
  /**
   * Cache of discovery results with TTL management.
   */
  private readonly cache: Map<string, CacheEntry> = new Map();

  /**
   * Cache of peer Bloom filters.
   */
  private readonly bloomFilterCache: Map<string, BloomFilter> = new Map();

  /**
   * Create a new DiscoveryProtocol.
   *
   * @param networkProvider - Provider for peer network operations
   * @param config - Discovery configuration (uses defaults if not provided)
   */
  constructor(
    private readonly networkProvider: IPeerNetworkProvider,
    private readonly config: DiscoveryConfig = defaultDiscoveryConfig,
  ) {}

  /**
   * Discover locations for a block across the network.
   *
   * @param blockId - The block ID to discover
   * @returns Promise resolving to discovery result with locations
   * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async discoverBlock(blockId: string): Promise<DiscoveryResult> {
    const startTime = Date.now();

    // Check cache first
    const cachedLocations = this.getCachedLocations(blockId);
    if (cachedLocations !== null) {
      return {
        blockId,
        found: cachedLocations.length > 0,
        locations: cachedLocations,
        queriedPeers: 0,
        duration: Date.now() - startTime,
      };
    }

    // Get connected peers
    const connectedPeers = this.networkProvider.getConnectedPeerIds();
    if (connectedPeers.length === 0) {
      return {
        blockId,
        found: false,
        locations: [],
        queriedPeers: 0,
        duration: Date.now() - startTime,
      };
    }

    // Filter peers using Bloom filters
    const peersToQuery = await this.filterPeersWithBloomFilters(
      connectedPeers,
      blockId,
    );

    // Query peers with concurrency limiting
    const queryResults = await this.queryPeersWithConcurrencyLimit(
      peersToQuery,
      blockId,
    );

    // Build location records from successful queries
    const locations = this.buildLocationRecords(queryResults);

    // Sort by latency (lowest first)
    locations.sort(
      (a, b) => (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity),
    );

    // Cache the results
    this.cacheResults(blockId, locations);

    return {
      blockId,
      found: locations.length > 0,
      locations,
      queriedPeers: queryResults.length,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Query a specific peer for a block.
   *
   * @param peerId - The peer to query
   * @param blockId - The block ID to query for
   * @returns Promise resolving to the query result
   * @see Requirements 5.3
   */
  async queryPeer(peerId: string, blockId: string): Promise<PeerQueryResult> {
    const startTime = Date.now();

    try {
      const hasBlock = await this.networkProvider.queryPeerForBlock(
        peerId,
        blockId,
        this.config.queryTimeoutMs,
      );

      return {
        peerId,
        hasBlock,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        peerId,
        hasBlock: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cached discovery results for a block.
   *
   * @param blockId - The block ID to get cached locations for
   * @returns Cached location records or null if not cached or expired
   * @see Requirements 5.8
   */
  getCachedLocations(blockId: string): ILocationRecord[] | null {
    const entry = this.cache.get(blockId);
    if (!entry) {
      return null;
    }

    // Check if cache has expired
    const age = Date.now() - entry.cachedAt;
    if (age > this.config.cacheTtlMs) {
      this.cache.delete(blockId);
      return null;
    }

    return [...entry.locations];
  }

  /**
   * Clear the discovery cache for a specific block.
   *
   * @param blockId - The block ID to clear from cache
   */
  clearCache(blockId: string): void {
    this.cache.delete(blockId);
  }

  /**
   * Clear the entire discovery cache.
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get the Bloom filter from a peer.
   *
   * @param peerId - The peer to get the Bloom filter from
   * @returns Promise resolving to the peer's Bloom filter
   * @see Requirements 4.2, 5.2
   */
  async getPeerBloomFilter(peerId: string): Promise<BloomFilter> {
    // Check cache first
    const cached = this.bloomFilterCache.get(peerId);
    if (cached) {
      return cached;
    }

    // Fetch from network
    const filter = await this.networkProvider.getPeerBloomFilter(peerId);

    // Cache the filter
    this.bloomFilterCache.set(peerId, filter);

    return filter;
  }

  /**
   * Get the current configuration.
   *
   * @returns The discovery configuration
   */
  getConfig(): DiscoveryConfig {
    return { ...this.config };
  }

  /**
   * Clear the Bloom filter cache for a specific peer.
   *
   * @param peerId - The peer to clear from cache
   */
  clearBloomFilterCache(peerId: string): void {
    this.bloomFilterCache.delete(peerId);
  }

  /**
   * Clear all Bloom filter caches.
   */
  clearAllBloomFilterCache(): void {
    this.bloomFilterCache.clear();
  }

  /**
   * Filter peers using their Bloom filters.
   * Only returns peers whose Bloom filters indicate they might have the block.
   *
   * @param peerIds - Peers to filter
   * @param blockId - Block ID to check
   * @returns Peers that might have the block
   * @see Requirements 4.3, 4.4, 4.5, 5.2
   */
  private async filterPeersWithBloomFilters(
    peerIds: string[],
    blockId: string,
  ): Promise<string[]> {
    const peersToQuery: string[] = [];

    // Check each peer's Bloom filter
    const filterPromises = peerIds.map(async (peerId) => {
      try {
        const filter = await this.getPeerBloomFilter(peerId);
        // If Bloom filter says block might exist, include peer
        if (filter.mightContain(blockId)) {
          return peerId;
        }
        // Bloom filter says block definitely doesn't exist, skip peer
        return null;
      } catch {
        // If we can't get the Bloom filter, include peer to be safe
        return peerId;
      }
    });

    const results = await Promise.all(filterPromises);
    for (const peerId of results) {
      if (peerId !== null) {
        peersToQuery.push(peerId);
      }
    }

    return peersToQuery;
  }

  /**
   * Query peers with concurrency limiting.
   *
   * @param peerIds - Peers to query
   * @param blockId - Block ID to query for
   * @returns Query results from all peers
   * @see Requirements 5.3, 13.2
   */
  private async queryPeersWithConcurrencyLimit(
    peerIds: string[],
    blockId: string,
  ): Promise<PeerQueryResult[]> {
    const results: PeerQueryResult[] = [];
    const pending: Promise<void>[] = [];
    let index = 0;

    const queryNext = async (): Promise<void> => {
      while (index < peerIds.length) {
        const currentIndex = index++;
        const peerId = peerIds[currentIndex];

        const result = await this.queryPeer(peerId, blockId);
        results.push(result);
      }
    };

    // Start up to maxConcurrentQueries parallel query chains
    const concurrency = Math.min(
      this.config.maxConcurrentQueries,
      peerIds.length,
    );
    for (let i = 0; i < concurrency; i++) {
      pending.push(queryNext());
    }

    await Promise.all(pending);

    return results;
  }

  /**
   * Build location records from query results.
   *
   * @param queryResults - Results from peer queries
   * @returns Location records for peers that have the block
   * @see Requirements 5.4
   */
  private buildLocationRecords(
    queryResults: PeerQueryResult[],
  ): ILocationRecord[] {
    const locations: ILocationRecord[] = [];

    for (const result of queryResults) {
      if (result.hasBlock && !result.error) {
        locations.push({
          nodeId: result.peerId,
          lastSeen: new Date(),
          isAuthoritative: false, // Remote copies are not authoritative
          latencyMs: result.latencyMs,
        });
      }
    }

    return locations;
  }

  /**
   * Cache discovery results.
   *
   * @param blockId - Block ID to cache
   * @param locations - Location records to cache
   */
  private cacheResults(blockId: string, locations: ILocationRecord[]): void {
    this.cache.set(blockId, {
      locations: [...locations],
      cachedAt: Date.now(),
    });
  }
}
