/**
 * @fileoverview CaptureMiddleware — Express middleware that attaches a
 * `RequestCostAccumulator` to every request and emits Resource_Events to the
 * metering-log shard when the response closes.
 *
 * ## Lifecycle
 *
 * 1. **Request start** — create a `RequestCostAccumulator`, attach it to
 *    `req.joule`.
 * 2. **Response close** — on `res.on('finish')`:
 *    a. If `req.brightchainUser` is absent (anonymous request), skip emit.
 *    b. For each non-zero resource class, call
 *       `shard.appendRecord(...)` with the µJ amount computed from the
 *       pinned rate table and the accumulated units.
 * 3. **Metering-log failure** — if `appendRecord` rejects, the failure is
 *    queued to an in-process durable retry buffer.  The request itself
 *    succeeds.  A `'retry-buffer-alarm'` event is emitted when the buffer
 *    depth exceeds `opts.retryBufferMax` (default: 1 000).
 *
 * ## Anonymous requests
 *
 * When `req.brightchainUser` is absent the accumulator is still attached so
 * route handlers can record work, but no Resource_Event is written to the
 * metering-log.
 *
 * ## Rate table pinning
 *
 * The current rate table is fetched from `RateTableCache` once at request
 * start.  If a new rate table is published mid-request the emit will still
 * use the rate that was active when the request arrived.
 *
 * @see joule-resource-credits spec, Requirements 2.1, 2.3, 2.4, 2.5, 2.6
 */

import { EventEmitter } from 'events';

