/**
 * Property-based tests for MultiCanaryBindingService.
 *
 * Feature: canary-provider-expansion
 *
 * Properties covered:
 *   - Property 3: Multi-canary binding provider count validation
 *   - Property 4: Redundancy policy evaluation correctness
 *   - Property 5: CHECK_FAILED exclusion from consensus
 */
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { RedundancyPolicy } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  evaluateRedundancyPolicy,
  validateProviderCount,
  MIN_PROVIDERS,
  MAX_PROVIDERS,
} from '../../services/multi-canary-binding-service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for a valid provider ID string. */
const arbProviderId: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 20,
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
  ),
});

/** Arbitrary for a unique list of N provider IDs. */
function arbProviderIds(n: number): fc.Arbitrary<string[]> {
  return fc
    .uniqueArray(arbProviderId, { minLength: n, maxLength: n })
    .filter((ids) => ids.length === n);
}

/** Arbitrary for a count below the minimum (0 or 1). */
const arbCountBelowMin: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: MIN_PROVIDERS - 1,
});

/** Arbitrary for a count above the maximum. */
const arbCountAboveMax: fc.Arbitrary<number> = fc.integer({
  min: MAX_PROVIDERS + 1,
  max: MAX_PROVIDERS + 50,
});

/** Arbitrary for a valid provider count (2–20). */
const arbValidCount: fc.Arbitrary<number> = fc.integer({
  min: MIN_PROVIDERS,
  max: MAX_PROVIDERS,
});

/** Arbitrary for a HeartbeatSignalType that counts as "active" (PRESENCE or ABSENCE). */
const arbActiveSignal: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
);

/** Arbitrary for a HeartbeatSignalType that is excluded from active count. */
const arbExcludedSignal: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.INCONCLUSIVE,
);

/** Arbitrary for any HeartbeatSignalType. */
const arbAnySignal: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.INCONCLUSIVE,
  HeartbeatSignalType.DURESS,
);

/** Arbitrary for a redundancy policy. */
const arbPolicy: fc.Arbitrary<RedundancyPolicy> = fc.constantFrom(
  'all_must_fail' as RedundancyPolicy,
  'majority_must_fail' as RedundancyPolicy,
  'any_fails' as RedundancyPolicy,
);

/** Arbitrary for a weighted_consensus threshold (0–100). */
const arbThresholdPercent: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: 100,
});

/**
 * Builds a providerSignals record from arrays of IDs and signals.
 */
