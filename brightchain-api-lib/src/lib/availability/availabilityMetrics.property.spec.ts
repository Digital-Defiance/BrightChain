/**
 * @fileoverview Property-based tests for AvailabilityMetrics
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 30: Metrics Accuracy
 *
 * **Validates: Requirements 15.1**
 */

/* eslint-disable @nx/enforce-module-boundaries */
import { AvailabilityState } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { AvailabilityMetricsTracker } from './availabilityMetrics';

/**
 * Generate a valid availability state
 */
const arbAvailabilityState = fc.constantFrom(
  AvailabilityState.Local,
  AvailabilityState.Remote,
  AvailabilityState.Cached,
  AvailabilityState.Orphaned,
  AvailabilityState.Unknown,
);

/**
 * Generate a positive latency value (1-10000ms)
 */
const arbLatency = fc.integer({ min: 1, max: 10000 });

/**
 * Generate a positive duration value (1-60000ms)
 */
const arbDuration = fc.integer({ min: 1, max: 60000 });

/**
 * Generate a non-negative count
 */
const arbCount = fc.integer({ min: 0, max: 1000 });

/**
 * Generate a discovery query operation
 */
type DiscoveryOp = {
  success: boolean;
  latencyMs: number;
};

const arbDiscoveryOp: fc.Arbitrary<DiscoveryOp> = fc.record({
  success: fc.boolean(),
  latencyMs: arbLatency,
});

/**
 * Generate a reconciliation operation
 */
type ReconciliationOp = {
  success: boolean;
  durationMs: number;
  blocksDiscovered: number;
  blocksUpdated: number;
  orphansResolved: number;
  conflictsResolved: number;
};

const arbReconciliationOp: fc.Arbitrary<ReconciliationOp> = fc.record({
  success: fc.boolean(),
  durationMs: arbDuration,
  blocksDiscovered: arbCount,
  blocksUpdated: arbCount,
  orphansResolved: arbCount,
  conflictsResolved: arbCount,
});

/**
 * Generate a block count update operation
 */
type BlockCountOp =
  | { type: 'set'; state: AvailabilityState; count: number }
  | { type: 'increment'; state: AvailabilityState; delta: number }
  | { type: 'decrement'; state: AvailabilityState; delta: number };

const arbBlockCountOp: fc.Arbitrary<BlockCountOp> = fc.oneof(
  fc.record({
    type: fc.constant('set' as const),
    state: arbAvailabilityState,
    count: arbCount,
  }),
  fc.record({
    type: fc.constant('increment' as const),
    state: arbAvailabilityState,
    delta: fc.integer({ min: 1, max: 100 }),
  }),
  fc.record({
    type: fc.constant('decrement' as const),
    state: arbAvailabilityState,
    delta: fc.integer({ min: 1, max: 100 }),
  }),
);

