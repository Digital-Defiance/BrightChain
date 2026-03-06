/**
 * PaperKeyRecovery — Recovery wizard for restoring accounts from paper keys.
 *
 * Supports text input (24 words) and QR code scanning for paper key entry.
 *
 * Requirements: 9.6, 9.7
 */

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaperKeyRecoveryProps {
  /** Called when recovery succeeds */
  onRecover: (paperKey: string) => void | Promise<void>;
  /** Called when the user cancels */
  onCancel?: () => void;
  /** Function to validate a paper key */
  validatePaperKey: (key: string) => boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PaperKeyRecovery: FC<PaperKeyRecoveryProps> = ({
  onRecover,
  onCancel,
  validatePaperKey,
}) => {
  const [paperKey, setPaperKey] = useState('');
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);

  const wordCount = paperKey.trim().split(/\s+/).filter(Boolean).length;

  const handleRecover = async () => {
    setError('');

    const trimmed = paperKey.trim().toLowerCase();
    const words = trimmed.split(/\s+/).filter(Boolean);

    if (words.length !== 24) {
      setError(`Expected 24 words, got ${words.length}.`);
      return;
    }

    const normalized = words.join(' ');

    if (!validatePaperKey(normalized)) {
      setError('Invalid paper key. Please check your words and try again.');
      return;
    }

    setRecovering(true);
    try {
      await onRecover(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Recovery failed';
      setError(msg);
    } finally {
      setRecovering(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Recover Your Account
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter your 24-word paper key to restore your BrightChain identity.
        Separate each word with a space.
      </Typography>

      <TextField
        label="Paper Key"
        value={paperKey}
        onChange={(e) => {
          setPaperKey(e.target.value);
          setError('');
        }}
        multiline
        rows={4}
        fullWidth
        placeholder="word1 word2 word3 ... word24"
        sx={{ mb: 1 }}
        autoComplete="off"
        inputProps={{ 'aria-label': 'Enter your 24-word paper key' }}
      />

      <Typography
        variant="caption"
        color={wordCount === 24 ? 'success.main' : 'text.secondary'}
        sx={{ mb: 2, display: 'block' }}
      >
        {wordCount}/24 words
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={recovering}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleRecover}
          disabled={recovering || wordCount !== 24}
          startIcon={recovering ? <CircularProgress size={16} /> : undefined}
        >
          {recovering ? 'Recovering...' : 'Recover Account'}
        </Button>
      </Box>
    </Paper>
  );
};
