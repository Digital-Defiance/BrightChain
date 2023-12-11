/**
 * @fileoverview Unit tests for FetchQueue
 *
 * Tests deduplication, concurrency limiting, priority ordering,
 * timeout cancellation, and cancelAll behavior.
 *
 * @see Requirements 4.1, 4.2, 4.3, 4.4
 */

import {
  BlockFetchResult,
  FetchTimeoutError,
} from '@brightchain/brightchain-lib';
import { FetchExecutor, FetchQueue } from './fetchQueue';

/** Helper: create a controllable executor that resolves/rejects on demand */
function createControllableExecutor() {
  const calls: Array<{
    blockId: string;
    poolId?: string;
    resolve: (result: BlockFetchResult) => void;
    reject: (error: Error) => void;
  }> = [];

  const executor: FetchExecutor = (blockId, poolId) =>
    new Promise<BlockFetchResult>((resolve, reject) => {
      calls.push({ blockId, poolId, resolve, reject });
    });

  return { executor, calls };
}

/** Helper: create a successful BlockFetchResult */
function successResult(data?: Uint8Array): BlockFetchResult {
  return {
    success: true,
    data: data ?? new Uint8Array([1, 2, 3]),
    attemptedNodes: [],
  };
}

describe('FetchQueue', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic enqueue and dispatch', () => {
    it('should dispatch a single enqueued request', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor);

      const promise = queue.enqueue('block-1');
      expect(calls).toHaveLength(1);
      expect(calls[0].blockId).toBe('block-1');

      calls[0].resolve(successResult());
      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should pass poolId to the executor', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor);

      queue.enqueue('block-1', 'pool-abc');
      expect(calls[0].poolId).toBe('pool-abc');

      calls[0].resolve(successResult());
    });
  });

  describe('deduplication (Req 4.1)', () => {
    it('should coalesce concurrent requests for the same blockId into one fetch', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor);

      const p1 = queue.enqueue('block-1');
      const p2 = queue.enqueue('block-1');
      const p3 = queue.enqueue('block-1');

      // Only one executor call should have been made
      expect(calls).toHaveLength(1);

      const result = successResult();
      calls[0].resolve(result);

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
      expect(r1.success).toBe(true);
    });

    it('should coalesce requests added while a fetch is active', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor);

      const p1 = queue.enqueue('block-1');
      expect(queue.getActiveCount()).toBe(1);

      // This should coalesce with the active fetch, not create a new one
      const p2 = queue.enqueue('block-1');
      expect(calls).toHaveLength(1);

      calls[0].resolve(successResult());
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe(r2);
    });

    it('should issue separate fetches for different blockIds', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor);

      queue.enqueue('block-1');
      queue.enqueue('block-2');

      expect(calls).toHaveLength(2);
      expect(calls[0].blockId).toBe('block-1');
      expect(calls[1].blockId).toBe('block-2');

      calls[0].resolve(successResult());
      calls[1].resolve(successResult());
    });
  });

  describe('concurrency limiting (Req 4.2)', () => {
    it('should not exceed maxConcurrency active fetches', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor, { maxConcurrency: 2 });

      queue.enqueue('block-1');
      queue.enqueue('block-2');
      queue.enqueue('block-3');

      // Only 2 should be dispatched
      expect(calls).toHaveLength(2);
      expect(queue.getActiveCount()).toBe(2);
      expect(queue.getPendingCount()).toBe(1);

      // Complete one — the third should now dispatch
      calls[0].resolve(successResult());
      // Allow microtask to process
      await Promise.resolve();

      expect(calls).toHaveLength(3);
      expect(queue.getActiveCount()).toBe(2);
      expect(queue.getPendingCount()).toBe(0);

      calls[1].resolve(successResult());
      calls[2].resolve(successResult());
    });

    it('should respect maxConcurrency of 1', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor, { maxConcurrency: 1 });

      const p1 = queue.enqueue('a');
      queue.enqueue('b');
      queue.enqueue('c');

      expect(calls).toHaveLength(1);
      expect(calls[0].blockId).toBe('a');

      calls[0].resolve(successResult());
      await p1;
      await Promise.resolve();

      expect(calls).toHaveLength(2);
      calls[1].resolve(successResult());
      await Promise.resolve();

      expect(calls).toHaveLength(3);
      calls[2].resolve(successResult());
    });
  });

  describe('priority ordering by waiter count (Req 4.3)', () => {
    it('should dispatch the entry with the most waiters first', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor, { maxConcurrency: 1 });

      // Fill the single slot
      const pA = queue.enqueue('block-a');

      // Queue two entries: block-b with 1 waiter, block-c with 3 waiters
      queue.enqueue('block-b');
      queue.enqueue('block-c');
      queue.enqueue('block-c');
      queue.enqueue('block-c');

      expect(queue.getPendingCount()).toBe(2);

      // Complete block-a to free the slot
      calls[0].resolve(successResult());
      await pA;
      await Promise.resolve();

      // block-c should be dispatched next (3 waiters > 1 waiter)
      expect(calls).toHaveLength(2);
      expect(calls[1].blockId).toBe('block-c');

      calls[1].resolve(successResult());
      await Promise.resolve();

      expect(calls).toHaveLength(3);
      expect(calls[2].blockId).toBe('block-b');
      calls[2].resolve(successResult());
    });
  });

  describe('per-request timeout (Req 4.4)', () => {
    it('should reject all waiters with FetchTimeoutError on timeout', async () => {
      jest.useFakeTimers();

      const { executor } = createControllableExecutor();
      const queue = new FetchQueue(executor, { fetchTimeoutMs: 500 });

      const p1 = queue.enqueue('block-1');
      const p2 = queue.enqueue('block-1');

      jest.advanceTimersByTime(500);

      await expect(p1).rejects.toThrow(FetchTimeoutError);
      await expect(p2).rejects.toThrow(FetchTimeoutError);
    });

    it('should not timeout if fetch completes in time', async () => {
      jest.useFakeTimers();

      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor, { fetchTimeoutMs: 1000 });

      const promise = queue.enqueue('block-1');

      jest.advanceTimersByTime(500);
      calls[0].resolve(successResult());

      // Need to flush microtasks after resolve
      await Promise.resolve();
      jest.advanceTimersByTime(600);

      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should drain pending after timeout frees a slot', async () => {
      jest.useFakeTimers();

      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor, {
        maxConcurrency: 1,
        fetchTimeoutMs: 200,
      });

      const p1 = queue.enqueue('block-1');
      queue.enqueue('block-2');

      expect(calls).toHaveLength(1);

      // Timeout block-1
      jest.advanceTimersByTime(200);
      await expect(p1).rejects.toThrow(FetchTimeoutError);

      // block-2 should now be dispatched
      expect(calls).toHaveLength(2);
      expect(calls[1].blockId).toBe('block-2');

      calls[1].resolve(successResult());
    });
  });

  describe('cancelAll', () => {
    it('should reject all pending and active waiters', async () => {
      const { executor } = createControllableExecutor();
      const queue = new FetchQueue(executor, { maxConcurrency: 1 });

      const p1 = queue.enqueue('block-1'); // active
      const p2 = queue.enqueue('block-2'); // pending

      queue.cancelAll('shutting down');

      await expect(p1).rejects.toThrow('shutting down');
      await expect(p2).rejects.toThrow('shutting down');
      expect(queue.getActiveCount()).toBe(0);
      expect(queue.getPendingCount()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should resolve all waiters with a failure result when executor throws', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor);

      const p1 = queue.enqueue('block-1');
      const p2 = queue.enqueue('block-1');

      calls[0].reject(new Error('network failure'));

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.success).toBe(false);
      expect(r1.error).toBe('network failure');
      expect(r2.success).toBe(false);
    });

    it('should drain pending after an executor error frees a slot', async () => {
      const { executor, calls } = createControllableExecutor();
      const queue = new FetchQueue(executor, { maxConcurrency: 1 });

      const p1 = queue.enqueue('block-1');
      queue.enqueue('block-2');

      expect(calls).toHaveLength(1);

      calls[0].reject(new Error('fail'));
      await p1;
      await Promise.resolve();

      expect(calls).toHaveLength(2);
      expect(calls[1].blockId).toBe('block-2');
      calls[1].resolve(successResult());
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const queue = new FetchQueue(jest.fn(), {
        maxConcurrency: 3,
        fetchTimeoutMs: 5000,
      });

      const config = queue.getConfig();
      expect(config.maxConcurrency).toBe(3);
      expect(config.fetchTimeoutMs).toBe(5000);
    });

    it('should use defaults when no config is provided', () => {
      const queue = new FetchQueue(jest.fn());
      const config = queue.getConfig();
      expect(config.maxConcurrency).toBe(5);
      expect(config.fetchTimeoutMs).toBe(10000);
    });
  });
});
