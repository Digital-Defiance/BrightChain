/**
 * Property-Based Tests for WorkQueue
 *
 * Feature: proof-of-useful-work-ratelimit
 *
 * Properties tested:
 * - Property 13: Work Queue Auto-Replenishment Invariant
 * - Property 14: Work Queue Expiration
 * - Property 15: Work Queue Reclamation
 * - Property 16: Work Queue Prioritization
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.6**
 */

import {
  DifficultyTier,
  IWorkUnit,
  WorkUnitOperation,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { WorkQueue } from '../workQueue';

/**
 * Create a minimal valid IWorkUnit for testing.
 */
function makeWorkUnit(id: string): IWorkUnit {
  return {
    id,
    treeId: 'tree-' + id,
    treeLevel: 0,
    treeIndex: 0,
    operation: WorkUnitOperation.LeafHash,
    inputData: 'dGVzdA==', // "test" in base64
    childCount: 0,
    difficulty: DifficultyTier.Low,
    challengeToken: 'token-' + id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
}

describe('WorkQueue Property Tests', () => {
  /**
   * Property 13: Work Queue Auto-Replenishment Invariant
   *
   * When queue depth falls below the configured minimum threshold,
   * needsReplenishment returns true. When depth is at or above the
   * minimum, needsReplenishment returns false.
   *
   * **Validates: Requirements 9.1, 9.2**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 13: Work Queue Auto-Replenishment Invariant', () => {
    it('needsReplenishment is true when depth < minQueueDepth, false when depth >= minQueueDepth', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // minQueueDepth
          fc.integer({ min: 0, max: 60 }), // itemsToEnqueue
          (minQueueDepth, itemsToEnqueue) => {
            const queue = new WorkQueue({
              minQueueDepth,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Enqueue the specified number of items
            for (let i = 0; i < itemsToEnqueue; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
            }

            // needsReplenishment should reflect whether depth < minQueueDepth
            if (itemsToEnqueue < minQueueDepth) {
              expect(queue.needsReplenishment).toBe(true);
            } else {
              expect(queue.needsReplenishment).toBe(false);
            }
            expect(queue.depth).toBe(itemsToEnqueue);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('needsReplenishment transitions from true to false as items are enqueued', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 30 }), // minQueueDepth
          (minQueueDepth) => {
            const queue = new WorkQueue({
              minQueueDepth,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Start empty — needs replenishment
            expect(queue.needsReplenishment).toBe(true);

            // Enqueue items one by one, checking the invariant at each step
            for (let i = 0; i < minQueueDepth; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
              if (i + 1 < minQueueDepth) {
                expect(queue.needsReplenishment).toBe(true);
              } else {
                expect(queue.needsReplenishment).toBe(false);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('dequeuing below minQueueDepth triggers needsReplenishment', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 30 }), // minQueueDepth
          fc.integer({ min: 1, max: 10 }), // extra items above min
          (minQueueDepth, extra) => {
            const totalItems = minQueueDepth + extra;
            const queue = new WorkQueue({
              minQueueDepth,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Fill queue above minimum
            for (let i = 0; i < totalItems; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
            }
            expect(queue.needsReplenishment).toBe(false);

            // Dequeue until we drop below minQueueDepth
            const dequeueCount = extra + 1; // removes enough to go below min
            for (let i = 0; i < dequeueCount; i++) {
              queue.dequeue();
            }

            expect(queue.depth).toBe(totalItems - dequeueCount);
            expect(queue.needsReplenishment).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 14: Work Queue Expiration
   *
   * Work units older than the configured max age are removed during
   * the expiration sweep.
   *
   * **Validates: Requirements 9.3**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 14: Work Queue Expiration', () => {
    it('all items older than workUnitMaxAgeMs are removed by expireStale', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 5000 }), // workUnitMaxAgeMs
          fc.integer({ min: 1, max: 20 }), // number of items to enqueue
          (workUnitMaxAgeMs, itemCount) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs,
            });

            // Enqueue items
            for (let i = 0; i < itemCount; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
            }
            expect(queue.depth).toBe(itemCount);

            // Advance Date.now() past the max age
            const realDateNow = Date.now;
            const frozenNow = Date.now();
            Date.now = () => frozenNow + workUnitMaxAgeMs + 1;

            try {
              const removed = queue.expireStale();
              expect(removed).toBe(itemCount);
              expect(queue.depth).toBe(0);
            } finally {
              Date.now = realDateNow;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('items younger than workUnitMaxAgeMs are NOT removed by expireStale', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000 }), // workUnitMaxAgeMs
          fc.integer({ min: 1, max: 20 }), // number of items
          (workUnitMaxAgeMs, itemCount) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs,
            });

            // Enqueue items
            for (let i = 0; i < itemCount; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
            }

            // Don't advance time — items are fresh
            const removed = queue.expireStale();
            expect(removed).toBe(0);
            expect(queue.depth).toBe(itemCount);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mixed-age items: only old items are removed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 5000 }), // workUnitMaxAgeMs
          fc.integer({ min: 1, max: 10 }), // old items count
          fc.integer({ min: 1, max: 10 }), // fresh items count
          (workUnitMaxAgeMs, oldCount, freshCount) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs,
            });

            const realDateNow = Date.now;
            const baseTime = Date.now();

            try {
              // Enqueue "old" items at a time in the past
              Date.now = () => baseTime - workUnitMaxAgeMs - 100;
              for (let i = 0; i < oldCount; i++) {
                queue.enqueue(makeWorkUnit(`old-${i}`), 'expected-hash', false);
              }

              // Enqueue "fresh" items at current time
              Date.now = () => baseTime;
              for (let i = 0; i < freshCount; i++) {
                queue.enqueue(
                  makeWorkUnit(`fresh-${i}`),
                  'expected-hash',
                  false,
                );
              }

              // Expire at current time — only old items should be removed
              const removed = queue.expireStale();
              expect(removed).toBe(oldCount);
              expect(queue.depth).toBe(freshCount);
            } finally {
              Date.now = realDateNow;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 15: Work Queue Reclamation
   *
   * Assigned work units with expired assignment tokens are returned
   * to the available pool by reclaimExpired().
   *
   * **Validates: Requirements 9.4**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 15: Work Queue Reclamation', () => {
    it('assigned items with expired assignedUntil are reclaimed and become available', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // number of items
          fc.integer({ min: 100, max: 5000 }), // assignment TTL in ms
          (itemCount, assignmentTtl) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Enqueue items
            for (let i = 0; i < itemCount; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
            }

            // Mark all items as assigned with an expiration in the past
            const pastExpiration = Date.now() - assignmentTtl;
            for (let i = 0; i < itemCount; i++) {
              queue.markAssigned(`unit-${i}`, pastExpiration);
            }

            // Reclaim expired assignments
            const reclaimed = queue.reclaimExpired();
            expect(reclaimed).toBe(itemCount);

            // All items should now be available for dequeue
            expect(queue.depth).toBe(itemCount);
            for (let i = 0; i < itemCount; i++) {
              const entry = queue.dequeue();
              expect(entry).not.toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('assigned items with future assignedUntil are NOT reclaimed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // number of items
          fc.integer({ min: 1000, max: 60000 }), // future TTL in ms
          (itemCount, futureTtl) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Enqueue items
            for (let i = 0; i < itemCount; i++) {
              queue.enqueue(makeWorkUnit(`unit-${i}`), 'expected-hash', false);
            }

            // Mark all items as assigned with a future expiration
            const futureExpiration = Date.now() + futureTtl;
            for (let i = 0; i < itemCount; i++) {
              queue.markAssigned(`unit-${i}`, futureExpiration);
            }

            // Reclaim should find nothing to reclaim
            const reclaimed = queue.reclaimExpired();
            expect(reclaimed).toBe(0);

            // Items should NOT be available (they're still assigned)
            expect(queue.depth).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mixed assigned/unassigned: only expired assignments are reclaimed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // expired assigned count
          fc.integer({ min: 1, max: 10 }), // future assigned count
          fc.integer({ min: 1, max: 10 }), // unassigned count
          (expiredCount, futureCount, unassignedCount) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs: 3_600_000,
            });

            const now = Date.now();

            // Enqueue all items
            for (let i = 0; i < expiredCount; i++) {
              queue.enqueue(
                makeWorkUnit(`expired-${i}`),
                'expected-hash',
                false,
              );
            }
            for (let i = 0; i < futureCount; i++) {
              queue.enqueue(
                makeWorkUnit(`future-${i}`),
                'expected-hash',
                false,
              );
            }
            for (let i = 0; i < unassignedCount; i++) {
              queue.enqueue(
                makeWorkUnit(`unassigned-${i}`),
                'expected-hash',
                false,
              );
            }

            // Mark expired-assigned items with past expiration
            for (let i = 0; i < expiredCount; i++) {
              queue.markAssigned(`expired-${i}`, now - 1000);
            }
            // Mark future-assigned items with future expiration
            for (let i = 0; i < futureCount; i++) {
              queue.markAssigned(`future-${i}`, now + 60000);
            }
            // unassigned items remain unassigned

            // Available depth = expired-assigned (expired so available) + unassigned
            expect(queue.depth).toBe(expiredCount + unassignedCount);

            // Reclaim expired
            const reclaimed = queue.reclaimExpired();
            expect(reclaimed).toBe(expiredCount);

            // After reclaim: expired items are now fully available (assignedUntil cleared)
            // Available = expiredCount + unassignedCount (same as before, but now assignedUntil is cleared)
            expect(queue.depth).toBe(expiredCount + unassignedCount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 16: Work Queue Prioritization
   *
   * Partial-tree work units (isPartialTree=true) are dequeued before
   * new-tree work units (isPartialTree=false).
   *
   * **Validates: Requirements 9.6**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 16: Work Queue Prioritization', () => {
    it('all partial-tree items are dequeued before all new-tree items', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // partial-tree count
          fc.integer({ min: 1, max: 20 }), // new-tree count
          (partialCount, newCount) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Enqueue a mix of partial-tree and new-tree items in random order
            // by interleaving: enqueue new first, then partial, to test sorting
            for (let i = 0; i < newCount; i++) {
              queue.enqueue(
                makeWorkUnit(`new-${i}`),
                'expected-hash',
                false, // new-tree
              );
            }
            for (let i = 0; i < partialCount; i++) {
              queue.enqueue(
                makeWorkUnit(`partial-${i}`),
                'expected-hash',
                true, // partial-tree
              );
            }

            // Dequeue all items and verify ordering
            const dequeued: Array<{ id: string; isPartialTree: boolean }> = [];
            let entry = queue.dequeue();
            while (entry !== null) {
              dequeued.push({
                id: entry.workUnit.id,
                isPartialTree: entry.isPartialTree,
              });
              entry = queue.dequeue();
            }

            expect(dequeued.length).toBe(partialCount + newCount);

            // All partial-tree items should come first
            const partialItems = dequeued.filter((d) => d.isPartialTree);
            const newItems = dequeued.filter((d) => !d.isPartialTree);

            expect(partialItems.length).toBe(partialCount);
            expect(newItems.length).toBe(newCount);

            // Verify ordering: all partial items have indices before all new items
            const lastPartialIndex = dequeued.findLastIndex(
              (d) => d.isPartialTree,
            );
            const firstNewIndex = dequeued.findIndex((d) => !d.isPartialTree);

            if (partialCount > 0 && newCount > 0) {
              expect(lastPartialIndex).toBeLessThan(firstNewIndex);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('random enqueue order preserves partial-before-new invariant', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 40 }), // true = partial, false = new
          (enqueueOrder) => {
            const queue = new WorkQueue({
              minQueueDepth: 1,
              workUnitMaxAgeMs: 3_600_000,
            });

            // Enqueue items in the random order
            enqueueOrder.forEach((isPartial, i) => {
              queue.enqueue(
                makeWorkUnit(`unit-${i}`),
                'expected-hash',
                isPartial,
              );
            });

            // Dequeue all items
            const dequeued: boolean[] = [];
            let entry = queue.dequeue();
            while (entry !== null) {
              dequeued.push(entry.isPartialTree);
              entry = queue.dequeue();
            }

            expect(dequeued.length).toBe(enqueueOrder.length);

            // Find the transition point: once we see a new-tree item,
            // all remaining items must also be new-tree
            let seenNewTree = false;
            for (const isPartial of dequeued) {
              if (!isPartial) {
                seenNewTree = true;
              }
              if (seenNewTree) {
                expect(isPartial).toBe(false);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
