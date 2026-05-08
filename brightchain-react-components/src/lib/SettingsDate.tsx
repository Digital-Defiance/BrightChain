/**
 * SettingsDate — A mode-aware date display component that renders dates
 * according to the user's BrightDate display preference.
 *
 * Uses the BrightDateContext (via `useBrightDateMode()`) to determine
 * how to render the date:
 * - Dual: locale date + BrightDate in parentheses
 * - BrightDateOnly: only BrightDate
 * - LocaleOnly: only the locale date
 * - Hover: locale date with BrightDate tooltip
 * - HoverReverse: BrightDate with locale date tooltip
 *
 * Falls back to Dual mode when no BrightDateProvider is in the tree.
 *
 * @module SettingsDate
 */

import { BrightDateDisplayMode } from '@brightchain/brightchain-lib';
import { toDate } from '@brightchain/brightdate';
import { Tooltip } from '@mui/material';
import { FC, useEffect, useMemo, useState } from 'react';
import { BrightDate } from './BrightDate';
import { useBrightDateMode } from './contexts/BrightDateContext';

export interface SettingsDateProps {
  /**
   * The refresh interval in ms. 0 or negative to disable auto-refresh.
   * Only applies when neither `date` nor `value` is provided.
   */
  interval?: number;
  /**
   * BrightDate format precision.
   */
  format?: 'full' | 'standard' | 'compact';
  /**
   * A JavaScript Date to display. When provided, auto-refresh is disabled.
   */
  date?: Date;
  /**
   * A BrightDate numeric value (decimal days since J2000.0) to display.
   * When provided, auto-refresh is disabled. Takes precedence over `date`.
   */
  value?: number;
  /**
   * Locale date format options for Intl.DateTimeFormat.
   * Defaults to a medium date+time format.
   */
  localeOptions?: Intl.DateTimeFormatOptions;
}

const DEFAULT_LOCALE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

export const SettingsDate: FC<SettingsDateProps> = ({
  interval = 1000,
  format = 'standard',
  date,
  value,
  localeOptions = DEFAULT_LOCALE_OPTIONS,
}) => {
  const { mode, formatDate, getTooltip } = useBrightDateMode();
  const [now, setNow] = useState(new Date());

  // Resolve the display date from value > date > live clock
  const resolvedDate = useMemo(() => {
    if (value !== undefined) return toDate(value);
    return date;
  }, [value, date]);

  useEffect(() => {
    if (resolvedDate !== undefined) {
      setNow(resolvedDate);
      return;
    }
    if (interval <= 0) {
      setNow(new Date());
      return;
    }
    const timer = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(timer);
  }, [interval, resolvedDate]);

  const localeStr = now.toLocaleString(undefined, localeOptions);

  // For BrightDateOnly and HoverReverse modes, delegate to BrightDate component
  if (mode === BrightDateDisplayMode.BrightDateOnly) {
    return <BrightDate date={now} interval={0} format={format} />;
  }

  // For LocaleOnly mode, just show the locale string
  if (mode === BrightDateDisplayMode.LocaleOnly) {
    return (
      <time dateTime={now.toISOString()} data-testid="settings-date">
        {localeStr}
      </time>
    );
  }

  // For Hover mode: show locale date, BrightDate on tooltip
  if (mode === BrightDateDisplayMode.Hover) {
    const tooltip = getTooltip(now, localeStr);
    return (
      <Tooltip title={tooltip} arrow>
        <time dateTime={now.toISOString()} data-testid="settings-date">
          {localeStr}
        </time>
      </Tooltip>
    );
  }

  // For HoverReverse mode: show BrightDate, locale date on tooltip
  if (mode === BrightDateDisplayMode.HoverReverse) {
    const tooltip = getTooltip(now, localeStr);
    return (
      <Tooltip title={tooltip} arrow>
        <span>
          <BrightDate date={now} interval={0} format={format} />
        </span>
      </Tooltip>
    );
  }

  // Dual mode (default): show formatted dual string
  const dualStr = formatDate(now, localeStr);
  return (
    <time dateTime={now.toISOString()} data-testid="settings-date">
      {dualStr}
    </time>
  );
};
