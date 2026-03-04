/**
 * ShareDialog — manages vault sharing with other BrightChain members.
 *
 * Provides a member search input, current share recipients list with
 * "Revoke" buttons, and an "Add" action to share with searched members.
 * Calls `shareVault()` and `revokeShare()` endpoints via BrightPassApiService.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { BrightPassStrings } from '@brightchain/brightchain-lib';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
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
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

interface ShareDialogProps {
  /** The vault ID to manage sharing for. */
  vaultId: string;
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback when the dialog should close. */
  onClose: () => void;
  /** Current list of shared member IDs (from VaultMetadata.sharedWith). */
  sharedWith?: string[];
  /** Called after a successful share or revoke so the parent can refresh. */
  onShareChanged?: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  vaultId,
  open,
  onClose,
  sharedWith = [],
  onShareChanged,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [searchValue, setSearchValue] = useState('');
  const [recipients, setRecipients] = useState<string[]>(sharedWith);
  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync recipients when sharedWith prop changes (dialog re-opens)
  React.useEffect(() => {
    setRecipients(sharedWith);
  }, [sharedWith]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchValue('');
      setError(null);
    }
  }, [open]);

  const handleShare = useCallback(async () => {
    const memberId = searchValue.trim();
    if (!memberId) return;

    setSharing(true);
    setError(null);

    try {
      await brightPassApi.shareVault(vaultId, [memberId]);
      setRecipients((prev) =>
        prev.includes(memberId) ? prev : [...prev, memberId],
      );
      setSearchValue('');
      onShareChanged?.();
    } catch {
      setError(t(BrightPassStrings.Share_Error));
    } finally {
      setSharing(false);
    }
  }, [searchValue, vaultId, t, onShareChanged]);

  const handleRevoke = useCallback(
    async (memberId: string) => {
      setRevoking(memberId);
      setError(null);

      try {
        await brightPassApi.revokeShare(vaultId, memberId);
        setRecipients((prev) => prev.filter((id) => id !== memberId));
        onShareChanged?.();
      } catch {
        setError(t(BrightPassStrings.Share_Error));
      } finally {
        setRevoking(null);
      }
    },
    [vaultId, t, onShareChanged],
  );

  const isLoading = sharing || revoking !== null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {t(BrightPassStrings.Share_Title)}
          <IconButton
            aria-label={t(BrightPassStrings.Share_Close)}
            onClick={onClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Search / Add member */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
          <TextField
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setError(null);
            }}
            label={t(BrightPassStrings.Share_SearchMembers)}
            size="small"
            fullWidth
            disabled={isLoading}
            aria-label={t(BrightPassStrings.Share_SearchMembers)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleShare();
            }}
          />
          <Button
            variant="contained"
            onClick={handleShare}
            disabled={sharing || !searchValue.trim()}
            startIcon={
              sharing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PersonAddIcon />
              )
            }
            sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
          >
            {t(BrightPassStrings.Share_Add)}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current recipients */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t(BrightPassStrings.Share_CurrentRecipients)}
        </Typography>

        {recipients.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t(BrightPassStrings.Share_NoRecipients)}
          </Typography>
        ) : (
          <List dense>
            {recipients.map((memberId) => (
              <ListItem
                key={memberId}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={t(BrightPassStrings.Share_Revoke)}
                    onClick={() => handleRevoke(memberId)}
                    disabled={revoking === memberId}
                    color="error"
                    size="small"
                  >
                    {revoking === memberId ? (
                      <CircularProgress size={16} />
                    ) : (
                      <PersonRemoveIcon />
                    )}
                  </IconButton>
                }
              >
                <ListItemText primary={memberId} />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t(BrightPassStrings.Share_Close)}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
