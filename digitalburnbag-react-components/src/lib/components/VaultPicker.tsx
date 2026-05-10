/**
 * VaultPicker — Dropdown selector for vault containers.
 * Shown above the file browser when the user has vault containers.
 * Allows switching between vaults and creating new ones.
 *
 * Status chips shown per vault:
 *   - Visibility: Private 🔒 / Unlisted 🔗 / Public 🌐
 *   - State: Locked ⚠ (only when locked)
 *   - Seal: Accessed ⚠ (only when sealStatus.allPristine is false)
 *   - Encryption: AES-256 ✓ (always)
 */
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateOnlyWithBD } from '../utils/formatBrightDate';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import type { IApiVaultContainerSummaryDTO } from '../services/burnbag-api-client';

export interface IVaultPickerProps {
  vaults: IApiVaultContainerSummaryDTO[];
  selectedVaultId: string | null;
  onSelectVault: (vaultId: string) => void;
  onCreateVault: (
    name: string,
    description?: string,
    visibility?: string,
  ) => Promise<void>;
  onSealVault?: (vaultId: string) => Promise<void>;
  loading?: boolean;
}

// ── Chip helpers ─────────────────────────────────────────────────────────────

const CHIP_SX = {
  height: 20,
  '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' },
};

function VisibilityChip({ visibility }: { visibility?: string }) {
  if (visibility === 'public') {
    return (
      <Tooltip title="Public — indexed and discoverable">
        <Chip
          icon={<PublicIcon sx={{ fontSize: 12 }} />}
          label="Public"
          size="small"
          color="primary"
          variant="outlined"
          sx={CHIP_SX}
        />
      </Tooltip>
    );
  }
  if (visibility === 'unlisted') {
    return (
      <Tooltip title="Unlisted — accessible via direct link">
        <Chip
          icon={<LinkIcon sx={{ fontSize: 12 }} />}
          label="Unlisted"
          size="small"
          color="default"
          variant="outlined"
          sx={CHIP_SX}
        />
      </Tooltip>
    );
  }
  // private (default)
  return (
    <Tooltip title="Private — only you and explicit shares">
      <Chip
        icon={<LockIcon sx={{ fontSize: 12 }} />}
        label="Private"
        size="small"
        color="default"
        variant="outlined"
        sx={CHIP_SX}
      />
    </Tooltip>
  );
}

function StateChip({ state }: { state: string }) {
  if (state === 'locked') {
    return (
      <Tooltip title="Vault is locked — read-only">
        <Chip
          icon={<LockIcon sx={{ fontSize: 12 }} />}
          label="Locked"
          size="small"
          color="warning"
          variant="filled"
          sx={CHIP_SX}
        />
      </Tooltip>
    );
  }
  if (state === 'suspended') {
    return (
      <Tooltip title="Vault is suspended">
        <Chip
          icon={<WarningAmberIcon sx={{ fontSize: 12 }} />}
          label="Suspended"
          size="small"
          color="error"
          variant="filled"
          sx={CHIP_SX}
        />
      </Tooltip>
    );
  }
  return null;
}

