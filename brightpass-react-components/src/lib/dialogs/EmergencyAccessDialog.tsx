/**
 * EmergencyAccessDialog — configures Shamir-based emergency access trustees
 * and provides a recovery form for submitting encrypted shares.
 *
 * Two modes:
 * 1. CONFIGURE: Set threshold and trustee member IDs, then call configureEmergencyAccess()
 * 2. RECOVER: Submit encrypted shares from trustees, call recoverWithShares() when threshold met
 *
 * Exports a pure `validateThreshold` helper for property testing (Property 13).
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import type { EncryptedShare } from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';
import { useBrightPassApi } from '../hooks/useBrightPassApi';

/**
 * Pure helper: returns true when `1 <= threshold <= trusteesCount` and `trusteesCount >= 1`.
 * Exported for property-based testing (Property 13).
 */
export function validateThreshold(
  threshold: number,
  trusteesCount: number,
): boolean {
  if (trusteesCount < 1) return false;
  return threshold >= 1 && threshold <= trusteesCount;
}

type DialogMode = 'configure' | 'recover';

interface EmergencyAccessDialogProps {
  /** The vault ID to configure emergency access for. */
  vaultId: string;
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback when the dialog should close. */
  onClose: () => void;
  /** Called after a successful configure or recover operation. */
  onSuccess?: () => void;
}

export const EmergencyAccessDialog: React.FC<EmergencyAccessDialogProps> = ({
  vaultId,
  open,
  onClose,
  onSuccess,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [mode, setMode] = useState<DialogMode>('configure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Configure mode state
  const [threshold, setThreshold] = useState<number>(1);
  const [trusteesInput, setTrusteesInput] = useState('');

  // Recover mode state
  const [shareInputs, setShareInputs] = useState<string[]>(['']);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setThreshold(1);
      setTrusteesInput('');
      setShareInputs(['']);
      setMode('configure');
    }
  }, [open]);

  const parseTrustees = useCallback((): string[] => {
    return trusteesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [trusteesInput]);

  const handleConfigure = useCallback(async () => {
    setError(null);
    setSuccess(null);

    const trustees = parseTrustees();
    if (!validateThreshold(threshold, trustees.length)) {
      setError(t(BrightPassStrings.Emergency_InvalidThreshold));
      return;
    }

    setLoading(true);
    try {
      await brightPassApi.configureEmergencyAccess(vaultId, {
        vaultId,
        threshold,
        totalShares: trustees.length,
        trustees,
      });
      setSuccess(t(BrightPassStrings.Emergency_Success));
      onSuccess?.();
    } catch {
      setError(t(BrightPassStrings.Emergency_Error));
    } finally {
      setLoading(false);
    }
  }, [vaultId, threshold, parseTrustees, t, onSuccess]);

  const handleRecover = useCallback(async () => {
    setError(null);
    setSuccess(null);

    const filledShares = shareInputs.filter((s) => s.trim().length > 0);
    if (filledShares.length === 0) {
      setError(
        t(BrightPassStrings.Emergency_InsufficientShares, {
          THRESHOLD: '1',
        }),
      );
      return;
    }

    const shares: EncryptedShare[] = filledShares.map((shareData, idx) => ({
      trusteeId: `trustee-${idx}`,
      encryptedShareData: new TextEncoder().encode(shareData.trim()),
    }));

    setLoading(true);
    try {
      await brightPassApi.recoverWithShares(vaultId, shares);
      setSuccess(t(BrightPassStrings.Emergency_Success));
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : t(BrightPassStrings.Emergency_Error);
      // Check if the error indicates insufficient shares
      if (message.toLowerCase().includes('insufficient')) {
        setError(
          t(BrightPassStrings.Emergency_InsufficientShares, {
            THRESHOLD: '?',
          }),
        );
      } else {
        setError(t(BrightPassStrings.Emergency_Error));
      }
    } finally {
      setLoading(false);
    }
  }, [vaultId, shareInputs, t, onSuccess]);

  const handleShareInputChange = useCallback(
    (index: number, value: string) => {
      setShareInputs((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [],
  );

  const addShareInput = useCallback(() => {
    setShareInputs((prev) => [...prev, '']);
  }, []);

  const trustees = parseTrustees();
  const isThresholdValid = validateThreshold(threshold, trustees.length);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {t(BrightPassStrings.Emergency_Title)}
          <IconButton
            aria-label={t(BrightPassStrings.Emergency_Close)}
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={mode}
          onChange={(_, newMode: DialogMode) => {
            setMode(newMode);
            setError(null);
            setSuccess(null);
          }}
          sx={{ mb: 2 }}
        >
          <Tab
            label={t(BrightPassStrings.Emergency_Configure)}
            value="configure"
          />
          <Tab
            label={t(BrightPassStrings.Emergency_Recover)}
            value="recover"
          />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {mode === 'configure' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t(BrightPassStrings.Emergency_Trustees)}
              value={trusteesInput}
              onChange={(e) => {
                setTrusteesInput(e.target.value);
                setError(null);
              }}
              fullWidth
              disabled={loading}
              aria-label={t(BrightPassStrings.Emergency_Trustees)}
            />
            <TextField
              label={t(BrightPassStrings.Emergency_Threshold)}
              type="number"
              value={threshold}
              onChange={(e) => {
                setThreshold(Number(e.target.value));
                setError(null);
              }}
              inputProps={{ min: 1, max: trustees.length || 1 }}
              error={trusteesInput.length > 0 && !isThresholdValid}
              fullWidth
              disabled={loading}
              aria-label={t(BrightPassStrings.Emergency_Threshold)}
            />
          </Box>
        )}

        {mode === 'recover' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shareInputs.map((shareValue, idx) => (
              <TextField
                key={idx}
                label={t(BrightPassStrings.Emergency_Shares, {
                  INDEX: String(idx + 1),
                })}
                value={shareValue}
                onChange={(e) => handleShareInputChange(idx, e.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={loading}
                aria-label={t(BrightPassStrings.Emergency_Shares, {
                  INDEX: String(idx + 1),
                })}
              />
            ))}
            <Button
              variant="outlined"
              onClick={addShareInput}
              disabled={loading}
              size="small"
            >
              +
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t(BrightPassStrings.Emergency_Close)}
        </Button>
        {mode === 'configure' && (
          <Button
            variant="contained"
            onClick={handleConfigure}
            disabled={loading || !isThresholdValid}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t(BrightPassStrings.Emergency_Configure)}
          </Button>
        )}
        {mode === 'recover' && (
          <Button
            variant="contained"
            onClick={handleRecover}
            disabled={loading || shareInputs.every((s) => s.trim().length === 0)}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t(BrightPassStrings.Emergency_Recover)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EmergencyAccessDialog;
