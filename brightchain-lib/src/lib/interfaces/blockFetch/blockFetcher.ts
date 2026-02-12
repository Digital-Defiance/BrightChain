/**
 * @fileoverview Block Fetcher Interface
 *
 * Defines the block fetcher service interface, configuration, and result types.
 * The fetcher retrieves block data from remote nodes with checksum verification,
 * retry logic, node health tracking, and pool-scoped storage.
 *
 * @see cross-node-eventual-consistency design, Section 3
 */

import { PoolId } from '../storage/pooledBlockStore';

/**
 * Result of a block fetch attempt, including per-node attempt details.
 */
export interface BlockFetchResult {
  /** Whether the fetch was successful */
  success: boolean;
  /** The fetched block data (present when success is true) */
  data?: Uint8Array;
  /** Error message if the fetch failed */
  error?: string;
  /** Details of each node attempted during the fetch */
  attemptedNodes: Array<{ nodeId: string; error?: string }>;
}

/**
 * Configuration for the BlockFetcher service.
 */
export interface BlockFetcherConfig {
  /** Maximum time in ms to wait for a single fetch operation. Default: 10000 */
  fetchTimeoutMs: number;
  /** Maximum number of retries per node. Default: 3 */
  maxRetries: number;
  /** Base delay in ms for exponential backoff between retries. Default: 500 */
  retryBaseDelayMs: number;
  /** Time in ms to exclude a failed node from candidate lists. Default: 60000 */
  nodeCooldownMs: number;
  /** Whether to proactively fetch blocks announced via gossip. Default: false */
  proactiveFetchEnabled: boolean;
  /** Time in ms to wait before returning PendingBlockError for Available concern. Default: 200 */
  initialWaitMs: number;
}

/** Default BlockFetcher configuration values */
export const DEFAULT_BLOCK_FETCHER_CONFIG: BlockFetcherConfig = {
  fetchTimeoutMs: 10000,
  maxRetries: 3,
  retryBaseDelayMs: 500,
  nodeCooldownMs: 60000,
  proactiveFetchEnabled: false,
  initialWaitMs: 200,
};

/**
 * Block fetcher service interface.
 * Retrieves block data from remote nodes with checksum verification,
 * retry logic, and node health tracking.
 */
export interface IBlockFetcher {
  /**
   * Fetch a block from remote nodes.
   * @param blockId - The block checksum/ID to fetch
   * @param poolId - Optional pool scope; when provided, the fetched block
   *                 is stored in the specified pool and its metadata is validated
   * @returns The fetch result with data and attempt details
   */
  fetchBlock(blockId: string, poolId?: PoolId): Promise<BlockFetchResult>;

  /** Check if a node is currently available (not in cooldown) */
  isNodeAvailable(nodeId: string): boolean;

  /** Mark a node as unavailable (enters cooldown period) */
  markNodeUnavailable(nodeId: string): void;

  /** Get the current configuration */
  getConfig(): BlockFetcherConfig;

  /** Start the fetcher (e.g., subscribe to gossip announcements) */
  start(): void;

  /** Stop the fetcher and clean up resources */
  stop(): void;
}
