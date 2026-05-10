/**
 * Property-based tests for ProviderHealthGrid pure functions.
 *
 * Feature: canary-provider-expansion
 *
 * Property 18: Provider health grid aggregate percentage calculation
 * Property 19: Provider health grid sorting correctness
 *
 * Validates: Requirements 12.4, 12.7
 */

import { HeartbeatSignalType, ProviderCategory } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  computeHealthPercentages,
  IProviderConnectionExtendedForGrid,
  sortConnections,
  SortCriterion,
} from '../../components/ProviderHealthGrid';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const signalTypeArb = fc.constantFrom(
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.DURESS,
  undefined,
);

const sortCriterionArb: fc.Arbitrary<SortCriterion> = fc.constantFrom(
  'name',
  'lastActivity',
  'statusSeverity',
  'category',
);

const providerCategoryArb = fc.constantFrom(...Object.values(ProviderCategory));

const validDateStringArb = fc
  .integer({ min: 946684800000, max: 1893456000000 })
  .map((ts) => new Date(ts).toISOString());

/** Arbitrary for a minimal IProviderConnectionExtendedForGrid. */
const connectionArb: fc.Arbitrary<IProviderConnectionExtendedForGrid> = fc.record({
  id: fc.uuid(),
  providerId: fc.string({ minLength: 1, maxLength: 20 }),
  providerDisplayName: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
  providerUsername: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
  status: fc.constantFrom('connected', 'expired', 'error', 'paused', 'pending') as fc.Arbitrary<
    'connected' | 'expired' | 'error' | 'paused' | 'pending'
  >,
  lastCheckSignalType: signalTypeArb,
  lastCheckedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastActivityAt: fc.option(validDateStringArb, { nil: undefined }),
  isPaused: fc.option(fc.boolean(), { nil: undefined }),
  providerConfig: fc.option(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      name: fc.string({ minLength: 1, maxLength: 40 }),
      description: fc.string({ maxLength: 80 }),
      category: providerCategoryArb,
      icon: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      baseUrl: fc.constant('https://api.example.com'),
      auth: fc.constant({ type: 'api_key' as const }),
      endpoints: fc.constant({
        activity: {
          path: '/activity',
          method: 'GET' as const,
          responseMapping: {
            eventsPath: 'events',
            timestampPath: 'ts',
            timestampFormat: 'iso8601' as const,
          },
        },
      }),
      defaultLookbackMs: fc.constant(86400000),
      minCheckIntervalMs: fc.constant(60000),
      supportsWebhooks: fc.boolean(),
      enabledByDefault: fc.boolean(),
    }),
    { nil: undefined },
  ),
  signalHistory: fc.option(
    fc.array(signalTypeArb.filter((s): s is HeartbeatSignalType => s !== undefined), {
      minLength: 0,
      maxLength: 20,
    }),
    { nil: undefined },
  ),
});

