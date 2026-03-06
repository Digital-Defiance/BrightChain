/**
 * VaultListView — Displays all vaults belonging to the authenticated user.
 *
 * - Fetches and displays vault name, creation date, shared member count, shared icon
 * - "Create Vault" button opens CreateVaultDialog
 * - Delete action per vault requires master password confirmation
 * - On vault click, shows MasterPasswordPrompt; on correct password navigates to vault detail
 * - All strings via useBrightPassTranslation()
 *
 * Requirements: 3.1, 3.2, 3.6, 3.7, 3.8, 9.5
 */

import type { VaultMetadata } from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightchain-lib';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import BreadcrumbNav from '../components/BreadcrumbNav';
import CreateVaultDialog from '../components/CreateVaultDialog';
import MasterPasswordPrompt from '../components/MasterPasswordPrompt';
import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

/** Formats a Date for display in the vault list. */
function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type DialogMode =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'unlock'; vault: VaultMetadata }
  | { kind: 'delete'; vault: VaultMetadata };

const VaultListView: React.FC = () => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [vaults, setVaults] = useState<VaultMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<DialogMode>({ kind: 'none' });
  const [masterPassword, setMasterPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await brightPassApi.listVaults();
      setVaults(result);
    } catch {
      setError(t(BrightPassStrings.Error_Generic));
    } finally {
      setLoading(false);
    }
  }, [brightPassApi, t]);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  const closeDialog = () => {
    setDialog({ kind: 'none' });
    setMasterPassword('');
    setDialogError(null);
    setDialogLoading(false);
  };

  // --- Unlock vault ---
  const handleVaultClick = (vault: VaultMetadata) => {
    setDialog({ kind: 'unlock', vault });
  };

  // --- Delete vault ---
  const handleDeleteClick = (event: React.MouseEvent, vault: VaultMetadata) => {
    event.stopPropagation();
    setDialog({ kind: 'delete', vault });
  };

  const handleDeleteSubmit = async () => {
    if (dialog.kind !== 'delete') return;
    setDialogLoading(true);
    setDialogError(null);
    try {
      await brightPassApi.deleteVault(dialog.vault.id, masterPassword);
      closeDialog();
      await fetchVaults();
    } catch {
      setDialogError(t(BrightPassStrings.Error_InvalidMasterPassword));
    } finally {
      setDialogLoading(false);
    }
  };

  // --- Create vault ---
  const handleCreateClick = () => {
    setDialog({ kind: 'create' });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <BreadcrumbNav />

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4" component="h1">
          {t(BrightPassStrings.VaultList_Title)}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          {t(BrightPassStrings.VaultList_CreateVault)}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && vaults.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          {t(BrightPassStrings.VaultList_NoVaults)}
        </Typography>
      )}

      <List>
        {vaults.map((vault) => (
          <ListItem
            key={vault.id}
            disablePadding
            secondaryAction={
              <IconButton
                edge="end"
                aria-label={t(BrightPassStrings.VaultList_DeleteVault)}
                onClick={(e) => handleDeleteClick(e, vault)}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton onClick={() => handleVaultClick(vault)}>
              <ListItemIcon>
                <LockIcon />
              </ListItemIcon>
              <ListItemText
                primary={vault.name}
                secondary={formatDate(vault.createdAt)}
              />
              {vault.sharedWith.length > 0 && (
                <Tooltip
                  title={t(BrightPassStrings.VaultList_SharedWithTemplate, {
                    COUNT: String(vault.sharedWith.length),
                  })}
                >
                  <Box display="flex" alignItems="center" mr={2}>
                    <PeopleIcon
                      fontSize="small"
                      color="action"
                      sx={{ mr: 0.5 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {vault.sharedWith.length}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Unlock Vault Dialog */}
      <MasterPasswordPrompt
        open={dialog.kind === 'unlock'}
        onClose={closeDialog}
        vaultId={dialog.kind === 'unlock' ? dialog.vault.id : ''}
        vaultName={dialog.kind === 'unlock' ? dialog.vault.name : ''}
      />

      {/* Delete Vault Confirmation Dialog */}
      <Dialog
        open={dialog.kind === 'delete'}
        onClose={closeDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t(BrightPassStrings.VaultList_ConfirmDelete)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {dialog.kind === 'delete'
              ? t(BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate, {
                  NAME: dialog.vault.name,
                })
              : ''}
          </DialogContentText>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDeleteSubmit();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>
            {t(BrightPassStrings.VaultList_Cancel)}
          </Button>
          <Button
            onClick={handleDeleteSubmit}
            variant="contained"
            color="error"
            disabled={dialogLoading || !masterPassword}
          >
            {t(BrightPassStrings.VaultList_Confirm)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Vault Dialog */}
      <CreateVaultDialog
        open={dialog.kind === 'create'}
        onClose={closeDialog}
        onVaultCreated={fetchVaults}
      />
    </Container>
  );
};

export default VaultListView;
