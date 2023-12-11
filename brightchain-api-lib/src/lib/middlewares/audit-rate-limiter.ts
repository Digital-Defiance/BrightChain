/**
 * In-memory sliding-window rate limiter for audit writes.
 * Keyed by route path. Returns whether the write should proceed
 * and tracks skipped entry counts.
 */

interface RateLimiterEntry {
  timestamps: number[];
  skippedCount: number;
}

export class AuditRateLimiter {
  private readonly state = new Map<string, RateLimiterEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Check if a write is allowed for the given route key.
   *
   * Uses a sliding window: only timestamps within the last `windowMs`
   * milliseconds are considered. If the count of timestamps in the window
   * is less than `maxEntries`, the write is allowed and the current
   * timestamp is recorded. Otherwise, the write is denied and the
   * skipped counter is incremented.
   */
  tryAcquire(routeKey: string, maxEntries: number, windowMs: number): boolean {
    const now = Date.now();
    let entry = this.state.get(routeKey);

    if (!entry) {
      entry = { timestamps: [], skippedCount: 0 };
      this.state.set(routeKey, entry);
    }

    // Remove timestamps outside the current window
    const windowStart = now - windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length < maxEntries) {
      entry.timestamps.push(now);
      return true;
    }

    entry.skippedCount++;
    return false;
  }

  /**
   * Get and reset the skipped count for a route key.
   * Returns the number of entries skipped since the last successful write,
   * then resets the counter to 0.
   */
  getAndResetSkipped(routeKey: string): number {
    const entry = this.state.get(routeKey);
    if (!entry) {
      return 0;
    }
    const skipped = entry.skippedCount;
    entry.skippedCount = 0;
    return skipped;
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
      for (const [key, entry] of this.state.entries()) {
        const newest =
          entry.timestamps.length > 0 ? Math.max(...entry.timestamps) : 0;
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

  /**
   * Clear all state. Useful for testing.
   */
  clear(): void {
    this.state.clear();
  }
}
