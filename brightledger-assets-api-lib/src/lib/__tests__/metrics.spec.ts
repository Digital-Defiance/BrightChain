/**
 * @fileoverview Tests for AssetMetricsCollector (Phase 8 — Req 11.1).
 *
 * Tests:
 *  1.  Initial snapshot returns zeroed / expected defaults.
 *  2.  p99 latency is 0 when no validations have been recorded.
 *  3.  p99 is correctly computed from 100 samples.
 *  4.  p99 is correctly computed from exactly 1 000 samples (full window).
 *  5.  p99 uses only the last 1 000 samples (window eviction).
 *  6.  entriesPerSecond increases when entries are recorded.
 *  7.  projectorLagMs is updated by recordProjectorLag.
 *  8.  snapshotLagMs is −1 before first snapshot write.
 *  9.  snapshotLagMs reflects time since last snapshot.
 * 10.  settlementLagPerShard maps each shard to elapsed ms.
 * 11.  disputeRate is NaN when no windows settled.
 * 12.  disputeRate is correct after settlements and disputes.
 * 13.  processKeyMinTtlRemainingMs is Infinity when no keys tracked.
 * 14.  processKeyMinTtlRemainingMs is the minimum across all active keys.
 * 15.  removeProcessKey removes a key from TTL tracking.
 */

