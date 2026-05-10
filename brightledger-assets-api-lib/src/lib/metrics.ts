/**
 * @fileoverview Asset-ledger metrics collector.
 *
 * Tracks the observability signals mandated by Requirement 11.1:
 *
 *  - **Throughput**  — entries accepted per second (1-minute EWMA)
 *  - **Validation latency** — p99 of the last 1 000 validation calls (ms)
 *  - **Projector lag** — ms between ledger append and projection apply
 *  - **Snapshot lag** — ms since the last snapshot was written
 *  - **Settlement lag per shard** — ms since each shard's last settlement
 *  - **Dispute rate** — fraction of settled windows that were challenged
 *  - **Process_Key TTL remaining** — minimum ms-until-expiry across all
 *    non-revoked, non-expired process keys
 *
 * The collector is intentionally framework-agnostic: callers wire it into
 * the `SubmissionService` event stream and call the record methods directly.
 * Export to Prometheus, OpenTelemetry, or any other sink is left to the host.
 *
 * @see Requirement 11.1
 */

// ── Interfaces ────────────────────────────────────────────────────────────────

/** Point-in-time snapshot of all asset-ledger metrics. */
export interface IAssetMetricsSnapshot {
  /** Accepted entries per second (1-minute EWMA). */
  readonly entriesPerSecond: number;
  /** p99 validation latency in milliseconds (last ≤ 1 000 samples). */
  readonly validatorP99LatencyMs: number;
  /** Most recent projector lag in milliseconds. */
  readonly projectorLagMs: number;
  /** Milliseconds since the last snapshot was written (−1 if never). */
  readonly snapshotLagMs: number;
  /** Per-shard settlement lag in milliseconds (−1 if the shard has never settled). */
  readonly settlementLagPerShard: ReadonlyMap<string, number>;
  /**
   * Fraction of settled windows that received at least one `BatchChallenge`
   * (0 – 1; NaN if no windows have been settled yet).
   */
  readonly disputeRate: number;
  /**
   * Minimum ms-until-expiry across all non-revoked, non-expired process keys.
   * `Infinity` when no active keys are tracked.
   */
  readonly processKeyMinTtlRemainingMs: number;
}

// ── EWMA helper ───────────────────────────────────────────────────────────────

/** Lightweight 1-minute exponential weighted moving average for rate estimation. */
class EwmaRate {
  private _ewma = 0;
  private _lastTick = 0;
  private _pendingCount = 0;

  /** Called once per entry to increment the pending bucket. */
  increment(): void {
    this._pendingCount++;
  }

  /**
   * Flush the pending bucket into the EWMA.
   * `nowMs` is the current wall-clock time in milliseconds.
   */
  tick(nowMs: number): void {
    const elapsed = nowMs - this._lastTick;
    if (elapsed <= 0) return;

    const rate = (this._pendingCount / elapsed) * 1000; // per-second
    // α ≈ 1 − e^(−Δt/60 000) for a ~1-minute window.
    const alpha = 1 - Math.exp(-elapsed / 60_000);
    this._ewma = alpha * rate + (1 - alpha) * this._ewma;

    this._pendingCount = 0;
    this._lastTick = nowMs;
  }

  get value(): number {
    return this._ewma;
  }

  init(nowMs: number): void {
    this._lastTick = nowMs;
  }
}

// ── p99 ring buffer ───────────────────────────────────────────────────────────

const LATENCY_WINDOW = 1000; // keep last 1 000 samples

/** Rolling window of latency samples used to compute p99. */
class LatencyWindow {
  private readonly _buf: Float64Array = new Float64Array(LATENCY_WINDOW);
  private _head = 0;
  private _count = 0;

  record(ms: number): void {
    this._buf[this._head] = ms;
    this._head = (this._head + 1) % LATENCY_WINDOW;
    if (this._count < LATENCY_WINDOW) this._count++;
  }

  p99(): number {
    if (this._count === 0) return 0;
    const samples = Array.from(this._buf.subarray(0, this._count)).sort(
      (a, b) => a - b,
    );
    const idx = Math.ceil(this._count * 0.99) - 1;
    return samples[Math.max(0, idx)] ?? 0;
  }
}

// ── AssetMetricsCollector ─────────────────────────────────────────────────────

/**
 * Mutable, non-thread-safe metrics accumulator for the asset-ledger subsystem.
 *
 * @see Requirement 11.1
 */
export class AssetMetricsCollector {
  private readonly _rate = new EwmaRate();
  private readonly _validationLatency = new LatencyWindow();

  private _projectorLagMs = 0;
  private _snapshotLastWrittenAt = -1;
  private _settlementLastAt = new Map<string, number>(); // shardId → wallclock ms
  private _settledWindowCount = 0;
  private _disputedWindowCount = 0;

