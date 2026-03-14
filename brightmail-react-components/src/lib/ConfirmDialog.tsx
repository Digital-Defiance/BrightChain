import { BrightChainComponentId } from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { FC, memo } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  const { tBranded: t } = useI18n();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      role="alertdialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} autoFocus>
          {cancelLabel ?? t(BrightMailStrings.Action_Cancel)}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          {confirmLabel ?? t(BrightMailStrings.Action_Delete)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ConfirmDialog);