import { AssetMetricsCollector } from '../metrics.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a sorted array of n latency samples where latency[i] = i + 1 ms. */
function recordN(
  collector: AssetMetricsCollector,
  n: number,
  nowBase = 0,
): void {
  for (let i = 0; i < n; i++) {
    const end = collector.startValidation(nowBase);
    end(nowBase + i + 1);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssetMetricsCollector', () => {
  // 1. Initial snapshot defaults
  it('returns zeroed defaults on a fresh snapshot', () => {
    const c = new AssetMetricsCollector(0);
    const snap = c.snapshot(0);

    expect(snap.entriesPerSecond).toBe(0);
    expect(snap.validatorP99LatencyMs).toBe(0);
    expect(snap.projectorLagMs).toBe(0);
    expect(snap.snapshotLagMs).toBe(-1);
    expect(snap.settlementLagPerShard.size).toBe(0);
    expect(Number.isNaN(snap.disputeRate)).toBe(true);
    expect(snap.processKeyMinTtlRemainingMs).toBe(Infinity);
  });

  // 2. p99 = 0 when no validations
  it('reports p99 = 0 before any validation is recorded', () => {
    const c = new AssetMetricsCollector(0);
    expect(c.snapshot(0).validatorP99LatencyMs).toBe(0);
  });

  // 3. p99 from 100 samples (latencies 1…100 ms)
  it('computes p99 correctly from 100 samples', () => {
    const c = new AssetMetricsCollector(0);
    recordN(c, 100);
    const snap = c.snapshot(0);
    // p99 of 1…100 = sample at index ceil(100×0.99)−1 = index 98 = 99 ms
    expect(snap.validatorP99LatencyMs).toBe(99);
  });

  // 4. p99 from exactly 1 000 samples
  it('computes p99 correctly from 1 000 samples', () => {
    const c = new AssetMetricsCollector(0);
    recordN(c, 1000);
    const snap = c.snapshot(0);
    // p99 of 1…1000 = sample at index ceil(1000×0.99)−1 = index 989 = 990 ms
    expect(snap.validatorP99LatencyMs).toBe(990);
  });

  // 5. Window eviction — old samples are replaced
  it('uses only the last 1 000 samples after window overflow', () => {
    const c = new AssetMetricsCollector(0);
    // Record 1 000 high samples (5 000 ms each)
    for (let i = 0; i < 1000; i++) {
      const end = c.startValidation(0);
      end(5000);
    }
    // Now overwrite with 1 000 low samples (1 ms each)
    for (let i = 0; i < 1000; i++) {
      const end = c.startValidation(0);
      end(1);
    }
    const snap = c.snapshot(0);
    // All samples should now be 1 ms
    expect(snap.validatorP99LatencyMs).toBe(1);
  });

  // 6. entriesPerSecond increases
  it('entriesPerSecond increases after recording entries', () => {
    const c = new AssetMetricsCollector(0);
    // Record 100 entries in a 100 ms window → 1 000 entries/s
    for (let i = 0; i < 100; i++) {
      c.recordEntry(i);
    }
    const snap = c.snapshot(100);
    expect(snap.entriesPerSecond).toBeGreaterThan(0);
  });

  // 7. projectorLagMs
  it('updates projectorLagMs via recordProjectorLag', () => {
    const c = new AssetMetricsCollector(0);
    c.recordProjectorLag(42);
    expect(c.snapshot(0).projectorLagMs).toBe(42);
  });

  // 8. snapshotLagMs = −1 before first snapshot
  it('reports snapshotLagMs = −1 before any snapshot', () => {
    const c = new AssetMetricsCollector(0);
    expect(c.snapshot(0).snapshotLagMs).toBe(-1);
  });

  // 9. snapshotLagMs reflects elapsed time
  it('reports snapshotLagMs as elapsed time since last snapshot', () => {
    const c = new AssetMetricsCollector(0);
    c.recordSnapshotWritten(1000);
    const snap = c.snapshot(3000);
    expect(snap.snapshotLagMs).toBe(2000);
  });

  // 10. settlementLagPerShard
  it('maps each shard to ms elapsed since last settlement', () => {
    const c = new AssetMetricsCollector(0);
    c.recordSettlement('shard-A', 1000);
    c.recordSettlement('shard-B', 2000);
    const snap = c.snapshot(5000);

    expect(snap.settlementLagPerShard.get('shard-A')).toBe(4000);
    expect(snap.settlementLagPerShard.get('shard-B')).toBe(3000);
  });

  // 11. disputeRate = NaN with no settlements
  it('disputeRate is NaN when no settlements recorded', () => {
    const c = new AssetMetricsCollector(0);
    expect(Number.isNaN(c.snapshot(0).disputeRate)).toBe(true);
  });

  // 12. disputeRate computed correctly
  it('computes disputeRate as disputed/settled', () => {
    const c = new AssetMetricsCollector(0);
    // 4 settlements, 1 dispute → rate = 0.25
    c.recordSettlement('s1', 0);
    c.recordSettlement('s2', 0);
    c.recordSettlement('s3', 0);
    c.recordSettlement('s4', 0);
    c.recordDispute();
    const snap = c.snapshot(0);
    expect(snap.disputeRate).toBeCloseTo(0.25);
  });

  // 13. processKeyMinTtlRemainingMs = Infinity with no keys
  it('processKeyMinTtlRemainingMs is Infinity when no keys registered', () => {
    const c = new AssetMetricsCollector(0);
    expect(c.snapshot(0).processKeyMinTtlRemainingMs).toBe(Infinity);
  });

  // 14. processKeyMinTtlRemainingMs is minimum
  it('returns the minimum TTL across all registered keys', () => {
    const c = new AssetMetricsCollector(0);
    c.registerProcessKey('key-A', 10_000); // expires at t=10 000
    c.registerProcessKey('key-B', 5_000); // expires at t=5 000
    c.registerProcessKey('key-C', 20_000); // expires at t=20 000
    const snap = c.snapshot(0); // now=0
    // Minimum: key-B → 5 000 ms remaining
    expect(snap.processKeyMinTtlRemainingMs).toBe(5_000);
  });

  // 15. removeProcessKey
  it('removeProcessKey removes a key from TTL tracking', () => {
    const c = new AssetMetricsCollector(0);
    c.registerProcessKey('key-A', 10_000);
    c.registerProcessKey('key-B', 5_000);
    c.removeProcessKey('key-B');
    const snap = c.snapshot(0);
    // Only key-A remains: 10 000 ms
    expect(snap.processKeyMinTtlRemainingMs).toBe(10_000);
  });
});
