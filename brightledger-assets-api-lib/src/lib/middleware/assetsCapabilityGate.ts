/**
 * @fileoverview assetsCapabilityGate — Express middleware that blocks all
 * asset-ledger routes when `BRIGHTCHAIN_ASSETS_ENABLED` is not set to a
 * truthy value.
 *
 * Returning 404 (rather than 403) intentionally hides the capability's
 * existence from un-authorised callers.
 *
 * @see Requirements 5.5, 7.2
 */

import type { NextFunction, Request, Response } from 'express';

/**
 * Express middleware factory.
 *
 * Returns a middleware that immediately ends the response with
 * `404 { code: 'ASSET_DISABLED', error: '...' }` when the
 * `BRIGHTCHAIN_ASSETS_ENABLED` environment variable is absent or falsy.
 */
export function assetsCapabilityGate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!process.env['BRIGHTCHAIN_ASSETS_ENABLED']) {
    res.status(404).json({
      code: 'ASSET_DISABLED',
      error: 'The asset-ledger capability is not enabled on this deployment.',
    });
    return;
  }
  next();
}
