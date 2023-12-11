/**
 * Per-client sliding window rate limiter with per-route support
 * and rate limit status reporting.
 *
 * Extends the pattern from AuditRateLimiter with:
 * - Composite keys (clientId + optional routeKey)
 * - Per-route override support
 * - Rate limit status reporting (limit, remaining, resetMs)
 *
 * @see AuditRateLimiter in middlewares/audit-rate-limiter.ts
 */

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** The effective rate limit for this check */
  limit: number;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Milliseconds until the oldest request in the window expires */
  resetMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly state = new Map<string, number[]>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly defaultLimit: number;
  private readonly defaultWindowMs: number;

  constructor(defaultLimit: number, defaultWindowMs: number) {
    this.defaultLimit = defaultLimit;
    this.defaultWindowMs = defaultWindowMs;
  }

  /**
   * Check if a request is allowed for the given client and optional route.
   *
   * Uses a sliding window: only timestamps within the last `windowMs`
   * milliseconds are considered. If the count of timestamps in the window
   * is less than `limit`, the request is allowed and the current timestamp
   * is recorded. Otherwise, the request is denied.
   *
   * @param clientId - The client identifier
   * @param routeKey - Optional route key for per-route rate limiting
   * @param overrideLimit - Optional limit override (takes precedence over default)
   * @param overrideWindowMs - Optional window override (takes precedence over default)
   * @returns Rate limit check result with allowed, limit, remaining, and resetMs
   */
  checkRate(
    clientId: string,
    routeKey?: string,
    overrideLimit?: number,
    overrideWindowMs?: number,
  ): RateLimitResult {
    const now = Date.now();
    const key = routeKey ? `${clientId}:${routeKey}` : clientId;
    const limit =
      overrideLimit !== undefined ? overrideLimit : this.defaultLimit;
    const windowMs =
      overrideWindowMs !== undefined ? overrideWindowMs : this.defaultWindowMs;

    let timestamps = this.state.get(key);
    if (!timestamps) {
      timestamps = [];
      this.state.set(key, timestamps);
    }

    // Remove timestamps outside the current window
    const windowStart = now - windowMs;
    timestamps = timestamps.filter((t) => t > windowStart);
    this.state.set(key, timestamps);

    const count = timestamps.length;

    // Calculate resetMs: time until the oldest timestamp in the window expires
    const resetMs =
      count > 0 ? Math.max(0, timestamps[0] + windowMs - now) : windowMs;

    if (count < limit) {
      // Allowed: record this request
      timestamps.push(now);
      return {
        allowed: true,
        limit,
        remaining: limit - count - 1,
        resetMs,
      };
    }

    // Denied: over the limit
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  /**
   * Clear all state. Useful for testing.
   */
  clear(): void {
    this.state.clear();
  }

  /**
   * Start periodic cleanup of stale entries.
   * Removes entries whose newest timestamp is older than `2 * windowMs`.
   */
  startCleanup(windowMs: number): void {
    if (this.cleanupTimer) {
      return;
    }
    const cleanupInterval = 2 * windowMs;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.state.entries()) {
        const newest = timestamps.length > 0 ? Math.max(...timestamps) : 0;
        if (now - newest > cleanupInterval) {
          this.state.delete(key);
        }
      }
    }, cleanupInterval);

    // Allow the process to exit even if the timer is still running
    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === 'object' &&
      'unref' in this.cleanupTimer
    ) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop periodic cleanup.
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
