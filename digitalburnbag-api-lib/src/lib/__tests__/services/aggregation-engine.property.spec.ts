/**
 * Property-based tests for AggregationEngine.
 *
 * Feature: canary-provider-system
 */
import type {
  IAggregationConfig,
  IHeartbeatCheckResult,
} from '@brightchain/digitalburnbag-lib';
import {
  HeartbeatSignalType,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  AggregationEngine,
  resolveWeight,
} from '../../services/aggregation-engine';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for a decisive signal type (PRESENCE or ABSENCE only). */
const arbDecisiveSignal: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
);

/** Arbitrary for any HeartbeatSignalType. */
const arbSignalType: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.DURESS,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.INCONCLUSIVE,
);

/** Arbitrary for a ProviderCategory. */
const arbProviderCategory: fc.Arbitrary<ProviderCategory> = fc.constantFrom(
  ProviderCategory.PLATFORM_NATIVE,
  ProviderCategory.HEALTH_FITNESS,
  ProviderCategory.COMMUNICATION,
  ProviderCategory.SOCIAL_MEDIA,
  ProviderCategory.DEVELOPER,
  ProviderCategory.OTHER,
);

/** Build a minimal IHeartbeatCheckResult with the given signal type. */
function makeResult(
  signalType: HeartbeatSignalType,
): IHeartbeatCheckResult<string> {
  return {
    success: signalType !== HeartbeatSignalType.CHECK_FAILED,
    checkedAt: new Date(),
    events: [],
    eventCount: 0,
    signalType,
    isAlive:
      signalType === HeartbeatSignalType.PRESENCE
        ? true
        : signalType === HeartbeatSignalType.ABSENCE
          ? false
          : undefined,
    confidence: signalType === HeartbeatSignalType.CHECK_FAILED ? 0 : 0.8,
    timeSinceLastActivityMs: null,
    duressDetected: signalType === HeartbeatSignalType.DURESS,
    duressDetails:
      signalType === HeartbeatSignalType.DURESS
        ? { type: 'test_duress' }
        : undefined,
  };
}

/** Build a results map from an array of [providerId, signalType] pairs. */
function buildResultsMap(
  entries: Array<[string, HeartbeatSignalType]>,
): Map<string, IHeartbeatCheckResult<string>> {
  const map = new Map<string, IHeartbeatCheckResult<string>>();
  for (const [id, signal] of entries) {
    map.set(id, makeResult(signal));
  }
  return map;
}

