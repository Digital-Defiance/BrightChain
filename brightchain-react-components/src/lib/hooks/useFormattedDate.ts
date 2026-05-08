/**
 * useFormattedDate — A hook that provides mode-aware date formatting functions.
 *
 * This is the primary utility for components that need to format dates as
 * strings (not JSX). It reads the user's BrightDate display preference from
 * the BrightDateContext and provides formatting functions that respect it.
 *
 * For components that render dates as JSX elements, use `<SettingsDate>` instead.
 *
 * @example
 * ```tsx
 * const { formatDate, formatDateTime, getTooltip } = useFormattedDate();
 *
 * // Returns mode-aware string:
 * // Dual: "Jan 15, 2025 (BD 9146.438)"
 * // BrightDateOnly: "BD 9146.438"
 * // LocaleOnly: "Jan 15, 2025"
 * // Hover/HoverReverse: locale or BD string (caller handles tooltip)
 * const dateStr = formatDate(someDate);
 * const dateTimeStr = formatDateTime(someDate);
 * ```
 *
 * @module hooks/useFormattedDate
 */

import { BrightDateDisplayMode, brightDateToDate, toBrightDateString } from '@brightchain/brightchain-lib';
import { useCallback } from 'react';
import { useBrightDateMode } from '../contexts/BrightDateContext';

export interface FormattedDateOptions {
  /** Locale for Intl.DateTimeFormat. Defaults to runtime default. */
  locale?: string;
  /** BrightDate precision (decimal places). Defaults to 3. */
  precision?: number;
}

export interface UseFormattedDateReturn {
  /** The current display mode. */
  mode: BrightDateDisplayMode;
  /**
   * Format a date as a short date string (e.g. "Jan 15, 2025") respecting mode.
   */
  formatDate: (date: number | Date | string, options?: FormattedDateOptions) => string;
  /**
   * Format a date as a date+time string (e.g. "Jan 15, 2025, 10:30 AM") respecting mode.
   */
  formatDateTime: (date: number | Date | string, options?: FormattedDateOptions) => string;
  /**
   * Get the tooltip string for hover modes. Empty string for non-hover modes.
   */
  getTooltip: (date: number | Date | string, options?: FormattedDateOptions) => string;
  /**
   * Get just the BrightDate string (e.g. "BD 9146.438").
   */
  toBD: (date: number | Date | string, precision?: number) => string;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

function toDateObj(date: number | Date | string): Date {
  if (typeof date === 'number') return brightDateToDate(date);
  return typeof date === 'string' ? new Date(date) : date;
}

function formatByMode(
  date: number | Date | string,
  mode: BrightDateDisplayMode,
  formatOptions: Intl.DateTimeFormatOptions,
  locale?: string,
  precision = 3,
): string {
  const d = toDateObj(date);
  if (isNaN(d.getTime())) return '';

  const localeStr = new Intl.DateTimeFormat(locale, formatOptions).format(d);
  const bd = toBrightDateString(date, precision);

  switch (mode) {
    case BrightDateDisplayMode.LocaleOnly:
    case BrightDateDisplayMode.Hover:
      return localeStr;

    case BrightDateDisplayMode.BrightDateOnly:
    case BrightDateDisplayMode.HoverReverse:
      return bd ? `BD ${bd}` : localeStr;

    case BrightDateDisplayMode.Dual:
    default:
      return bd ? `${localeStr} (BD ${bd})` : localeStr;
  }
}

function tooltipByMode(
  date: number | Date | string,
  mode: BrightDateDisplayMode,
  formatOptions: Intl.DateTimeFormatOptions,
  locale?: string,
  precision = 3,
): string {
  const d = toDateObj(date);
  if (isNaN(d.getTime())) return '';

  switch (mode) {
    case BrightDateDisplayMode.Hover: {
      const bd = toBrightDateString(date, precision);
      return bd ? `BD ${bd}` : '';
    }
    case BrightDateDisplayMode.HoverReverse:
      return new Intl.DateTimeFormat(locale, formatOptions).format(d);
    default:
      return '';
  }
}

/**
 * Hook providing mode-aware date formatting functions.
 *
 * Uses the BrightDateContext to determine the user's display preference.
 * Falls back to Dual mode when no provider is in the tree.
 */
export function useFormattedDate(): UseFormattedDateReturn {
  const { mode, toBD } = useBrightDateMode();

  const formatDate = useCallback(
    (date: number | Date | string, options?: FormattedDateOptions) =>
      formatByMode(date, mode, DATE_FORMAT, options?.locale, options?.precision ?? 3),
    [mode],
  );

  const formatDateTime = useCallback(
    (date: number | Date | string, options?: FormattedDateOptions) =>
      formatByMode(date, mode, DATETIME_FORMAT, options?.locale, options?.precision ?? 3),
    [mode],
  );

  const getTooltip = useCallback(
    (date: number | Date | string, options?: FormattedDateOptions) =>
      tooltipByMode(date, mode, DATETIME_FORMAT, options?.locale, options?.precision ?? 3),
    [mode],
  );

  return { mode, formatDate, formatDateTime, getTooltip, toBD };
}
