import { PlatformID } from '@digitaldefiance/ecies-lib';
import { HeartbeatSignalType } from './canary-provider-adapter';

/**
 * Granularity for time-series chart buckets.
 * Selected automatically based on the requested date range span:
 * - '1h': ranges up to 48 hours
 * - '6h': ranges up to 14 days
 * - '1d': ranges up to 90 days
 */
export type TimeBucketGranularity = '1h' | '6h' | '1d';

/**
 * A single aggregated time bucket for chart rendering.
 * Groups raw IStatusHistoryEntry records into fixed-width intervals.
 */
export interface ITimeBucket {
  /** Start of the bucket interval (inclusive) */
  bucketStart: Date;
  /** End of the bucket interval (exclusive) */
  bucketEnd: Date;
  /** Count of each signal type within this bucket */
  signalCounts: Record<HeartbeatSignalType, number>;
  /** Total entries in this bucket */
  totalCount: number;
  /** Average confidence across entries in this bucket */
  averageConfidence: number;
  /** Average timeSinceLastActivityMs (excluding nulls), null if all nulls */
  averageTimeSinceActivityMs: number | null;
  /** Dominant signal type (highest count, ties broken by priority) */
  dominantSignalType: HeartbeatSignalType;
}

/**
 * Computed aggregate statistics for a provider connection over a date range.
 * All numeric fields are null when the input entry set is empty.
 */
export interface IAggregateStats {
  /** Uptime percentage: (PRESENCE + ABSENCE) / total * 100 */
  uptimePercentage: number | null;
  /** Average timeSinceLastActivityMs for PRESENCE entries (excluding nulls) */
  averageResponseTimeMs: number | null;
  /** CHECK_FAILED / total * 100 */
  failureRate: number | null;
  /** Total monitored duration / number of failure transitions */
  mtbfMs: number | null;
  /** Failure rate trend: % change (positive = worsening) */
  failureRateTrend: number | null;
  /** Total check count in range */
  totalCheckCount: number;
  /** Signal type distribution (count per type) */
  signalDistribution: Record<HeartbeatSignalType, number>;
}

/**
 * A single day cell for the heatmap calendar view.
 * Represents aggregated heartbeat data for one calendar day (UTC).
 */
export interface IHeatmapDay {
  /** The date (YYYY-MM-DD) */
  date: string;
  /** Dominant signal type for this day, null if no data */
  dominantSignalType: HeartbeatSignalType | null;
  /** Total check count for this day */
  totalCount: number;
  /** Per-signal-type counts */
  signalCounts: Record<HeartbeatSignalType, number>;
}

/**
 * Streak and duration metrics for dashboard widgets.
 * Derived from chronologically sorted IStatusHistoryEntry records.
 */
export interface IStreakInfo {
  /** Current streak: consecutive entries of same signal type from latest */
  currentStreakCount: number;
  /** Signal type of the current streak, null if no entries */
  currentStreakSignalType: HeartbeatSignalType | null;
  /** Longest continuous ABSENCE duration in ms, null if no ABSENCE entries */
  longestAbsenceDurationMs: number | null;
  /** Time since last PRESENCE signal in ms, null if no PRESENCE exists */
  timeSinceLastPresenceMs: number | null;
}

/**
 * Shared query parameter interface for analytics endpoints.
 */
export interface IAnalyticsQueryParams {
  /** Start of date range */
  since: Date;
  /** End of date range */
  until: Date;
  /** Optional signal type filter */
  signalTypes?: HeartbeatSignalType[];
}

/**
 * Response shape for multi-provider comparison.
 * Each dataset contains one connection's time-series buckets,
 * all aligned to the same bucket boundaries for overlay charting.
 */
export interface IComparisonDataset<TID extends PlatformID = string> {
  /** The connection identifier */
  connectionId: TID;
  /** Human-readable connection name */
  connectionName: string;
  /** Time-series buckets for this connection */
  buckets: ITimeBucket[];
}
