import {
  HeartbeatSignalType,
  type IAggregateStats,
  type IHeatmapDay,
  type IStatusHistoryEntry,
  type IStreakInfo,
  type ITimeBucket,
  type TimeBucketGranularity,
} from '@brightchain/digitalburnbag-lib';

/**
 * Millisecond durations for each granularity level.
 */
const GRANULARITY_MS: Record<TimeBucketGranularity, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

/**
 * Priority order for tie-breaking dominant signal type.
 * Higher index = higher priority.
 */
const SIGNAL_PRIORITY: HeartbeatSignalType[] = [
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.DURESS,
];

/** Create a zero-initialized signal counts record. */
function emptySignalCounts(): Record<HeartbeatSignalType, number> {
  return {
    [HeartbeatSignalType.PRESENCE]: 0,
    [HeartbeatSignalType.ABSENCE]: 0,
    [HeartbeatSignalType.CHECK_FAILED]: 0,
    [HeartbeatSignalType.DURESS]: 0,
    [HeartbeatSignalType.INCONCLUSIVE]: 0,
  };
}

/** Resolve a timestamp that may be a Date or ISO string to epoch ms. */
function toMs(ts: Date | string): number {
  return ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
}

/**
 * Stateless analytics engine with pure computation functions.
 *
 * All methods are static — the controller fetches entries and passes them in.
 * No I/O or state management happens here.
 */
export class AnalyticsEngine {
  // ── Task 2.1 ──────────────────────────────────────────────────────────

  /**
   * Select appropriate granularity based on date range span.
   * ≤48h → '1h', ≤14d → '6h', else → '1d'
   */
  static selectGranularity(since: Date, until: Date): TimeBucketGranularity {
    const spanMs = until.getTime() - since.getTime();
    const HOURS_48 = 48 * 60 * 60 * 1000;
    const DAYS_14 = 14 * 24 * 60 * 60 * 1000;

    if (spanMs <= HOURS_48) return '1h';
    if (spanMs <= DAYS_14) return '6h';
    return '1d';
  }

  /**
   * Determine dominant signal type from counts.
   * Highest count wins. Ties broken by priority:
   * DURESS > CHECK_FAILED > ABSENCE > PRESENCE
   */
  static dominantSignal(
    counts: Record<HeartbeatSignalType, number>,
  ): HeartbeatSignalType {
    let best: HeartbeatSignalType = HeartbeatSignalType.PRESENCE;
    let bestCount = -1;
    let bestPriority = -1;

    for (const signalType of SIGNAL_PRIORITY) {
      const count = counts[signalType] ?? 0;
      const priority = SIGNAL_PRIORITY.indexOf(signalType);

      if (
        count > bestCount ||
        (count === bestCount && priority > bestPriority)
      ) {
        best = signalType;
        bestCount = count;
        bestPriority = priority;
      }
    }

    // Also consider INCONCLUSIVE (not in priority list, lowest priority)
    const inconclusiveCount = counts[HeartbeatSignalType.INCONCLUSIVE] ?? 0;
    if (inconclusiveCount > bestCount) {
      best = HeartbeatSignalType.INCONCLUSIVE;
    }

    return best;
  }

  // ── Task 2.2 ──────────────────────────────────────────────────────────

  /**
   * Aggregate entries into time buckets.
   * Empty buckets are included for continuity.
   */
  static aggregateIntoBuckets(
    entries: IStatusHistoryEntry<string>[],
    since: Date,
    until: Date,
    granularity: TimeBucketGranularity,
  ): ITimeBucket[] {
    const sinceMs = since.getTime();
    const untilMs = until.getTime();
    const stepMs = GRANULARITY_MS[granularity];
    const bucketCount = Math.ceil((untilMs - sinceMs) / stepMs);

    // Pre-create all buckets
    const buckets: ITimeBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStartMs = sinceMs + i * stepMs;
      const bucketEndMs = Math.min(sinceMs + (i + 1) * stepMs, untilMs);
      buckets.push({
        bucketStart: new Date(bucketStartMs),
        bucketEnd: new Date(bucketEndMs),
        signalCounts: emptySignalCounts(),
        totalCount: 0,
        averageConfidence: 0,
        averageTimeSinceActivityMs: null,
        dominantSignalType: HeartbeatSignalType.PRESENCE, // default for empty
      });
    }

    if (bucketCount === 0) return buckets;

    // Assign entries to buckets
    for (const entry of entries) {
      const ts = toMs(entry.timestamp);
      if (ts < sinceMs || ts >= untilMs) continue;

      const bucketIndex = Math.min(
        Math.floor((ts - sinceMs) / stepMs),
        bucketCount - 1,
      );
      const bucket = buckets[bucketIndex];
      bucket.signalCounts[entry.signalType] =
        (bucket.signalCounts[entry.signalType] ?? 0) + 1;
      bucket.totalCount++;
    }

