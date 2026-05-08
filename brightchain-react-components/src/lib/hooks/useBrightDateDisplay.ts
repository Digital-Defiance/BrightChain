import { useMemo } from 'react';
import { BrightDate } from '@brightchain/brightdate';
import type { BrightDateValue } from '@brightchain/brightdate';
import { brightDateToDate } from '@brightchain/brightchain-lib';

export interface BrightDateDisplayResult {
  /** BrightDate string representation (e.g., "9622.50417") */
  brightDateString: string;
  /** Locale-formatted date string */
  localeString: string;
  /** The underlying Date for custom formatting */
  date: Date;
}

/**
 * Hook that derives display strings from a BrightDateValue.
 * BrightDate is the primary format; locale date is derived on demand.
 *
 * @param value - The BrightDateValue (decimal days since J2000.0) to display
 * @param locale - Optional BCP 47 locale string for locale-formatted output
 * @param options - Optional Intl.DateTimeFormatOptions for locale formatting
 * @returns Memoized object with brightDateString, localeString, and date
 *
 * @example
 * ```tsx
 * const { brightDateString, localeString, date } = useBrightDateDisplay(9622.50417);
 * // brightDateString: "9622.50417"
 * // localeString: "1/15/2026" (locale-dependent)
 * ```
 */
export function useBrightDateDisplay(
  value: BrightDateValue,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): BrightDateDisplayResult {
  return useMemo(() => {
    const bd = BrightDate.fromValue(value);
    const date = brightDateToDate(value);
    const localeString = date.toLocaleDateString(locale, options);
    return {
      brightDateString: bd.toString(),
      localeString,
      date,
    };
  }, [value, locale, options]);
}
