/**
 * Locale-aware date formatting utility for BrightMail.
 *
 * Uses `Intl.DateTimeFormat` to format dates per the user's locale,
 * with BrightDate (the official time system of BrightChain) shown alongside.
 *
 * Display format: "Jan 15, 2025 (BD 9146.43750)"
 *
 * Requirements: 7.4
 */

import { brightDateToDate, toBrightDateString } from '@brightchain/brightchain-lib';

/**
 * Normalise a BrightDateTimestamp (number), Date, or ISO string to a Date.
 */
function toDate(date: number | Date | string): Date {
  if (typeof date === 'number') return brightDateToDate(date);
  if (typeof date === 'string') return new Date(date);
  return date;
}

/**
 * Formats a date value using `Intl.DateTimeFormat` for the given locale,
 * with BrightDate shown alongside in parentheses.
 *
 * @param date - A BrightDateTimestamp (number), Date object, or ISO date string to format.
 * @param locale - BCP 47 locale string (e.g. 'en-US', 'ja', 'de').
 *                 Defaults to `undefined` which uses the runtime default locale.
 * @returns A non-empty dual-formatted date string, e.g. "Jan 15, 2025 (BD 9146.438)"
 */
export function formatDateLocale(date: number | Date | string, locale?: string): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const localeStr = formatter.format(d);
  const bd = toBrightDateString(d, 3);
  return bd ? `${localeStr} (BD ${bd})` : localeStr;
}

/**
 * Formats a date value as a full date-time string using `Intl.DateTimeFormat`,
 * with BrightDate shown alongside in parentheses.
 * Used in ThreadView for more detailed timestamps.
 *
 * @param date - A BrightDateTimestamp (number), Date object, or ISO date string to format.
 * @param locale - BCP 47 locale string. Defaults to runtime default.
 * @returns A non-empty dual-formatted date-time string, e.g. "Jan 15, 2025, 10:30 AM (BD 9146.43750)"
 */
export function formatDateTimeLocale(
  date: number | Date | string,
  locale?: string,
): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  const localeStr = formatter.format(d);
  const bd = toBrightDateString(d, 5);
  return bd ? `${localeStr} (BD ${bd})` : localeStr;
}

/**
 * Formats a date value using only the locale format (no BrightDate).
 * Use this when space is extremely constrained or BrightDate is shown separately.
 *
 * @param date - A BrightDateTimestamp (number), Date object, or ISO date string to format.
 * @param locale - BCP 47 locale string.
 * @returns A locale-formatted date string without BrightDate.
 */
export function formatDateLocaleOnly(
  date: number | Date | string,
  locale?: string,
): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(d);
}
