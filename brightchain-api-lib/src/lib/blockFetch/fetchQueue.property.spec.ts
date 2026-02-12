/**
 * @fileoverview Property-based tests for FetchQueue deduplication
 *
 * Feature: cross-node-eventual-consistency, Property 8: FetchQueue deduplication
 *
 * Property 8: For any number N > 1 of concurrent enqueue(blockId) calls for the
 * same blockId, the underlying transport SHALL be invoked exactly once, and all N
 * callers SHALL receive the same BlockFetchResult.
 *
 * **Validates: Requirements 4.1**
 */

import { BlockFetchResult } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { FetchExecutor, FetchQueue } from './fetchQueue';

describe('Feature: cross-node-eventual-consistency, Property 8: FetchQueue deduplication', () => {
  /**
   * Arbitrary: number of concurrent callers (N > 1, up to 50)
   */
  const arbCallerCount = fc.integer({ min: 2, max: 50 });

  /**
   * Arbitrary: block ID strings — non-empty hex strings
   */
  const arbBlockId = fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: 8, maxLength: 64 })
    .map((digits) => digits.map((d) => d.toString(16)).join(''));

  /**
   * Arbitrary: block data payload
   */
  const arbBlockData = fc.uint8Array({ minLength: 1, maxLength: 128 });

  it('concurrent enqueue calls for the same blockId invoke the executor exactly once and all callers receive the same result', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCallerCount,
        arbBlockId,
        arbBlockData,
        async (n: number, blockId: string, data: Uint8Array) => {
          let executorCallCount = 0;

          const executor: FetchExecutor = () => {
            executorCallCount++;
            const result: BlockFetchResult = {
              success: true,
              data,
              attemptedNodes: [],
            };
            return Promise.resolve(result);
          };

          const queue = new FetchQueue(executor, {
            maxConcurrency: 10,
            fetchTimeoutMs: 5000,
          });

          // Fire N concurrent enqueue calls for the same blockId
          const promises: Promise<BlockFetchResult>[] = [];
          for (let i = 0; i < n; i++) {
            promises.push(queue.enqueue(blockId));
          }

          const results = await Promise.all(promises);

          // The executor must have been called exactly once
          expect(executorCallCount).toBe(1);

          // All callers must receive the same result object
          const first = results[0];
          for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(first);
          }

          // The result must be the successful one we returned
          expect(first.success).toBe(true);
          expect(first.data).toBe(data);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('concurrent enqueue calls for the same blockId all receive the same failure result on executor error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCallerCount,
        arbBlockId,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (n: number, blockId: string, errorMsg: string) => {
          let executorCallCount = 0;

          const executor: FetchExecutor = () => {
            executorCallCount++;
            return Promise.reject(new Error(errorMsg));
          };

          const queue = new FetchQueue(executor, {
            maxConcurrency: 10,
            fetchTimeoutMs: 5000,
          });

          const promises: Promise<BlockFetchResult>[] = [];
          for (let i = 0; i < n; i++) {
            promises.push(queue.enqueue(blockId));
          }

          const results = await Promise.all(promises);

          // Still exactly one executor call
          expect(executorCallCount).toBe(1);

          // All callers get the same failure result
          const first = results[0];
          expect(first.success).toBe(false);
          expect(first.error).toBe(errorMsg);

          for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(first);
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('concurrent enqueue calls with a delayed executor still deduplicate to one fetch', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCallerCount,
        arbBlockId,
        arbBlockData,
        async (n: number, blockId: string, data: Uint8Array) => {
          let executorCallCount = 0;

          // Executor that resolves after a small delay, simulating network latency
          const executor: FetchExecutor = () => {
            executorCallCount++;
            return new Promise<BlockFetchResult>((resolve) => {
              setTimeout(() => {
                resolve({
                  success: true,
                  data,
                  attemptedNodes: [],
                });
              }, 5);
            });
          };

          const queue = new FetchQueue(executor, {
            maxConcurrency: 10,
            fetchTimeoutMs: 5000,
          });

          // Enqueue all N callers concurrently
          const promises: Promise<BlockFetchResult>[] = [];
          for (let i = 0; i < n; i++) {
            promises.push(queue.enqueue(blockId));
          }

          const results = await Promise.all(promises);

          expect(executorCallCount).toBe(1);

          const first = results[0];
          for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(first);
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});

describe('Feature: cross-node-eventual-consistency, Property 9: FetchQueue concurrency bound', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * Property 9: For any sequence of enqueued fetch requests, the number of
   * simultaneously active transport calls SHALL never exceed maxConcurrency.
   */

  /**
   * Arbitrary: maxConcurrency between 1 and 10
   */
  const arbMaxConcurrency = fc.integer({ min: 1, max: 10 });

  /**
   * Generate a list of distinct block IDs whose count is between
   * maxConcurrency+1 and maxConcurrency*3, ensuring we always have
   * more requests than concurrency slots.
   */
  const arbDistinctBlockIds = (maxConcurrency: number) =>
    fc.uniqueArray(
      fc
        .array(fc.integer({ min: 0, max: 15 }), {
          minLength: 8,
          maxLength: 32,
        })
        .map((digits) => digits.map((d) => d.toString(16)).join('')),
      {
        minLength: maxConcurrency + 1,
        maxLength: maxConcurrency * 3,
      },
    );

  it('the number of simultaneously active executor calls never exceeds maxConcurrency', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMaxConcurrency.chain((mc) =>
          arbDistinctBlockIds(mc).map((ids) => ({
            maxConcurrency: mc,
            blockIds: ids,
          })),
        ),
        async ({ maxConcurrency, blockIds }) => {
          let currentActive = 0;
          let peakActive = 0;

          /**
           * Controllable executor that tracks concurrent active calls.
           * Each call increments the counter, records the peak, waits
           * a small delay to allow overlap, then decrements.
           */
          const executor: FetchExecutor = (_blockId: string) => {
            currentActive++;
            if (currentActive > peakActive) {
              peakActive = currentActive;
            }

            return new Promise<BlockFetchResult>((resolve) => {
              // Small delay so multiple dispatches can overlap
              setTimeout(() => {
                currentActive--;
                resolve({
                  success: true,
                  data: new Uint8Array([1, 2, 3]),
                  attemptedNodes: [],
                });
              }, 5);
            });
          };

          const queue = new FetchQueue(executor, {
            maxConcurrency,
            fetchTimeoutMs: 10000,
          });

          // Enqueue all distinct blockIds concurrently
          const promises = blockIds.map((id) => queue.enqueue(id));

          await Promise.all(promises);

          // The peak concurrent count must never exceed maxConcurrency
          expect(peakActive).toBeLessThanOrEqual(maxConcurrency);
          // Sanity: we should have had at least 1 active call
          expect(peakActive).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);

  it('concurrency bound holds even when requests arrive in bursts', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMaxConcurrency.chain((mc) =>
          arbDistinctBlockIds(mc).map((ids) => ({
            maxConcurrency: mc,
            blockIds: ids,
          })),
        ),
        async ({ maxConcurrency, blockIds }) => {
          let currentActive = 0;
          let peakActive = 0;

          const executor: FetchExecutor = () => {
            currentActive++;
            if (currentActive > peakActive) {
              peakActive = currentActive;
            }

            return new Promise<BlockFetchResult>((resolve) => {
              // Slightly longer delay to increase overlap window
              setTimeout(() => {
                currentActive--;
                resolve({
                  success: true,
                  data: new Uint8Array([0]),
                  attemptedNodes: [],
                });
              }, 10);
            });
          };

          const queue = new FetchQueue(executor, {
            maxConcurrency,
            fetchTimeoutMs: 10000,
          });

          // Enqueue in two bursts to test drain behavior across waves
          const mid = Math.ceil(blockIds.length / 2);
          const firstBurst = blockIds
            .slice(0, mid)
            .map((id) => queue.enqueue(id));

          // Small gap between bursts
          await new Promise((r) => setTimeout(r, 2));

          const secondBurst = blockIds
            .slice(mid)
            .map((id) => queue.enqueue(id));

          await Promise.all([...firstBurst, ...secondBurst]);

          expect(peakActive).toBeLessThanOrEqual(maxConcurrency);
          expect(peakActive).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});