/** Build a default IAggregationConfig for a given strategy. */
function makeConfig(
  strategy: IAggregationConfig['strategy'],
  overrides?: Partial<IAggregationConfig>,
): IAggregationConfig {
  return {
    strategy,
    minConfidenceThreshold: 0.5,
    failureCountsAsNotAlive: false,
    maxCacheAgeMs: 300_000,
    duressHandling: 'immediate',
    categoryWeights: {
      [ProviderCategory.PLATFORM_NATIVE]: 2.0,
      [ProviderCategory.HEALTH_FITNESS]: 1.5,
      [ProviderCategory.COMMUNICATION]: 1.2,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 19: Aggregation strategy correctness
// Tag: Feature: canary-provider-system, Property 19: Aggregation strategy correctness
// Validates: Requirements 9.1, 9.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 19: Aggregation strategy correctness', () => {
  it('"any" strategy → PRESENCE if ≥1 PRESENCE among decisive providers', () => {
    /**
     * **Validates: Requirements 9.1, 9.3**
     *
     * For any set of decisive results (PRESENCE/ABSENCE), the "any" strategy
     * returns PRESENCE if at least one provider shows PRESENCE.
     */
    fc.assert(
      fc.property(
        fc.array(arbDecisiveSignal, { minLength: 1, maxLength: 20 }),
        (signals) => {
          const entries: Array<[string, HeartbeatSignalType]> = signals.map(
            (s, i) => [`provider-${i}`, s],
          );
          const results = buildResultsMap(entries);
          const engine = new AggregationEngine();
          const config = makeConfig('any');
          const aggregated = engine.aggregate(results, config);

          const hasPresence = signals.some(
            (s) => s === HeartbeatSignalType.PRESENCE,
          );

          if (hasPresence) {
            return (
              aggregated.overallSignalType === HeartbeatSignalType.PRESENCE
            );
          } else {
            return aggregated.overallSignalType === HeartbeatSignalType.ABSENCE;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('"all" strategy → PRESENCE only if all decisive providers show PRESENCE', () => {
    /**
     * **Validates: Requirements 9.1, 9.3**
     *
     * For any set of decisive results, the "all" strategy returns PRESENCE
     * only if every provider shows PRESENCE.
     */
    fc.assert(
      fc.property(
        fc.array(arbDecisiveSignal, { minLength: 1, maxLength: 20 }),
        (signals) => {
          const entries: Array<[string, HeartbeatSignalType]> = signals.map(
            (s, i) => [`provider-${i}`, s],
          );
          const results = buildResultsMap(entries);
          const engine = new AggregationEngine();
          const config = makeConfig('all');
          const aggregated = engine.aggregate(results, config);

          const allPresence = signals.every(
            (s) => s === HeartbeatSignalType.PRESENCE,
          );

          if (allPresence) {
            return (
              aggregated.overallSignalType === HeartbeatSignalType.PRESENCE
            );
          } else {
            return aggregated.overallSignalType === HeartbeatSignalType.ABSENCE;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('"majority" strategy → PRESENCE if >50% of decisive providers show PRESENCE', () => {
    /**
     * **Validates: Requirements 9.1, 9.3**
     *
     * For any set of decisive results, the "majority" strategy returns
     * PRESENCE if more than half show PRESENCE.
     */
    fc.assert(
      fc.property(
        fc.array(arbDecisiveSignal, { minLength: 1, maxLength: 20 }),
        (signals) => {
          const entries: Array<[string, HeartbeatSignalType]> = signals.map(
            (s, i) => [`provider-${i}`, s],
          );
          const results = buildResultsMap(entries);
          const engine = new AggregationEngine();
          const config = makeConfig('majority');
          const aggregated = engine.aggregate(results, config);

          const presenceCount = signals.filter(
            (s) => s === HeartbeatSignalType.PRESENCE,
          ).length;
          const isMajority = presenceCount > signals.length / 2;

          if (isMajority) {
            return (
              aggregated.overallSignalType === HeartbeatSignalType.PRESENCE
            );
          } else {
            return aggregated.overallSignalType === HeartbeatSignalType.ABSENCE;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('"weighted" strategy → PRESENCE if weighted PRESENCE score exceeds threshold', () => {
    /**
     * **Validates: Requirements 9.1, 9.3**
     *
     * For any set of decisive results with assigned categories, the "weighted"
     * strategy returns PRESENCE if the weighted PRESENCE score exceeds half
     * of the total weight.
     */
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbDecisiveSignal, arbProviderCategory), {
          minLength: 1,
          maxLength: 20,
        }),
        (signalsWithCategories) => {
          const providerCategories = new Map<string, ProviderCategory>();
          const entries: Array<[string, HeartbeatSignalType]> = [];

          signalsWithCategories.forEach(([signal, category], i) => {
            const id = `provider-${i}`;
            entries.push([id, signal]);
            providerCategories.set(id, category);
          });

          const results = buildResultsMap(entries);
          const config = makeConfig('weighted');
          const engine = new AggregationEngine(providerCategories);
          const aggregated = engine.aggregate(results, config);

          // Compute expected weighted score
          let presenceWeight = 0;
          let absenceWeight = 0;
          for (const [id, signal] of entries) {
            const category = providerCategories.get(id);
            const weight = resolveWeight(id, category, config);
            if (signal === HeartbeatSignalType.PRESENCE) {
              presenceWeight += weight;
            } else {
              absenceWeight += weight;
            }
          }

          const expectedPresence = presenceWeight > absenceWeight;

          if (expectedPresence) {
            return (
              aggregated.overallSignalType === HeartbeatSignalType.PRESENCE
            );
          } else {
            return aggregated.overallSignalType === HeartbeatSignalType.ABSENCE;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Duress detection safety invariant
// Tag: Feature: canary-provider-system, Property 20: Duress detection safety invariant
// Validates: Requirements 9.4
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 20: Duress detection safety invariant', () => {
  it('duressDetected is true whenever ≥1 provider reports DURESS, regardless of strategy', () => {
    /**
     * **Validates: Requirements 9.4**
     *
     * For any strategy and any results where at least one provider reports
     * DURESS, the aggregate has duressDetected = true.
     */
    const arbStrategy: fc.Arbitrary<IAggregationConfig['strategy']> =
      fc.constantFrom(
        'any' as const,
        'all' as const,
        'majority' as const,
        'weighted' as const,
      );

    fc.assert(
      fc.property(
        arbStrategy,
        // At least 1 DURESS + 0..19 other signals
        fc.array(arbSignalType, { minLength: 0, maxLength: 19 }),
        (strategy, otherSignals) => {
          // Ensure at least one DURESS
          const signals: HeartbeatSignalType[] = [
            HeartbeatSignalType.DURESS,
            ...otherSignals,
          ];

          const entries: Array<[string, HeartbeatSignalType]> = signals.map(
            (s, i) => [`provider-${i}`, s],
          );
          const results = buildResultsMap(entries);
          const engine = new AggregationEngine();
          const config = makeConfig(strategy);
          const aggregated = engine.aggregate(results, config);

          return aggregated.duressDetected === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: All-failures aggregate safety invariant
// Tag: Feature: canary-provider-system, Property 21: All-failures aggregate safety invariant
// Validates: Requirements 9.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 21: All-failures aggregate safety invariant', () => {
  it('when all providers return CHECK_FAILED, aggregate is CHECK_FAILED not ABSENCE', () => {
    /**
     * **Validates: Requirements 9.5**
     *
     * For any number of providers (≥1) where all return CHECK_FAILED,
     * the aggregate signal is CHECK_FAILED, not ABSENCE.
     */
    const arbStrategy: fc.Arbitrary<IAggregationConfig['strategy']> =
      fc.constantFrom(
        'any' as const,
        'all' as const,
        'majority' as const,
        'weighted' as const,
      );

    fc.assert(
      fc.property(
        arbStrategy,
        fc.integer({ min: 1, max: 20 }),
        (strategy, providerCount) => {
          const entries: Array<[string, HeartbeatSignalType]> = Array.from(
            { length: providerCount },
            (_, i) => [`provider-${i}`, HeartbeatSignalType.CHECK_FAILED],
          );
          const results = buildResultsMap(entries);
          const engine = new AggregationEngine();
          const config = makeConfig(strategy);
          const aggregated = engine.aggregate(results, config);

          return (
            aggregated.overallSignalType === HeartbeatSignalType.CHECK_FAILED &&
            aggregated.overallSignalType !== HeartbeatSignalType.ABSENCE
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
