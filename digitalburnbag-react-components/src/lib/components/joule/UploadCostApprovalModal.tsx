import { formatJoule } from '@brightchain/brightchain-lib';
import type {
  IUploadCommitResultDTO,
  IUploadCostQuoteDTO,
} from '@brightchain/digitalburnbag-lib';
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BurnbagApiClient } from '../../services/burnbag-api-client';

export interface IUploadCostApprovalModalProps {
  open: boolean;
  sessionId: string;
  availableJouleBalance?: bigint;
  apiClient: BurnbagApiClient;
  onCommit: (result: IUploadCommitResultDTO) => void;
  onDiscard: () => void;
}

type ModalState =
  | { phase: 'loading' }
  | { phase: 'quoted'; quote: IUploadCostQuoteDTO }
  | { phase: 'expired' }
  | { phase: 'error'; message: string };

function useCountdown(expiresAt: string | null): {
  secondsLeft: number;
  expired: boolean;
} {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  // Only consider the quote expired once the countdown has actually started
  // (i.e. we've received a non-null expiresAt and ticked at least once).
  const startedRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) {
      startedRef.current = false;
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000,
      );
      setSecondsLeft(Math.max(0, diff));
      startedRef.current = true;
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return {
    secondsLeft,
    // Only expired if the countdown has started AND reached zero.
    expired: startedRef.current && secondsLeft === 0,
  };
}

/**
 * Modal displayed after an upload session is initialised but before the user
 * commits Joule charges. Lifecycle:
 *
 *  1. On open — calls `BurnbagApiClient.quoteUpload(sessionId)` to fetch the
 *     cost quote and starts a live countdown to `quoteExpiresAt`.
 *  2. Displays the quote (upfront + daily µJ, RS params, overhead).
 *  3. Shows an `role="alert"` warning when upfront cost > `availableJouleBalance`.
 *  4. "Confirm Upload" → commits; calls `onCommit(result)`.
 *  5. "Cancel" → discards; calls `onDiscard()`.
 *  6. When countdown hits zero → proactively discards and shows "Quote expired"
 *     message.
 *
 * Fully keyboard-navigable (Tab, Enter, Escape).
 *
 * Requirement 8.10 (Phase 6.8)
 */
