/**
 * SealBreakWarningDialog — reusable confirmation dialog shown before any
 * action that would break a sealed vault's pristine guarantee.
 *
 * Used in two contexts:
 *   1. Vault-level: user navigates into / browses a sealed vault
 *   2. File-level: user previews or downloads a specific file
 *
 * The caller decides what "proceed" means via the `onConfirm` callback.
 */
import { formatDateWithBD } from '../utils/formatBrightDate';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

export interface ISealBreakWarningDialogProps {
  open: boolean;
  /** 'vault' shows vault-level copy; 'file' shows file-level copy */
  context: 'vault' | 'file';
  /** Name of the vault or file being accessed */
  targetName: string;
  /** ISO timestamp when the vault was sealed */
  sealedAt?: string;
  /** Called when the user confirms they want to proceed */
  onConfirm: () => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

export function SealBreakWarningDialog({
  open,
  context,
  targetName,
  sealedAt,
  onConfirm,
  onCancel,
}: ISealBreakWarningDialogProps) {
  const sealDate = sealedAt ? formatDateWithBD(sealedAt) : undefined;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        This vault is sealed
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight={600} gutterBottom>
            {context === 'vault'
              ? `"${targetName}" has an active pristine guarantee.`
              : `"${targetName}" is in a sealed vault.`}
          </Typography>
          {sealDate && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              Sealed on {sealDate}
            </Typography>
          )}
        </Box>

        <Typography variant="body2" gutterBottom>
          {context === 'vault'
            ? 'Browsing this vault will expose file metadata and content to your session.'
            : 'Opening or downloading this file will expose its content to your session.'}
        </Typography>

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: 'warning.light',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'warning.main',
          }}
        >
          <Typography variant="body2" color="warning.dark" fontWeight={600}>
            ⚠ This action will permanently break the cryptographic seal.
          </Typography>
          <Typography variant="body2" color="warning.dark" sx={{ mt: 0.5 }}>
            Once broken, non-access can no longer be proven for{' '}
            {context === 'vault' ? 'this vault' : 'this file or its vault'}.
            This cannot be undone.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="warning" variant="contained">
          Break Seal &amp; Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SealBreakWarningDialog;
