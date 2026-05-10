/**
 * Unit tests for AggregationEngine.
 *
 * Feature: canary-provider-system
 * Requirements: 9.2, 9.6
 */
import type {
  IAggregationConfig,
  IHeartbeatCheckResult,
} from '@brightchain/digitalburnbag-lib';
import {
  DEFAULT_AGGREGATION_CONFIG,
  HeartbeatSignalType,
} from '@brightchain/digitalburnbag-lib';
import { AggregationEngine } from '../../services/aggregation-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  signalType: HeartbeatSignalType,
  overrides?: Partial<IHeartbeatCheckResult<string>>,
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
    confidence: 0.8,
    timeSinceLastActivityMs: null,
    duressDetected: signalType === HeartbeatSignalType.DURESS,
    ...overrides,
  };
}

function makeConfig(
  overrides?: Partial<IAggregationConfig>,
): IAggregationConfig {
  return {
    strategy: 'any',
    minConfidenceThreshold: 0.5,
    failureCountsAsNotAlive: false,
    maxCacheAgeMs: 300_000,
    duressHandling: 'immediate',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AggregationEngine', () => {
  // Req 9.2: Default strategy is "any"
  describe('default strategy is "any" (Req 9.2)', () => {
    it('should use DEFAULT_AGGREGATION_CONFIG with strategy "any"', () => {
      expect(DEFAULT_AGGREGATION_CONFIG.strategy).toBe('any');
    });

    it('should return PRESENCE when at least one provider shows PRESENCE using default config', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.ABSENCE)],
        ['fitbit', makeResult(HeartbeatSignalType.PRESENCE)],
        ['slack', makeResult(HeartbeatSignalType.CHECK_FAILED)],
      ]);

      const config = makeConfig({
        strategy: DEFAULT_AGGREGATION_CONFIG.strategy,
      });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.overallSignalType).toBe(HeartbeatSignalType.PRESENCE);
    });
  });

  // Req 9.6: Aggregate display includes contributing providers
  describe('aggregate display includes contributing providers (Req 9.6)', () => {
    it('should list presence providers in presenceProviders array', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.PRESENCE)],
        ['fitbit', makeResult(HeartbeatSignalType.PRESENCE)],
        ['slack', makeResult(HeartbeatSignalType.ABSENCE)],
      ]);

      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.presenceProviders).toContain('github');
      expect(aggregated.presenceProviders).toContain('fitbit');
      expect(aggregated.presenceProviders).not.toContain('slack');
    });

    it('should list absence providers in absenceProviders array', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.PRESENCE)],
        ['slack', makeResult(HeartbeatSignalType.ABSENCE)],
      ]);

      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.absenceProviders).toContain('slack');
      expect(aggregated.absenceProviders).not.toContain('github');
    });

    it('should list failed providers in failedProviders array', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.PRESENCE)],
        [
          'slack',
          makeResult(HeartbeatSignalType.CHECK_FAILED, { error: 'timeout' }),
        ],
      ]);

      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.failedProviders).toHaveLength(1);
      expect(aggregated.failedProviders[0].providerId).toBe('slack');
      expect(aggregated.failedProviders[0].error).toBe('timeout');
    });

    it('should include all provider results in providerResults map', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.PRESENCE)],
        ['fitbit', makeResult(HeartbeatSignalType.ABSENCE)],
      ]);

      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.providerResults.size).toBe(2);
      expect(aggregated.providerResults.has('github')).toBe(true);
      expect(aggregated.providerResults.has('fitbit')).toBe(true);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should return INCONCLUSIVE with 0 confidence when no providers', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>();
      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.overallSignalType).toBe(
        HeartbeatSignalType.INCONCLUSIVE,
      );
      expect(aggregated.overallConfidence).toBe(0);
    });

    it('should pass through single provider result', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.ABSENCE)],
      ]);
      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.overallSignalType).toBe(HeartbeatSignalType.ABSENCE);
    });

    it('should return INCONCLUSIVE when all providers are INCONCLUSIVE', () => {
      const engine = new AggregationEngine();
      const results = new Map<string, IHeartbeatCheckResult<string>>([
        ['github', makeResult(HeartbeatSignalType.INCONCLUSIVE)],
        ['fitbit', makeResult(HeartbeatSignalType.INCONCLUSIVE)],
      ]);
      const config = makeConfig({ strategy: 'any' });
      const aggregated = engine.aggregate(results, config);

      expect(aggregated.overallSignalType).toBe(
        HeartbeatSignalType.INCONCLUSIVE,
      );
    });
  });
});
