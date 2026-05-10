import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Typography } from '@mui/material';

export interface IRsParamsDisplayProps {
  rsK: number;
  rsM: number;
}

/**
 * Read-only display component for Reed-Solomon erasure coding parameters.
 * Shows the RS(k,m) scheme, overhead factor, and node failure tolerance.
 *
 * Requirement 8.4
 */
export function RsParamsDisplay({ rsK, rsM }: IRsParamsDisplayProps) {
  const { tBranded: t } = useI18n();
  // No parity shards means no RS coding — nothing meaningful to display.
  if (rsM === 0) return null;
  const overhead = ((rsK + rsM) / rsK).toFixed(2);
  const failureSuffix = rsM !== 1 ? 's' : '';
  return (
    <Typography
      variant="body2"
      component="span"
      aria-label={t(DigitalBurnbagStrings.Joule_RsDisplayAriaLabel, {
        rsK,
        rsM,
        overhead,
        failureSuffix,
      })}
    >
      {t(DigitalBurnbagStrings.Joule_RsDisplayText, {
        rsK,
        rsM,
        overhead,
        failureSuffix,
      })}
    </Typography>
  );
}