function SealChip({
  state,
  sealStatus,
  sealedAt,
}: {
  state: string;
  sealStatus?: IApiVaultContainerSummaryDTO['sealStatus'];
  sealedAt?: string;
}) {
  if (state !== 'sealed') return null;

  const pristine = !sealStatus || sealStatus.allPristine;
  const tooltip = pristine
    ? `Sealed${sealedAt ? ` on ${formatDateOnlyWithBD(sealedAt)}` : ''} — all files pristine`
    : `Seal broken — ${sealStatus?.accessedCount ?? 0} file(s) accessed`;

  return (
    <Tooltip title={tooltip}>
      <Chip
        icon={
          pristine ? (
            <VerifiedUserIcon sx={{ fontSize: 12 }} />
          ) : (
            <WarningAmberIcon sx={{ fontSize: 12 }} />
          )
        }
        label={pristine ? 'Sealed ✓' : 'Seal Broken'}
        size="small"
        color={pristine ? 'success' : 'warning'}
        variant={pristine ? 'filled' : 'outlined'}
        sx={CHIP_SX}
      />
    </Tooltip>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VaultPicker({
  vaults,
  selectedVaultId,
  onSelectVault,
  onCreateVault,
  onSealVault,
  loading = false,
}: IVaultPickerProps) {
  const { tBranded: t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [sealConfirmOpen, setSealConfirmOpen] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState<
    'private' | 'unlisted' | 'public'
  >('private');
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreateVault(
        newName.trim(),
        newDesc.trim() || undefined,
        newVisibility,
      );
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      setNewVisibility('private');
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, newVisibility, onCreateVault]);

  const handleSealConfirm = useCallback(async () => {
    if (!selectedVaultId || !onSealVault) return;
    setSealing(true);
    try {
      await onSealVault(selectedVaultId);
      setSealConfirmOpen(false);
    } finally {
      setSealing(false);
    }
  }, [selectedVaultId, onSealVault]);

  const selectedVault = vaults.find((v) => v.id === selectedVaultId);

  if (vaults.length === 0 && !loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t(DigitalBurnbagStrings.Vault_Empty)}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mb: 2 }}
        >
          {t(DigitalBurnbagStrings.Vault_EmptyDesc)}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          {t(DigitalBurnbagStrings.Vault_CreateNew)}
        </Button>
        {renderCreateDialog()}
      </Box>
    );
  }

  function renderCreateDialog() {
    return (
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t(DigitalBurnbagStrings.Vault_CreateNew)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={t(DigitalBurnbagStrings.Vault_NameLabel)}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={creating}
          />
          <TextField
            fullWidth
            margin="dense"
            label={t(DigitalBurnbagStrings.Vault_DescriptionLabel)}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            disabled={creating}
            multiline
            rows={2}
          />
          <FormControl fullWidth margin="dense" disabled={creating}>
            <InputLabel id="vault-visibility-label">Visibility</InputLabel>
            <Select
              labelId="vault-visibility-label"
              value={newVisibility}
              label="Visibility"
              onChange={(e) =>
                setNewVisibility(
                  e.target.value as 'private' | 'unlisted' | 'public',
                )
              }
            >
              <MenuItem value="private">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon fontSize="small" />
                  Private — only you and explicit shares
                </Box>
              </MenuItem>
              <MenuItem value="unlisted">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon fontSize="small" />
                  Unlisted — accessible via direct link
                </Box>
              </MenuItem>
              <MenuItem value="public">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PublicIcon fontSize="small" />
                  Public — indexed and discoverable
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            {t(DigitalBurnbagStrings.Vault_Cancel)}
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !newName.trim()}
          >
            {t(DigitalBurnbagStrings.Vault_Create)}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        flexWrap: 'wrap',
      }}
    >
      {/* Vault selector */}
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="vault-picker-label">
          {t(DigitalBurnbagStrings.Nav_Vaults)}
        </InputLabel>
        <Select
          labelId="vault-picker-label"
          value={selectedVaultId ?? ''}
          label={t(DigitalBurnbagStrings.Nav_Vaults)}
          onChange={(e) => onSelectVault(e.target.value)}
          disabled={loading}
        >
          {vaults.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: '100%',
                }}
              >
                {/* State icon */}
                {v.state === 'locked' ? (
                  <Tooltip title="Locked">
                    <LockIcon fontSize="small" color="warning" />
                  </Tooltip>
                ) : (
                  <Tooltip title={t(DigitalBurnbagStrings.Vault_AllEncrypted)}>
                    <VerifiedUserIcon fontSize="small" color="success" />
                  </Tooltip>
                )}

                {/* Name */}
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {v.name}
                </Typography>

                {/* Status chips */}
                <Box
                  sx={{ ml: 'auto', display: 'flex', gap: 0.5, flexShrink: 0 }}
                >
                  <VisibilityChip visibility={v.visibility} />
                  <StateChip state={v.state} />
                  <SealChip
                    state={v.state}
                    sealStatus={v.sealStatus}
                    sealedAt={v.sealedAt}
                  />
                  <Chip
                    icon={<LockIcon sx={{ fontSize: 12 }} />}
                    label={t(DigitalBurnbagStrings.Encryption_AES256)}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={CHIP_SX}
                  />
                  <Chip
                    label={`${v.fileCount} ${t(DigitalBurnbagStrings.Vault_Files)}`}
                    size="small"
                    variant="outlined"
                    sx={CHIP_SX}
                  />
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* New vault button */}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setCreateOpen(true)}
      >
        {t(DigitalBurnbagStrings.Vault_CreateNew)}
      </Button>

      {/* Seal vault button — only for active vaults */}
      {selectedVault && selectedVault.state === 'active' && onSealVault && (
        <Tooltip title="Seal this vault to activate the pristine guarantee. Any subsequent read will break the seal.">
          <Button
            size="small"
            color="warning"
            onClick={() => setSealConfirmOpen(true)}
          >
            Seal Vault
          </Button>
        </Tooltip>
      )}

      {/* Selected vault status bar */}
      {selectedVault && (
        <Box
          sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 'auto' }}
        >
          <VisibilityChip visibility={selectedVault.visibility} />
          <StateChip state={selectedVault.state} />
          <SealChip
            state={selectedVault.state}
            sealStatus={selectedVault.sealStatus}
            sealedAt={selectedVault.sealedAt}
          />
          <Tooltip title={t(DigitalBurnbagStrings.Vault_AllEncryptedDesc)}>
            <Chip
              icon={<VerifiedUserIcon />}
              label={t(DigitalBurnbagStrings.Vault_AllEncrypted)}
              size="small"
              color="success"
              variant="filled"
            />
          </Tooltip>
        </Box>
      )}

      {renderCreateDialog()}

      {/* Seal confirmation dialog */}
      <Dialog
        open={sealConfirmOpen}
        onClose={() => setSealConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Seal Vault — {selectedVault?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Sealing activates the <strong>pristine guarantee</strong>. From this
            moment:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1 }}>
            <Typography component="li" variant="body2">
              No files can be added, modified, or deleted
            </Typography>
            <Typography component="li" variant="body2">
              Any read of file content will permanently break the seal
            </Typography>
            <Typography component="li" variant="body2">
              A cryptographic seal hash is recorded on the ledger
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }} color="warning.main">
            This cannot be undone. Are you sure?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSealConfirmOpen(false)} disabled={sealing}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleSealConfirm();
            }}
            variant="contained"
            color="warning"
            disabled={sealing}
          >
            {sealing ? 'Sealing…' : 'Seal Vault'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VaultPicker;
