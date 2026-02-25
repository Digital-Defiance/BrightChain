/**
 * @fileoverview StatuteOfLimitationsConfig interface.
 *
 * Configuration for the digital statute of limitations that controls
 * when identity recovery shards are permanently deleted.
 *
 * @see Requirements 17
 */

/** Seven years in milliseconds (default fallback duration) */
const SEVEN_YEARS_MS = 7 * 365.25 * 24 * 60 * 60 * 1000;

/**
 * Default fallback duration for statute of limitations: 7 years in milliseconds.
 */
export const DEFAULT_STATUTE_FALLBACK_DURATION_MS = SEVEN_YEARS_MS;

/**
 * Configuration for the digital statute of limitations.
 */
export interface StatuteOfLimitationsConfig {
  /** Default expiration duration per content type (e.g., 'post', 'message', 'financial_record'), in milliseconds */
  defaultDurations: Map<string, number>;
  /** Fallback duration if content type is not configured. Default: 7 years (~220,898,800,000 ms) */
  fallbackDurationMs: number;
}