    // Compute averages and dominant signal per bucket
    for (let i = 0; i < bucketCount; i++) {
      const bucket = buckets[i];
      if (bucket.totalCount === 0) continue;

      // Collect entries for this bucket to compute averages
      const bucketStartMs = bucket.bucketStart.getTime();
      const bucketEndMs = bucket.bucketEnd.getTime();

      let confidenceSum = 0;
      let confidenceCount = 0;
      let activitySum = 0;
      let activityCount = 0;

      for (const entry of entries) {
        const ts = toMs(entry.timestamp);
        if (ts >= bucketStartMs && ts < bucketEndMs) {
          confidenceSum += entry.confidence;
          confidenceCount++;
          if (
            entry.timeSinceLastActivityMs !== null &&
            entry.timeSinceLastActivityMs !== undefined
          ) {
            activitySum += entry.timeSinceLastActivityMs;
            activityCount++;
          }
        }
      }

      bucket.averageConfidence =
        confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
      bucket.averageTimeSinceActivityMs =
        activityCount > 0 ? activitySum / activityCount : null;
      bucket.dominantSignalType = AnalyticsEngine.dominantSignal(
        bucket.signalCounts,
      );
    }

    return buckets;
  }

  // ── Task 2.3 ──────────────────────────────────────────────────────────

  /**
   * Compute aggregate statistics from entries.
   * Returns null fields when entries is empty (except totalCheckCount=0
   * and signalDistribution with all zeros).
   */
  static computeStatistics(
    entries: IStatusHistoryEntry<string>[],
    since: Date,
    until: Date,
  ): IAggregateStats {
    const distribution = emptySignalCounts();

    if (entries.length === 0) {
      return {
        uptimePercentage: null,
        averageResponseTimeMs: null,
        failureRate: null,
        mtbfMs: null,
        failureRateTrend: null,
        totalCheckCount: 0,
        signalDistribution: distribution,
      };
    }

    // Count signal types
    for (const entry of entries) {
      distribution[entry.signalType] =
        (distribution[entry.signalType] ?? 0) + 1;
    }

    const total = entries.length;

    // Uptime % = (PRESENCE + ABSENCE) / total * 100
    const uptimePercentage =
      ((distribution[HeartbeatSignalType.PRESENCE] +
        distribution[HeartbeatSignalType.ABSENCE]) /
        total) *
      100;

    // Average response time = mean of timeSinceLastActivityMs for PRESENCE entries
    const presenceActivityValues: number[] = [];
    for (const entry of entries) {
      if (
        entry.signalType === HeartbeatSignalType.PRESENCE &&
        entry.timeSinceLastActivityMs !== null &&
        entry.timeSinceLastActivityMs !== undefined
      ) {
        presenceActivityValues.push(entry.timeSinceLastActivityMs);
      }
    }
    const averageResponseTimeMs =
      presenceActivityValues.length > 0
        ? presenceActivityValues.reduce((a, b) => a + b, 0) /
          presenceActivityValues.length
        : null;

    // Failure rate = CHECK_FAILED / total * 100
    const failureRate =
      (distribution[HeartbeatSignalType.CHECK_FAILED] / total) * 100;

    // MTBF = totalDurationMs / numberOfFailureTransitions
    const totalDurationMs = until.getTime() - since.getTime();

    // Sort entries chronologically for transition counting
    const sorted = [...entries].sort(
      (a, b) => toMs(a.timestamp) - toMs(b.timestamp),
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

    const mtbfMs =
      failureTransitions > 0 ? totalDurationMs / failureTransitions : null;

    // Failure rate trend: split entries into two halves by time
    const midpointMs =
      since.getTime() + (until.getTime() - since.getTime()) / 2;

    const firstHalf = sorted.filter((e) => toMs(e.timestamp) < midpointMs);
    const secondHalf = sorted.filter((e) => toMs(e.timestamp) >= midpointMs);

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

    const failureRateTrend =
      firstHalfRate > 0
        ? ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100
        : null;

    return {
      uptimePercentage,
      averageResponseTimeMs,
      failureRate,
      mtbfMs,
      failureRateTrend,
      totalCheckCount: total,
      signalDistribution: distribution,
    };
  }

  // ── Task 2.4 ──────────────────────────────────────────────────────────

  /**
   * Compute heatmap day data from entries.
   * Generates one IHeatmapDay per calendar day (UTC) in the range,
   * inclusive of both endpoints' dates.
   */
  static computeHeatmap(
    entries: IStatusHistoryEntry<string>[],
    since: Date,
    until: Date,
  ): IHeatmapDay[] {
    // Determine the start and end calendar days (UTC)
    const startDay = AnalyticsEngine.utcDateString(since);
    const endDay = AnalyticsEngine.utcDateString(until);

    // Generate all days in range
    const days: string[] = [];
    const current = new Date(startDay + 'T00:00:00.000Z');
    const end = new Date(endDay + 'T00:00:00.000Z');

    while (current <= end) {
      days.push(AnalyticsEngine.utcDateString(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Index entries by day
    const dayMap = new Map<string, IStatusHistoryEntry<string>[]>();
    for (const entry of entries) {
      const day = AnalyticsEngine.utcDateString(
        new Date(toMs(entry.timestamp)),
      );
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(entry);
    }

    return days.map((date) => {
      const dayEntries = dayMap.get(date) ?? [];
      const signalCounts = emptySignalCounts();

      for (const entry of dayEntries) {
        signalCounts[entry.signalType] =
          (signalCounts[entry.signalType] ?? 0) + 1;
      }

      return {
        date,
        dominantSignalType:
          dayEntries.length > 0
            ? AnalyticsEngine.dominantSignal(signalCounts)
            : null,
        totalCount: dayEntries.length,
        signalCounts,
      };
    });
  }

  /** Format a Date as YYYY-MM-DD in UTC. */
  private static utcDateString(d: Date): string {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ── Task 2.5 ──────────────────────────────────────────────────────────

  /**
   * Compute streak and duration info.
   */
  static computeStreakInfo(
    entries: IStatusHistoryEntry<string>[],
    now: Date,
  ): IStreakInfo {
    if (entries.length === 0) {
      return {
        currentStreakCount: 0,
        currentStreakSignalType: null,
        longestAbsenceDurationMs: null,
        timeSinceLastPresenceMs: null,
      };
    }

    // Sort chronologically
    const sorted = [...entries].sort(
      (a, b) => toMs(a.timestamp) - toMs(b.timestamp),
    );

    // Current streak: count consecutive entries of same signal type from latest backwards
    const latestSignal = sorted[sorted.length - 1].signalType;
    let streakCount = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].signalType === latestSignal) {
        streakCount++;
      } else {
        break;
      }
    }

    // Longest absence duration: max span of contiguous ABSENCE subsequences
    let longestAbsenceDurationMs: number | null = null;
    let absenceStart: number | null = null;

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].signalType === HeartbeatSignalType.ABSENCE) {
        if (absenceStart === null) {
          absenceStart = toMs(sorted[i].timestamp);
        }
        // Check if this is the last in a contiguous ABSENCE run
        if (
          i === sorted.length - 1 ||
          sorted[i + 1].signalType !== HeartbeatSignalType.ABSENCE
        ) {
          const absenceEnd = toMs(sorted[i].timestamp);
          const duration = absenceEnd - absenceStart;
          if (
            longestAbsenceDurationMs === null ||
            duration > longestAbsenceDurationMs
          ) {
            longestAbsenceDurationMs = duration;
          }
          absenceStart = null;
        }
      }
    }

    // Time since last presence
    let timeSinceLastPresenceMs: number | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].signalType === HeartbeatSignalType.PRESENCE) {
        timeSinceLastPresenceMs = now.getTime() - toMs(sorted[i].timestamp);
        break;
      }
    }

    return {
      currentStreakCount: streakCount,
      currentStreakSignalType: latestSignal,
      longestAbsenceDurationMs,
      timeSinceLastPresenceMs,
    };
  }

  // ── Task 2.6 ──────────────────────────────────────────────────────────

  /**
   * Format entries for CSV export.
   * Header row + one row per entry.
   * Columns: timestamp, signalType, eventCount, confidence,
   *          timeSinceLastActivityMs, httpStatusCode, errorMessage
   *
   * Fields containing commas, quotes, or newlines are properly quoted.
   */
  static formatCSV(entries: IStatusHistoryEntry<string>[]): string {
    const header =
      'timestamp,signalType,eventCount,confidence,timeSinceLastActivityMs,httpStatusCode,errorMessage';

    const rows = entries.map((e) => {
      const ts =
        e.timestamp instanceof Date
          ? e.timestamp.toISOString()
          : String(e.timestamp);

      return [
        AnalyticsEngine.csvEscape(ts),
        AnalyticsEngine.csvEscape(e.signalType),
        AnalyticsEngine.csvEscape(String(e.eventCount)),
        AnalyticsEngine.csvEscape(String(e.confidence)),
        AnalyticsEngine.csvEscape(
          e.timeSinceLastActivityMs !== null &&
            e.timeSinceLastActivityMs !== undefined
            ? String(e.timeSinceLastActivityMs)
            : '',
        ),
        AnalyticsEngine.csvEscape(
          e.httpStatusCode !== undefined ? String(e.httpStatusCode) : '',
        ),
        AnalyticsEngine.csvEscape(e.errorMessage ?? ''),
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Escape a CSV field value.
   * If the value contains commas, double-quotes, or newlines,
   * wrap it in double-quotes and escape internal double-quotes.
   */
  private static csvEscape(value: string): string {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  /**
   * Format entries for JSON export.
   */
  static formatJSON(entries: IStatusHistoryEntry<string>[]): string {
    return JSON.stringify(entries);
  }
}
