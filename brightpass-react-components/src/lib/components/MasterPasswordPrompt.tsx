/**
 * MasterPasswordPrompt — Modal dialog for vault unlock.
 *
 * On correct master password, navigates to vault detail view.
 * On incorrect password, displays an i18n error and remains open.
 *
 * Requirements: 3.3, 3.4, 3.5
 */

import { BrightPassStrings } from '@brightchain/brightchain-lib';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrightPass } from '../context/BrightPassProvider';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

export interface MasterPasswordPromptProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to close the dialog. */
  onClose: () => void;
  /** The vault ID to unlock. */
  vaultId: string;
  /** The vault name displayed in the dialog title. */
  vaultName: string;
}

const MasterPasswordPrompt: React.FC<MasterPasswordPromptProps> = ({
  open,
  onClose,
  vaultId,
  vaultName,
}) => {
  const { t } = useBrightPassTranslation();
  const { unlockVault } = useBrightPass();
  const navigate = useNavigate();

  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setMasterPassword('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await unlockVault(vaultId, masterPassword);
      resetState();
      onClose();
      navigate(`/brightpass/vault/${vaultId}`);
    } catch {
      setError(t(BrightPassStrings.Error_InvalidMasterPassword));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && masterPassword && !loading) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {t(BrightPassStrings.VaultList_UnlockVault)}: {vaultName}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label={t(BrightPassStrings.VaultList_EnterMasterPassword)}
          type="password"
          fullWidth
          variant="outlined"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {t(BrightPassStrings.VaultList_Cancel)}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !masterPassword}
        >
          {t(BrightPassStrings.VaultList_Unlock)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MasterPasswordPrompt;
