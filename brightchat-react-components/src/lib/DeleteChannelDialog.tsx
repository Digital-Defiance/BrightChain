/**
 * DeleteChannelDialog — Confirmation dialog for deleting a channel.
 *
 * Requirements: 7.1, 7.5
 */
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback, useState } from 'react';

export interface DeleteChannelDialogProps {
  open: boolean;
  channelName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteChannelDialog: FC<DeleteChannelDialogProps> = ({
  open,
  channelName,
  onClose,
  onConfirm,
}) => {
  const { tBranded: t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(BrightChatStrings.Delete_Channel_Failed),
      );
    } finally {
      setDeleting(false);
    }
  }, [onConfirm, onClose, t]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      data-testid="delete-channel-dialog"
    >
      <DialogTitle>{t(BrightChatStrings.Delete_Channel_Title)}</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Typography variant="body2">
          Are you sure you want to delete <strong>#{channelName}</strong>? This
          cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          {t(BrightChatStrings.Delete_Channel_Cancel)}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={deleting}
        >
          {deleting
            ? t(BrightChatStrings.Delete_Channel_Deleting)
            : t(BrightChatStrings.Delete_Channel_Confirm)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(DeleteChannelDialog);