import {
  IRateTable,
  JOULE_ASSET_ID,
  priceMicroJoules,
  RESOURCE_CLASSES,
  ResourceClass,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { JouleMetrics } from './jouleMetrics';
import { RateTableCache } from './rateTableCache';
import { RequestCostAccumulator } from './requestCostAccumulator';

// ---------------------------------------------------------------------------
// Minimal duck-typed interface for the metering-log shard dependency.
//
// Using an interface (instead of importing from brightledger-metering-log-lib
// directly) keeps brightchain-api-lib free from that transitive dependency
// while still being type-safe.
// ---------------------------------------------------------------------------

/** Params for a single metering-log record (subset of AppendRecordParams). */
export interface IMeteringRecordParams {
  op: string;
  memberId: Uint8Array;
  assetId: string;
  amount: bigint;
  opId: string;
  contextHash: Uint8Array;
}

/** Duck-typed interface satisfied by `MeteringLogShard`. */
export interface IMeteringLogShard {
  appendRecord(params: IMeteringRecordParams): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Retry buffer
// ---------------------------------------------------------------------------

/** A single failed-emit entry held in the retry buffer. */
export interface IRetryEntry {
  params: IMeteringRecordParams;
  enqueuedAt: number;
  attempts: number;
}

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

/** Default buffer depth that triggers the alarm event. */
export const JOULE_RETRY_BUFFER_MAX_DEFAULT = 1_000;

/** Options accepted by `createCaptureMiddleware`. */
export interface ICaptureMiddlewareOptions {
  /**
   * Maximum retry-buffer depth before `captureEvents.emit('retry-buffer-alarm')`
   * is fired.
   *
   * @default 1000
   */
  retryBufferMax?: number;
}

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

/**
 * Singleton event emitter for capture-middleware operational events.
 *
 * Consumers can listen to:
 * - `'retry-buffer-alarm'`  — fired when the buffer exceeds `retryBufferMax`
 * - `'emit-failure'`        — fired on each failed `appendRecord` attempt
 *
 * @example
 * ```ts
 * captureEvents.on('retry-buffer-alarm', ({ depth }) => {
 *   alertOps({ message: `Joule retry buffer depth: ${depth}` });
 * });
 * ```
 */
export const captureEvents = new EventEmitter();

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build an Express `RequestHandler` that captures per-request Joule costs.
 *
 * @param rateTableCache - Source of current rate tables.
 * @param shard          - Metering-log shard for Resource_Event emission.
 * @param opts           - Optional configuration.
 */
export function createCaptureMiddleware(
  rateTableCache: RateTableCache,
  shard: IMeteringLogShard,
  opts: ICaptureMiddlewareOptions = {},
): RequestHandler {
  const retryBufferMax = opts.retryBufferMax ?? JOULE_RETRY_BUFFER_MAX_DEFAULT;
  const retryBuffer: IRetryEntry[] = [];

  // ------------------------------------------------------------------
  // Internal: attempt to flush one retry entry
  // ------------------------------------------------------------------
  async function tryFlushOne(entry: IRetryEntry): Promise<void> {
    entry.attempts += 1;
    try {
      await shard.appendRecord(entry.params);
      // Success — remove from buffer
      const idx = retryBuffer.indexOf(entry);
      if (idx !== -1) retryBuffer.splice(idx, 1);
    } catch {
      // Still failing; leave in buffer for the next cycle
    }
  }

  // ------------------------------------------------------------------
  // Internal: emit a single resource class charge to the metering log
  // ------------------------------------------------------------------
  async function emitCharge(
    req: Request,
    rateTable: IRateTable,
    cls: ResourceClass,
    units: bigint,
  ): Promise<void> {
    const user = req.brightchainUser;
    if (!user) return; // anonymous — skip

    // Convert to µJ using the pinned rate table
    const microJoules = priceMicroJoules(rateTable, cls, units);
    if (microJoules === 0n) return;

    // member id: ecies-lib Member exposes a bytes / id representation.
    // We need a Uint8Array; prefer `member.toBytes()` then `member.id`.
    const memberIdBytes: Uint8Array =
      typeof (user as unknown as { toBytes: () => Uint8Array }).toBytes ===
      'function'
        ? (user as unknown as { toBytes: () => Uint8Array }).toBytes()
        : new TextEncoder().encode(
            String((user as unknown as { id: string }).id),
          );

    const params: IMeteringRecordParams = {
      op: `joule.charge.${cls}`,
      memberId: memberIdBytes,
      assetId: JOULE_ASSET_ID,
      amount: -microJoules, // debit
      opId: `${req.requestId ?? uuidv4()}:${cls}`,
      contextHash: new Uint8Array(32), // zero hash; shard overrides at seq=0
    };

    try {
      await shard.appendRecord(params);
      JouleMetrics.getInstance().recordCaptureEmit(cls);
    } catch (err) {
      captureEvents.emit('emit-failure', { params, error: err });

      // Enqueue to retry buffer
      retryBuffer.push({ params, enqueuedAt: Date.now(), attempts: 1 });
      JouleMetrics.getInstance().setRetryBufferDepth(retryBuffer.length);

      if (retryBuffer.length > retryBufferMax) {
        captureEvents.emit('retry-buffer-alarm', {
          depth: retryBuffer.length,
          max: retryBufferMax,
        });
      }

      // Best-effort background retry for the oldest entry
      const oldest = retryBuffer[0];
      if (oldest) {
        void tryFlushOne(oldest);
      }
    }
  }

  // ------------------------------------------------------------------
  // The middleware itself
  // ------------------------------------------------------------------
  return function captureMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    // 1. Create and attach accumulator (snapshot rate table version)
    const accumulator = new RequestCostAccumulator();
    req.joule = accumulator;

    // Pin the rate table at request start
    const pinnedRateTable = rateTableCache.getCurrentRate();

    // 2. Register finish handler
    res.on('finish', () => {
      // Skip emit for anonymous requests
      if (!req.brightchainUser) return;
      // Skip if nothing was accumulated
      if (accumulator.isEmpty) return;

      const snapshot = accumulator.snapshot();

      // Emit one charge per non-zero class (fire and forget; errors go to buffer)
      for (const cls of RESOURCE_CLASSES) {
        const units = snapshot[cls];
        if (units > 0n) {
          void emitCharge(req, pinnedRateTable, cls, units);
        }
      }
    });

    next();
  };
}

// ---------------------------------------------------------------------------
// Retry buffer accessor (for monitoring / testing)
// ---------------------------------------------------------------------------

/**
 * Returns the internal retry buffer of `createCaptureMiddleware`.
 *
 * This is exposed purely for testing and monitoring.  Production code
 * should use `captureEvents` listeners instead.
 *
 * Note: each call to `createCaptureMiddleware` has its own isolated buffer;
 * this function cannot be used across middleware instances.
 */
