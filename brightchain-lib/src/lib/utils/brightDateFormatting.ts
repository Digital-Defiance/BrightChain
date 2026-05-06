/**
 * BrightDate Formatting Utilities for BrightChain
 *
 * Provides dual-display date formatting: standard locale date alongside
 * BrightDate (decimal days since J2000.0 epoch).
 *
 * BrightDate is the official time system of BrightChain — displayed alongside
 * traditional dates like metric alongside imperial.
 *
 * The display mode is controlled by `BrightDateDisplayMode`:
 * - `dual`: "Jan 15, 2025 (BD 9146.438)" — default
 * - `brightDateOnly`: "BD 9146.438"
 * - `localeOnly`: "Jan 15, 2025"
 * - `hover`: Returns locale string only (caller handles tooltip with BD value)
 *
 * @module brightDateFormatting
 */

import { BrightDate } from '@brightchain/brightdate';
import type { Precision } from '@brightchain/brightdate';
import { BrightDateDisplayMode } from '../enumerations/brightDateDisplayMode';

/**
 * Format a date as a BrightDate string.
 *
 * @param date - A Date object or ISO date string
 * @param precision - Decimal places (default: 5, gives ~0.86 second resolution)
 * @returns BrightDate string, e.g. "9146.43750", or empty string if invalid
 */
export function toBrightDateString(
  date: Date | string,
  precision: number = 5,
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const bd = BrightDate.fromDate(d, {
      precision: precision as Precision,
    });
    return bd.toString();
  } catch {
    return '';
  }
}

/**
 * Format a date as a prefixed BrightDate string.
 *
 * @param date - A Date object or ISO date string
 * @param precision - Decimal places (default: 5)
 * @returns Prefixed string, e.g. "BD:9146.43750", or empty string if invalid
 */
export function toBrightDatePrefixed(
  date: Date | string,
  precision: number = 5,
): string {
  const bd = toBrightDateString(date, precision);
  return bd ? `BD:${bd}` : '';
}

/**
 * Format a date in dual-display mode: locale string + BrightDate.
 *
 * This is the primary display format for BrightChain — showing both
 * traditional and BrightDate representations side by side.
 *
 * @param date - A Date object or ISO date string
 * @param localeStr - The already-formatted locale date string
 * @param precision - BrightDate decimal places (default: 5)
 * @returns Dual string, e.g. "Jan 15, 2025 (BD 9146.43750)"
 */
export function formatDualDate(
  date: Date | string,
  localeStr: string,
  precision: number = 5,
): string {
  const bd = toBrightDateString(date, precision);
  if (!bd) return localeStr;
  return `${localeStr} (BD ${bd})`;
}

/**
 * Format a date as a compact BrightDate for space-constrained UIs.
 * Uses 3 decimal places (~86 second resolution).
 *
 * @param date - A Date object or ISO date string
 * @returns Compact string, e.g. "BD:9146.438"
 */
export function toBrightDateCompact(date: Date | string): string {
  return toBrightDatePrefixed(date, 3);
}

/**
 * Format a date as a log-friendly BrightDate string.
 *
 * @param date - A Date object or ISO date string
 * @returns Log string, e.g. "[9146.43750]"
 */
export function toBrightDateLog(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const bd = BrightDate.fromDate(d);
    return bd.toLogString();
  } catch {
    return '';
  }
}

/**
 * Get the current time as a BrightDate string.
 *
 * @param precision - Decimal places (default: 5)
 * @returns Current BrightDate, e.g. "9622.50417"
 */
export function nowAsBrightDate(precision: number = 5): string {
  const bd = BrightDate.now({ precision: precision as Precision });
  return bd.toString();
}

/**
 * Format a date according to the user's BrightDate display preference.
 *
 * This is the primary function for mode-aware date formatting. Components
 * should use this when they have access to the user's display preference.
 *
 * @param date - A Date object or ISO date string
 * @param localeStr - The already-formatted locale date string
 * @param mode - The user's BrightDate display preference
 * @param precision - BrightDate decimal places (default: 3)
 * @returns Formatted string according to the display mode
 *
 * @example
 * ```typescript
 * // Dual mode (default):
 * formatDateByMode(date, "Jan 15, 2025", BrightDateDisplayMode.Dual)
 * // → "Jan 15, 2025 (BD 9146.438)"
 *
 * // BrightDate only:
 * formatDateByMode(date, "Jan 15, 2025", BrightDateDisplayMode.BrightDateOnly)
 * // → "BD 9146.438"
 *
 * // Locale only:
 * formatDateByMode(date, "Jan 15, 2025", BrightDateDisplayMode.LocaleOnly)
 * // → "Jan 15, 2025"
 *
 * // Hover mode (locale string returned; caller uses getBrightDateTooltip for title attr):
 * formatDateByMode(date, "Jan 15, 2025", BrightDateDisplayMode.Hover)
 * // → "Jan 15, 2025"
 * ```
 */
export function formatDateByMode(
  date: Date | string,
  localeStr: string,
  mode: BrightDateDisplayMode = BrightDateDisplayMode.Dual,
  precision: number = 3,
): string {
  switch (mode) {
    case BrightDateDisplayMode.LocaleOnly:
    case BrightDateDisplayMode.Hover:
      return localeStr;

    case BrightDateDisplayMode.BrightDateOnly:
    case BrightDateDisplayMode.HoverReverse: {
      const bd = toBrightDateString(date, precision);
      return bd ? `BD ${bd}` : localeStr;
    }

    case BrightDateDisplayMode.Dual:
    default: {
      const bd = toBrightDateString(date, precision);
      if (!bd) return localeStr;
      return `${localeStr} (BD ${bd})`;
    }
  }
}

/**
 * Get the tooltip string for hover modes.
 *
 * - In `hover` mode: returns the BrightDate string (shown when hovering locale date)
 * - In `hoverReverse` mode: returns the locale date string (shown when hovering BrightDate)
 * - In other modes: returns empty string (no tooltip needed)
 *
 * @param date - A Date object or ISO date string
 * @param mode - The user's display mode
 * @param localeStr - The locale-formatted date string (needed for hoverReverse)
 * @param precision - Decimal places (default: 3)
 * @returns Tooltip string, or empty string if mode doesn't use tooltips
 */
export function getDateTooltip(
  date: Date | string,
  mode: BrightDateDisplayMode,
  localeStr?: string,
  precision: number = 3,
): string {
  switch (mode) {
    case BrightDateDisplayMode.Hover: {
      const bd = toBrightDateString(date, precision);
      return bd ? `BD ${bd}` : '';
    }
    case BrightDateDisplayMode.HoverReverse:
      return localeStr || '';
    default:
      return '';
  }
}

/**
 * Get the BrightDate tooltip string for hover mode.
 *
 * @deprecated Use `getDateTooltip()` which handles both hover directions.
 * @param date - A Date object or ISO date string
 * @param precision - Decimal places (default: 3)
 * @returns Tooltip string, e.g. "BD 9146.438", or empty string if invalid
 */
export function getBrightDateTooltip(
  date: Date | string,
  precision: number = 3,
): string {
  const bd = toBrightDateString(date, precision);
  return bd ? `BD ${bd}` : '';
}
