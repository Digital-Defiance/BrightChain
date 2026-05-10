/**
 * @fileoverview Burnbag upload cost estimator.
 *
 * Provides a declared-size affordability pre-screen used on `POST /upload/init`
 * to fast-fail obviously unaffordable uploads before any chunked data is received.
 *
 * IMPORTANT: This estimator is NOT authoritative. The definitive storage cost is
 * computed in `UploadService.quote()` using the actual block-aligned encrypted
 * byte count. This function uses the client-declared `totalSizeBytes` only.
 *
 * Requirement 3.2d — declared-size estimate for early affordability check
 */

import type { BurnbagStorageTier } from '@brightchain/digitalburnbag-lib';
import {
  calculateBurnbagStorageCost,
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import type { Request } from 'express';
import { body, validationResult } from 'express-validator';

/** All valid Burnbag storage tiers (const for validation). */
const VALID_TIERS: readonly BurnbagStorageTier[] = [
  'performance',
  'standard',
  'archive',
  'pending-burn',
];

/** Error thrown when request body fails validation. */
export class UploadCostEstimateValidationError extends Error {
  public readonly code = 'INVALID_UPLOAD_COST_PARAMS';
  public readonly httpStatus = 422;
  public readonly details: string[];

  constructor(details: string[]) {
    super(`INVALID_UPLOAD_COST_PARAMS: ${details.join('; ')}`);
    this.name = 'UploadCostEstimateValidationError';
    this.details = details;
  }
}

/**
 * Validates the `POST /upload/init` request body for Joule-economy fields.
 * Throws `UploadCostEstimateValidationError` (HTTP 422) on any failure.
 *
 * Use this before calling `burnbagUploadCostEstimate()`.
 */
export const burnbagUploadValidationRules = [
  body('totalSizeBytes')
    .isInt({ min: 1 })
    .withMessage(
      getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_TotalSizeBytesPositiveInt,
      ),
    ),
  body('durabilityTier')
    .isIn(VALID_TIERS)
    .withMessage(
      getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_DurabilityTierMustBeOneOf,
        { tiers: VALID_TIERS.join(', ') },
      ),
    ),
  body('durationDays')
    .isInt({ min: 1 })
    .withMessage(
      getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_DurationDaysMustBeInt,
      ),
    ),
];

/**
 * Extracts Joule-cost fields from an Express `Request` body, validates them,
 * and returns the estimated upfront µJ cost based on the declared file size.
 *
 * @throws {UploadCostEstimateValidationError} HTTP 422 if body is invalid
 */
export function burnbagUploadCostEstimate(req: Request): bigint {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new UploadCostEstimateValidationError(
      errors.array().map((e) => e.msg as string),
    );
  }

  const totalSizeBytes = req.body.totalSizeBytes as number;
  const durabilityTier = req.body.durabilityTier as BurnbagStorageTier;
  const durationDays = req.body.durationDays as number;

  return calculateBurnbagStorageCost({
    bytes: BigInt(totalSizeBytes),
    tier: durabilityTier,
    durationDays,
  }).upfrontMicroJoules;
}
