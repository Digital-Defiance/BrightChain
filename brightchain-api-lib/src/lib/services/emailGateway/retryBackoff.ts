/**
 * Retry Back-Off Utilities — exponential back-off with jitter for outbound
 * email delivery retries.
 *
 * Provides pure utility functions that the OutboundDeliveryWorker and
 * OutboundQueue use to compute retry delays and determine whether a
 * message should be retried or permanently failed.
 *
 * Back-off formula: baseInterval × 2^retryCount + random jitter (0–25%)
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * @module retryBackoff
 */

/**
 * Configuration for retry back-off behaviour.
 *
 * Extracted from `IEmailGatewayConfig` so the utility functions remain
 * decoupled from the full gateway config.
 */
export interface IRetryConfig {
  /** Maximum number of delivery retry attempts (default: 5). Req 3.3 */
  retryMaxCount: number;

  /** Maximum total retry duration in milliseconds (default: 48h). Req 3.3 */
  retryMaxDurationMs: number;

  /** Base interval in milliseconds for exponential back-off (default: 60000). Req 3.2 */
  retryBaseIntervalMs: number;
}

/**
 * Minimal item shape needed by `shouldRetry`.
 */
export interface IRetryableItem {
  /** Number of delivery attempts made so far. */
  retryCount: number;

  /** Timestamp when the item was first enqueued. */
  enqueuedAt: Date;
}

/**
 * Compute the exponential back-off delay for a retry attempt.
 *
 * Formula: `baseIntervalMs × 2^retryCount + jitter`
 * where jitter is a random value between 0% and 25% of the base delay.
 *
 * @param baseIntervalMs - Base interval in milliseconds (e.g. 60000)
 * @param retryCount     - Current retry attempt number (0-based: first retry = 0)
 * @param randomFn       - Optional random function for deterministic testing (default: Math.random)
 * @returns Delay in milliseconds before the next retry attempt
 *
 * @see Requirement 3.2
 */
export function computeBackoffDelay(
  baseIntervalMs: number,
  retryCount: number,
  randomFn: () => number = Math.random,
): number {
  const baseDelay = baseIntervalMs * Math.pow(2, retryCount);
  const jitter = baseDelay * 0.25 * randomFn();
  return baseDelay + jitter;
}

/**
 * Determine whether a queue item should be retried or permanently failed.
 *
 * An item should be retried when BOTH conditions are met:
 * 1. `retryCount < config.retryMaxCount`
 * 2. Time since `enqueuedAt` has not exceeded `config.retryMaxDurationMs`
 *
 * @param item   - The queue item to evaluate
 * @param config - Retry configuration limits
 * @param nowMs  - Current time in epoch milliseconds (default: Date.now())
 * @returns `true` if the item is eligible for another retry attempt
 *
 * @see Requirements 3.3, 3.4
 */
export function shouldRetry(
  item: IRetryableItem,
  config: IRetryConfig,
  nowMs: number = Date.now(),
): boolean {
  if (item.retryCount >= config.retryMaxCount) {
    return false;
  }
  const age = nowMs - item.enqueuedAt.getTime();
  if (age > config.retryMaxDurationMs) {
    return false;
  }
  return true;
}

/**
 * Compute the `nextAttemptAt` timestamp for a requeued item.
 *
 * Convenience wrapper that combines `computeBackoffDelay` with the
 * current time to produce an absolute `Date`.
 *
 * @param baseIntervalMs - Base interval in milliseconds
 * @param retryCount     - Current retry count (before increment)
 * @param nowMs          - Current time in epoch milliseconds (default: Date.now())
 * @param randomFn       - Optional random function for deterministic testing
 * @returns The `Date` at which the next attempt should be made
 */
export function computeNextAttemptAt(
  baseIntervalMs: number,
  retryCount: number,
  nowMs: number = Date.now(),
  randomFn?: () => number,
): Date {
  const delay = computeBackoffDelay(baseIntervalMs, retryCount, randomFn);
  return new Date(nowMs + delay);
}