export function UploadCostApprovalModal({
  open,
  sessionId,
  availableJouleBalance,
  apiClient,
  onCommit,
  onDiscard,
}: IUploadCostApprovalModalProps) {
  const [state, setState] = useState<ModalState>({ phase: 'loading' });
  const [committing, setCommitting] = useState(false);
  const discardedRef = useRef(false);
  const { tBranded: t } = useI18n();

  const quoteExpiresAt =
    state.phase === 'quoted' ? state.quote.quoteExpiresAt : null;
  const { secondsLeft, expired } = useCountdown(quoteExpiresAt);

  // Load the quote when the modal opens
  useEffect(() => {
    if (!open) return;
    discardedRef.current = false;
    setState({ phase: 'loading' });
    setCommitting(false);

    apiClient
      .quoteUpload(sessionId)
      .then((quote) => {
        setState({ phase: 'quoted', quote });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : t(DigitalBurnbagStrings.Joule_FetchQuoteFailed);
        setState({ phase: 'error', message });
      });
  }, [open, sessionId, apiClient]);

  // Proactively discard when the quote expires
  useEffect(() => {
    if (!expired || state.phase !== 'quoted' || discardedRef.current) return;
    // Double-check against the actual timestamp to avoid false positives
    // from the countdown not having ticked yet.
    const expiresAt = state.quote.quoteExpiresAt;
    if (new Date(expiresAt).getTime() > Date.now()) return;
    discardedRef.current = true;
    setState({ phase: 'expired' });
    apiClient.discardUpload(sessionId).catch(() => {
      // best-effort — server will expire the session anyway
    });
  }, [expired, state.phase, sessionId, apiClient]);

  const handleCommit = useCallback(async () => {
    setCommitting(true);
    try {
      const result = await apiClient.commitUpload(sessionId);
      onCommit(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t(DigitalBurnbagStrings.Joule_CommitFailed);
      setState({ phase: 'error', message });
    } finally {
      setCommitting(false);
    }
  }, [apiClient, sessionId, onCommit]);

  const handleDiscard = useCallback(async () => {
    try {
      await apiClient.discardUpload(sessionId);
    } catch {
      // ignore — server-side TTL will clean up
    }
    onDiscard();
  }, [apiClient, sessionId, onDiscard]);

  const quote = state.phase === 'quoted' ? state.quote : null;
  const upfrontBigint = quote ? BigInt(quote.upfrontMicroJoules) : 0n;
  const dailyBigint = quote ? BigInt(quote.dailyMicroJoules) : 0n;
  const isOverBalance =
    quote !== null &&
    availableJouleBalance !== undefined &&
    upfrontBigint > availableJouleBalance;

  const totalSeconds =
    quote !== null
      ? Math.floor(
          (new Date(quote.quoteExpiresAt).getTime() -
            new Date(quote.quotedAt).getTime()) /
            1000,
        )
      : 0;
  const progressPct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        void handleDiscard();
      }}
      aria-labelledby="upload-cost-approval-title"
      aria-describedby="upload-cost-approval-desc"
      disableEscapeKeyDown={committing}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="upload-cost-approval-title">
        {t(DigitalBurnbagStrings.Joule_ModalTitle)}
      </DialogTitle>

      <DialogContent id="upload-cost-approval-desc">
        {state.phase === 'loading' && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={4}
            aria-live="polite"
            aria-label={t(DigitalBurnbagStrings.Joule_LoadingAriaLabel)}
          >
            <CircularProgress />
          </Box>
        )}

        {state.phase === 'error' && (
          <Alert severity="error" role="alert" aria-live="assertive">
            {state.message}
          </Alert>
        )}

        {state.phase === 'expired' && (
          <Alert severity="warning" role="alert" aria-live="assertive">
            {t(DigitalBurnbagStrings.Joule_QuoteExpired)}
          </Alert>
        )}

        {state.phase === 'quoted' && quote && (
          <Stack spacing={2}>
            {isOverBalance && (
              <Alert severity="error" role="alert" aria-live="assertive">
                {t(DigitalBurnbagStrings.Joule_ModalInsufficientBalance, {
                  balance: formatJoule(availableJouleBalance),
                })}
              </Alert>
            )}

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Typography variant="body2" color="text.secondary">
                {t(DigitalBurnbagStrings.Joule_UpfrontLabel, {
                  durationDays: quote.durationDays,
                  daySuffix: quote.durationDays !== 1 ? 's' : '',
                })}
              </Typography>
              <Typography
                variant="body1"
                fontWeight={700}
                color={isOverBalance ? 'error.main' : 'text.primary'}
                aria-label={t(DigitalBurnbagStrings.Joule_UpfrontAriaLabel, {
                  amount: formatJoule(upfrontBigint),
                })}
              >
                {formatJoule(upfrontBigint)}
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
                  amount: formatJoule(dailyBigint),
                })}
              >
                {t(DigitalBurnbagStrings.Joule_DailyPerDay, {
                  amount: formatJoule(dailyBigint),
                })}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Typography variant="body2" color="text.secondary">
                {t(DigitalBurnbagStrings.Joule_ErasureCodingLabel)}
              </Typography>
              <Typography variant="body2">
                {t(DigitalBurnbagStrings.Joule_ErasureCodingValue, {
                  rsK: quote.rsK,
                  rsM: quote.rsM,
                  overheadDisplay: quote.overheadDisplay,
                })}
              </Typography>
            </Stack>

            <Divider />

            <Box aria-live="polite" aria-atomic="true">
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="caption" color="text.secondary">
                  {t(DigitalBurnbagStrings.Joule_QuoteExpiresIn)}
                </Typography>
                <Typography
                  variant="caption"
                  color={secondsLeft < 60 ? 'error.main' : 'text.secondary'}
                  aria-label={t(
                    DigitalBurnbagStrings.Joule_QuoteExpiresInAriaLabel,
                    { seconds: secondsLeft },
                  )}
                >
                  {t(DigitalBurnbagStrings.Joule_QuoteSeconds, {
                    seconds: secondsLeft,
                  })}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                color={secondsLeft < 60 ? 'error' : 'primary'}
                aria-label={t(
                  DigitalBurnbagStrings.Joule_QuoteProgressAriaLabel,
                )}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            void handleDiscard();
          }}
          disabled={committing}
          aria-label={t(DigitalBurnbagStrings.Joule_CancelButtonAriaLabel)}
        >
          {t(DigitalBurnbagStrings.Joule_CancelButton)}
        </Button>
        <Button
          onClick={() => {
            void handleCommit();
          }}
          disabled={
            committing || state.phase !== 'quoted' || expired || isOverBalance
          }
          variant="contained"
          color="primary"
          aria-label={t(DigitalBurnbagStrings.Joule_ConfirmButtonAriaLabel)}
          aria-busy={committing}
        >
          {committing ? (
            <CircularProgress size={18} />
          ) : (
            t(DigitalBurnbagStrings.Joule_ConfirmButton)
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
