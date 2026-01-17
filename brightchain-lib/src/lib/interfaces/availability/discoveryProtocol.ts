/**
 * @fileoverview Discovery Protocol Interface
 *
 * Defines the interface for discovering blocks across the network.
 * Supports Bloom filter pre-checks, concurrent query limiting,
 * result caching, and latency-based node preference.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { BloomFilter } from './blockRegistry';
import { ILocationRecord } from './locationRecord';

/**
 * Result of a block discovery operation.
 * Contains information about where a block was found and query statistics.
 *
 * @see Requirements 5.1, 5.4, 5.6
 */
export interface DiscoveryResult {
  /**
   * The block ID that was searched for
   */
  blockId: string;

  /**
   * Whether the block was found on any peer
   */
  found: boolean;

  /**
   * Nodes where the block was found, sorted by latency (lowest first)
   *
   * @see Requirements 5.5
   */
  locations: ILocationRecord[];

  /**
   * Number of peers that were queried during discovery
   */
  queriedPeers: number;

  /**
   * Total duration of the discovery operation in milliseconds
   */
  duration: number;
}

/**
 * Result of querying a single peer for a block.
 *
 * @see Requirements 5.3
 */
export interface PeerQueryResult {
  /**
   * The peer that was queried
   */
  peerId: string;

  /**
   * Whether the peer has the block
   */
  hasBlock: boolean;

  /**
   * Round-trip latency to the peer in milliseconds
   */
  latencyMs: number;

  /**
   * Error message if the query failed
   */
  error?: string;
}

/**
 * Configuration for the discovery protocol.
 *
 * @see Requirements 5.7, 13.1, 13.2, 13.3
 */
export interface DiscoveryConfig {
  /**
   * Timeout for discovery queries in milliseconds.
   * Queries that exceed this timeout will be cancelled.
   *
   * @see Requirements 5.7, 13.1
   */
  queryTimeoutMs: number;

  /**
   * Maximum number of concurrent queries to peers.
   * Limits resource usage during discovery.
   *
   * @see Requirements 13.2
   */
  maxConcurrentQueries: number;

  /**
   * Time-to-live for cached discovery results in milliseconds.
   * Cached results older than this will be refreshed.
   *
   * @see Requirements 5.8
   */
  cacheTtlMs: number;

  /**
   * Target false positive rate for Bloom filters.
   * Lower values reduce unnecessary queries but increase filter size.
   *
   * @see Requirements 4.6, 13.3
   */
  bloomFilterFalsePositiveRate: number;

  /**
   * Number of hash functions for Bloom filters.
   *
   * @see Requirements 13.3
   */
  bloomFilterHashCount: number;
}

/**
 * Default discovery configuration values.
 */
export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  queryTimeoutMs: 5000,
  maxConcurrentQueries: 10,
  cacheTtlMs: 60000,
  bloomFilterFalsePositiveRate: 0.01,
  bloomFilterHashCount: 7,
};

/**
 * Discovery Protocol Interface
 *
 * Handles finding blocks across the network using Bloom filter pre-checks,
 * concurrent query limiting, result caching, and latency-based node preference.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
export interface IDiscoveryProtocol {
  /**
   * Discover locations for a block across the network.
   *
   * The discovery process:
   * 1. Check local cache for recent results
   * 2. Query peers using Bloom filter pre-checks
   * 3. Make direct queries to peers whose Bloom filters indicate possible match
   * 4. Cache and return results sorted by latency
   *
   * @param blockId - The block ID to discover
   * @returns Promise resolving to discovery result with locations
   * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */
  discoverBlock(blockId: string): Promise<DiscoveryResult>;

  /**
   * Query a specific peer for a block.
   * Makes a direct query without Bloom filter pre-check.
   *
   * @param peerId - The peer to query
   * @param blockId - The block ID to query for
   * @returns Promise resolving to the query result
   * @see Requirements 5.3
   */
  queryPeer(peerId: string, blockId: string): Promise<PeerQueryResult>;

  /**
   * Get cached discovery results for a block.
   * Returns null if no cached results exist or if cache has expired.
   *
   * @param blockId - The block ID to get cached locations for
   * @returns Cached location records or null if not cached
   * @see Requirements 5.8
   */
  getCachedLocations(blockId: string): ILocationRecord[] | null;

  /**
   * Clear the discovery cache for a specific block.
   * Forces the next discovery to query the network.
   *
   * @param blockId - The block ID to clear from cache
   */
  clearCache(blockId: string): void;

  /**
   * Clear the entire discovery cache.
   */
  clearAllCache(): void;

  /**
   * Get the Bloom filter from a peer.
   * Used to pre-check if a peer might have a block before making a direct query.
   *
   * @param peerId - The peer to get the Bloom filter from
   * @returns Promise resolving to the peer's Bloom filter
   * @see Requirements 4.2, 5.2
   */
  getPeerBloomFilter(peerId: string): Promise<BloomFilter>;

  /**
   * Get the current configuration.
   *
   * @returns The discovery configuration
   */
  getConfig(): DiscoveryConfig;
}
