/**
 * Property-based tests for AnalyticsEngine.
 *
 * Feature: heartbeat-history-analytics
 */
import {
  HeartbeatSignalType,
  type IStatusHistoryEntry,
} from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import { AnalyticsEngine } from '../../services/analytics-engine';

// ---------------------------------------------------------------------------
// Arbitraries & Helpers
// ---------------------------------------------------------------------------

/** All signal types in the enum. */
const ALL_SIGNAL_TYPES: HeartbeatSignalType[] = [
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.DURESS,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.INCONCLUSIVE,
];

/** Priority-ordered signal types (used by dominantSignal tie-breaking). */
const PRIORITY_SIGNALS: HeartbeatSignalType[] = [
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.DURESS,
];

const arbSignalType: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  ...ALL_SIGNAL_TYPES,
);

/** Granularity durations in ms. */
const GRANULARITY_MS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
} as const;

/** Build a minimal IStatusHistoryEntry. */
function makeEntry(
  overrides: Partial<IStatusHistoryEntry<string>> = {},
): IStatusHistoryEntry<string> {
  const now = new Date();
  return {
    id: 'entry-1',
    connectionId: 'conn-1',
    userId: 'user-1',
    timestamp: now,
    signalType: HeartbeatSignalType.PRESENCE,
    eventCount: 1,
    confidence: 0.9,
    timeSinceLastActivityMs: null,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Arbitrary for IStatusHistoryEntry with timestamp constrained to [since, until).
 */
function arbEntryInRange(
  sinceMs: number,
  untilMs: number,
): fc.Arbitrary<IStatusHistoryEntry<string>> {
  return fc
    .record({
      signalType: arbSignalType,
      confidence: fc.double({ min: 0, max: 1, noNaN: true }),
      eventCount: fc.integer({ min: 0, max: 100 }),
      timeSinceLastActivityMs: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 0, max: 1_000_000 }),
      ),
      httpStatusCode: fc.option(fc.integer({ min: 100, max: 599 }), {
        nil: undefined,
      }),
      errorMessage: fc.option(fc.string({ minLength: 0, maxLength: 50 }), {
        nil: undefined,
      }),
      timestampMs: fc.integer({ min: sinceMs, max: untilMs - 1 }),
    })
    .map((r) => {
      const ts = new Date(r.timestampMs);
      return makeEntry({
        id: `entry-${r.timestampMs}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: ts,
        signalType: r.signalType,
        confidence: r.confidence,
        eventCount: r.eventCount,
        timeSinceLastActivityMs: r.timeSinceLastActivityMs,
        httpStatusCode: r.httpStatusCode,
        errorMessage: r.errorMessage,
        createdAt: ts,
      });
    });
}

/**
 * Arbitrary for a date range where since < until.
 * Produces [sinceMs, untilMs] with a minimum span of 1 hour.
 */
const arbDateRange: fc.Arbitrary<{ since: Date; until: Date }> = fc
  .record({
    baseMs: fc.integer({
      min: Date.UTC(2020, 0, 1),
      max: Date.UTC(2025, 0, 1),
    }),
    spanMs: fc.integer({
      min: 60 * 60 * 1000, // 1 hour minimum
      max: 120 * 24 * 60 * 60 * 1000, // 120 days max
    }),
  })
  .map(({ baseMs, spanMs }) => ({
    since: new Date(baseMs),
    until: new Date(baseMs + spanMs),
  }));

/**
 * Arbitrary for entries + date range together, ensuring entries are within range.
 */
function arbEntriesAndRange(
  minEntries = 0,
  maxEntries = 30,
): fc.Arbitrary<{
  entries: IStatusHistoryEntry<string>[];
  since: Date;
  until: Date;
}> {
  return arbDateRange.chain(({ since, until }) =>
    fc
      .array(arbEntryInRange(since.getTime(), until.getTime()), {
        minLength: minEntries,
        maxLength: maxEntries,
      })
      .map((entries) => ({ entries, since, until })),
  );
}

/** Count entries within [since, until). */
function countInRange(
  entries: IStatusHistoryEntry<string>[],
  since: Date,
  until: Date,
): number {
  const sinceMs = since.getTime();
  const untilMs = until.getTime();
  return entries.filter((e) => {
    const ts = e.timestamp.getTime();
    return ts >= sinceMs && ts < untilMs;
  }).length;
}

/** UTC date string YYYY-MM-DD. */
function utcDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Count calendar days between two dates (inclusive of both endpoints' dates). */
function countCalendarDays(since: Date, until: Date): number {
  const startDay = new Date(
    Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()),
  );
  const endDay = new Date(
    Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate()),
  );
  return (
    Math.round((endDay.getTime() - startDay.getTime()) / (24 * 3600 * 1000)) + 1
  );
}

// ---------------------------------------------------------------------------
// Property 1: Granularity selection correctness
// Validates: Requirements 1.3, 10.2
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 1: Granularity selection correctness', () => {
  it('returns correct granularity based on date range span', () => {
    /**
     * **Validates: Requirements 1.3, 10.2**
     */
    fc.assert(
      fc.property(arbDateRange, ({ since, until }) => {
        const spanMs = until.getTime() - since.getTime();
        const result = AnalyticsEngine.selectGranularity(since, until);

        const HOURS_48 = 48 * 60 * 60 * 1000;
        const DAYS_14 = 14 * 24 * 60 * 60 * 1000;

        if (spanMs <= HOURS_48) {
          return result === '1h';
        } else if (spanMs <= DAYS_14) {
          return result === '6h';
        } else {
          return result === '1d';
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Aggregation preserves total count
// Validates: Requirements 10.3
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 2: Aggregation preserves total count', () => {
  it('sum of bucket totalCounts equals count of entries within range', () => {
    /**
     * **Validates: Requirements 10.3**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 30), ({ entries, since, until }) => {
        const granularity = AnalyticsEngine.selectGranularity(since, until);
        const buckets = AnalyticsEngine.aggregateIntoBuckets(
          entries,
          since,
          until,
          granularity,
        );
        const bucketTotal = buckets.reduce((sum, b) => sum + b.totalCount, 0);
        const expectedCount = countInRange(entries, since, until);
        return bucketTotal === expectedCount;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Continuous time axis — correct bucket count
// Validates: Requirements 10.4
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 3: Continuous time axis — correct bucket count', () => {
  it('returns exactly ceil((until - since) / granularityMs) buckets', () => {
    /**
     * **Validates: Requirements 10.4**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 10), ({ entries, since, until }) => {
        const granularity = AnalyticsEngine.selectGranularity(since, until);
        const buckets = AnalyticsEngine.aggregateIntoBuckets(
          entries,
          since,
          until,
          granularity,
        );
        const spanMs = until.getTime() - since.getTime();
        const stepMs = GRANULARITY_MS[granularity];
        const expectedCount = Math.ceil(spanMs / stepMs);
        return buckets.length === expectedCount;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Entry-to-bucket assignment correctness
// Validates: Requirements 10.1
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 4: Entry-to-bucket assignment correctness', () => {
  it('each entry in [since, until) is counted in exactly one bucket', () => {
    /**
     * **Validates: Requirements 10.1**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(1, 20), ({ entries, since, until }) => {
        const granularity = AnalyticsEngine.selectGranularity(since, until);
        const buckets = AnalyticsEngine.aggregateIntoBuckets(
          entries,
          since,
          until,
          granularity,
        );

        // For each entry in range, verify it falls in exactly one bucket
        for (const entry of entries) {
          const ts = entry.timestamp.getTime();
          if (ts < since.getTime() || ts >= until.getTime()) continue;

          let matchCount = 0;
          for (const bucket of buckets) {
            const bStart = bucket.bucketStart.getTime();
            const bEnd = bucket.bucketEnd.getTime();
            if (ts >= bStart && ts < bEnd) {
              matchCount++;
            }
          }
          if (matchCount !== 1) return false;
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Dominant signal type priority
// Validates: Requirements 6.2, 10.5
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 5: Dominant signal type priority', () => {
  it('for tied counts, returns highest priority; for strict max, returns that type', () => {
    /**
     * **Validates: Requirements 6.2, 10.5**
     */
    const arbCounts: fc.Arbitrary<Record<HeartbeatSignalType, number>> = fc
      .record({
        [HeartbeatSignalType.PRESENCE]: fc.integer({ min: 0, max: 20 }),
        [HeartbeatSignalType.ABSENCE]: fc.integer({ min: 0, max: 20 }),
        [HeartbeatSignalType.CHECK_FAILED]: fc.integer({ min: 0, max: 20 }),
        [HeartbeatSignalType.DURESS]: fc.integer({ min: 0, max: 20 }),
        [HeartbeatSignalType.INCONCLUSIVE]: fc.integer({ min: 0, max: 20 }),
      })
      .filter((c) => {
        // Ensure at least one count > 0 among priority signals
        return (
          PRIORITY_SIGNALS.some((s) => c[s] > 0) ||
          c[HeartbeatSignalType.INCONCLUSIVE] > 0
        );
      });

    fc.assert(
      fc.property(arbCounts, (counts) => {
        const result = AnalyticsEngine.dominantSignal(counts);

        // Find the max count among priority signals
        const maxPriorityCount = Math.max(
          ...PRIORITY_SIGNALS.map((s) => counts[s]),
        );
        const inconclusiveCount = counts[HeartbeatSignalType.INCONCLUSIVE];

        if (inconclusiveCount > maxPriorityCount) {
          // INCONCLUSIVE wins outright when it has strictly more
          return result === HeartbeatSignalType.INCONCLUSIVE;
        }

        // Among priority signals with the max count, the highest priority wins
        const tiedSignals = PRIORITY_SIGNALS.filter(
          (s) => counts[s] === maxPriorityCount,
        );
        // Highest priority = last in PRIORITY_SIGNALS array
        const expectedWinner = tiedSignals[tiedSignals.length - 1];
        return result === expectedWinner;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Uptime percentage formula
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 6: Uptime percentage formula', () => {
  it('uptimePercentage = (PRESENCE + ABSENCE) / total * 100 for non-empty; null for empty', () => {
    /**
     * **Validates: Requirements 3.1**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 30), ({ entries, since, until }) => {
        const stats = AnalyticsEngine.computeStatistics(entries, since, until);

        if (entries.length === 0) {
          return stats.uptimePercentage === null;
        }

        const presenceCount = entries.filter(
          (e) => e.signalType === HeartbeatSignalType.PRESENCE,
        ).length;
        const absenceCount = entries.filter(
          (e) => e.signalType === HeartbeatSignalType.ABSENCE,
        ).length;
        const expected =
          ((presenceCount + absenceCount) / entries.length) * 100;

        return Math.abs(stats.uptimePercentage! - expected) < 1e-9;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Average response time formula
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 7: Average response time formula', () => {
  it('averageResponseTimeMs equals mean of timeSinceLastActivityMs for qualifying PRESENCE entries', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 30), ({ entries, since, until }) => {
        const stats = AnalyticsEngine.computeStatistics(entries, since, until);

        const qualifying = entries.filter(
          (e) =>
            e.signalType === HeartbeatSignalType.PRESENCE &&
            e.timeSinceLastActivityMs !== null &&
            e.timeSinceLastActivityMs !== undefined,
        );

        if (qualifying.length === 0) {
          return stats.averageResponseTimeMs === null;
        }

        const expectedMean =
          qualifying.reduce(
            (sum, e) => sum + (e.timeSinceLastActivityMs as number),
            0,
          ) / qualifying.length;

        return Math.abs(stats.averageResponseTimeMs! - expectedMean) < 1e-6;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Failure rate formula
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 8: Failure rate formula', () => {
  it('failureRate = CHECK_FAILED / total * 100 for non-empty; null for empty', () => {
    /**
     * **Validates: Requirements 3.3**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 30), ({ entries, since, until }) => {
        const stats = AnalyticsEngine.computeStatistics(entries, since, until);

        if (entries.length === 0) {
          return stats.failureRate === null;
        }

        const checkFailedCount = entries.filter(
          (e) => e.signalType === HeartbeatSignalType.CHECK_FAILED,
        ).length;
        const expected = (checkFailedCount / entries.length) * 100;

        return Math.abs(stats.failureRate! - expected) < 1e-9;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: MTBF formula
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 9: MTBF formula', () => {
  it('mtbfMs = totalDurationMs / numberOfFailureTransitions; null when no transitions', () => {
    /**
     * **Validates: Requirements 3.4**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 30), ({ entries, since, until }) => {
        const stats = AnalyticsEngine.computeStatistics(entries, since, until);

        if (entries.length === 0) {
          return stats.mtbfMs === null;
        }

        const totalDurationMs = until.getTime() - since.getTime();
        const sorted = [...entries].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        let failureTransitions = 0;
        for (let i = 1; i < sorted.length; i++) {
          if (
            sorted[i].signalType === HeartbeatSignalType.CHECK_FAILED &&
            sorted[i - 1].signalType !== HeartbeatSignalType.CHECK_FAILED
          ) {
            failureTransitions++;
          }
        }

        if (failureTransitions === 0) {
          return stats.mtbfMs === null;
        }

        const expected = totalDurationMs / failureTransitions;
        return Math.abs(stats.mtbfMs! - expected) < 1e-6;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Failure rate trend computation
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 10: Failure rate trend computation', () => {
  it('failureRateTrend = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100; null when firstHalfRate is 0', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 30), ({ entries, since, until }) => {
        const stats = AnalyticsEngine.computeStatistics(entries, since, until);

        if (entries.length === 0) {
          return stats.failureRateTrend === null;
        }

        const midpointMs =
          since.getTime() + (until.getTime() - since.getTime()) / 2;
        const sorted = [...entries].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        const firstHalf = sorted.filter(
          (e) => e.timestamp.getTime() < midpointMs,
        );
        const secondHalf = sorted.filter(
          (e) => e.timestamp.getTime() >= midpointMs,
        );

        const firstHalfRate =
          firstHalf.length > 0
            ? (firstHalf.filter(
                (e) => e.signalType === HeartbeatSignalType.CHECK_FAILED,
              ).length /
                firstHalf.length) *
              100
            : 0;

        const secondHalfRate =
          secondHalf.length > 0
            ? (secondHalf.filter(
                (e) => e.signalType === HeartbeatSignalType.CHECK_FAILED,
              ).length /
                secondHalf.length) *
              100
            : 0;

        if (firstHalfRate === 0) {
          return stats.failureRateTrend === null;
        }

        const expected =
          ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100;
        return Math.abs(stats.failureRateTrend! - expected) < 1e-6;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Heatmap produces correct day count
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 11: Heatmap produces correct day count', () => {
  it('returns exactly one IHeatmapDay per calendar day in range, no missing or duplicate days', () => {
    /**
     * **Validates: Requirements 6.1**
     */
    fc.assert(
      fc.property(arbEntriesAndRange(0, 15), ({ entries, since, until }) => {
        const heatmap = AnalyticsEngine.computeHeatmap(entries, since, until);
        const expectedDays = countCalendarDays(since, until);

        if (heatmap.length !== expectedDays) return false;

        // Check no duplicate dates
        const dateSet = new Set(heatmap.map((d) => d.date));
        if (dateSet.size !== heatmap.length) return false;

        // Check all expected dates are present
        const startDay = new Date(
          Date.UTC(
            since.getUTCFullYear(),
            since.getUTCMonth(),
            since.getUTCDate(),
          ),
        );
        for (let i = 0; i < expectedDays; i++) {
          const d = new Date(startDay.getTime() + i * 24 * 3600 * 1000);
          const dateStr = utcDateStr(d);
          if (!dateSet.has(dateStr)) return false;
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Current streak computation with invariants
// Validates: Requirements 11.1, 11.5
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 12: Current streak computation with invariants', () => {
  it('currentStreakCount >= 1 for non-empty; equals total when all same type; streak type equals most recent', () => {
    /**
     * **Validates: Requirements 11.1, 11.5**
     */
    fc.assert(
      fc.property(
        fc.array(arbSignalType, { minLength: 1, maxLength: 30 }),
        fc.integer({
          min: Date.UTC(2024, 0, 1),
          max: Date.UTC(2025, 0, 1),
        }),
        (signalTypes, baseMs) => {
          const now = new Date(baseMs + signalTypes.length * 60000 + 60000);
          const entries: IStatusHistoryEntry<string>[] = signalTypes.map(
            (st, i) =>
              makeEntry({
                id: `e-${i}`,
                timestamp: new Date(baseMs + i * 60000),
                signalType: st,
              }),
          );

          const info = AnalyticsEngine.computeStreakInfo(entries, now);

          // Streak count >= 1
          if (info.currentStreakCount < 1) return false;

          // Streak signal type equals most recent entry's type
          const sorted = [...entries].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
          );
          const mostRecentType = sorted[sorted.length - 1].signalType;
          if (info.currentStreakSignalType !== mostRecentType) return false;

          // When all same type, streak equals total
          const allSame = signalTypes.every((s) => s === signalTypes[0]);
          if (allSame && info.currentStreakCount !== entries.length)
            return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Longest absence duration
// Validates: Requirements 11.2
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 13: Longest absence duration', () => {
  it('longestAbsenceDurationMs equals max span of contiguous ABSENCE subsequences; null when no ABSENCE', () => {
    /**
     * **Validates: Requirements 11.2**
     */
    fc.assert(
      fc.property(
        fc.array(arbSignalType, { minLength: 1, maxLength: 30 }),
        fc.integer({
          min: Date.UTC(2024, 0, 1),
          max: Date.UTC(2024, 6, 1),
        }),
        (signalTypes, baseMs) => {
          const now = new Date(baseMs + signalTypes.length * 60000 + 60000);
          const entries: IStatusHistoryEntry<string>[] = signalTypes.map(
            (st, i) =>
              makeEntry({
                id: `e-${i}`,
                timestamp: new Date(baseMs + i * 60000),
                signalType: st,
              }),
          );

          const info = AnalyticsEngine.computeStreakInfo(entries, now);

          const hasAbsence = signalTypes.some(
            (s) => s === HeartbeatSignalType.ABSENCE,
          );

          if (!hasAbsence) {
            return info.longestAbsenceDurationMs === null;
          }

          // Compute expected longest absence duration
          const sorted = [...entries].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
          );

          let maxDuration = 0;
          let runStart: number | null = null;

          for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].signalType === HeartbeatSignalType.ABSENCE) {
              if (runStart === null) {
                runStart = sorted[i].timestamp.getTime();
              }
              if (
                i === sorted.length - 1 ||
                sorted[i + 1].signalType !== HeartbeatSignalType.ABSENCE
              ) {
                const duration = sorted[i].timestamp.getTime() - runStart;
                maxDuration = Math.max(maxDuration, duration);
                runStart = null;
              }
            }
          }

          return info.longestAbsenceDurationMs === maxDuration;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Time since last presence
// Validates: Requirements 8.2, 11.3, 11.4
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 14: Time since last presence', () => {
  it('timeSinceLastPresenceMs = now - most recent PRESENCE timestamp; null when no PRESENCE', () => {
    /**
     * **Validates: Requirements 8.2, 11.3, 11.4**
     */
    fc.assert(
      fc.property(
        fc.array(arbSignalType, { minLength: 1, maxLength: 30 }),
        fc.integer({
          min: Date.UTC(2024, 0, 1),
          max: Date.UTC(2024, 6, 1),
        }),
        (signalTypes, baseMs) => {
          const now = new Date(baseMs + signalTypes.length * 60000 + 60000);
          const entries: IStatusHistoryEntry<string>[] = signalTypes.map(
            (st, i) =>
              makeEntry({
                id: `e-${i}`,
                timestamp: new Date(baseMs + i * 60000),
                signalType: st,
              }),
          );

          const info = AnalyticsEngine.computeStreakInfo(entries, now);

          const presenceEntries = entries.filter(
            (e) => e.signalType === HeartbeatSignalType.PRESENCE,
          );

          if (presenceEntries.length === 0) {
            return info.timeSinceLastPresenceMs === null;
          }

          const mostRecentPresenceTs = Math.max(
            ...presenceEntries.map((e) => e.timestamp.getTime()),
          );
          const expected = now.getTime() - mostRecentPresenceTs;

          return info.timeSinceLastPresenceMs === expected;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: JSON export round-trip
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 15: JSON export round-trip', () => {
  it('serializing via formatJSON then parsing back produces equivalent entries', () => {
    /**
     * **Validates: Requirements 2.5**
     */
    fc.assert(
      fc.property(
        fc.array(
          fc
            .record({
              signalType: arbSignalType,
              confidence: fc.double({ min: 0, max: 1, noNaN: true }),
              eventCount: fc.integer({ min: 0, max: 100 }),
              timeSinceLastActivityMs: fc.oneof(
                fc.constant(null),
                fc.integer({ min: 0, max: 1_000_000 }),
              ),
              httpStatusCode: fc.option(fc.integer({ min: 100, max: 599 }), {
                nil: undefined,
              }),
              errorMessage: fc.option(
                fc.string({ minLength: 0, maxLength: 50 }),
                { nil: undefined },
              ),
              timestampMs: fc.integer({
                min: Date.UTC(2020, 0, 1),
                max: Date.UTC(2025, 0, 1),
              }),
            })
            .map((r) => {
              const ts = new Date(r.timestampMs);
              return makeEntry({
                id: `e-${r.timestampMs}`,
                timestamp: ts,
                signalType: r.signalType,
                confidence: r.confidence,
                eventCount: r.eventCount,
                timeSinceLastActivityMs: r.timeSinceLastActivityMs,
                httpStatusCode: r.httpStatusCode,
                errorMessage: r.errorMessage,
                createdAt: ts,
              });
            }),
          { minLength: 0, maxLength: 20 },
        ),
        (entries) => {
          const json = AnalyticsEngine.formatJSON(entries);
          const parsed = JSON.parse(json) as Array<Record<string, unknown>>;

          if (parsed.length !== entries.length) return false;

          for (let i = 0; i < entries.length; i++) {
            const orig = entries[i];
            const p = parsed[i];

            // Timestamps are serialized as ISO strings
            if (p['timestamp'] !== orig.timestamp.toISOString()) return false;
            if (p['signalType'] !== orig.signalType) return false;
            if (p['eventCount'] !== orig.eventCount) return false;
            if (p['timeSinceLastActivityMs'] !== orig.timeSinceLastActivityMs)
              return false;
            if (p['id'] !== orig.id) return false;
            // Confidence: floating point comparison
            if (Math.abs((p['confidence'] as number) - orig.confidence) > 1e-10)
              return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: CSV export completeness
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 16: CSV export completeness', () => {
  it('CSV output has entries.length + 1 lines; each row has all specified columns', () => {
    /**
     * **Validates: Requirements 2.4**
     */
    const EXPECTED_COLUMNS = [
      'timestamp',
      'signalType',
      'eventCount',
      'confidence',
      'timeSinceLastActivityMs',
      'httpStatusCode',
      'errorMessage',
    ];

    fc.assert(
      fc.property(
        fc.array(
          fc
            .record({
              signalType: arbSignalType,
              confidence: fc.double({ min: 0, max: 1, noNaN: true }),
              eventCount: fc.integer({ min: 0, max: 100 }),
              timeSinceLastActivityMs: fc.oneof(
                fc.constant(null),
                fc.integer({ min: 0, max: 1_000_000 }),
              ),
              timestampMs: fc.integer({
                min: Date.UTC(2020, 0, 1),
                max: Date.UTC(2025, 0, 1),
              }),
            })
            .map((r) => {
              const ts = new Date(r.timestampMs);
              return makeEntry({
                id: `e-${r.timestampMs}`,
                timestamp: ts,
                signalType: r.signalType,
                confidence: r.confidence,
                eventCount: r.eventCount,
                timeSinceLastActivityMs: r.timeSinceLastActivityMs,
                createdAt: ts,
              });
            }),
          { minLength: 0, maxLength: 20 },
        ),
        (entries) => {
          const csv = AnalyticsEngine.formatCSV(entries);
          const lines = csv.split('\n');

          // Header + one row per entry
          if (lines.length !== entries.length + 1) return false;

          // Header has all expected columns
          const headerCols = lines[0].split(',');
          for (const col of EXPECTED_COLUMNS) {
            if (!headerCols.includes(col)) return false;
          }

          // Each data row has the same number of columns as the header
          // (accounting for CSV escaping with commas inside quoted fields)
          for (let i = 1; i < lines.length; i++) {
            // Parse CSV row properly: count fields respecting quoted values
            const fieldCount = parseCsvFieldCount(lines[i]);
            if (fieldCount !== EXPECTED_COLUMNS.length) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Count the number of CSV fields in a row, respecting quoted fields.
 */
function parseCsvFieldCount(row: string): number {
  let count = 0;
  let inQuotes = false;
  let i = 0;

  while (i <= row.length) {
    if (i === row.length) {
      count++;
      break;
    }
    if (row[i] === '"') {
      inQuotes = !inQuotes;
      i++;
    } else if (row[i] === ',' && !inQuotes) {
      count++;
      i++;
    } else {
      i++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Property 17 (spec Property 18): Comparison normalization — identical bucket boundaries
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 18: Comparison normalization — identical bucket boundaries', () => {
  it('multiple entry arrays aggregated with same params produce identical bucketStart/bucketEnd sequences', () => {
    /**
     * **Validates: Requirements 4.4**
     */
    fc.assert(
      fc.property(
        arbDateRange,
        fc.integer({ min: 2, max: 5 }),
        ({ since, until }, datasetCount) => {
          const granularity = AnalyticsEngine.selectGranularity(since, until);
          const sinceMs = since.getTime();
          const untilMs = until.getTime();

          // Generate multiple independent entry arrays
          const allBuckets: Array<Array<{ start: number; end: number }>> = [];

          for (let d = 0; d < datasetCount; d++) {
            // Create random entries for this dataset
            const entryCount = Math.floor(Math.random() * 15);
            const entries: IStatusHistoryEntry<string>[] = [];
            for (let i = 0; i < entryCount; i++) {
              const ts =
                sinceMs + Math.floor(Math.random() * (untilMs - sinceMs));
              entries.push(
                makeEntry({
                  id: `d${d}-e${i}`,
                  timestamp: new Date(ts),
                  signalType:
                    ALL_SIGNAL_TYPES[
                      Math.floor(Math.random() * ALL_SIGNAL_TYPES.length)
                    ],
                }),
              );
            }

            const buckets = AnalyticsEngine.aggregateIntoBuckets(
              entries,
              since,
              until,
              granularity,
            );
            allBuckets.push(
              buckets.map((b) => ({
                start: b.bucketStart.getTime(),
                end: b.bucketEnd.getTime(),
              })),
            );
          }

          // All datasets must have identical bucket boundaries
          const reference = allBuckets[0];
          for (let d = 1; d < allBuckets.length; d++) {
            if (allBuckets[d].length !== reference.length) return false;
            for (let i = 0; i < reference.length; i++) {
              if (allBuckets[d][i].start !== reference[i].start) return false;
              if (allBuckets[d][i].end !== reference[i].end) return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
