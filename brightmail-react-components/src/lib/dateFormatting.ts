/**
 * Locale-aware date formatting utility for BrightMail.
 *
 * Uses `Intl.DateTimeFormat` to format dates per the user's locale.
 * Exported for use in EmailListTable and ThreadView.
 *
 * Requirements: 7.4
 */

/**
 * Formats a date value using `Intl.DateTimeFormat` for the given locale.
 *
 * @param date - A Date object or ISO date string to format.
 * @param locale - BCP 47 locale string (e.g. 'en-US', 'ja', 'de').
 *                 Defaults to `undefined` which uses the runtime default locale.
 * @returns A non-empty locale-formatted date string.
 */
export function formatDateLocale(date: Date | string, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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

/**
 * Formats a date value as a full date-time string using `Intl.DateTimeFormat`.
 * Used in ThreadView for more detailed timestamps.
 *
 * @param date - A Date object or ISO date string to format.
 * @param locale - BCP 47 locale string. Defaults to runtime default.
 * @returns A non-empty locale-formatted date-time string.
 */
export function formatDateTimeLocale(
  date: Date | string,
  locale?: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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
  return formatter.format(d);
}