function buildSignals(
  ids: string[],
  signals: HeartbeatSignalType[],
): Record<string, HeartbeatSignalType> {
  const result: Record<string, HeartbeatSignalType> = {};
  for (let i = 0; i < ids.length; i++) {
    result[ids[i]] = signals[i];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Property 3: Multi-canary binding provider count validation
// Tag: Feature: canary-provider-expansion, Property 3
// Validates: Requirements 9.1, 9.8
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 3: Multi-canary binding provider count validation', () => {
  it('validateProviderCount returns null (valid) iff 2 ≤ N ≤ 20', () => {
    /**
     * **Validates: Requirements 9.1, 9.8**
     *
     * For any N provider IDs, creation succeeds iff 2 ≤ N ≤ 20; rejected otherwise.
     * validateProviderCount returns null on success, an error string on failure.
     */
    fc.assert(
      fc.property(arbValidCount, (count) => {
        const result = validateProviderCount(count);
        return result === null;
      }),
      { numRuns: 100 },
    );
  });

  it('validateProviderCount returns an error string when N < 2', () => {
    /**
     * **Validates: Requirements 9.1, 9.8**
     *
     * For any count below the minimum (0 or 1), validateProviderCount must
     * return a non-null error string.
     */
    fc.assert(
      fc.property(arbCountBelowMin, (count) => {
        const result = validateProviderCount(count);
        return typeof result === 'string' && result.length > 0;
      }),
      { numRuns: 100 },
    );
  });

  it('validateProviderCount returns an error string when N > 20', () => {
    /**
     * **Validates: Requirements 9.1, 9.8**
     *
     * For any count above the maximum (> 20), validateProviderCount must
     * return a non-null error string.
     */
    fc.assert(
      fc.property(arbCountAboveMax, (count) => {
        const result = validateProviderCount(count);
        return typeof result === 'string' && result.length > 0;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Redundancy policy evaluation correctness
// Tag: Feature: canary-provider-expansion, Property 4
// Validates: Requirements 9.3, 9.4, 9.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 4: Redundancy policy evaluation correctness', () => {
  /**
   * Generates a set of N unique provider IDs and assigns each a random
   * active signal (PRESENCE or ABSENCE).
   */
  const arbActiveProviderSignals = (n: number) =>
    arbProviderIds(n).chain((ids) =>
      fc
        .array(arbActiveSignal, { minLength: n, maxLength: n })
        .map((signals) => ({ ids, signals })),
    );

  it('all_must_fail: triggers iff ALL active providers report ABSENCE', () => {
    /**
     * **Validates: Requirements 9.3, 9.4**
     *
     * For any set of active signals (PRESENCE or ABSENCE) and the
     * all_must_fail policy, shouldTrigger is true iff every active provider
     * reports ABSENCE.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }).chain((n) => arbActiveProviderSignals(n)),
        ({ ids, signals }) => {
          const providerSignals = buildSignals(ids, signals);
          const result = evaluateRedundancyPolicy(
            'all_must_fail',
            providerSignals,
            new Set<string>(),
            {},
            75,
          );

          const allAbsent = signals.every(
            (s) => s === HeartbeatSignalType.ABSENCE,
          );
          return result.shouldTrigger === allAbsent;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('majority_must_fail: triggers iff >50% of active providers report ABSENCE', () => {
    /**
     * **Validates: Requirements 9.3**
     *
     * For any set of active signals and the majority_must_fail policy,
     * shouldTrigger is true iff more than half of active providers report ABSENCE.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }).chain((n) => arbActiveProviderSignals(n)),
        ({ ids, signals }) => {
          const providerSignals = buildSignals(ids, signals);
          const result = evaluateRedundancyPolicy(
            'majority_must_fail',
            providerSignals,
            new Set<string>(),
            {},
            75,
          );

          const absenceCount = signals.filter(
            (s) => s === HeartbeatSignalType.ABSENCE,
          ).length;
          const majorityAbsent = absenceCount > signals.length / 2;
          return result.shouldTrigger === majorityAbsent;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('any_fails: triggers iff at least one active provider reports ABSENCE', () => {
    /**
     * **Validates: Requirements 9.3**
     *
     * For any set of active signals and the any_fails policy,
     * shouldTrigger is true iff at least one active provider reports ABSENCE.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }).chain((n) => arbActiveProviderSignals(n)),
        ({ ids, signals }) => {
          const providerSignals = buildSignals(ids, signals);
          const result = evaluateRedundancyPolicy(
            'any_fails',
            providerSignals,
            new Set<string>(),
            {},
            75,
          );

          const anyAbsent = signals.some(
            (s) => s === HeartbeatSignalType.ABSENCE,
          );
          return result.shouldTrigger === anyAbsent;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('weighted_consensus: triggers iff weighted absence score >= threshold', () => {
    /**
     * **Validates: Requirements 9.3, 9.5**
     *
     * For any set of active signals, per-provider weights, and threshold,
     * shouldTrigger is true iff the weighted absence score (as a percentage
     * of total weight) meets or exceeds the threshold.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }).chain((n) =>
          arbProviderIds(n).chain((ids) =>
            fc
              .array(arbActiveSignal, { minLength: n, maxLength: n })
              .chain((signals) =>
                fc
                  .array(
                    fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true }),
                    { minLength: n, maxLength: n },
                  )
                  .chain((weights) =>
                    arbThresholdPercent.map((threshold) => ({
                      ids,
                      signals,
                      weights,
                      threshold,
                    })),
                  ),
              ),
          ),
        ),
        ({ ids, signals, weights, threshold }) => {
          const providerSignals = buildSignals(ids, signals);
          const providerWeights: Record<string, number> = {};
          for (let i = 0; i < ids.length; i++) {
            providerWeights[ids[i]] = weights[i];
          }

          const result = evaluateRedundancyPolicy(
            'weighted_consensus',
            providerSignals,
            new Set<string>(),
            providerWeights,
            threshold,
          );

          // Compute expected weighted score manually
          let absenceWeight = 0;
          let totalWeight = 0;
          for (let i = 0; i < ids.length; i++) {
            totalWeight += weights[i];
            if (signals[i] === HeartbeatSignalType.ABSENCE) {
              absenceWeight += weights[i];
            }
          }
          const expectedScore =
            totalWeight > 0 ? (absenceWeight / totalWeight) * 100 : 0;
          const expectedTrigger = expectedScore >= threshold;

          return result.shouldTrigger === expectedTrigger;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('absenceCount and totalActive are correctly reported for all policies', () => {
    /**
     * **Validates: Requirements 9.3**
     *
     * For any set of active signals and any non-weighted policy,
     * the returned absenceCount and totalActive match the actual counts.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }).chain((n) => arbActiveProviderSignals(n)),
        arbPolicy,
        ({ ids, signals }, policy) => {
          const providerSignals = buildSignals(ids, signals);
          const result = evaluateRedundancyPolicy(
            policy,
            providerSignals,
            new Set<string>(),
            {},
            75,
          );

          const expectedAbsenceCount = signals.filter(
            (s) => s === HeartbeatSignalType.ABSENCE,
          ).length;
          const expectedTotalActive = signals.length;

          return (
            result.absenceCount === expectedAbsenceCount &&
            result.totalActive === expectedTotalActive
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: CHECK_FAILED exclusion from consensus
// Tag: Feature: canary-provider-expansion, Property 5
// Validates: Requirements 9.7
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 5: CHECK_FAILED exclusion from consensus', () => {
  it('CHECK_FAILED providers are excluded from active count and not treated as ABSENCE', () => {
    /**
     * **Validates: Requirements 9.7**
     *
     * For any binding evaluation where some providers report CHECK_FAILED,
     * those providers are excluded from the active count and are not treated
     * as ABSENCE. The result must be identical to evaluating without those
     * providers.
     */
    fc.assert(
      fc.property(
        // Generate active providers (PRESENCE or ABSENCE)
        fc.integer({ min: 2, max: 8 }).chain((nActive) =>
          arbProviderIds(nActive).chain((activeIds) =>
            fc
              .array(arbActiveSignal, {
                minLength: nActive,
                maxLength: nActive,
              })
              .chain((activeSignals) =>
                // Generate CHECK_FAILED providers (1–5)
                fc.integer({ min: 1, max: 5 }).chain((nFailed) =>
                  fc
                    .uniqueArray(arbProviderId, {
                      minLength: nFailed,
                      maxLength: nFailed,
                    })
                    // Ensure no overlap with active IDs
                    .filter((failedIds) =>
                      failedIds.every((id) => !activeIds.includes(id)),
                    )
                    .chain((failedIds) =>
                      arbPolicy.map((policy) => ({
                        activeIds,
                        activeSignals,
                        failedIds,
                        policy,
                      })),
                    ),
                ),
              ),
          ),
        ),
        ({ activeIds, activeSignals, failedIds, policy }) => {
          // Build signals with CHECK_FAILED providers mixed in
          const mixedSignals: Record<string, HeartbeatSignalType> = {};
          for (let i = 0; i < activeIds.length; i++) {
            mixedSignals[activeIds[i]] = activeSignals[i];
          }
          for (const id of failedIds) {
            mixedSignals[id] = HeartbeatSignalType.CHECK_FAILED;
          }

          // Build signals with only active providers (no CHECK_FAILED)
          const activeOnlySignals: Record<string, HeartbeatSignalType> = {};
          for (let i = 0; i < activeIds.length; i++) {
            activeOnlySignals[activeIds[i]] = activeSignals[i];
          }

          // Evaluate with mixed signals (includes CHECK_FAILED)
          const mixedResult = evaluateRedundancyPolicy(
            policy,
            mixedSignals,
            new Set<string>(),
            {},
            75,
          );

          // Evaluate with only active signals (no CHECK_FAILED)
          const activeOnlyResult = evaluateRedundancyPolicy(
            policy,
            activeOnlySignals,
            new Set<string>(),
            {},
            75,
          );

          // Results must be identical: CHECK_FAILED providers have no effect
          return (
            mixedResult.shouldTrigger === activeOnlyResult.shouldTrigger &&
            mixedResult.absenceCount === activeOnlyResult.absenceCount &&
            mixedResult.totalActive === activeOnlyResult.totalActive
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('CHECK_FAILED providers are not counted as ABSENCE in any policy', () => {
    /**
     * **Validates: Requirements 9.7**
     *
     * When ALL non-CHECK_FAILED providers report PRESENCE, no policy should
     * trigger — even if there are many CHECK_FAILED providers present.
     */
    fc.assert(
      fc.property(
        // Generate presence-only active providers
        fc.integer({ min: 2, max: 8 }).chain((nActive) =>
          arbProviderIds(nActive).chain((activeIds) =>
            // Generate CHECK_FAILED providers
            fc.integer({ min: 1, max: 5 }).chain((nFailed) =>
              fc
                .uniqueArray(arbProviderId, {
                  minLength: nFailed,
                  maxLength: nFailed,
                })
                .filter((failedIds) =>
                  failedIds.every((id) => !activeIds.includes(id)),
                )
                .chain((failedIds) =>
                  arbPolicy.map((policy) => ({
                    activeIds,
                    failedIds,
                    policy,
                  })),
                ),
            ),
          ),
        ),
        ({ activeIds, failedIds, policy }) => {
          // All active providers report PRESENCE; some report CHECK_FAILED
          const signals: Record<string, HeartbeatSignalType> = {};
          for (const id of activeIds) {
            signals[id] = HeartbeatSignalType.PRESENCE;
          }
          for (const id of failedIds) {
            signals[id] = HeartbeatSignalType.CHECK_FAILED;
          }

          const result = evaluateRedundancyPolicy(
            policy,
            signals,
            new Set<string>(),
            {},
            75,
          );

          // No policy should trigger when all active providers report PRESENCE
          // (CHECK_FAILED providers must not be treated as ABSENCE)
          return result.shouldTrigger === false && result.absenceCount === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Paused providers excluded from aggregation
// Tag: Feature: canary-provider-expansion, Property 6
// Validates: Requirements 16.2
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 6: Paused providers excluded from aggregation', () => {
  /**
   * Generates a set of active provider IDs with signals, plus a subset of
   * those IDs that are "paused".
   */
  const arbProvidersWithPaused = fc
    .integer({ min: 2, max: 8 })
    .chain((nTotal) =>
      fc
        .uniqueArray(arbProviderId, { minLength: nTotal, maxLength: nTotal })
        .filter((ids) => ids.length === nTotal)
        .chain((ids) =>
          fc
            .array(arbAnySignal, { minLength: nTotal, maxLength: nTotal })
            .chain((signals) =>
              // Choose a non-empty subset of IDs to be paused (1 to nTotal-1)
              fc
                .integer({ min: 1, max: Math.max(1, nTotal - 1) })
                .chain((nPaused) =>
                  fc
                    .uniqueArray(fc.integer({ min: 0, max: nTotal - 1 }), {
                      minLength: nPaused,
                      maxLength: nPaused,
                    })
                    .map((pausedIndices) => ({
                      ids,
                      signals,
                      pausedIds: new Set(pausedIndices.map((i) => ids[i])),
                    })),
                ),
            ),
        ),
    );

  it('paused providers are excluded from active count and do not affect shouldTrigger', () => {
    /**
     * **Validates: Requirements 16.2**
     *
     * For any set of connections where some are paused, paused providers are
     * excluded from binding evaluation and aggregate health. The result of
     * evaluating with paused providers must be identical to evaluating with
     * only the non-paused providers.
     */
    fc.assert(
      fc.property(
        arbProvidersWithPaused,
        arbPolicy,
        ({ ids, signals, pausedIds }, policy) => {
          const allSignals = buildSignals(ids, signals);

          // Build signals for non-paused providers only
          const nonPausedSignals: Record<string, HeartbeatSignalType> = {};
          for (let i = 0; i < ids.length; i++) {
            if (!pausedIds.has(ids[i])) {
              nonPausedSignals[ids[i]] = signals[i];
            }
          }

          // Evaluate with all providers but paused set populated
          const resultWithPaused = evaluateRedundancyPolicy(
            policy,
            allSignals,
            pausedIds,
            {},
            75,
          );

          // Evaluate with only non-paused providers and empty paused set
          const resultWithoutPaused = evaluateRedundancyPolicy(
            policy,
            nonPausedSignals,
            new Set<string>(),
            {},
            75,
          );

          // Results must be identical: paused providers have no effect
          return (
            resultWithPaused.shouldTrigger === resultWithoutPaused.shouldTrigger &&
            resultWithPaused.absenceCount === resultWithoutPaused.absenceCount &&
            resultWithPaused.totalActive === resultWithoutPaused.totalActive
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('paused providers reporting ABSENCE do not trigger any policy', () => {
    /**
     * **Validates: Requirements 16.2**
     *
     * When ALL non-paused providers report PRESENCE, no policy should trigger —
     * even if all paused providers report ABSENCE. Paused providers must be
     * completely excluded from aggregate health evaluation.
     */
    fc.assert(
      fc.property(
        // Non-paused providers: all report PRESENCE
        fc.integer({ min: 2, max: 8 }).chain((nActive) =>
          fc
            .uniqueArray(arbProviderId, { minLength: nActive, maxLength: nActive })
            .filter((ids) => ids.length === nActive)
            .chain((activeIds) =>
              // Paused providers: all report ABSENCE
              fc.integer({ min: 1, max: 5 }).chain((nPaused) =>
                fc
                  .uniqueArray(arbProviderId, {
                    minLength: nPaused,
                    maxLength: nPaused,
                  })
                  .filter((pausedIds) =>
                    pausedIds.every((id) => !activeIds.includes(id)),
                  )
                  .chain((pausedIds) =>
                    arbPolicy.map((policy) => ({
                      activeIds,
                      pausedIds,
                      policy,
                    })),
                  ),
              ),
            ),
        ),
        ({ activeIds, pausedIds, policy }) => {
          // Build signals: active providers report PRESENCE, paused report ABSENCE
          const signals: Record<string, HeartbeatSignalType> = {};
          for (const id of activeIds) {
            signals[id] = HeartbeatSignalType.PRESENCE;
          }
          for (const id of pausedIds) {
            signals[id] = HeartbeatSignalType.ABSENCE;
          }

          const result = evaluateRedundancyPolicy(
            policy,
            signals,
            new Set(pausedIds),
            {},
            75,
          );

          // No policy should trigger when all active (non-paused) providers report PRESENCE
          return result.shouldTrigger === false && result.absenceCount === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('paused providers are not counted in totalActive', () => {
    /**
     * **Validates: Requirements 16.2**
     *
     * For any set of providers where some are paused, totalActive must equal
     * the count of non-paused providers whose signals are not CHECK_FAILED or
     * INCONCLUSIVE (i.e., PRESENCE, ABSENCE, and DURESS are all counted as active).
     */
    fc.assert(
      fc.property(
        arbProvidersWithPaused,
        arbPolicy,
        ({ ids, signals, pausedIds }, policy) => {
          const allSignals = buildSignals(ids, signals);

          const result = evaluateRedundancyPolicy(
            policy,
            allSignals,
            pausedIds,
            {},
            75,
          );

          // Compute expected totalActive: non-paused AND not CHECK_FAILED/INCONCLUSIVE
          // The implementation excludes CHECK_FAILED and INCONCLUSIVE but counts DURESS as active
          const expectedTotalActive = ids.filter((id, i) => {
            if (pausedIds.has(id)) return false;
            const sig = signals[i];
            return (
              sig !== HeartbeatSignalType.CHECK_FAILED &&
              sig !== HeartbeatSignalType.INCONCLUSIVE
            );
          }).length;

          return result.totalActive === expectedTotalActive;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// In-memory repository helpers for Property 22
// ---------------------------------------------------------------------------

import {
  MultiCanaryBindingService,
  MIN_PROVIDERS,
} from '../../services/multi-canary-binding-service';
import type { IMultiCanaryConnectionRepository } from '../../services/multi-canary-binding-service';
import type { IMultiCanaryBindingBase } from '@brightchain/digitalburnbag-lib';
import type { BrightDBMultiCanaryBindingRepository } from '../../collections/multi-canary-binding-collection';

/**
 * Creates a fully in-memory BrightDBMultiCanaryBindingRepository for testing.
 * Stores bindings in a plain Map, supporting all CRUD operations.
 */
function createInMemoryBindingRepository(): BrightDBMultiCanaryBindingRepository<string> {
  const store = new Map<string, IMultiCanaryBindingBase<string>>();

  return {
    getBindingById: async (id: string) => store.get(id) ?? null,
    getBindingsForUser: async (userId: string) =>
      [...store.values()].filter((b) => b.userId === userId),
    getBindingsForTarget: async (targetId: string) =>
      [...store.values()].filter(
        (b) =>
          (b.vaultContainerIds as string[]).includes(targetId) ||
          (b.fileIds as string[]).includes(targetId) ||
          (b.folderIds as string[]).includes(targetId),
      ),
    getBindingsForConnection: async (connectionId: string) =>
      [...store.values()].filter((b) =>
        (b.providerConnectionIds as string[]).includes(connectionId),
      ),
    createBinding: async (binding: IMultiCanaryBindingBase<string>) => {
      store.set(String(binding.id), binding);
    },
    updateBinding: async (
      bindingId: string,
      updates: Partial<IMultiCanaryBindingBase<string>>,
    ) => {
      const existing = store.get(String(bindingId));
      if (existing) {
        store.set(String(bindingId), {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        });
      }
    },
    deleteBinding: async (bindingId: string) => {
      store.delete(String(bindingId));
    },
  } as unknown as BrightDBMultiCanaryBindingRepository<string>;
}

/**
 * Creates a connection repository where all connections are "connected"
 * and none are paused (suitable for binding creation).
 */
function createAllConnectedRepository(): IMultiCanaryConnectionRepository<string> {
  return {
    getConnection: async (connectionId: string) => ({
      id: connectionId,
      status: 'connected' as const,
      isPaused: false,
    }),
  } as unknown as IMultiCanaryConnectionRepository<string>;
}

// ---------------------------------------------------------------------------
// Property 22: Provider disconnect removes from all bindings
// Tag: Feature: canary-provider-expansion, Property 22
// Validates: Requirements 16.4, 16.5, 16.6
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 22: Provider disconnect removes from all bindings', () => {
  /**
   * Generates K bindings (1–5), each with 2–6 providers, where one specific
   * provider ID appears in all K bindings.
   */
  const arbBindingsWithSharedProvider = fc
    .integer({ min: 1, max: 5 })
    .chain((k) =>
      arbProviderId.chain((sharedProviderId) =>
        fc
          .array(
            // Each binding has 2–6 providers, always including the shared one
            fc
              .integer({ min: 1, max: 5 })
              .chain((nOthers) =>
                fc
                  .uniqueArray(arbProviderId, {
                    minLength: nOthers,
                    maxLength: nOthers,
                  })
                  .filter(
                    (others) =>
                      others.length === nOthers &&
                      !others.includes(sharedProviderId),
                  )
                  .map((others) => [sharedProviderId, ...others]),
              ),
            { minLength: k, maxLength: k },
          )
          .map((bindingProviderSets) => ({ sharedProviderId, bindingProviderSets })),
      ),
    );

  it('disconnecting a provider removes it from all K bindings', async () => {
    /**
     * **Validates: Requirements 16.4, 16.5**
     *
     * For any provider in K bindings, disconnecting removes it from all K
     * bindings. The impact report must list all K bindings as affected.
     */
    await fc.assert(
      fc.asyncProperty(
        arbBindingsWithSharedProvider,
        async ({ sharedProviderId, bindingProviderSets }) => {
          const repo = createInMemoryBindingRepository();
          const connRepo = createAllConnectedRepository();
          let idCounter = 0;
          const service = new MultiCanaryBindingService<string>(
            repo,
            connRepo,
            undefined,
            () => `binding-${++idCounter}`,
          );

          const userId = 'user-disconnect-test';

          // Create K bindings, each containing the shared provider
          const createdBindingIds: string[] = [];
          for (const providerIds of bindingProviderSets) {
            const binding = await service.createBinding({
              userId,
              name: `Binding ${idCounter}`,
              vaultContainerIds: [`vault-${idCounter}`],
              fileIds: [],
              folderIds: [],
              providerConnectionIds: providerIds,
              redundancyPolicy: 'all_must_fail',
              protocolAction: 'notify' as never,
              canaryCondition: 'absence' as never,
            });
            createdBindingIds.push(String(binding.id));
          }

          // Disconnect the shared provider
          const impactReport = await service.removeProviderFromBindings(
            sharedProviderId,
          );

          // All K bindings must be in the affected list
          const k = bindingProviderSets.length;
          if (impactReport.affectedBindings.length !== k) return false;

          // Every created binding ID must appear in affectedBindings
          const affectedSet = new Set(impactReport.affectedBindings);
          if (!createdBindingIds.every((id) => affectedSet.has(id))) return false;

          // Verify the shared provider is actually removed from each binding
          for (const bindingId of createdBindingIds) {
            const updated = await repo.getBindingById(bindingId);
            if (!updated) return false;
            if (
              (updated.providerConnectionIds as string[]).includes(
                sharedProviderId,
              )
            ) {
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('bindings reduced to <2 providers are flagged in bindingsReducedBelowMinimum', async () => {
    /**
     * **Validates: Requirements 16.5, 16.6**
     *
     * When disconnecting a provider reduces a binding to fewer than 2 providers,
     * that binding must appear in bindingsReducedBelowMinimum. Bindings that
     * still have ≥2 providers must appear in bindingsStillValid.
     */
    await fc.assert(
      fc.asyncProperty(
        arbBindingsWithSharedProvider,
        async ({ sharedProviderId, bindingProviderSets }) => {
          const repo = createInMemoryBindingRepository();
          const connRepo = createAllConnectedRepository();
          let idCounter = 0;
          const service = new MultiCanaryBindingService<string>(
            repo,
            connRepo,
            undefined,
            () => `binding-${++idCounter}`,
          );

          const userId = 'user-flag-test';

          // Create K bindings
          const createdBindings: Array<{
            id: string;
            providerCount: number;
          }> = [];
          for (const providerIds of bindingProviderSets) {
            const binding = await service.createBinding({
              userId,
              name: `Binding ${idCounter}`,
              vaultContainerIds: [`vault-${idCounter}`],
              fileIds: [],
              folderIds: [],
              providerConnectionIds: providerIds,
              redundancyPolicy: 'all_must_fail',
              protocolAction: 'notify' as never,
              canaryCondition: 'absence' as never,
            });
            createdBindings.push({
              id: String(binding.id),
              providerCount: providerIds.length,
            });
          }

          // Disconnect the shared provider
          const impactReport = await service.removeProviderFromBindings(
            sharedProviderId,
          );

          // Verify classification: bindings with only 1 provider left → below minimum
          for (const { id, providerCount } of createdBindings) {
            const remainingCount = providerCount - 1; // removed the shared provider
            if (remainingCount < MIN_PROVIDERS) {
              // Must be in bindingsReducedBelowMinimum
              if (!impactReport.bindingsReducedBelowMinimum.includes(id)) {
                return false;
              }
              // Must NOT be in bindingsStillValid
              if (impactReport.bindingsStillValid.includes(id)) {
                return false;
              }
            } else {
              // Must be in bindingsStillValid
              if (!impactReport.bindingsStillValid.includes(id)) {
                return false;
              }
              // Must NOT be in bindingsReducedBelowMinimum
              if (impactReport.bindingsReducedBelowMinimum.includes(id)) {
                return false;
              }
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('affectedBindings + non-affected = total bindings for user', async () => {
    /**
     * **Validates: Requirements 16.4**
     *
     * The impact report's affectedBindings must contain exactly the bindings
     * that included the disconnected provider — no more, no less.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate a shared provider and two groups: bindings WITH it and WITHOUT it
        arbProviderId.chain((sharedProviderId) =>
          fc
            .integer({ min: 1, max: 4 })
            .chain((nWith) =>
              fc
                .integer({ min: 0, max: 4 })
                .chain((nWithout) =>
                  // Bindings containing the shared provider
                  fc
                    .array(
                      fc
                        .integer({ min: 1, max: 4 })
                        .chain((nOthers) =>
                          fc
                            .uniqueArray(arbProviderId, {
                              minLength: nOthers,
                              maxLength: nOthers,
                            })
                            .filter(
                              (others) =>
                                others.length === nOthers &&
                                !others.includes(sharedProviderId),
                            )
                            .map((others) => [sharedProviderId, ...others]),
                        ),
                      { minLength: nWith, maxLength: nWith },
                    )
                    .chain((withBindings) =>
                      // Bindings NOT containing the shared provider (2+ distinct providers)
                      fc
                        .array(
                          fc
                            .integer({ min: 2, max: 4 })
                            .chain((n) =>
                              fc
                                .uniqueArray(arbProviderId, {
                                  minLength: n,
                                  maxLength: n,
                                })
                                .filter(
                                  (ids) =>
                                    ids.length === n &&
                                    !ids.includes(sharedProviderId),
                                ),
                            ),
                          { minLength: nWithout, maxLength: nWithout },
                        )
                        .map((withoutBindings) => ({
                          sharedProviderId,
                          withBindings,
                          withoutBindings,
                        })),
                    ),
                ),
            ),
        ),
        async ({ sharedProviderId, withBindings, withoutBindings }) => {
          const repo = createInMemoryBindingRepository();
          const connRepo = createAllConnectedRepository();
          let idCounter = 0;
          const service = new MultiCanaryBindingService<string>(
            repo,
            connRepo,
            undefined,
            () => `binding-${++idCounter}`,
          );

          const userId = 'user-scope-test';

          // Create bindings that include the shared provider
          const withIds: string[] = [];
          for (const providerIds of withBindings) {
            const binding = await service.createBinding({
              userId,
              name: `With-${idCounter}`,
              vaultContainerIds: [`vault-${idCounter}`],
              fileIds: [],
              folderIds: [],
              providerConnectionIds: providerIds,
              redundancyPolicy: 'all_must_fail',
              protocolAction: 'notify' as never,
              canaryCondition: 'absence' as never,
            });
            withIds.push(String(binding.id));
          }

          // Create bindings that do NOT include the shared provider
          const withoutIds: string[] = [];
          for (const providerIds of withoutBindings) {
            const binding = await service.createBinding({
              userId,
              name: `Without-${idCounter}`,
              vaultContainerIds: [`vault-${idCounter}`],
              fileIds: [],
              folderIds: [],
              providerConnectionIds: providerIds,
              redundancyPolicy: 'all_must_fail',
              protocolAction: 'notify' as never,
              canaryCondition: 'absence' as never,
            });
            withoutIds.push(String(binding.id));
          }

          // Disconnect the shared provider
          const impactReport = await service.removeProviderFromBindings(
            sharedProviderId,
          );

          // affectedBindings must be exactly the "with" bindings
          const affectedSet = new Set(impactReport.affectedBindings);
          const expectedAffectedCount = withIds.length;

          if (affectedSet.size !== expectedAffectedCount) return false;
          if (!withIds.every((id) => affectedSet.has(id))) return false;
          // "without" bindings must NOT be in affectedBindings
          if (withoutIds.some((id) => affectedSet.has(id))) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