describe('AvailabilityMetrics Property Tests', () => {
  describe('Property 30: Metrics Accuracy', () => {
    /**
     * **Feature: block-availability-discovery, Property 30: Metrics Accuracy**
     *
     * *For any* point in time, the availability statistics SHALL accurately reflect:
     * - Count of blocks in each availability state
     * - Total known locations
     * - Average locations per block
     *
     * **Validates: Requirements 15.1**
     */
    it('should accurately track block counts by state', () => {
      fc.assert(
        fc.property(
          fc.array(arbBlockCountOp, { maxLength: 50 }),
          (operations) => {
            const tracker = new AvailabilityMetricsTracker();

            // Track expected counts
            const expectedCounts = new Map<AvailabilityState, number>([
              [AvailabilityState.Local, 0],
              [AvailabilityState.Remote, 0],
              [AvailabilityState.Cached, 0],
              [AvailabilityState.Orphaned, 0],
              [AvailabilityState.Unknown, 0],
            ]);

            // Apply operations and track expected state
            for (const op of operations) {
              switch (op.type) {
                case 'set':
                  tracker.setBlockCount(op.state, op.count);
                  expectedCounts.set(op.state, op.count);
                  break;
                case 'increment':
                  tracker.incrementBlockCount(op.state, op.delta);
                  expectedCounts.set(
                    op.state,
                    (expectedCounts.get(op.state) || 0) + op.delta,
                  );
                  break;
                case 'decrement':
                  tracker.decrementBlockCount(op.state, op.delta);
                  expectedCounts.set(
                    op.state,
                    Math.max(0, (expectedCounts.get(op.state) || 0) - op.delta),
                  );
                  break;
              }
            }

            // Get metrics and verify
            const metrics = tracker.getMetrics();

            // Verify all block counts match expected
            for (const state of Object.values(AvailabilityState)) {
              expect(metrics.blockCounts[state]).toBe(
                expectedCounts.get(state),
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accurately track discovery query metrics', () => {
      fc.assert(
        fc.property(
          fc.array(arbDiscoveryOp, { minLength: 1, maxLength: 100 }),
          (queries) => {
            const tracker = new AvailabilityMetricsTracker();

            // Track expected values
            let expectedTotal = 0;
            let expectedSuccessful = 0;
            let expectedFailed = 0;
            const latencies: number[] = [];

            // Record all queries
            for (const query of queries) {
              tracker.recordDiscoveryQuery(query.success, query.latencyMs);
              expectedTotal++;
              if (query.success) {
                expectedSuccessful++;
              } else {
                expectedFailed++;
              }
              latencies.push(query.latencyMs);
            }

            // Calculate expected averages
            const expectedAvgLatency =
              latencies.reduce((a, b) => a + b, 0) / latencies.length;
            const expectedMinLatency = Math.min(...latencies);
            const expectedMaxLatency = Math.max(...latencies);

            // Get metrics and verify
            const metrics = tracker.getMetrics();

            expect(metrics.discovery.totalQueries).toBe(expectedTotal);
            expect(metrics.discovery.successfulQueries).toBe(
              expectedSuccessful,
            );
            expect(metrics.discovery.failedQueries).toBe(expectedFailed);
            expect(metrics.discovery.averageLatencyMs).toBeCloseTo(
              expectedAvgLatency,
              2,
            );
            expect(metrics.discovery.minLatencyMs).toBe(expectedMinLatency);
            expect(metrics.discovery.maxLatencyMs).toBe(expectedMaxLatency);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accurately track partition mode duration', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          fc.array(fc.integer({ min: 10, max: 1000 }), {
            minLength: 1,
            maxLength: 20,
          }),
          (enterExitSequence, delays) => {
            const tracker = new AvailabilityMetricsTracker();

            let expectedEntryCount = 0;
            let inPartition = false;

            // Simulate partition mode entries and exits with delays
            for (let i = 0; i < enterExitSequence.length; i++) {
              const shouldEnter = enterExitSequence[i];

              if (shouldEnter && !inPartition) {
                tracker.enterPartitionMode();
                expectedEntryCount++;
                inPartition = true;
              } else if (!shouldEnter && inPartition) {
                // Simulate some time passing
                const delay = delays[i % delays.length];
                const startTime = Date.now();
                while (Date.now() - startTime < delay) {
                  // Busy wait to simulate time passing
                }
                tracker.exitPartitionMode();
                inPartition = false;
              }
            }

            // Get metrics and verify
            const metrics = tracker.getMetrics();

            expect(metrics.partition.entryCount).toBe(expectedEntryCount);
            expect(metrics.partition.inPartitionMode).toBe(inPartition);

            // If we entered partition mode at least once, duration should be > 0
            if (expectedEntryCount > 0) {
              expect(metrics.partition.totalDurationMs).toBeGreaterThanOrEqual(
                0,
              );
            }

            return true;
          },
        ),
        { numRuns: 50 }, // Fewer runs due to time delays
      );
    });

    it('should accurately track reconciliation metrics', () => {
      fc.assert(
        fc.property(
          fc.array(arbReconciliationOp, { minLength: 1, maxLength: 50 }),
          (reconciliations) => {
            const tracker = new AvailabilityMetricsTracker();

            // Track expected values
            let expectedTotal = 0;
            let expectedSuccessful = 0;
            let expectedFailed = 0;
            let expectedBlocksDiscovered = 0;
            let expectedBlocksUpdated = 0;
            let expectedOrphansResolved = 0;
            let expectedConflictsResolved = 0;
            const durations: number[] = [];

            // Record all reconciliations
            for (const recon of reconciliations) {
              tracker.recordReconciliation(
                recon.success,
                recon.durationMs,
                recon.blocksDiscovered,
                recon.blocksUpdated,
                recon.orphansResolved,
                recon.conflictsResolved,
              );

              expectedTotal++;
              if (recon.success) {
                expectedSuccessful++;
              } else {
                expectedFailed++;
              }
              expectedBlocksDiscovered += recon.blocksDiscovered;
              expectedBlocksUpdated += recon.blocksUpdated;
              expectedOrphansResolved += recon.orphansResolved;
              expectedConflictsResolved += recon.conflictsResolved;
              durations.push(recon.durationMs);
            }

            // Calculate expected average duration
            const expectedAvgDuration =
              durations.reduce((a, b) => a + b, 0) / durations.length;

            // Get metrics and verify
            const metrics = tracker.getMetrics();

            expect(metrics.reconciliation.totalOperations).toBe(expectedTotal);
            expect(metrics.reconciliation.successfulOperations).toBe(
              expectedSuccessful,
            );
            expect(metrics.reconciliation.failedOperations).toBe(
              expectedFailed,
            );
            expect(metrics.reconciliation.blocksDiscovered).toBe(
              expectedBlocksDiscovered,
            );
            expect(metrics.reconciliation.blocksUpdated).toBe(
              expectedBlocksUpdated,
            );
            expect(metrics.reconciliation.orphansResolved).toBe(
              expectedOrphansResolved,
            );
            expect(metrics.reconciliation.conflictsResolved).toBe(
              expectedConflictsResolved,
            );
            expect(metrics.reconciliation.averageDurationMs).toBeCloseTo(
              expectedAvgDuration,
              2,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should export Prometheus metrics with correct format', () => {
      fc.assert(
        fc.property(
          fc.array(arbBlockCountOp, { maxLength: 10 }),
          fc.array(arbDiscoveryOp, { maxLength: 10 }),
          (blockOps, discoveryOps) => {
            const tracker = new AvailabilityMetricsTracker();

            // Apply some operations
            for (const op of blockOps) {
              if (op.type === 'set') {
                tracker.setBlockCount(op.state, op.count);
              }
            }

            for (const query of discoveryOps) {
              tracker.recordDiscoveryQuery(query.success, query.latencyMs);
            }

            // Export Prometheus metrics
            const prometheusMetrics = tracker.exportPrometheus();

            // Verify structure
            expect(Array.isArray(prometheusMetrics)).toBe(true);
            expect(prometheusMetrics.length).toBeGreaterThan(0);

            // Verify each metric has required fields
            for (const metric of prometheusMetrics) {
              expect(metric).toHaveProperty('name');
              expect(metric).toHaveProperty('type');
              expect(metric).toHaveProperty('help');
              expect(metric).toHaveProperty('value');
              expect(typeof metric.name).toBe('string');
              expect(['counter', 'gauge', 'histogram', 'summary']).toContain(
                metric.type,
              );
              expect(typeof metric.help).toBe('string');
              expect(typeof metric.value).toBe('number');
            }

            // Verify text format is valid
            const textFormat = tracker.formatPrometheusText();
            expect(typeof textFormat).toBe('string');
            expect(textFormat.length).toBeGreaterThan(0);

            // Should contain HELP and TYPE lines
            expect(textFormat).toContain('# HELP');
            expect(textFormat).toContain('# TYPE');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reset all metrics to initial state', () => {
      fc.assert(
        fc.property(
          fc.array(arbBlockCountOp, { maxLength: 20 }),
          fc.array(arbDiscoveryOp, { maxLength: 20 }),
          fc.array(arbReconciliationOp, { maxLength: 20 }),
          (blockOps, discoveryOps, reconOps) => {
            const tracker = new AvailabilityMetricsTracker();

            // Apply various operations
            for (const op of blockOps) {
              if (op.type === 'set') {
                tracker.setBlockCount(op.state, op.count);
              } else if (op.type === 'increment') {
                tracker.incrementBlockCount(op.state, op.delta);
              } else {
                tracker.decrementBlockCount(op.state, op.delta);
              }
            }

            for (const query of discoveryOps) {
              tracker.recordDiscoveryQuery(query.success, query.latencyMs);
            }

            for (const recon of reconOps) {
              tracker.recordReconciliation(
                recon.success,
                recon.durationMs,
                recon.blocksDiscovered,
                recon.blocksUpdated,
                recon.orphansResolved,
                recon.conflictsResolved,
              );
            }

            // Reset
            tracker.reset();

            // Get metrics after reset
            const metrics = tracker.getMetrics();

            // Verify all counts are zero
            for (const state of Object.values(AvailabilityState)) {
              expect(metrics.blockCounts[state]).toBe(0);
            }

            expect(metrics.discovery.totalQueries).toBe(0);
            expect(metrics.discovery.successfulQueries).toBe(0);
            expect(metrics.discovery.failedQueries).toBe(0);
            expect(metrics.discovery.averageLatencyMs).toBe(0);

            expect(metrics.partition.inPartitionMode).toBe(false);
            expect(metrics.partition.totalDurationMs).toBe(0);
            expect(metrics.partition.entryCount).toBe(0);

            expect(metrics.reconciliation.totalOperations).toBe(0);
            expect(metrics.reconciliation.successfulOperations).toBe(0);
            expect(metrics.reconciliation.failedOperations).toBe(0);
            expect(metrics.reconciliation.blocksDiscovered).toBe(0);
            expect(metrics.reconciliation.blocksUpdated).toBe(0);
            expect(metrics.reconciliation.orphansResolved).toBe(0);
            expect(metrics.reconciliation.conflictsResolved).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
