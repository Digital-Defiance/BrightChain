import { formatJoule } from '@brightchain/brightchain-lib';
import {
  calculateBurnbagStorageCost,
  DigitalBurnbagStrings,
  type BurnbagStorageTier,
} from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';

import { BurnDateCostNote } from './BurnDateCostNote';
import { RsParamsDisplay } from './RsParamsDisplay';

export interface IStorageCostPreviewProps {
  bytes: bigint;
  tier: BurnbagStorageTier;
  durationDays: number;
  hasBurnDate: boolean;
  availableBalance?: bigint;
}

/**
 * Client-side storage cost preview panel.
 * Calls `calculateBurnbagStorageCost` in the browser (no API call) and
 * displays the upfront and daily µJ costs via `formatJoule`.
 *
 * Shows a `BurnDateCostNote` badge when `hasBurnDate` is true.
 * Renders the active tier's `RsParamsDisplay`.
 * Highlights in red / shows an alert when upfront cost exceeds `availableBalance`.
 *
 * Requirement 8.6
 */
export function StorageCostPreview({
  bytes,
  tier,
  durationDays,
  hasBurnDate,
  availableBalance,
}: IStorageCostPreviewProps) {
  const { tBranded: t } = useI18n();
  const effectiveTier: BurnbagStorageTier = hasBurnDate ? 'pending-burn' : tier;

  let cost: ReturnType<typeof calculateBurnbagStorageCost> | null = null;
  let calcError: string | null = null;
  try {
    cost = calculateBurnbagStorageCost({
      bytes,
      tier: effectiveTier,
      durationDays,
    });
  } catch (err) {
    calcError =
      err instanceof Error
        ? err.message
        : t(DigitalBurnbagStrings.Joule_UnableToCalculateCost);
  }

  const isOverBalance =
    cost !== null &&
    availableBalance !== undefined &&
    cost.upfrontMicroJoules > availableBalance;

  return (
    <Box
      sx={{
        border: isOverBalance ? '1px solid' : '1px solid',
        borderColor: isOverBalance ? 'error.main' : 'divider',
        borderRadius: 1,
        p: 2,
      }}
      role="region"
      aria-label={t(DigitalBurnbagStrings.Joule_StorageCostPreviewRegion)}
    >
      {hasBurnDate && (
        <Box mb={1}>
          <BurnDateCostNote />
        </Box>
      )}

      {!hasBurnDate && (
        <Box mb={1}>
          <Alert severity="info" icon={false}>
            <Typography variant="caption">
              {t(DigitalBurnbagStrings.Joule_ExpiryReleaseNote, {
                durationDays,
                daySuffix: durationDays !== 1 ? 's' : '',
              })}
            </Typography>
          </Alert>
        </Box>
      )}

      {calcError ? (
        <Alert severity="warning" aria-live="polite">
          {calcError}
        </Alert>
      ) : cost !== null ? (
        <Stack spacing={1}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
          >
            <Typography variant="body2" color="text.secondary">
              {t(DigitalBurnbagStrings.Joule_UpfrontLabel, {
                durationDays,
                daySuffix: durationDays !== 1 ? 's' : '',
              })}
            </Typography>
            <Typography
              variant="body1"
              fontWeight={700}
              color={isOverBalance ? 'error.main' : 'text.primary'}
              aria-label={t(DigitalBurnbagStrings.Joule_UpfrontAriaLabel, {
                amount: formatJoule(cost.upfrontMicroJoules),
              })}
            >
              {formatJoule(cost.upfrontMicroJoules)}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
          >
            <Typography variant="body2" color="text.secondary">
              {t(DigitalBurnbagStrings.Joule_DailyCharge)}
            </Typography>
            <Typography
              variant="body2"
              aria-label={t(DigitalBurnbagStrings.Joule_DailyAriaLabel, {
                amount: formatJoule(cost.dailyMicroJoules),
              })}
            >
              {t(DigitalBurnbagStrings.Joule_DailyPerDay, {
                amount: formatJoule(cost.dailyMicroJoules),
              })}
            </Typography>
          </Stack>

          <Divider />

          <RsParamsDisplay rsK={cost.rsK} rsM={cost.rsM} />

          {isOverBalance && availableBalance !== undefined && (
            <Alert severity="error" role="alert" aria-live="assertive">
              {t(DigitalBurnbagStrings.Joule_InsufficientBalance, {
                balance: formatJoule(availableBalance),
              })}
            </Alert>
          )}
        </Stack>
      ) : null}
    </Box>
  );
}
