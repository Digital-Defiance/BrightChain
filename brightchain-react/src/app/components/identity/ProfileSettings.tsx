/**
 * ProfileSettings — Display linked accounts, revoke proofs, toggle privacy.
 *
 * Requirements: 10.7, 10.8, 10.10
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import { FC, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LinkedAccount {
  id: string;
  platform: string;
  username: string;
  verified: boolean;
  proofUrl: string;
  createdAt: string;
}

interface ProfileSettingsProps {
  /** Linked identity proofs */
  accounts: LinkedAccount[];
  /** Whether privacy mode is enabled */
  privacyMode: boolean;
  /** Called when a proof should be revoked */
  onRevoke: (proofId: string) => Promise<void>;
  /** Called when privacy mode is toggled */
  onTogglePrivacy: (enabled: boolean) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ProfileSettings: FC<ProfileSettingsProps> = ({
  accounts,
  privacyMode,
  onRevoke,
  onTogglePrivacy,
}) => {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleRevoke = async (proofId: string) => {
    setRevoking(proofId);
    setError('');
    try {
      await onRevoke(proofId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revocation failed');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Profile Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Privacy Mode */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle1">Privacy Mode</Typography>
          <Typography variant="body2" color="text.secondary">
            When enabled, your profile is hidden from public directory searches.
          </Typography>
        </Box>
        <Switch
          checked={privacyMode}
          onChange={(e) => onTogglePrivacy(e.target.checked)}
          inputProps={{ 'aria-label': 'Toggle privacy mode' }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Linked Accounts */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Linked Accounts ({accounts.length})
      </Typography>

      <List>
        {accounts.map((account) => (
          <ListItem key={account.id} divider>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>{account.username}</Typography>
                  <Chip
                    label={account.platform}
                    size="small"
                    variant="outlined"
                  />
                  {account.verified && (
                    <Chip label="✓ Verified" size="small" color="success" />
                  )}
                </Box>
              }
              secondary={`Linked ${new Date(account.createdAt).toLocaleDateString()}`}
            />
            <Button
              size="small"
              color="error"
              onClick={() => handleRevoke(account.id)}
              disabled={revoking === account.id}
            >
              {revoking === account.id ? 'Revoking...' : 'Revoke'}
            </Button>
          </ListItem>
        ))}
        {accounts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No linked accounts. Use the Identity Proof wizard to link one.
          </Typography>
        )}
      </List>
    </Paper>
  );
};