// ---------------------------------------------------------------------------
// Property 18: Provider health grid aggregate percentage calculation
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 18: Provider health grid aggregate percentage calculation', () => {
  /**
   * **Validates: Requirements 12.7**
   *
   * For any set of statuses, percentages sum to 100% (within floating-point
   * tolerance); each category's percentage = (count / total) * 100.
   */
  it('percentages sum to 100% for any non-empty set of connections', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 1, maxLength: 50 }),
        (connections) => {
          const result = computeHealthPercentages(connections);
          const sum = result.presence + result.absence + result.checkFailed + result.other;
          // Allow floating-point tolerance of 0.001%
          expect(Math.abs(sum - 100)).toBeLessThan(0.001);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all zeros for an empty connection list', () => {
    const result = computeHealthPercentages([]);
    expect(result.presence).toBe(0);
    expect(result.absence).toBe(0);
    expect(result.checkFailed).toBe(0);
    expect(result.other).toBe(0);
  });

  it('each category percentage equals (count / total) * 100', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 1, maxLength: 50 }),
        (connections) => {
          const total = connections.length;
          const result = computeHealthPercentages(connections);

          const presenceCount = connections.filter(
            (c) =>
              c.lastCheckSignalType === HeartbeatSignalType.PRESENCE ||
              c.lastCheckSignalType === 'presence',
          ).length;
          const absenceCount = connections.filter(
            (c) =>
              c.lastCheckSignalType === HeartbeatSignalType.ABSENCE ||
              c.lastCheckSignalType === 'absence',
          ).length;
          const checkFailedCount = connections.filter(
            (c) =>
              c.lastCheckSignalType === HeartbeatSignalType.CHECK_FAILED ||
              c.lastCheckSignalType === 'check_failed',
          ).length;
          const otherCount = total - presenceCount - absenceCount - checkFailedCount;

          expect(result.presence).toBeCloseTo((presenceCount / total) * 100, 5);
          expect(result.absence).toBeCloseTo((absenceCount / total) * 100, 5);
          expect(result.checkFailed).toBeCloseTo((checkFailedCount / total) * 100, 5);
          expect(result.other).toBeCloseTo((otherCount / total) * 100, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all percentages are non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 0, maxLength: 50 }),
        (connections) => {
          const result = computeHealthPercentages(connections);
          expect(result.presence).toBeGreaterThanOrEqual(0);
          expect(result.absence).toBeGreaterThanOrEqual(0);
          expect(result.checkFailed).toBeGreaterThanOrEqual(0);
          expect(result.other).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('100% presence when all connections have PRESENCE signal', () => {
    fc.assert(
      fc.property(
        fc.array(
          connectionArb.map((c) => ({ ...c, lastCheckSignalType: HeartbeatSignalType.PRESENCE })),
          { minLength: 1, maxLength: 20 },
        ),
        (connections) => {
          const result = computeHealthPercentages(connections);
          expect(result.presence).toBeCloseTo(100, 5);
          expect(result.absence).toBe(0);
          expect(result.checkFailed).toBe(0);
          expect(result.other).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: Provider health grid sorting correctness
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 19: Provider health grid sorting correctness', () => {
  /**
   * **Validates: Requirements 12.4**
   *
   * For any connections and any sort criterion, result is correctly ordered
   * and contains exactly the same elements as the unsorted input.
   */
  it('sorted result contains exactly the same elements as the input', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 0, maxLength: 30 }),
        sortCriterionArb,
        (connections, criterion) => {
          const sorted = sortConnections(connections, criterion);

          // Same length
          expect(sorted.length).toBe(connections.length);

          // Same elements (by id)
          const inputIds = connections.map((c) => c.id).sort();
          const sortedIds = sorted.map((c) => c.id).sort();
          expect(sortedIds).toEqual(inputIds);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sort by name produces lexicographically ordered names', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 0, maxLength: 20 }),
        (connections) => {
          const sorted = sortConnections(connections, 'name');

          for (let i = 0; i < sorted.length - 1; i++) {
            const nameA = (
              sorted[i].providerDisplayName ??
              sorted[i].providerConfig?.name ??
              sorted[i].providerId
            ).toLowerCase();
            const nameB = (
              sorted[i + 1].providerDisplayName ??
              sorted[i + 1].providerConfig?.name ??
              sorted[i + 1].providerId
            ).toLowerCase();
            expect(nameA.localeCompare(nameB)).toBeLessThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sort by statusSeverity places CHECK_FAILED before ABSENCE before PRESENCE', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 2, maxLength: 20 }),
        (connections) => {
          const sorted = sortConnections(connections, 'statusSeverity');

          // Verify ordering: CHECK_FAILED (0) ≤ ABSENCE (1) ≤ DURESS (2) ≤ PRESENCE (3) ≤ other (4)
          const severityOf = (sig?: HeartbeatSignalType | string): number => {
            switch (sig) {
              case HeartbeatSignalType.CHECK_FAILED:
              case 'check_failed':
                return 0;
              case HeartbeatSignalType.ABSENCE:
              case 'absence':
                return 1;
              case HeartbeatSignalType.DURESS:
              case 'duress':
                return 2;
              case HeartbeatSignalType.PRESENCE:
              case 'presence':
                return 3;
              default:
                return 4;
            }
          };

          for (let i = 0; i < sorted.length - 1; i++) {
            expect(severityOf(sorted[i].lastCheckSignalType)).toBeLessThanOrEqual(
              severityOf(sorted[i + 1].lastCheckSignalType),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sort by category produces lexicographically ordered categories', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 0, maxLength: 20 }),
        (connections) => {
          const sorted = sortConnections(connections, 'category');

          for (let i = 0; i < sorted.length - 1; i++) {
            const catA = (sorted[i].providerConfig?.category ?? '').toLowerCase();
            const catB = (sorted[i + 1].providerConfig?.category ?? '').toLowerCase();
            expect(catA.localeCompare(catB)).toBeLessThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sort by lastActivity places most recent first', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 0, maxLength: 20 }),
        (connections) => {
          const sorted = sortConnections(connections, 'lastActivity');

          for (let i = 0; i < sorted.length - 1; i++) {
            const tsA = sorted[i].lastActivityAt ?? sorted[i].lastCheckedAt ?? '';
            const tsB = sorted[i + 1].lastActivityAt ?? sorted[i + 1].lastCheckedAt ?? '';

            // Both empty: equal (ok)
            if (tsA === '' && tsB === '') continue;
            // A empty means A comes after B (less recent)
            if (tsA === '') continue;
            // B empty means B comes after A (less recent) — A should be before B
            if (tsB === '') continue;
            // Both non-empty: A should be >= B (most recent first)
            expect(tsA.localeCompare(tsB)).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 1, maxLength: 20 }),
        sortCriterionArb,
        (connections, criterion) => {
          const originalIds = connections.map((c) => c.id);
          sortConnections(connections, criterion);
          // Original array order should be unchanged
          expect(connections.map((c) => c.id)).toEqual(originalIds);
        },
      ),
      { numRuns: 100 },
    );
  });
});
