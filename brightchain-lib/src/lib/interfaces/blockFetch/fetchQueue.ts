/**
 * @fileoverview Fetch Queue Interface
 *
 * Defines the fetch queue interface, configuration, and request types.
 * The queue manages block fetch requests with deduplication, priority ordering,
 * and configurable concurrency limits.
 *
 * @see cross-node-eventual-consistency design, Section 4
 */

import { PoolId } from '../storage/pooledBlockStore';
import { BlockFetchResult } from './blockFetcher';

/**
 * A single fetch request in the queue.
 * Tracks the block being fetched, its priority, and the promise callbacks
 * for resolving or rejecting the caller's await.
 */
export interface FetchRequest {
  /** The block checksum/ID to fetch */
  blockId: string;
  /** Optional pool scope for the fetch */
  poolId?: PoolId;
  /** Priority level — higher values are processed first */
  priority: number;
  /** Callback to resolve the caller's promise with the fetch result */
  resolve: (result: BlockFetchResult) => void;
  /** Callback to reject the caller's promise with an error */
  reject: (error: Error) => void;
  /** Timestamp (ms) when the request was enqueued */
  enqueuedAt: number;
}

/**
 * Configuration for the FetchQueue.
 */
export interface FetchQueueConfig {
  /** Maximum number of simultaneous remote fetches. Default: 5 */
  maxConcurrency: number;
  /** Maximum time in ms to wait for a single fetch before timeout. Default: 10000 */
  fetchTimeoutMs: number;
}

/** Default FetchQueue configuration values */
export const DEFAULT_FETCH_QUEUE_CONFIG: FetchQueueConfig = {
  maxConcurrency: 5,
  fetchTimeoutMs: 10000,
};

/**
 * Fetch queue interface.
 * Manages block fetch requests with deduplication (concurrent requests for the
 * same block produce a single network fetch), priority ordering, and bounded
 * concurrency.
 */
export interface IFetchQueue {
  /**
   * Enqueue a block fetch request. If a fetch for the same blockId is already
   * pending or active, the caller's promise is coalesced with the existing request.
   * @param blockId - The block checksum/ID to fetch
   * @param poolId - Optional pool scope for the fetch
   * @returns The fetch result once the block is retrieved or an error occurs
   */
  enqueue(blockId: string, poolId?: PoolId): Promise<BlockFetchResult>;

  /** Get the number of requests waiting to be processed */
  getPendingCount(): number;

  /** Get the number of fetches currently in progress */
  getActiveCount(): number;

  /**
   * Cancel all pending and active fetch requests.
   * All waiting callers receive a rejection with the given reason.
   * @param reason - Description of why requests are being cancelled
   */
  cancelAll(reason: string): void;

  /** Get the current queue configuration */
  getConfig(): FetchQueueConfig;
}
