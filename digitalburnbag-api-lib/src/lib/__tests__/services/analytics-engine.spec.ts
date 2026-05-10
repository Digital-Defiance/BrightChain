/**
 * Unit tests for AnalyticsEngine.
 *
 * Feature: heartbeat-history-analytics
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 10.3, 10.4, 10.5,
 *               11.1, 11.2, 11.3, 11.4, 11.5, 2.4, 2.5
 */
import type { IStatusHistoryEntry } from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import { AnalyticsEngine } from '../../services/analytics-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entryIdCounter = 0;

function makeEntry(
  signalType: HeartbeatSignalType,
  timestamp: Date,
  overrides?: Partial<IStatusHistoryEntry<string>>,
): IStatusHistoryEntry<string> {
  entryIdCounter++;
  return {
    id: `entry-${entryIdCounter}`,
    connectionId: 'conn-1',
    userId: 'user-1',
    timestamp,
    signalType,
    eventCount: 1,
    confidence: 0.9,
    timeSinceLastActivityMs: null,
    createdAt: timestamp,
    ...overrides,
  };
}

// Reset counter before each test
beforeEach(() => {
  entryIdCounter = 0;
});

// ---------------------------------------------------------------------------
// selectGranularity
// ---------------------------------------------------------------------------

describe('AnalyticsEngine', () => {
  describe('selectGranularity', () => {
    it('should return "1h" for a 24-hour range', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-02T00:00:00Z');
      expect(AnalyticsEngine.selectGranularity(since, until)).toBe('1h');
    });

    it('should return "1h" for exactly 48 hours', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-03T00:00:00Z');
      expect(AnalyticsEngine.selectGranularity(since, until)).toBe('1h');
    });

    it('should return "6h" for a 7-day range', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-08T00:00:00Z');
      expect(AnalyticsEngine.selectGranularity(since, until)).toBe('6h');
    });

    it('should return "6h" for exactly 14 days', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-15T00:00:00Z');
      expect(AnalyticsEngine.selectGranularity(since, until)).toBe('6h');
    });

    it('should return "1d" for a 30-day range', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-31T00:00:00Z');
      expect(AnalyticsEngine.selectGranularity(since, until)).toBe('1d');
    });

    it('should return "1d" for a 90-day range', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-04-01T00:00:00Z');
      expect(AnalyticsEngine.selectGranularity(since, until)).toBe('1d');
    });
  });

  // ---------------------------------------------------------------------------
  // dominantSignal
  // ---------------------------------------------------------------------------

  describe('dominantSignal', () => {
    it('should return the signal type with the highest count', () => {
      const counts = {
        [HeartbeatSignalType.PRESENCE]: 5,
        [HeartbeatSignalType.ABSENCE]: 2,
        [HeartbeatSignalType.CHECK_FAILED]: 1,
        [HeartbeatSignalType.DURESS]: 0,
        [HeartbeatSignalType.INCONCLUSIVE]: 0,
      };
      expect(AnalyticsEngine.dominantSignal(counts)).toBe(
        HeartbeatSignalType.PRESENCE,
      );
    });

    it('should break ties by priority: DURESS > CHECK_FAILED > ABSENCE > PRESENCE', () => {
      const counts = {
        [HeartbeatSignalType.PRESENCE]: 3,
        [HeartbeatSignalType.ABSENCE]: 3,
        [HeartbeatSignalType.CHECK_FAILED]: 3,
        [HeartbeatSignalType.DURESS]: 3,
        [HeartbeatSignalType.INCONCLUSIVE]: 0,
      };
      expect(AnalyticsEngine.dominantSignal(counts)).toBe(
        HeartbeatSignalType.DURESS,
      );
    });

    it('should return CHECK_FAILED when tied with ABSENCE and PRESENCE', () => {
      const counts = {
        [HeartbeatSignalType.PRESENCE]: 2,
        [HeartbeatSignalType.ABSENCE]: 2,
        [HeartbeatSignalType.CHECK_FAILED]: 2,
        [HeartbeatSignalType.DURESS]: 0,
        [HeartbeatSignalType.INCONCLUSIVE]: 0,
      };
      expect(AnalyticsEngine.dominantSignal(counts)).toBe(
        HeartbeatSignalType.CHECK_FAILED,
      );
    });

    it('should return INCONCLUSIVE when it has the strictly highest count', () => {
      const counts = {
        [HeartbeatSignalType.PRESENCE]: 1,
        [HeartbeatSignalType.ABSENCE]: 1,
        [HeartbeatSignalType.CHECK_FAILED]: 1,
        [HeartbeatSignalType.DURESS]: 1,
        [HeartbeatSignalType.INCONCLUSIVE]: 5,
      };
      expect(AnalyticsEngine.dominantSignal(counts)).toBe(
        HeartbeatSignalType.INCONCLUSIVE,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // aggregateIntoBuckets
  // ---------------------------------------------------------------------------

  describe('aggregateIntoBuckets', () => {
    const since = new Date('2024-01-01T00:00:00Z');
    const until = new Date('2024-01-01T06:00:00Z');

    it('should produce correct number of buckets for 6h range at 1h granularity', () => {
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        [],
        since,
        until,
        '1h',
      );
      expect(buckets).toHaveLength(6);
    });

    it('should produce empty buckets when no entries', () => {
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        [],
        since,
        until,
        '1h',
      );
      for (const bucket of buckets) {
        expect(bucket.totalCount).toBe(0);
        expect(bucket.averageTimeSinceActivityMs).toBeNull();
      }
    });

    it('should assign entries to the correct bucket', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:30:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:45:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T02:15:00Z'),
        ),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );

      // First bucket (00:00-01:00) should have 2 entries
      expect(buckets[0].totalCount).toBe(2);
      expect(buckets[0].signalCounts[HeartbeatSignalType.PRESENCE]).toBe(2);

      // Third bucket (02:00-03:00) should have 1 entry
      expect(buckets[2].totalCount).toBe(1);
      expect(buckets[2].signalCounts[HeartbeatSignalType.ABSENCE]).toBe(1);

      // Other buckets should be empty
      expect(buckets[1].totalCount).toBe(0);
      expect(buckets[3].totalCount).toBe(0);
      expect(buckets[4].totalCount).toBe(0);
      expect(buckets[5].totalCount).toBe(0);
    });

    it('should preserve total count across all buckets', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:30:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T01:30:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T03:30:00Z'),
        ),
        makeEntry(HeartbeatSignalType.DURESS, new Date('2024-01-01T05:30:00Z')),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );
      const totalCount = buckets.reduce((sum, b) => sum + b.totalCount, 0);
      expect(totalCount).toBe(4);
    });

    it('should compute averageConfidence for non-empty buckets', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:10:00Z'),
          {
            confidence: 0.8,
          },
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:20:00Z'),
          {
            confidence: 1.0,
          },
        ),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );
      expect(buckets[0].averageConfidence).toBeCloseTo(0.9, 5);
    });

    it('should compute averageTimeSinceActivityMs excluding nulls', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:10:00Z'),
          {
            timeSinceLastActivityMs: 1000,
          },
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:20:00Z'),
          {
            timeSinceLastActivityMs: 3000,
          },
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:30:00Z'),
          {
            timeSinceLastActivityMs: null,
          },
        ),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );
      expect(buckets[0].averageTimeSinceActivityMs).toBeCloseTo(2000, 5);
    });

    it('should set dominantSignalType per bucket', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:10:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T00:20:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T00:30:00Z'),
        ),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );
      expect(buckets[0].dominantSignalType).toBe(HeartbeatSignalType.ABSENCE);
    });

    it('should exclude entries outside the date range', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2023-12-31T23:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:30:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T06:30:00Z'),
        ),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );
      const totalCount = buckets.reduce((sum, b) => sum + b.totalCount, 0);
      expect(totalCount).toBe(1);
    });

    it('should have continuous bucket boundaries with no gaps', () => {
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        [],
        since,
        until,
        '1h',
      );
      for (let i = 1; i < buckets.length; i++) {
        expect(buckets[i].bucketStart.getTime()).toBe(
          buckets[i - 1].bucketEnd.getTime(),
        );
      }
      expect(buckets[0].bucketStart.getTime()).toBe(since.getTime());
    });
  });

  // ---------------------------------------------------------------------------
  // computeStatistics
  // ---------------------------------------------------------------------------

  describe('computeStatistics', () => {
    const since = new Date('2024-01-01T00:00:00Z');
    const until = new Date('2024-01-02T00:00:00Z');

    it('should return null fields for empty entries', () => {
      const stats = AnalyticsEngine.computeStatistics([], since, until);
      expect(stats.uptimePercentage).toBeNull();
      expect(stats.averageResponseTimeMs).toBeNull();
      expect(stats.failureRate).toBeNull();
      expect(stats.mtbfMs).toBeNull();
      expect(stats.failureRateTrend).toBeNull();
      expect(stats.totalCheckCount).toBe(0);
    });

    it('should compute uptimePercentage correctly', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T04:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      // (2 PRESENCE + 1 ABSENCE) / 4 * 100 = 75
      expect(stats.uptimePercentage).toBeCloseTo(75, 5);
    });

    it('should compute 100% uptime when all PRESENCE', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.uptimePercentage).toBeCloseTo(100, 5);
    });

    it('should compute averageResponseTimeMs from PRESENCE entries only', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
          {
            timeSinceLastActivityMs: 1000,
          },
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
          {
            timeSinceLastActivityMs: 3000,
          },
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T03:00:00Z'),
          {
            timeSinceLastActivityMs: 9999,
          },
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      // mean of 1000 and 3000 = 2000
      expect(stats.averageResponseTimeMs).toBeCloseTo(2000, 5);
    });

    it('should return null averageResponseTimeMs when no PRESENCE entries have non-null values', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
          {
            timeSinceLastActivityMs: null,
          },
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T02:00:00Z'),
          {
            timeSinceLastActivityMs: 5000,
          },
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.averageResponseTimeMs).toBeNull();
    });

    it('should compute failureRate correctly', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T04:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      // 2 CHECK_FAILED / 4 total * 100 = 50
      expect(stats.failureRate).toBeCloseTo(50, 5);
    });

    it('should compute mtbfMs correctly with failure transitions', () => {
      // Entries: PRESENCE → CHECK_FAILED → PRESENCE → CHECK_FAILED
      // 2 transitions into CHECK_FAILED
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T04:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      const totalDurationMs = until.getTime() - since.getTime(); // 24h in ms
      expect(stats.mtbfMs).toBeCloseTo(totalDurationMs / 2, 5);
    });

    it('should return null mtbfMs when no failure transitions', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.mtbfMs).toBeNull();
    });

    it('should compute failureRateTrend correctly', () => {
      // First half (before midpoint 12:00): 1 CHECK_FAILED out of 2 = 50%
      // Second half (at/after midpoint 12:00): 0 CHECK_FAILED out of 2 = 0%
      // Trend = (0 - 50) / 50 * 100 = -100
      const entries = [
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T06:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T08:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T14:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T18:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.failureRateTrend).toBeCloseTo(-100, 5);
    });

    it('should return null failureRateTrend when first half has zero failure rate', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T06:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T18:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.failureRateTrend).toBeNull();
    });

    it('should compute signalDistribution correctly', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(HeartbeatSignalType.DURESS, new Date('2024-01-01T04:00:00Z')),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.signalDistribution[HeartbeatSignalType.PRESENCE]).toBe(2);
      expect(stats.signalDistribution[HeartbeatSignalType.ABSENCE]).toBe(1);
      expect(stats.signalDistribution[HeartbeatSignalType.DURESS]).toBe(1);
      expect(stats.signalDistribution[HeartbeatSignalType.CHECK_FAILED]).toBe(
        0,
      );
      expect(stats.totalCheckCount).toBe(4);
    });

    it('should handle single entry', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T12:00:00Z'),
          {
            timeSinceLastActivityMs: 5000,
          },
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.uptimePercentage).toBeCloseTo(100, 5);
      expect(stats.averageResponseTimeMs).toBeCloseTo(5000, 5);
      expect(stats.failureRate).toBeCloseTo(0, 5);
      expect(stats.mtbfMs).toBeNull();
      expect(stats.totalCheckCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // computeHeatmap
  // ---------------------------------------------------------------------------

  describe('computeHeatmap', () => {
    it('should produce one day per calendar day in a 3-day range', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-03T23:59:59Z');
      const heatmap = AnalyticsEngine.computeHeatmap([], since, until);
      expect(heatmap).toHaveLength(3);
      expect(heatmap[0].date).toBe('2024-01-01');
      expect(heatmap[1].date).toBe('2024-01-02');
      expect(heatmap[2].date).toBe('2024-01-03');
    });

    it('should assign entries to the correct day', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-03T23:59:59Z');
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T10:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T14:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-02T08:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-03T20:00:00Z'),
        ),
      ];
      const heatmap = AnalyticsEngine.computeHeatmap(entries, since, until);

      expect(heatmap[0].totalCount).toBe(2);
      expect(heatmap[0].signalCounts[HeartbeatSignalType.PRESENCE]).toBe(2);
      expect(heatmap[0].dominantSignalType).toBe(HeartbeatSignalType.PRESENCE);

      expect(heatmap[1].totalCount).toBe(1);
      expect(heatmap[1].signalCounts[HeartbeatSignalType.ABSENCE]).toBe(1);
      expect(heatmap[1].dominantSignalType).toBe(HeartbeatSignalType.ABSENCE);

      expect(heatmap[2].totalCount).toBe(1);
      expect(heatmap[2].signalCounts[HeartbeatSignalType.CHECK_FAILED]).toBe(1);
      expect(heatmap[2].dominantSignalType).toBe(
        HeartbeatSignalType.CHECK_FAILED,
      );
    });

    it('should return null dominantSignalType for days with no entries', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-03T23:59:59Z');
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T10:00:00Z'),
        ),
      ];
      const heatmap = AnalyticsEngine.computeHeatmap(entries, since, until);
      expect(heatmap[1].dominantSignalType).toBeNull();
      expect(heatmap[1].totalCount).toBe(0);
      expect(heatmap[2].dominantSignalType).toBeNull();
    });

    it('should handle single-day range', () => {
      const since = new Date('2024-01-15T00:00:00Z');
      const until = new Date('2024-01-15T23:59:59Z');
      const heatmap = AnalyticsEngine.computeHeatmap([], since, until);
      expect(heatmap).toHaveLength(1);
      expect(heatmap[0].date).toBe('2024-01-15');
    });
  });

  // ---------------------------------------------------------------------------
  // computeStreakInfo
  // ---------------------------------------------------------------------------

  describe('computeStreakInfo', () => {
    const now = new Date('2024-01-02T00:00:00Z');

    it('should return zeros/nulls for empty entries', () => {
      const info = AnalyticsEngine.computeStreakInfo([], now);
      expect(info.currentStreakCount).toBe(0);
      expect(info.currentStreakSignalType).toBeNull();
      expect(info.longestAbsenceDurationMs).toBeNull();
      expect(info.timeSinceLastPresenceMs).toBeNull();
    });

    it('should compute current streak from the latest entry backwards', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T04:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      expect(info.currentStreakCount).toBe(3);
      expect(info.currentStreakSignalType).toBe(HeartbeatSignalType.ABSENCE);
    });

    it('should return total count when all entries have the same signal type', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      expect(info.currentStreakCount).toBe(3);
      expect(info.currentStreakSignalType).toBe(HeartbeatSignalType.PRESENCE);
    });

    it('should compute streak of 1 for single entry', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T12:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      expect(info.currentStreakCount).toBe(1);
      expect(info.currentStreakSignalType).toBe(
        HeartbeatSignalType.CHECK_FAILED,
      );
    });

    it('should compute longestAbsenceDurationMs from contiguous ABSENCE runs', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T04:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T05:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T10:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      // First ABSENCE run: 01:00 to 03:00 = 2h = 7_200_000ms
      // Second ABSENCE run: 05:00 to 10:00 = 5h = 18_000_000ms
      expect(info.longestAbsenceDurationMs).toBe(5 * 60 * 60 * 1000);
    });

    it('should return null longestAbsenceDurationMs when no ABSENCE entries', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      expect(info.longestAbsenceDurationMs).toBeNull();
    });

    it('should return 0 longestAbsenceDurationMs for a single ABSENCE entry', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T05:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      // Single ABSENCE: duration = timestamp - timestamp = 0
      expect(info.longestAbsenceDurationMs).toBe(0);
    });

    it('should compute timeSinceLastPresenceMs correctly', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T12:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T18:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      // now (Jan 2 00:00) - last PRESENCE (Jan 1 12:00) = 12h
      expect(info.timeSinceLastPresenceMs).toBe(12 * 60 * 60 * 1000);
    });

    it('should return null timeSinceLastPresenceMs when no PRESENCE entries', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T02:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      expect(info.timeSinceLastPresenceMs).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // formatCSV
  // ---------------------------------------------------------------------------

  describe('formatCSV', () => {
    it('should produce a header row with all expected columns', () => {
      const csv = AnalyticsEngine.formatCSV([]);
      const header = csv.split('\n')[0];
      expect(header).toBe(
        'timestamp,signalType,eventCount,confidence,timeSinceLastActivityMs,httpStatusCode,errorMessage',
      );
    });

    it('should produce header + 1 row per entry', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // header + 2 rows
    });

    it('should quote fields containing commas', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T00:00:00Z'),
          {
            errorMessage: 'timeout, connection refused',
          },
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      const dataRow = csv.split('\n')[1];
      expect(dataRow).toContain('"timeout, connection refused"');
    });

    it('should escape double quotes within fields', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T00:00:00Z'),
          {
            errorMessage: 'error "unexpected"',
          },
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      const dataRow = csv.split('\n')[1];
      expect(dataRow).toContain('"error ""unexpected"""');
    });

    it('should handle null timeSinceLastActivityMs as empty string', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
          {
            timeSinceLastActivityMs: null,
          },
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      const dataRow = csv.split('\n')[1];
      const fields = dataRow.split(',');
      // timeSinceLastActivityMs is the 5th column (index 4)
      expect(fields[4]).toBe('');
    });

    it('should handle undefined httpStatusCode and errorMessage as empty strings', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      const dataRow = csv.split('\n')[1];
      const fields = dataRow.split(',');
      // httpStatusCode is 6th column (index 5), errorMessage is 7th (index 6)
      expect(fields[5]).toBe('');
      expect(fields[6]).toBe('');
    });

    it('should include timeSinceLastActivityMs value when present', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
          {
            timeSinceLastActivityMs: 12345,
          },
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      const dataRow = csv.split('\n')[1];
      expect(dataRow).toContain('12345');
    });

    it('should quote fields containing newlines', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T00:00:00Z'),
          {
            errorMessage: 'line1\nline2',
          },
        ),
      ];
      const csv = AnalyticsEngine.formatCSV(entries);
      // The field should be quoted
      expect(csv).toContain('"line1\nline2"');
    });
  });

  // ---------------------------------------------------------------------------
  // formatJSON
  // ---------------------------------------------------------------------------

  describe('formatJSON', () => {
    it('should produce valid JSON', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
        ),
      ];
      const json = AnalyticsEngine.formatJSON(entries);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should produce an array', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
      ];
      const json = AnalyticsEngine.formatJSON(entries);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should produce empty array for empty entries', () => {
      const json = AnalyticsEngine.formatJSON([]);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual([]);
    });

    it('should preserve entry field values', () => {
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T00:00:00Z'),
          {
            eventCount: 5,
            confidence: 0.95,
            timeSinceLastActivityMs: 3000,
            httpStatusCode: 200,
            errorMessage: undefined,
          },
        ),
      ];
      const json = AnalyticsEngine.formatJSON(entries);
      const parsed = JSON.parse(json);
      expect(parsed[0].signalType).toBe(HeartbeatSignalType.PRESENCE);
      expect(parsed[0].eventCount).toBe(5);
      expect(parsed[0].confidence).toBe(0.95);
      expect(parsed[0].timeSinceLastActivityMs).toBe(3000);
      expect(parsed[0].httpStatusCode).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('aggregateIntoBuckets: all entries same signal type', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-01T03:00:00Z');
      const entries = [
        makeEntry(HeartbeatSignalType.DURESS, new Date('2024-01-01T00:30:00Z')),
        makeEntry(HeartbeatSignalType.DURESS, new Date('2024-01-01T01:30:00Z')),
        makeEntry(HeartbeatSignalType.DURESS, new Date('2024-01-01T02:30:00Z')),
      ];
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        entries,
        since,
        until,
        '1h',
      );
      for (const bucket of buckets) {
        if (bucket.totalCount > 0) {
          expect(bucket.dominantSignalType).toBe(HeartbeatSignalType.DURESS);
        }
      }
    });

    it('computeStatistics: all entries are CHECK_FAILED', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-02T00:00:00Z');
      const entries = [
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T02:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.CHECK_FAILED,
          new Date('2024-01-01T03:00:00Z'),
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.uptimePercentage).toBeCloseTo(0, 5);
      expect(stats.failureRate).toBeCloseTo(100, 5);
      expect(stats.averageResponseTimeMs).toBeNull();
      // All same type → no transitions
      expect(stats.mtbfMs).toBeNull();
    });

    it('computeStreakInfo: entries provided out of order are sorted correctly', () => {
      const now = new Date('2024-01-02T00:00:00Z');
      const entries = [
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T03:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
        ),
        makeEntry(
          HeartbeatSignalType.ABSENCE,
          new Date('2024-01-01T02:00:00Z'),
        ),
      ];
      const info = AnalyticsEngine.computeStreakInfo(entries, now);
      // Sorted: PRESENCE(01:00), ABSENCE(02:00), ABSENCE(03:00)
      // Streak from latest: 2 ABSENCE
      expect(info.currentStreakCount).toBe(2);
      expect(info.currentStreakSignalType).toBe(HeartbeatSignalType.ABSENCE);
    });

    it('computeStatistics: entries with all null timeSinceLastActivityMs', () => {
      const since = new Date('2024-01-01T00:00:00Z');
      const until = new Date('2024-01-02T00:00:00Z');
      const entries = [
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T01:00:00Z'),
          {
            timeSinceLastActivityMs: null,
          },
        ),
        makeEntry(
          HeartbeatSignalType.PRESENCE,
          new Date('2024-01-01T02:00:00Z'),
          {
            timeSinceLastActivityMs: null,
          },
        ),
      ];
      const stats = AnalyticsEngine.computeStatistics(entries, since, until);
      expect(stats.averageResponseTimeMs).toBeNull();
    });
  });
});
