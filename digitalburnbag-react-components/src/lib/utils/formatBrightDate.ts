/**
 * BrightDate formatting utility for Digital Burnbag UI components.
 *
 * Provides dual-display date formatting: standard locale date alongside
 * BrightDate (the official time system of BrightChain).
 *
 * Usage: Replace `new Date(iso).toLocaleString()` with `formatDateWithBD(iso)`
 * to get "1/15/2025, 10:30:00 AM (BD 9146.438)" style output.
 */

import { toBrightDateString } from '@brightchain/brightchain-lib';

/**
 * Format an ISO date string or Date object as locale string + BrightDate.
 *
 * @param dateInput - ISO-8601 date string or Date object
 * @param precision - BrightDate decimal places (default: 3)
 * @returns Dual-formatted string, e.g. "1/15/2025, 10:30 AM (BD 9146.438)"
 */
export function formatDateWithBD(dateInput: string | Date, precision = 3): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const localeStr = d.toLocaleString();
    const bd = toBrightDateString(d, precision);
    return bd ? `${localeStr} (BD ${bd})` : localeStr;
  } catch {
    return typeof dateInput === 'string' ? dateInput : dateInput.toString();
  }
}

/**
 * Format an ISO date string or Date object as locale date (no time) + BrightDate.
 *
 * @param dateInput - ISO-8601 date string or Date object
 * @returns Dual-formatted date string, e.g. "1/15/2025 (BD 9146.438)"
 */
export function formatDateOnlyWithBD(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const localeStr = d.toLocaleDateString();
    const bd = toBrightDateString(d, 3);
    return bd ? `${localeStr} (BD ${bd})` : localeStr;
  } catch {
    return typeof dateInput === 'string' ? dateInput : dateInput.toString();
  }
}

/**
 * Format a date as BrightDate only (no locale string).
 *
 * @param iso - ISO-8601 date string
 * @param precision - Decimal places (default: 5)
 * @returns BrightDate string, e.g. "BD 9146.43750"
 */
export function formatBDOnly(iso: string, precision = 5): string {
  const bd = toBrightDateString(iso, precision);
  return bd ? `BD ${bd}` : '';
}
