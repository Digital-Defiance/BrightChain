/**
 * CreateVaultDialog — Form dialog for creating a new vault.
 *
 * Requires vault name and master password. On submit, calls
 * `brightPassApiService.createVault()` and refreshes the vault list.
 * On error, displays an i18n error message and keeps the dialog open.
 *
 * Requirements: 3.6, 3.7
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
import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

export interface CreateVaultDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to close the dialog. */
  onClose: () => void;
  /** Callback invoked after a vault is successfully created (e.g. to refresh the vault list). */
  onVaultCreated: () => void;
}

const CreateVaultDialog: React.FC<CreateVaultDialogProps> = ({
  open,
  onClose,
  onVaultCreated,
}) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [name, setName] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setName('');
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
      await brightPassApi.createVault(name, masterPassword);
      resetState();
      onVaultCreated();
      onClose();
    } catch {
      setError(t(BrightPassStrings.Error_Generic));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name && masterPassword && !loading) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t(BrightPassStrings.VaultList_CreateVault)}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label={t(BrightPassStrings.VaultList_Title)}
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
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
          disabled={loading || !name || !masterPassword}
        >
          {t(BrightPassStrings.VaultList_CreateVault)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateVaultDialog;
