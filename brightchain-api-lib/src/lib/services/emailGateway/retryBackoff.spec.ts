/**
 * Unit tests for retry back-off utilities.
 *
 * Validates:
 * - computeBackoffDelay produces baseInterval × 2^retryCount + jitter (0–25%)
 * - shouldRetry returns false when retryCount >= maxCount
 * - shouldRetry returns false when enqueue age > maxDuration
 * - shouldRetry returns true when both limits are within bounds
 * - computeNextAttemptAt produces a Date offset by the computed delay
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { IRetryConfig } from './retryBackoff';
import {
  computeBackoffDelay,
  computeNextAttemptAt,
  shouldRetry,
} from './retryBackoff';

// ─── computeBackoffDelay ────────────────────────────────────────────────────

describe('computeBackoffDelay', () => {
  it('should return baseInterval × 2^0 = baseInterval when retryCount is 0 and jitter is 0', () => {
    const delay = computeBackoffDelay(60_000, 0, () => 0);
    expect(delay).toBe(60_000);
  });

  it('should return baseInterval × 2^1 = 2×baseInterval when retryCount is 1 and jitter is 0', () => {
    const delay = computeBackoffDelay(60_000, 1, () => 0);
    expect(delay).toBe(120_000);
  });

  it('should return baseInterval × 2^3 = 8×baseInterval when retryCount is 3 and jitter is 0', () => {
    const delay = computeBackoffDelay(60_000, 3, () => 0);
    expect(delay).toBe(480_000);
  });

  it('should add up to 25% jitter when randomFn returns 1', () => {
    // baseDelay = 60000 × 2^0 = 60000
    // jitter = 60000 × 0.25 × 1 = 15000
    // total = 75000
    const delay = computeBackoffDelay(60_000, 0, () => 1);
    expect(delay).toBe(75_000);
  });

  it('should add proportional jitter for intermediate random values', () => {
    // baseDelay = 60000 × 2^1 = 120000
    // jitter = 120000 × 0.25 × 0.5 = 15000
    // total = 135000
    const delay = computeBackoffDelay(60_000, 1, () => 0.5);
    expect(delay).toBe(135_000);
  });

  it('should handle retryCount of 4 (baseInterval × 16)', () => {
    const delay = computeBackoffDelay(1000, 4, () => 0);
    expect(delay).toBe(16_000);
  });

  it('should always produce a delay >= baseInterval × 2^retryCount', () => {
    // Jitter is always >= 0, so delay >= base
    for (let retry = 0; retry < 6; retry++) {
      const delay = computeBackoffDelay(1000, retry, Math.random);
      expect(delay).toBeGreaterThanOrEqual(1000 * Math.pow(2, retry));
    }
  });

  it('should always produce a delay <= baseInterval × 2^retryCount × 1.25', () => {
    for (let retry = 0; retry < 6; retry++) {
      const delay = computeBackoffDelay(1000, retry, Math.random);
      expect(delay).toBeLessThanOrEqual(1000 * Math.pow(2, retry) * 1.25);
    }
  });
});

// ─── shouldRetry ────────────────────────────────────────────────────────────

describe('shouldRetry', () => {
  const config: IRetryConfig = {
    retryMaxCount: 5,
    retryMaxDurationMs: 48 * 60 * 60 * 1000, // 48h
    retryBaseIntervalMs: 60_000,
  };

  it('should return true when retryCount and age are within limits', () => {
    const item = { retryCount: 0, enqueuedAt: new Date() };
    expect(shouldRetry(item, config)).toBe(true);
  });

  it('should return true at retryCount = maxCount - 1', () => {
    const item = { retryCount: 4, enqueuedAt: new Date() };
    expect(shouldRetry(item, config)).toBe(true);
  });

  it('should return false when retryCount equals maxCount', () => {
    const item = { retryCount: 5, enqueuedAt: new Date() };
    expect(shouldRetry(item, config)).toBe(false);
  });

  it('should return false when retryCount exceeds maxCount', () => {
    const item = { retryCount: 10, enqueuedAt: new Date() };
    expect(shouldRetry(item, config)).toBe(false);
  });

  it('should return false when enqueue age exceeds maxDuration', () => {
    const enqueuedAt = new Date(Date.now() - 49 * 60 * 60 * 1000); // 49h ago
    const item = { retryCount: 0, enqueuedAt };
    expect(shouldRetry(item, config)).toBe(false);
  });

  it('should return true when enqueue age is exactly at maxDuration', () => {
    const now = Date.now();
    const enqueuedAt = new Date(now - config.retryMaxDurationMs);
    // age === maxDuration, not > maxDuration, so should be true
    const item = { retryCount: 0, enqueuedAt };
    expect(shouldRetry(item, config, now)).toBe(true);
  });

  it('should return false when both limits are exceeded', () => {
    const enqueuedAt = new Date(Date.now() - 49 * 60 * 60 * 1000);
    const item = { retryCount: 6, enqueuedAt };
    expect(shouldRetry(item, config)).toBe(false);
  });

  it('should use provided nowMs for time calculation', () => {
    const enqueuedAt = new Date(1000);
    const nowMs = 1000 + config.retryMaxDurationMs + 1; // just past limit
    const item = { retryCount: 0, enqueuedAt };
    expect(shouldRetry(item, config, nowMs)).toBe(false);
  });
});

// ─── computeNextAttemptAt ───────────────────────────────────────────────────

describe('computeNextAttemptAt', () => {
  it('should return a Date offset by the computed delay from nowMs', () => {
    const nowMs = 1_000_000;
    const result = computeNextAttemptAt(60_000, 0, nowMs, () => 0);
    expect(result.getTime()).toBe(nowMs + 60_000);
  });

  it('should include jitter in the computed Date', () => {
    const nowMs = 1_000_000;
    const result = computeNextAttemptAt(60_000, 0, nowMs, () => 1);
    // baseDelay = 60000, jitter = 60000 × 0.25 × 1 = 15000
    expect(result.getTime()).toBe(nowMs + 75_000);
  });

  it('should respect retryCount in exponential calculation', () => {
    const nowMs = 1_000_000;
    const result = computeNextAttemptAt(1000, 3, nowMs, () => 0);
    // baseDelay = 1000 × 2^3 = 8000
    expect(result.getTime()).toBe(nowMs + 8000);
  });
});
