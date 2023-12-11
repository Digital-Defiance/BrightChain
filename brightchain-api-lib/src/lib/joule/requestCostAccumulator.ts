/**
 * @fileoverview RequestCostAccumulator — per-request, per-class resource-unit
 * accumulator used by Capture Middleware.
 *
 * Each incoming request gets exactly one `RequestCostAccumulator` attached to
 * its context (via `req.joule.cost`).  Application code calls
 * `accumulator.add(resourceClass, units)` to record resource consumption in
 * the rate table's natural units (NOT µJ).  The middleware reads the snapshot
 * at response-close time and converts to µJ using the pinned rate table.
 *
 * Design notes:
 * - All accrual is bigint; no float.
 * - `snapshot()` returns a frozen copy so callers cannot mutate internal state.
 * - `reset()` zeroes all counters; useful for test harnesses.
 *
 * @see joule-resource-credits spec, Requirements 2.1, 2.2
 */

import { RESOURCE_CLASSES, ResourceClass } from '@brightchain/brightchain-lib';

/**
 * A read-only snapshot of all per-class unit accumulations for one request.
 * Values are in the rate table's natural units (e.g. "requests" for compute,
 * "MB" for storage/network), NOT µJ.
 */
export type CostSnapshot = Readonly<Record<ResourceClass, bigint>>;

/**
 * Creates a zero-filled snapshot (all resource classes → 0n).
 */
function makeZeroSnapshot(): Record<ResourceClass, bigint> {
  return Object.fromEntries(RESOURCE_CLASSES.map((cls) => [cls, 0n])) as Record<
    ResourceClass,
    bigint
  >;
}

/**
 * Mutable per-request cost accumulator.
 *
 * One instance is created by `CaptureMiddleware` at the start of each
 * request and torn down (or transferred to the retry buffer) at response
 * close.
 *
 * @see joule-resource-credits spec, Requirements 2.1, 2.2, 9.1
 */
export class RequestCostAccumulator {
  private readonly units: Record<ResourceClass, bigint> = makeZeroSnapshot();

  /**
   * Accrue `delta` units of the given resource class.
   *
   * `delta` must be ≥ 0n; negative values are silently ignored because
   * the accumulator only measures forward consumption.
   *
   * @param cls    - The resource class being consumed.
   * @param delta  - Units consumed (rate-table natural units, NOT µJ).
   */
  add(cls: ResourceClass, delta: bigint): void {
    if (delta <= 0n) return;
    this.units[cls] += delta;
  }

  /**
   * Add all classes from an `OperationCost`-shaped object at once.
   *
   * Accepts any object whose field names match `ResourceClass` values.
   * Only recognises the four v1 classes; extra fields are ignored.
   *
   * @param cost - An object mapping resource classes to unit amounts.
   */
  addAll(cost: Partial<Record<ResourceClass, bigint>>): void {
    for (const cls of RESOURCE_CLASSES) {
      const delta = cost[cls];
      if (delta !== undefined) this.add(cls, delta);
    }
  }

  /**
   * Return a frozen snapshot of the current accumulation state.
   *
   * The returned object is immutable; subsequent `add()` calls will not
   * affect previously returned snapshots.
   */
  snapshot(): CostSnapshot {
    return Object.freeze({ ...this.units }) as CostSnapshot;
  }

  /**
   * Reset all counters to zero.
   *
   * Intended for test harnesses and retry-buffer replay; production
   * middleware should not call this after response-close.
   */
  reset(): void {
    for (const cls of RESOURCE_CLASSES) {
      this.units[cls] = 0n;
    }
  }

  /**
   * Returns `true` when every resource class is zero (i.e. nothing has
   * been accumulated yet, or `reset()` was just called).
   */
  get isEmpty(): boolean {
    return RESOURCE_CLASSES.every((cls) => this.units[cls] === 0n);
  }
}
