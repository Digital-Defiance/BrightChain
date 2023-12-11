/**
 * @fileoverview Joule observability metrics (Task 5.2).
 *
 * Provides lightweight in-process counters and histograms for the required
 * Joule metrics.  The collector follows the same interface pattern used by
 * `MessageMetricsCollector` in brightchain-lib.
 *
 * ## Required metrics (spec §6)
 *
 * | Name                                      | Kind      | Labels           |
 * |-------------------------------------------|-----------|------------------|
 * | `joule_capture_emits_total`               | counter   | `class`          |
 * | `joule_authorize_failures_total`          | counter   | `reason`         |
 * | `joule_reservation_age_seconds`           | histogram | (p50, p90, p99)  |
 * | `joule_retry_buffer_depth`                | gauge     | —                |
 * | `joule_rate_table_version`                | gauge     | —                |
 *
 * An instance is obtained via `JouleMetrics.getInstance()` (singleton).
 * Tests may call `JouleMetrics.resetInstance()` to obtain a fresh collector.
 *
 * @see joule-resource-credits spec, Requirements 6.1–6.5
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Snapshot of all Joule metrics at a point in time. */
export interface IJouleMetricsSnapshot {
  /** Total Resource_Event emits per resource class. */
  captureEmitsTotal: Record<string, number>;
  /** Total authorize failures per reason code. */
  authorizeFailuresTotal: Record<string, number>;
  /**
   * Reservation age histogram (seconds).
   * Sorted sample list; derive quantiles by index.
   */
  reservationAgeSamples: number[];
  /** Current depth of the in-process retry buffer. */
  retryBufferDepth: number;
  /** Active rate-table version number. */
  rateTableVersion: number;
}

/** Public interface for the Joule metrics collector. */
export interface IJouleMetricsCollector {
  /** Increment the capture-emit counter for a given resource class. */
  recordCaptureEmit(resourceClass: string): void;
  /** Increment the authorize-failure counter for a given reason code. */
  recordAuthorizeFailure(reason: string): void;
  /** Record the age of a fulfilled/expired reservation in milliseconds. */
  recordReservationAge(ageMs: number): void;
  /** Set (overwrite) the current retry-buffer depth gauge. */
  setRetryBufferDepth(depth: number): void;
  /** Set (overwrite) the current rate-table version gauge. */
  setRateTableVersion(version: number): void;
  /** Return an immutable snapshot of all current metrics. */
  snapshot(): IJouleMetricsSnapshot;
  /** Reset all counters and histograms to zero (useful for tests). */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * In-process Joule metrics collector singleton.
 *
 * Replace with a Prometheus `prom-client` adapter in production by passing a
 * custom `IJouleMetricsCollector` to callers, or by overriding
 * `JouleMetrics.instance` in application bootstrap.
 */
export class JouleMetrics implements IJouleMetricsCollector {
  private static _instance: JouleMetrics | null = null;

  /** Get or create the singleton instance. */
  static getInstance(): JouleMetrics {
    if (!JouleMetrics._instance) {
      JouleMetrics._instance = new JouleMetrics();
    }
    return JouleMetrics._instance;
  }

  /** Replace the singleton — for testing only. */
  static resetInstance(): void {
    JouleMetrics._instance = null;
  }

  // ── Internal state ───────────────────────────────────────────────────────

  private _captureEmitsTotal: Record<string, number> = {};
  private _authorizeFailuresTotal: Record<string, number> = {};
  /** Raw age samples in seconds (up to MAX_HISTOGRAM_SAMPLES). */
  private _reservationAgeSamples: number[] = [];
  private _retryBufferDepth = 0;
  private _rateTableVersion = 0;

  /** Hard cap on histogram samples retained in memory. */
  private static readonly MAX_HISTOGRAM_SAMPLES = 10_000;

  // ── IJouleMetricsCollector ───────────────────────────────────────────────

  recordCaptureEmit(resourceClass: string): void {
    this._captureEmitsTotal[resourceClass] =
      (this._captureEmitsTotal[resourceClass] ?? 0) + 1;
  }

  recordAuthorizeFailure(reason: string): void {
    this._authorizeFailuresTotal[reason] =
      (this._authorizeFailuresTotal[reason] ?? 0) + 1;
  }

  recordReservationAge(ageMs: number): void {
    const ageSec = ageMs / 1_000;
    if (
      this._reservationAgeSamples.length < JouleMetrics.MAX_HISTOGRAM_SAMPLES
    ) {
      this._reservationAgeSamples.push(ageSec);
    }
    // Once the cap is reached, silently drop new samples.  In production,
    // use a ring-buffer or delegate to prom-client which handles this natively.
  }

  setRetryBufferDepth(depth: number): void {
    this._retryBufferDepth = depth;
  }

  setRateTableVersion(version: number): void {
    this._rateTableVersion = version;
  }

  snapshot(): IJouleMetricsSnapshot {
    return {
      captureEmitsTotal: { ...this._captureEmitsTotal },
      authorizeFailuresTotal: { ...this._authorizeFailuresTotal },
      reservationAgeSamples: [...this._reservationAgeSamples].sort(
        (a, b) => a - b,
      ),
      retryBufferDepth: this._retryBufferDepth,
      rateTableVersion: this._rateTableVersion,
    };
  }

  reset(): void {
    this._captureEmitsTotal = {};
    this._authorizeFailuresTotal = {};
    this._reservationAgeSamples = [];
    this._retryBufferDepth = 0;
    this._rateTableVersion = 0;
  }

  // ── Derived helpers ──────────────────────────────────────────────────────

  /**
   * Compute a quantile from the sorted reservation-age samples.
   * Returns `undefined` if no samples have been recorded.
   */
  quantile(q: number): number | undefined {
    const sorted = [...this._reservationAgeSamples].sort((a, b) => a - b);
    if (sorted.length === 0) return undefined;
    const idx = Math.min(Math.floor(q * sorted.length), sorted.length - 1);
    return sorted[idx];
  }
}
