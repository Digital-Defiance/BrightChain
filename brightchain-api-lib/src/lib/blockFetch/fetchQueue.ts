/**
 * @fileoverview FetchQueue Implementation
 *
 * Priority queue with deduplication for remote block fetch requests.
 * - Coalesces concurrent requests for the same blockId into a single fetch
 * - Bounds concurrency to maxConcurrency simultaneous fetches
 * - Orders pending fetches by waiter count (more waiters = higher priority)
 * - Enforces per-request timeout with cancellation for all waiters
 *
 * The queue delegates actual fetch execution to an injected executor function,
 * which allows the BlockFetcher to handle node selection, retries, and
 * checksum verification while the queue handles scheduling concerns.
 *
 * @see cross-node-eventual-consistency design, Section 10
 * @see Requirements 4.1, 4.2, 4.3, 4.4
 */

import {
  BlockFetchResult,
  DEFAULT_FETCH_QUEUE_CONFIG,
  FetchQueueConfig,
  FetchTimeoutError,
  IFetchQueue,
  PoolId,
} from '@brightchain/brightchain-lib';

/**
 * Function type for the fetch executor.
 * The queue calls this to perform the actual block retrieval.
 * The executor is responsible for node selection, retries, and verification.
 */
export type FetchExecutor = (
  blockId: string,
  poolId?: PoolId,
) => Promise<BlockFetchResult>;

/** Internal waiter entry — one per caller awaiting a given blockId */
interface Waiter {
  resolve: (result: BlockFetchResult) => void;
  reject: (error: Error) => void;
}

/** Internal record for a queued (not yet active) blockId */
interface PendingEntry {
  blockId: string;
  poolId?: PoolId;
  waiters: Waiter[];
}

/**
 * FetchQueue manages block fetch requests with deduplication, priority ordering,
 * and bounded concurrency.
 *
 * Deduplication (Req 4.1): If blockId is already pending or active, new callers
 * are appended to the existing waiters list — only one fetch executes.
 *
 * Concurrency (Req 4.2): At most `maxConcurrency` fetches run in parallel.
 *
 * Priority (Req 4.3): When a slot opens, the pending entry with the most waiters
 * is dispatched next.
 *
 * Timeout (Req 4.4): Each active fetch is bounded by `fetchTimeoutMs`. On timeout,
 * all waiters for that blockId receive a FetchTimeoutError.
 */
export class FetchQueue implements IFetchQueue {
  /** Queued blockIds not yet dispatched — keyed by blockId */
  private readonly pending: Map<string, PendingEntry> = new Map();

  /**
   * Currently executing blockIds.
   * Maps blockId to its waiters list and the timeout handle for cancellation.
   */
  private readonly active: Map<
    string,
    { waiters: Waiter[]; timeoutHandle: ReturnType<typeof setTimeout> }
  > = new Map();

  private readonly config: FetchQueueConfig;

  /**
   * @param executor - Function that performs the actual block fetch.
   *   The queue calls this when dispatching; the executor handles node
   *   selection, retries, and checksum verification.
   * @param config - Optional partial config; merged with defaults.
   */
  constructor(
    private readonly executor: FetchExecutor,
    config?: Partial<FetchQueueConfig>,
  ) {
    this.config = { ...DEFAULT_FETCH_QUEUE_CONFIG, ...config };
  }

  /**
   * Enqueue a block fetch request.
   * If the blockId is already pending or active, the caller's promise is
   * coalesced with the existing request (Req 4.1).
   */
  public enqueue(blockId: string, poolId?: PoolId): Promise<BlockFetchResult> {
    return new Promise<BlockFetchResult>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject };

      // Coalesce with an already-active fetch
      const activeEntry = this.active.get(blockId);
      if (activeEntry) {
        activeEntry.waiters.push(waiter);
        return;
      }

      // Coalesce with a pending entry
      const pendingEntry = this.pending.get(blockId);
      if (pendingEntry) {
        pendingEntry.waiters.push(waiter);
        return;
      }

      // Create a new pending entry
      this.pending.set(blockId, {
        blockId,
        poolId,
        waiters: [waiter],
      });

      // Try to dispatch immediately if there's capacity
      this.drain();
    });
  }

  /** Number of requests waiting to be dispatched */
  public getPendingCount(): number {
    return this.pending.size;
  }

  /** Number of fetches currently in progress */
  public getActiveCount(): number {
    return this.active.size;
  }

  /**
   * Cancel all pending and active fetch requests.
   * Every waiter receives a rejection with the given reason.
   */
  public cancelAll(reason: string): void {
    const error = new Error(reason);

    for (const [, entry] of this.pending) {
      for (const waiter of entry.waiters) {
        waiter.reject(error);
      }
    }
    this.pending.clear();

    for (const [, entry] of this.active) {
      clearTimeout(entry.timeoutHandle);
      for (const waiter of entry.waiters) {
        waiter.reject(error);
      }
    }
    this.active.clear();
  }

  /** Current queue configuration */
  public getConfig(): FetchQueueConfig {
    return { ...this.config };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  /**
   * Dispatch pending entries up to the concurrency limit.
   * Selects the entry with the most waiters first (Req 4.3).
   */
  private drain(): void {
    while (
      this.active.size < this.config.maxConcurrency &&
      this.pending.size > 0
    ) {
      const next = this.pickHighestPriority();
      if (!next) break;
      this.dispatch(next);
    }
  }

  /**
   * Pick and remove the pending entry with the most waiters.
   */
  private pickHighestPriority(): PendingEntry | undefined {
    let best: PendingEntry | undefined;
    for (const [, entry] of this.pending) {
      if (!best || entry.waiters.length > best.waiters.length) {
        best = entry;
      }
    }
    if (best) {
      this.pending.delete(best.blockId);
    }
    return best;
  }

  /**
   * Dispatch a single fetch: move entry to active, start the executor,
   * and arm the timeout (Req 4.4).
   */
  private dispatch(entry: PendingEntry): void {
    const { blockId, poolId, waiters } = entry;
    let settled = false;

    const timeoutHandle = setTimeout(() => {
      if (settled) return;
      settled = true;

      const current = this.active.get(blockId);
      this.active.delete(blockId);

      const timeoutError = new FetchTimeoutError(
        blockId,
        this.config.fetchTimeoutMs,
      );

      if (current) {
        for (const w of current.waiters) {
          w.reject(timeoutError);
        }
      }

      this.drain();
    }, this.config.fetchTimeoutMs);

    this.active.set(blockId, { waiters, timeoutHandle });

    this.executor(blockId, poolId)
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);

        const current = this.active.get(blockId);
        this.active.delete(blockId);

        if (current) {
          for (const w of current.waiters) {
            w.resolve(result);
          }
        }

        this.drain();
      })
      .catch((err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);

        const current = this.active.get(blockId);
        this.active.delete(blockId);

        const failResult: BlockFetchResult = {
          success: false,
          error: err.message,
          attemptedNodes: [],
        };

        if (current) {
          for (const w of current.waiters) {
            w.resolve(failResult);
          }
        }

        this.drain();
      });
  }
}
