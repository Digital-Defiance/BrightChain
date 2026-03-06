/**
 * VaultDetailView — Displays entries within an unlocked vault.
 *
 * - Shows entry property records (title, type icon, tags, favorite, site URL)
 *   without decrypting entry contents
 * - Provides "Add Entry" and "Lock Vault" buttons
 * - Prompts to lock vault on navigation away (beforeunload)
 * - If vault is not unlocked, shows MasterPasswordPrompt
 *
 * Requirements: 4.1, 4.2, 4.5, 4.9, 4.10
 */

import type {
  EntryPropertyRecord,
  VaultEntryType,
} from '@brightchain/brightchain-lib';
import {
  BrightPassStrings,
  type BrightPassStringKey,
} from '@brightchain/brightchain-lib';
import AddIcon from '@mui/icons-material/Add';
import BadgeIcon from '@mui/icons-material/Badge';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LockIcon from '@mui/icons-material/Lock';
import NoteIcon from '@mui/icons-material/Note';
import StarIcon from '@mui/icons-material/Star';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { useNavigate, useParams } from 'react-router-dom';
import BreadcrumbNav from '../components/BreadcrumbNav';
import MasterPasswordPrompt from '../components/MasterPasswordPrompt';
import { useBrightPass } from '../context/BrightPassProvider';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

/** Maps entry types to their corresponding MUI icon. */
function entryTypeIcon(entryType: VaultEntryType): React.ReactElement {
  switch (entryType) {
    case 'login':
      return <VpnKeyIcon />;
    case 'secure_note':
      return <NoteIcon />;
    case 'credit_card':
      return <CreditCardIcon />;
    case 'identity':
      return <BadgeIcon />;
    default:
      return <VpnKeyIcon />;
  }
}

/** Maps entry types to their i18n string key. */
function entryTypeLabel(
  entryType: VaultEntryType,
  t: (key: BrightPassStringKey, vars?: Record<string, string>) => string,
): string {
  switch (entryType) {
    case 'login':
      return t(BrightPassStrings.EntryType_Login);
    case 'secure_note':
      return t(BrightPassStrings.EntryType_SecureNote);
    case 'credit_card':
      return t(BrightPassStrings.EntryType_CreditCard);
    case 'identity':
      return t(BrightPassStrings.EntryType_Identity);
    default:
      return entryType;
  }
}

const VaultDetailView: React.FC = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  const { t } = useBrightPassTranslation();
  const { vault, lockVault, isVaultUnlocked } = useBrightPass();
  const navigate = useNavigate();

  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, _setError] = useState<string | null>(null);

  // --- Lock vault and navigate back ---
  const handleLockVault = useCallback(() => {
    lockVault();
    navigate('/brightpass');
  }, [lockVault, navigate]);

  // --- Prompt to lock on browser close / tab navigation ---
  useEffect(() => {
    if (!isVaultUnlocked()) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isVaultUnlocked]);

  // --- Filter entries by search query ---
  const filteredEntries: EntryPropertyRecord[] = vault?.propertyRecords
    ? vault.propertyRecords.filter((entry) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          entry.title.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          entry.siteUrl.toLowerCase().includes(query)
        );
      })
    : [];

  // --- If vault is not unlocked, show the master password prompt ---
  if (!isVaultUnlocked() || !vault) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <BreadcrumbNav />
        <MasterPasswordPrompt
          open={true}
          onClose={() => navigate('/brightpass')}
          vaultId={vaultId || ''}
          vaultName={vaultId || ''}
        />
      </Container>
    );
  }

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
          {t(BrightPassStrings.VaultDetail_TitleNameTemplate, {
            NAME: vault.metadata.name,
          })}
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/brightpass/vaults/${vaultId}/entries/new`)}
          >
            {t(BrightPassStrings.VaultDetail_AddEntry)}
          </Button>
          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setShowLockConfirm(true)}
          >
            {t(BrightPassStrings.VaultDetail_LockVault)}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search bar placeholder — will be replaced by SearchBar in Task 6.4 */}
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={t(BrightPassStrings.VaultDetail_Search)}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      {filteredEntries.length === 0 && !searchQuery && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          {t(BrightPassStrings.VaultDetail_NoEntries)}
        </Typography>
      )}

      <List>
        {filteredEntries.map((entry, index) => (
          <ListItem key={`${entry.title}-${index}`} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Tooltip title={entryTypeLabel(entry.entryType, t)}>
                  {entryTypeIcon(entry.entryType)}
                </Tooltip>
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">{entry.title}</Typography>
                    {entry.favorite && (
                      <Tooltip
                        title={t(BrightPassStrings.VaultDetail_Favorite)}
                      >
                        <StarIcon
                          fontSize="small"
                          sx={{ color: 'warning.main' }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={0.5}
                    flexWrap="wrap"
                    sx={{ mt: 0.5 }}
                  >
                    {entry.siteUrl && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="span"
                      >
                        {entry.siteUrl}
                      </Typography>
                    )}
                    {entry.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 0.5 }}
                      />
                    ))}
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Add Entry placeholder — EntryForm will be integrated in Task 6.3 */}

      {/* Lock Vault Confirmation Dialog */}
      <Dialog
        open={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t(BrightPassStrings.VaultDetail_ConfirmLockTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightPassStrings.VaultDetail_ConfirmLockMessage)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLockConfirm(false)}>
            {t(BrightPassStrings.VaultDetail_Cancel)}
          </Button>
          <Button onClick={handleLockVault} variant="contained">
            {t(BrightPassStrings.VaultDetail_Confirm)}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VaultDetailView;
