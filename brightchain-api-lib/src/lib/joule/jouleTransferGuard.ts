/**
 * @fileoverview jouleTransferGuard — Express middleware that rejects any
 * member-originated `TransferAction` targeting the `joule` asset.
 *
 * Joule can only be minted via operator `OperatorGrantAction` and deducted
 * via `DebitAuthorizationService.capture`.  Members are explicitly forbidden
 * from transferring Joule peer-to-peer through the regular asset API.
 *
 * @see joule-resource-credits spec, Requirements 4.5, 4.6
 */

import { JOULE_ASSET_ID } from '@brightchain/brightchain-lib';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Error code returned in the 403 response body. */
export const JOULE_TRANSFER_FORBIDDEN_CODE = 'JOULE_TRANSFER_FORBIDDEN';

/** HTTP status code for a forbidden Joule transfer attempt. */
export const JOULE_TRANSFER_FORBIDDEN_STATUS = 403;

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Express middleware that blocks member-originated Joule transfer requests.
 *
 * The guard checks the decoded request body for:
 *
 * - `kind === 'Transfer'`  (the wire-format action kind)
 * - `assetId` matching the canonical Joule asset identifier
 *
 * Both checks are case-sensitive. If either condition is absent the guard
 * falls through to the next middleware.
 *
 * ### Mounting
 *
 * Mount BEFORE the route handler on any endpoint that accepts generic asset
 * actions from members:
 *
 * ```ts
 * router.post('/assets/transfer', jouleTransferGuard, handleTransfer);
 * ```
 *
 * Or globally on the asset sub-router if the path exclusively handles
 * `TransferAction` payloads:
 *
 * ```ts
 * assetRouter.use(jouleTransferGuard);
 * ```
 */
export const jouleTransferGuard: RequestHandler = function jouleTransferGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const body = req.body as Record<string, unknown> | null | undefined;

  if (
    body !== null &&
    body !== undefined &&
    body['kind'] === 'Transfer' &&
    body['assetId'] === JOULE_ASSET_ID
  ) {
    res.status(JOULE_TRANSFER_FORBIDDEN_STATUS).json({
      error: JOULE_TRANSFER_FORBIDDEN_CODE,
      message:
        'Joule credits may not be transferred between members. ' +
        'Credits are issued exclusively by the operator quorum.',
    });
    return;
  }

  next();
};
