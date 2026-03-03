/**
 * TOTPWidget — displays a live TOTP code with countdown timer.
 *
 * On mount and every 30 seconds, calls the backend to get the current code.
 * Provides "Copy Code" with 30-second auto-clear and optional QR code display.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6
 */

import type { ITotpCode } from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';
import { useBrightPassApi } from '../hooks/useBrightPassApi';

/* ------------------------------------------------------------------ */
/*  Pure helper functions — exported for property-based testing        */
/* ------------------------------------------------------------------ */

/**
 * Format a 6-digit TOTP code as "XXX XXX" for readability.
 */
export function formatTotpCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  return code;
}

/**
 * Calculate seconds remaining in the current TOTP window.
 * Returns a value in [0, period - 1].
 */
export function calculateRemainingSeconds(
  timestampMs: number,
  period: number,
): number {
  return period - 1 - (Math.floor(timestampMs / 1000) % period);
}

/**
 * Validate a base32-encoded string.
 */
export function isValidBase32(input: string): boolean {
  return /^[A-Z2-7]+=*$/i.test(input) && input.length > 0;
}

/**
 * Validate an otpauth:// URI containing a valid base32 secret.
 */
export function isValidOtpauthUri(input: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.protocol === 'otpauth:' &&
      url.searchParams.has('secret') &&
      isValidBase32(url.searchParams.get('secret')!)
    );
  } catch {
    return false;
  }
}

/**
 * Validate a TOTP secret — either raw base32 or an otpauth:// URI.
 */
export function isValidTotpSecret(input: string): boolean {
  return isValidBase32(input) || isValidOtpauthUri(input);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const CLIPBOARD_CLEAR_MS = 30_000;
const COUNTDOWN_INTERVAL_MS = 1_000;

interface TOTPWidgetProps {
  secret: string;
  showQrCode?: boolean;
}

export const TOTPWidget: React.FC<TOTPWidgetProps> = ({
  secret,
  showQrCode = false,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [totpCode, setTotpCode] = useState<ITotpCode | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCode = useCallback(async () => {
    try {
      setError(null);
      const code = await brightPassApi.generateTotp(secret);
      setTotpCode(code);
      setRemaining(code.remainingSeconds);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Failed to generate TOTP';
      setError(message);
    }
  }, [secret]);

  // Fetch on mount and whenever the secret changes
  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  // Countdown timer — ticks every second, re-fetches when reaching zero
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          fetchCode();
          return 30;
        }
        return prev - 1;
      });
    }, COUNTDOWN_INTERVAL_MS);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchCode]);

  // Cleanup clipboard timers on unmount
  useEffect(() => {
    return () => {
      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!totpCode?.code) return;

    try {
      await navigator.clipboard.writeText(totpCode.code);
      setCopied(true);

      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);

      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
      clipboardTimerRef.current = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
        } catch {
          // Clipboard API may not be available in background
        }
      }, CLIPBOARD_CLEAR_MS);
    } catch {
      // Clipboard write failed
    }
  }, [totpCode]);

  const period = totpCode?.period ?? 30;
  const progressValue = (remaining / period) * 100;

  const otpauthUri = `otpauth://totp/?secret=${encodeURIComponent(secret)}&period=${period}&digits=6&algorithm=SHA1`;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t(BrightPassStrings.TOTP_Title)}
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {totpCode && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: 'block' }}
          >
            {t(BrightPassStrings.TOTP_Code)}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                letterSpacing: '0.15em',
              }}
            >
              {formatTotpCode(totpCode.code)}
            </Typography>

            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={progressValue}
                size={48}
                thickness={4}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {remaining}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t(BrightPassStrings.TOTP_SecondsRemaining, {
              SECONDS: String(remaining),
            })}
          </Typography>

          <Button variant="outlined" onClick={handleCopy}>
            {copied
              ? t(BrightPassStrings.TOTP_Copied)
              : t(BrightPassStrings.TOTP_CopyCode)}
          </Button>
        </Box>
      )}

      {showQrCode && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t(BrightPassStrings.TOTP_QrCode)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            {t(BrightPassStrings.TOTP_SecretUri)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            {otpauthUri}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TOTPWidget;
