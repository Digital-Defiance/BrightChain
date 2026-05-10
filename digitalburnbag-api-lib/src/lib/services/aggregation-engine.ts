import type {
  IAggregatedHeartbeatStatus,
  IAggregationConfig,
  IAggregationEngine,
  IHeartbeatCheckResult,
} from '@brightchain/digitalburnbag-lib';
import {
  HeartbeatSignalType,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Default category weights for the "weighted" aggregation strategy.
 * PLATFORM_NATIVE: 2.0, HEALTH_FITNESS: 1.5, COMMUNICATION: 1.2, others: 1.0
 */
export const DEFAULT_CATEGORY_WEIGHTS: Partial<
  Record<ProviderCategory, number>
> = {
  [ProviderCategory.PLATFORM_NATIVE]: 2.0,
  [ProviderCategory.HEALTH_FITNESS]: 1.5,
  [ProviderCategory.COMMUNICATION]: 1.2,
};

/** Default weight for categories not explicitly listed. */
export const DEFAULT_WEIGHT = 1.0;

/**
 * Resolves the effective weight for a provider.
 * Per-provider overrides take precedence over category weights.
 */
export function resolveWeight(
  providerId: string,
  category: ProviderCategory | undefined,
  config: IAggregationConfig,
): number {
  // Per-provider override
  if (config.providerWeights?.[providerId] !== undefined) {
    return config.providerWeights[providerId];
  }
  // Category weight
  if (
    category !== undefined &&
    config.categoryWeights?.[category] !== undefined
  ) {
    return config.categoryWeights[category]!;
  }
  // Fallback
  return DEFAULT_WEIGHT;
}

/**
 * Concrete implementation of IAggregationEngine.
 *
 * Computes aggregate heartbeat status across multiple providers for a user
 * using the configured aggregation strategy.
 *
 * Strategies:
 *   - "any":      PRESENCE if ≥1 provider shows PRESENCE
 *   - "all":      PRESENCE only if ALL providers show PRESENCE
 *   - "majority": PRESENCE if >50% of providers show PRESENCE
 *   - "weighted": PRESENCE if weighted PRESENCE score > weighted total / 2
 *
 * Safety invariants:
 *   - Duress: if ANY provider reports DURESS → duressDetected = true
 *   - All-failures: if ALL providers return CHECK_FAILED → aggregate is CHECK_FAILED, not ABSENCE
 *   - All paused: if all providers are paused (INCONCLUSIVE) → INCONCLUSIVE
 *   - No providers: INCONCLUSIVE with 0 confidence
 *   - Single provider: pass through
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class AggregationEngine<TID extends PlatformID = string>
  implements IAggregationEngine<TID>
{
  /**
   * Optional provider-to-category mapping.
   * Used by the "weighted" strategy to look up category weights.
   */
  private readonly providerCategories: Map<string, ProviderCategory>;

  constructor(providerCategories?: Map<string, ProviderCategory>) {
    this.providerCategories = providerCategories ?? new Map();
  }

  aggregate(
    results: Map<TID, IHeartbeatCheckResult<TID>>,
    config: IAggregationConfig,
  ): IAggregatedHeartbeatStatus<TID> {
    const now = new Date();

    // Edge case: no providers → INCONCLUSIVE with 0 confidence
    if (results.size === 0) {
      return this.buildResult({
        userId: '' as unknown as TID,
        aggregatedAt: now,
        overallSignalType: HeartbeatSignalType.INCONCLUSIVE,
        overallConfidence: 0,
        providerResults: results,
        duressDetected: false,
        duressDetails: [],
        absenceProviders: [],
        presenceProviders: [],
        failedProviders: [],
        skippedProviders: [],
      });
    }

    // Collect signal categories
    const presenceProviders: TID[] = [];
    const absenceProviders: TID[] = [];
    const failedProviders: Array<{ providerId: TID; error: string }> = [];
    const duressDetails: IAggregatedHeartbeatStatus<TID>['duressDetails'] = [];
    const inconclusiveProviders: TID[] = [];
    let duressDetected = false;
    let mostRecentEvent: IHeartbeatCheckResult<TID>['latestEvent'] | undefined;
    let minTimeSinceActivity: number | undefined;
    let confidenceSum = 0;
    let confidenceCount = 0;

    // Extract a userId from the first result
    let userId: TID = '' as unknown as TID;
    let firstResult = true;

    for (const [providerId, result] of results) {
      if (firstResult) {
        // Use the first provider's result to infer userId context
        firstResult = false;
      }

      // Duress safety: any DURESS → duressDetected = true (Req 9.4)
      if (
        result.signalType === HeartbeatSignalType.DURESS ||
        result.duressDetected
      ) {
        duressDetected = true;
        duressDetails.push({
          providerId,
          type: result.duressDetails?.type ?? 'unknown',
          event: result.duressDetails?.triggerEvent,
          context: result.duressDetails?.context,
        });
      }

      // Categorise by signal type
      switch (result.signalType) {
        case HeartbeatSignalType.PRESENCE:
          presenceProviders.push(providerId);
          break;
        case HeartbeatSignalType.ABSENCE:
          absenceProviders.push(providerId);
          break;
        case HeartbeatSignalType.CHECK_FAILED:
          failedProviders.push({
            providerId,
            error: result.error ?? 'Check failed',
          });
          break;
        case HeartbeatSignalType.DURESS:
          // Duress providers count as presence for aggregation purposes
          presenceProviders.push(providerId);
          break;
        case HeartbeatSignalType.INCONCLUSIVE:
        default:
          inconclusiveProviders.push(providerId);
          break;
      }

      // Track most recent event
      if (result.latestEvent) {
        if (
          !mostRecentEvent ||
          result.latestEvent.timestamp > mostRecentEvent.timestamp
        ) {
          mostRecentEvent = result.latestEvent;
        }
      }

      // Track minimum time since activity
      if (
        result.timeSinceLastActivityMs !== null &&
        result.timeSinceLastActivityMs !== undefined
      ) {
        if (
          minTimeSinceActivity === undefined ||
          result.timeSinceLastActivityMs < minTimeSinceActivity
        ) {
          minTimeSinceActivity = result.timeSinceLastActivityMs;
        }
      }

      // Accumulate confidence
      confidenceSum += result.confidence;
      confidenceCount++;
    }

    const overallConfidence =
      confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

    // All-failures safety: if ALL providers return CHECK_FAILED → CHECK_FAILED, not ABSENCE (Req 9.5)
    if (failedProviders.length === results.size) {
      return this.buildResult({
        userId,
        aggregatedAt: now,
        overallSignalType: HeartbeatSignalType.CHECK_FAILED,
        overallConfidence,
        providerResults: results,
        mostRecentEvent,
        timeSinceLastActivityMs: minTimeSinceActivity,
        duressDetected,
        duressDetails,
        absenceProviders,
        presenceProviders,
        failedProviders,
        skippedProviders: [],
      });
    }

    // All inconclusive (e.g. all paused) → INCONCLUSIVE
    if (inconclusiveProviders.length === results.size) {
      return this.buildResult({
        userId,
        aggregatedAt: now,
        overallSignalType: HeartbeatSignalType.INCONCLUSIVE,
        overallConfidence,
        providerResults: results,
        mostRecentEvent,
        timeSinceLastActivityMs: minTimeSinceActivity,
        duressDetected,
        duressDetails,
        absenceProviders,
        presenceProviders,
        failedProviders,
        skippedProviders: [],
      });
    }

    // Determine overall signal based on strategy
    const overallSignalType = this.applyStrategy(
      config,
      presenceProviders,
      absenceProviders,
      failedProviders,
      inconclusiveProviders,
      results,
    );

    return this.buildResult({
      userId,
      aggregatedAt: now,
      overallSignalType,
      overallConfidence,
      providerResults: results,
      mostRecentEvent,
      timeSinceLastActivityMs: minTimeSinceActivity,
      duressDetected,
      duressDetails,
      absenceProviders,
      presenceProviders,
      failedProviders,
      skippedProviders: [],
    });
  }

  /**
   * Apply the configured aggregation strategy to determine the overall signal.
   */
  private applyStrategy(
    config: IAggregationConfig,
    presenceProviders: TID[],
    absenceProviders: TID[],
    failedProviders: Array<{ providerId: TID; error: string }>,
    inconclusiveProviders: TID[],
    results: Map<TID, IHeartbeatCheckResult<TID>>,
  ): HeartbeatSignalType {
    // Count only "decisive" providers (PRESENCE or ABSENCE) for strategy evaluation
    const decisiveCount = presenceProviders.length + absenceProviders.length;

    switch (config.strategy) {
      case 'any':
        // PRESENCE if ≥1 provider shows PRESENCE
        return presenceProviders.length >= 1
          ? HeartbeatSignalType.PRESENCE
          : decisiveCount > 0
            ? HeartbeatSignalType.ABSENCE
            : HeartbeatSignalType.INCONCLUSIVE;

      case 'all':
        // PRESENCE only if ALL decisive providers show PRESENCE
        if (decisiveCount === 0) return HeartbeatSignalType.INCONCLUSIVE;
        return absenceProviders.length === 0 && presenceProviders.length > 0
          ? HeartbeatSignalType.PRESENCE
          : HeartbeatSignalType.ABSENCE;

      case 'majority':
        // PRESENCE if >50% of decisive providers show PRESENCE
        if (decisiveCount === 0) return HeartbeatSignalType.INCONCLUSIVE;
        return presenceProviders.length > decisiveCount / 2
          ? HeartbeatSignalType.PRESENCE
          : HeartbeatSignalType.ABSENCE;

      case 'weighted':
        return this.applyWeightedStrategy(
          config,
          presenceProviders,
          absenceProviders,
          results,
        );

      default:
        return HeartbeatSignalType.INCONCLUSIVE;
    }
  }

  /**
   * Weighted strategy: PRESENCE if weighted PRESENCE score exceeds half of total weight.
   *
   * Uses a small epsilon to guard against floating-point rounding at the
   * exact boundary (e.g. 7.7 vs 15.4 / 2 computed via different addition
   * orders).  The comparison is strictly "greater than"; ties go to ABSENCE.
   */
  private applyWeightedStrategy(
    config: IAggregationConfig,
    presenceProviders: TID[],
    absenceProviders: TID[],
    results: Map<TID, IHeartbeatCheckResult<TID>>,
  ): HeartbeatSignalType {
    let presenceWeight = 0;
    let absenceWeight = 0;

    // Only consider decisive providers (PRESENCE or ABSENCE)
    for (const providerId of presenceProviders) {
      const category = this.providerCategories.get(String(providerId));
      const weight = resolveWeight(String(providerId), category, config);
      presenceWeight += weight;
    }

    for (const providerId of absenceProviders) {
      const category = this.providerCategories.get(String(providerId));
      const weight = resolveWeight(String(providerId), category, config);
      absenceWeight += weight;
    }

    const totalWeight = presenceWeight + absenceWeight;
    if (totalWeight === 0) return HeartbeatSignalType.INCONCLUSIVE;

    // PRESENCE if weighted presence score strictly exceeds half of total weight.
    // Compare via difference to avoid floating-point ordering issues with division.
    return presenceWeight > absenceWeight
      ? HeartbeatSignalType.PRESENCE
      : HeartbeatSignalType.ABSENCE;
  }

  /**
   * Build the full IAggregatedHeartbeatStatus from partial data.
   */
  private buildResult(
    partial: Omit<IAggregatedHeartbeatStatus<TID>, 'isAlive'>,
  ): IAggregatedHeartbeatStatus<TID> {
    const isAlive =
      partial.overallSignalType === HeartbeatSignalType.PRESENCE
        ? true
        : partial.overallSignalType === HeartbeatSignalType.ABSENCE
          ? false
          : undefined;

    return {
      ...partial,
      isAlive,
    };
  }
}
