/**
 * @fileoverview `wrapWithAuthorization` — Express route handler wrapper that
 * implements the pre-authorize → capture / release lifecycle for routes
 * decorated with `@Cost('authorized', { estimator, safetyMultiplier })`.
 *
 * ## Lifecycle (Req 3.1 – 3.6)
 *
 * 1. **Pre-handler** — call `debitService.authorize(memberId, max)`.
 *    - If insufficient balance → respond 402 `INSUFFICIENT_JOULE` immediately;
 *      do NOT execute the underlying handler.
 * 2. **Handler execution** — run the original handler normally.
 * 3. **Post-success** — on response `finish`, call
 *    `debitService.capture(opId, req.joule.snapshot().totalMicroJoules)`.
 * 4. **Post-failure** — if the handler throws, call
 *    `debitService.release(opId)` before re-throwing.
 *
 * ### Usage
 *
 * In a controller definition:
 *
 * ```ts
 * @Cost('authorized', { estimator: (req) => 50_000n, safetyMultiplier: 1.25 })
 * async handleBulkUpload(req: Request, res: Response, next: NextFunction) {
 *   // ... do work, accumulating cost into req.joule ...
 * }
 * ```
 *
 * The `BaseController.initRouteDefinitions()` should detect `'authorized'`
 * category via `getCostMetadata` and call `wrapWithAuthorization` on the
 * handler before registering it with Express.
 *
 * @see joule-resource-credits spec, Requirements 3.1 – 3.6, 9.4
 */

import { Checksum, RESOURCE_CLASSES } from '@brightchain/brightchain-lib';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getCostMetadata } from './costDecorator';
import {
  DebitAuthorizationService,
  InsufficientJouleError,
} from './debitAuthorization';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The result of computing total µJ from the accumulator snapshot. */
function snapshotTotalMicroJoules(req: Request): bigint {
  if (!req.joule) return 0n;
  const snap = req.joule.snapshot();
  let total = 0n;
  for (const cls of RESOURCE_CLASSES) {
    total += snap[cls];
  }
  return total;
}

// ---------------------------------------------------------------------------
// Exported utility
// ---------------------------------------------------------------------------

/**
 * Wrap an Express route handler with Debit_Authorization flow.
 *
 * This function is called at route-registration time (inside
 * `initRouteDefinitions`) for any handler whose `@Cost` metadata has
 * `category === 'authorized'`.
 *
 * @param handler         The original route handler function.
 * @param debitService    The `DebitAuthorizationService` instance for this
 *                        API process.
 * @param getMemberId     Extract a `Checksum` member ID from the request.
 *                        Typically reads `req.brightchainUser.toChecksum()`.
 * @returns               A new `RequestHandler` that implements the full
 *                        pre-auth → capture / release cycle.
 */
export function wrapWithAuthorization(
  handler: RequestHandler,
  debitService: DebitAuthorizationService,
  getMemberId: (req: Request) => Checksum | undefined,
): RequestHandler {
  const meta = getCostMetadata(handler);

  return async function authorizedHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const memberId = getMemberId(req);
    if (!memberId) {
      // Anonymous — fall through; capture middleware will skip emit.
      handler(req, res, next);
      return;
    }

    // --- 1. Pre-handler: estimate × safety multiplier → authorize. ---

    const baseEstimate = meta?.options.estimator
      ? meta.options.estimator(req)
      : 1_000n; // 1 000 µJ default estimate

    const safetyMultiplier = meta?.options.safetyMultiplier ?? 1.25;

    const maxMicroJoules = BigInt(
      Math.ceil(Number(baseEstimate) * safetyMultiplier),
    );

    let opId: string;
    try {
      opId = debitService.authorize(memberId, maxMicroJoules);
    } catch (err) {
      if (err instanceof InsufficientJouleError) {
        res.status(402).json({
          error: 'INSUFFICIENT_JOULE',
          message: err.message,
        });
        return;
      }
      next(err);
      return;
    }

    // --- 2. Handler execution. ---

    let handlerError: unknown = undefined;

    res.on('finish', async () => {
      if (handlerError !== undefined) return; // post-failure path already ran
      // --- 3. Post-success: capture actual cost. ---
      const actual = snapshotTotalMicroJoules(req);
      try {
        await debitService.capture(opId, actual, undefined, req.requestId);
      } catch {
        // Best-effort capture; do not surface metering errors to client.
      }
    });

    try {
      await (
        handler as (
          req: Request,
          res: Response,
          next: NextFunction,
        ) => Promise<void>
      )(req, res, next);
    } catch (err) {
      handlerError = err;
      // --- 4. Post-failure: release the authorization. ---
      try {
        debitService.release(opId);
      } catch {
        // Best-effort release.
      }
      next(err);
    }
  };
}
