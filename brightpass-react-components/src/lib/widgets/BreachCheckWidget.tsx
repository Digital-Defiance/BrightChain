/**
 * BreachCheckWidget — checks passwords against the breach database.
 *
 * Provides an input field and "Check" button. Displays an i18n warning
 * with breach count on positive result, or a success message on negative.
 * Accessible standalone from BrightPass menu and inline within EntryDetailView.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import type { IBreachCheckResult } from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

/* ------------------------------------------------------------------ */
/*  Pure helper functions — exported for property-based testing        */
/* ------------------------------------------------------------------ */

/**
 * Determine the alert severity and i18n message key based on a breach result.
 * Exported for property-based testing (Property 12).
 */
export function formatBreachMessage(
  breached: boolean,
  count: number,
): { severity: 'warning' | 'success'; messageKey: string } {
  if (breached) {
    return { severity: 'warning', messageKey: 'Breach_Found' };
  }
  return { severity: 'success', messageKey: 'Breach_NotFound' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BreachCheckWidgetProps {
  /** Optional initial password value (e.g. when used inline in EntryDetailView). */
  initialPassword?: string;
}

export const BreachCheckWidget: React.FC<BreachCheckWidgetProps> = ({
  initialPassword = '',
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [password, setPassword] = useState(initialPassword);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<IBreachCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    if (!password.trim()) return;

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      const breachResult = await brightPassApi.checkBreach(password);
      setResult(breachResult);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Breach check failed';
      setError(message);
    } finally {
      setChecking(false);
    }
  }, [password]);

  const breachMessage = result
    ? formatBreachMessage(result.breached, result.count)
    : null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t(BrightPassStrings.Breach_Title)}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
        <TextField
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setResult(null);
            setError(null);
          }}
          type="password"
          label={t(BrightPassStrings.Breach_Password)}
          size="small"
          fullWidth
          disabled={checking}
          aria-label={t(BrightPassStrings.Breach_Password)}
        />
        <Button
          variant="contained"
          onClick={handleCheck}
          disabled={checking || !password.trim()}
          sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
        >
          {checking ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            t(BrightPassStrings.Breach_Check)
          )}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {breachMessage && result && (
        <Alert severity={breachMessage.severity} sx={{ mb: 1 }}>
          {breachMessage.severity === 'warning'
            ? t(BrightPassStrings.Breach_Found, {
                COUNT: String(result.count),
              })
            : t(BrightPassStrings.Breach_NotFound)}
        </Alert>
      )}
    </Box>
  );
};

export default BreachCheckWidget;
