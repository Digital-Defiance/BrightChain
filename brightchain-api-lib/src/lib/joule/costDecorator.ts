/**
 * @fileoverview `@Cost` method decorator — declares the Joule cost category
 * for an API route handler.
 *
 * Every route handler MUST be annotated with `@Cost(category)`.  The CI guard
 * (`tools/joule-lint/`) will fail the build if any controller handler is
 * missing this decoration.
 *
 * ## Categories
 *
 * - `'free'`        — No Resource_Event is emitted regardless of accumulator.
 * - `'metered'`     — Accumulator is emitted on response close (Req 2.3).
 * - `'authorized'`  — Debit_Authorization flow applies (Req 3).
 *
 * ## Usage
 *
 * ```ts
 * @Cost('metered')
 * async handleGetFoo(req, res, next) { ... }
 *
 * // With options:
 * @Cost('authorized', { estimator: (req) => 10_000n, safetyMultiplier: 1.5 })
 * async handleBulkUpload(req, res, next) { ... }
 * ```
 *
 * ## Metadata storage
 *
 * Metadata is stored under `COST_METADATA_KEY` using `Reflect.metadata`
 * (requires `reflect-metadata` side-effect import in the process entry
 * point, which is already present in `test-setup.ts`).
 *
 * The `CaptureMiddleware` reads this via `getCostMetadata(handler)`.
 *
 * @see joule-resource-credits spec, Requirements 9.1–9.4
 */

import { Request } from 'express';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The three cost categories that every route handler must declare.
 *
 * - `'free'`       — Req 9.2: no Resource_Event regardless of accumulator.
 * - `'metered'`    — Req 9.3: emit on response close.
 * - `'authorized'` — Req 9.4: pre-authorize (Req 3) before doing work.
 */
export type CostCategory = 'free' | 'metered' | 'authorized';

/**
 * Options for `'authorized'` routes.
 *
 * - `estimator`        — Returns the estimated maximum µJ for this request
 *                        (used to call `AssetAccountStore.reserve`).
 * - `safetyMultiplier` — Multiplied over the estimator result before
 *                        reserving.  Defaults to `1.25` (Req 3.6).
 */
export interface ICostOptions {
  /**
   * Returns the maximum µJ that this operation may consume.
   * Called BEFORE the work begins, so it may only inspect the request
   * metadata (headers, params, body size) — not the result.
   *
   * Must return a bigint.  A return value of `0n` causes an immediate
   * rejection (Req 3.1: no point reserving zero).
   */
  estimator?: (req: Request) => bigint;

  /**
   * Multiplier applied to the estimator result when computing the
   * reservation amount.
   *
   * @default 1.25
   */
  safetyMultiplier?: number;
}

/**
 * The full metadata record stored by `@Cost` and read by `CaptureMiddleware`.
 */
export interface ICostMetadata {
  category: CostCategory;
  options: Required<ICostOptions>;
}

// ---------------------------------------------------------------------------
// Reflect metadata key
// ---------------------------------------------------------------------------

/**
 * `Reflect.metadata` key used to store/retrieve `ICostMetadata`.
 *
 * Using a Symbol avoids string key collisions with other libraries.
 */
export const COST_METADATA_KEY: unique symbol = Symbol('joule:cost');

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

/**
 * Method decorator that declares the Joule cost category for a route handler.
 *
 * @param category - Required cost category declaration.
 * @param opts     - Optional estimator and safety-multiplier for `'authorized'`
 *                   routes.  Ignored for `'free'` and `'metered'` routes but
 *                   accepted without error so that migrating between categories
 *                   is easy.
 *
 * @see joule-resource-credits spec, Requirements 9.1–9.4
 */
export function Cost(
  category: CostCategory,
  opts: ICostOptions = {},
): MethodDecorator {
  const metadata: ICostMetadata = {
    category,
    options: {
      estimator: opts.estimator ?? (() => 0n),
      safetyMultiplier: opts.safetyMultiplier ?? 1.25,
    },
  };

  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      COST_METADATA_KEY,
      metadata,
      descriptor.value as object,
    );
  };
}

// ---------------------------------------------------------------------------
// Reader helper
// ---------------------------------------------------------------------------

/**
 * Retrieve `ICostMetadata` from a route handler function, or `undefined`
 * when `@Cost` was not applied.
 *
 * Used by `CaptureMiddleware` and the joule-lint CI guard.
 */
export function getCostMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  handler: Function,
): ICostMetadata | undefined {
  return Reflect.getMetadata(COST_METADATA_KEY, handler) as
    | ICostMetadata
    | undefined;
}