  /** Map of processKeyFingerprint (hex) → notAfter (Unix ms). */
  private _processKeyExpiries = new Map<string, number>();

  constructor(nowMs = Date.now()) {
    this._rate.init(nowMs);
  }

  // ── Throughput ────────────────────────────────────────────────────────────

  /**
   * Call after each successfully accepted entry to update the EWMA.
   * `nowMs` defaults to `Date.now()`.
   */
  recordEntry(nowMs = Date.now()): void {
    this._rate.increment();
    this._rate.tick(nowMs);
  }

  // ── Validation latency ────────────────────────────────────────────────────

  /**
   * Start timing a validation call.  Call the returned function when
   * validation completes to record the elapsed time.
   *
   * @example
   * ```ts
   * const end = metrics.startValidation();
   * const result = validator.validate(action, state, ctx);
   * end();
   * ```
   */
  startValidation(nowMs = Date.now()): (endMs?: number) => void {
    const start = nowMs;
    return (endMs = Date.now()) => {
      this._validationLatency.record(endMs - start);
    };
  }

  // ── Projector lag ─────────────────────────────────────────────────────────

  /**
   * Record the most recent projector lag (ms between ledger append and
   * projection apply completing).
   */
  recordProjectorLag(lagMs: number): void {
    this._projectorLagMs = lagMs;
  }

  // ── Snapshot lag ─────────────────────────────────────────────────────────

  /** Call after each successful snapshot write. */
  recordSnapshotWritten(nowMs = Date.now()): void {
    this._snapshotLastWrittenAt = nowMs;
  }

  // ── Settlement lag ────────────────────────────────────────────────────────

  /**
   * Call after each accepted `BatchSettlement`.
   *
   * @param shardId - Shard that was settled.
   * @param nowMs   - Wall-clock time of acceptance (defaults to `Date.now()`).
   */
  recordSettlement(shardId: string, nowMs = Date.now()): void {
    this._settlementLastAt.set(shardId, nowMs);
    this._settledWindowCount++;
  }

  // ── Dispute rate ──────────────────────────────────────────────────────────

  /** Call after each accepted `BatchChallenge`. */
  recordDispute(): void {
    this._disputedWindowCount++;
  }

  // ── Process_Key TTL ───────────────────────────────────────────────────────

  /**
   * Register or update the `notAfter` timestamp for a process key.
   *
   * Call this after a successful `ProcessKeyCert` action and remove the key
   * (via `removeProcessKey`) after a `ProcessKeyRevoke`.
   *
   * @param fingerprint - Hex-encoded SHA-256 fingerprint of the key.
   * @param notAfterMs  - Unix timestamp (ms) of key expiry.
   */
  registerProcessKey(fingerprint: string, notAfterMs: number): void {
    this._processKeyExpiries.set(fingerprint, notAfterMs);
  }

  /** Remove a process key from TTL tracking (e.g. on revocation). */
  removeProcessKey(fingerprint: string): void {
    this._processKeyExpiries.delete(fingerprint);
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────

  /**
   * Return a point-in-time snapshot of all metrics.
   *
   * @param nowMs - Wall-clock time used for lag calculations (defaults to `Date.now()`).
   */
  snapshot(nowMs = Date.now()): IAssetMetricsSnapshot {
    // Flush EWMA bucket.
    this._rate.tick(nowMs);

    // Settlement lag per shard.
    const settlementLagPerShard = new Map<string, number>();
    for (const [shardId, lastAt] of this._settlementLastAt) {
      settlementLagPerShard.set(shardId, nowMs - lastAt);
    }

    // Snapshot lag.
    const snapshotLagMs =
      this._snapshotLastWrittenAt < 0
        ? -1
        : nowMs - this._snapshotLastWrittenAt;

    // Dispute rate.
    const disputeRate =
      this._settledWindowCount === 0
        ? NaN
        : this._disputedWindowCount / this._settledWindowCount;

    // Process_Key minimum TTL.
    let processKeyMinTtlRemainingMs = Infinity;
    for (const notAfterMs of this._processKeyExpiries.values()) {
      const ttl = notAfterMs - nowMs;
      if (ttl < processKeyMinTtlRemainingMs) {
        processKeyMinTtlRemainingMs = ttl;
      }
    }

    return {
      entriesPerSecond: this._rate.value,
      validatorP99LatencyMs: this._validationLatency.p99(),
      projectorLagMs: this._projectorLagMs,
      snapshotLagMs,
      settlementLagPerShard,
      disputeRate,
      processKeyMinTtlRemainingMs,
    };
  }
}
