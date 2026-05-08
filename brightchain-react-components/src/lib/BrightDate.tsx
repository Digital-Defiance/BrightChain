import {
  BrightChainStrings,
  toBrightDateString,
} from '@brightchain/brightchain-lib';
import { toDate } from '@brightchain/brightdate';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { FC, useEffect, useMemo, useState } from 'react';

export interface BrightDateProps {
  /**
   * The refresh interval in ms. 0 or negative to disable auto-refresh.
   */
  interval?: number;
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
}

const PRECISION: Record<NonNullable<BrightDateProps['format']>, number> = {
  full: 8, // sub-millisecond
  standard: 5, // ~0.86s
  compact: 3, // ~86s
};

export const BrightDate: FC<BrightDateProps> = ({
  interval = 1000,
  format = 'full',
  date,
  value,
}) => {
  const { tBranded: t } = useI18n();
  const [now, setNow] = useState(new Date());

  // Convert a BrightDate numeric value to a JS Date
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

  const brightDate = toBrightDateString(now, PRECISION[format]);

  return (
    <time dateTime={now.toISOString()} data-testid="bright-date">
      {t(BrightChainStrings.Date_BrightDateTemplate, { BD: brightDate })}
    </time>
  );
};
