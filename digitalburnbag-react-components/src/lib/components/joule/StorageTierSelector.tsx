import {
  BURNBAG_TIER_RS_PARAMS,
  calculateBurnbagStorageCost,
  DigitalBurnbagStrings,
  type BurnbagStorageTier,
} from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

import { RsParamsDisplay } from './RsParamsDisplay';

const TIERS: {
  value: BurnbagStorageTier;
  labelKey: string;
}[] = [
  {
    value: 'performance',
    labelKey: DigitalBurnbagStrings.Joule_Tier_Performance,
  },
  { value: 'standard', labelKey: DigitalBurnbagStrings.Joule_Tier_Standard },
  { value: 'archive', labelKey: DigitalBurnbagStrings.Joule_Tier_Archive },
  {
    value: 'pending-burn',
    labelKey: DigitalBurnbagStrings.Joule_Tier_PendingBurn,
  },
  { value: 'none', labelKey: DigitalBurnbagStrings.Joule_Tier_None },
];

/** Reference cost for "standard" tier at 1 GB × 30 days, used for relative cost multipliers. */
const REFERENCE_BYTES = 1_073_741_824n; // 1 GiB
const REFERENCE_DAYS = 30;

function getRelativeMultiplier(tier: BurnbagStorageTier): string {
  try {
    const ref = calculateBurnbagStorageCost({
      bytes: REFERENCE_BYTES,
      tier: 'standard',
      durationDays: REFERENCE_DAYS,
    });
    const cost = calculateBurnbagStorageCost({
      bytes: REFERENCE_BYTES,
      tier,
      durationDays: REFERENCE_DAYS,
    });
    if (ref.upfrontMicroJoules === 0n) return '1.00×';
    // Multiply by 100 first to retain two decimal places
    const mul100 = (cost.upfrontMicroJoules * 100n) / ref.upfrontMicroJoules;
    const whole = mul100 / 100n;
    const frac = mul100 % 100n;
    return `${whole}.${String(frac).padStart(2, '0')}×`;
  } catch {
    return '—';
  }
}

export interface IStorageTierSelectorProps {
  value: BurnbagStorageTier;
  onChange: (tier: BurnbagStorageTier) => void;
  disabled?: boolean;
}

/**
 * Radio group allowing the user to select one of the four Burnbag storage tiers.
 * Each option displays the tier label, RS(k,m) parameters, overhead factor,
 * node failure tolerance, and cost multiplier relative to Standard tier.
 *
 * Requirement 8.3
 */
export function StorageTierSelector({
  value,
  onChange,
  disabled = false,
}: IStorageTierSelectorProps) {
  const { tBranded: t } = useI18n();
  return (
    <FormControl component="fieldset" disabled={disabled} fullWidth>
      <Typography
        component="legend"
        variant="subtitle2"
        gutterBottom
        aria-label={t(DigitalBurnbagStrings.Joule_StorageTierAriaLabel)}
      >
        {t(DigitalBurnbagStrings.Joule_StorageTierTitle)}
      </Typography>
      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as BurnbagStorageTier)}
        aria-label={t(DigitalBurnbagStrings.Joule_StorageTierAriaLabel)}
      >
        {TIERS.map((tier) => {
          const rsParams = BURNBAG_TIER_RS_PARAMS[tier.value];
          const multiplier = getRelativeMultiplier(tier.value);
          const tierLabel = t(tier.labelKey);
          return (
            <FormControlLabel
              key={tier.value}
              value={tier.value}
              control={<Radio inputProps={{ 'aria-label': tierLabel }} />}
              label={
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body1"
                      component="span"
                      fontWeight={500}
                    >
                      {tierLabel}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="span"
                    >
                      {t(DigitalBurnbagStrings.Joule_TierCostVsStandard, {
                        multiplier,
                      })}
                    </Typography>
                  </Stack>
                  <RsParamsDisplay rsK={rsParams.k} rsM={rsParams.m} />
                </Box>
              }
              sx={{ alignItems: 'flex-start', mb: 1 }}
            />
          );
        })}
      </RadioGroup>
    </FormControl>
  );
}
