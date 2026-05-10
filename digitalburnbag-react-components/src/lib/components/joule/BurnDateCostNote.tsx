import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Chip, Tooltip } from '@mui/material';

/**
 * Stateless badge displayed when a burn date is set on the file.
 * Informs the user that the tier is automatically reduced to FROZEN (pending-burn)
 * which uses RS(4,1) erasure coding.
 *
 * Requirement 8.2
 */
export function BurnDateCostNote() {
  const { tBranded: t } = useI18n();
  return (
    <Tooltip title={t(DigitalBurnbagStrings.Joule_BurnDateTooltip)} arrow>
      <Chip
        label={t(DigitalBurnbagStrings.Joule_BurnDateActive)}
        color="warning"
        size="small"
        role="status"
        aria-label={t(DigitalBurnbagStrings.Joule_BurnDateActive)}
        sx={{ fontWeight: 500 }}
      />
    </Tooltip>
  );
}
