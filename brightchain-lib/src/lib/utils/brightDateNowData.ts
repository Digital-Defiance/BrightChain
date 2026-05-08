/**
 * BrightDate Now Data Utility
 *
 * Computes the full BrightDate response payload for the public /brightdate/now
 * API endpoint. This lives in brightchain-lib so the brightdate dependency
 * is contained here and the API controller doesn't need to import it directly.
 *
 * @module brightDateNowData
 */

import type { Precision } from '@brightchain/brightdate';
import {
  BrightDate,
  CURRENT_TAI_UTC_OFFSET,
  fromDate,
  toJulianDate,
  toModifiedJulianDate,
} from '@brightchain/brightdate';

import { IBrightDateNowResponseData } from '../interfaces/responses/brightDateNowResponse';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the full BrightDate "now" response data.
 *
 * @param precision - Number of decimal places for the full BrightDate value (0–12, default 8)
 * @returns The complete response data object for the /brightdate/now endpoint
 */
export function computeBrightDateNowData(
  precision: number = 8,
): IBrightDateNowResponseData {
  // Clamp precision to valid range
  const clampedPrecision = Math.max(0, Math.min(12, Math.round(precision)));

  const now = new Date();
  const bdValue = fromDate(now);

  const bd = BrightDate.fromDate(now, {
    precision: clampedPrecision as Precision,
  });
  const bdStandard = BrightDate.fromDate(now, { precision: 5 as Precision });
  const bdCompact = BrightDate.fromDate(now, { precision: 3 as Precision });

  return {
    brightDate: bd.toString(),
    brightDateStandard: bdStandard.toString(),
    brightDateCompact: bdCompact.toString(),
    precision: clampedPrecision,
    iso8601: now.toISOString(),
    utc: now.toUTCString(),
    unixTimestamp: Math.floor(now.getTime() / 1000),
    unixMs: now.getTime(),
    julianDate: toJulianDate(bdValue),
    modifiedJulianDate: toModifiedJulianDate(bdValue),
    dayOfYear: getDayOfYear(now),
    isoWeek: getISOWeek(now),
    isLeapYear: isLeapYear(now.getFullYear()),
    taiUtcOffset: CURRENT_TAI_UTC_OFFSET,
    epoch: 'J2000.0 (January 1, 2000, 12:00:00 UTC) — decimal days since epoch',
  };
}
