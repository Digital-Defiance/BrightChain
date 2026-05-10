/**
 * PassphraseDialog — Modal dialog for collecting a GPG passphrase.
 *
 * The passphrase is held in component state only for the duration of the
 * API call and is never persisted to localStorage or cookies.
 *
 * Requirements: 4.1, 5.1, Design GPG Passphrase Handling
 */

import { BrightMailStrings } from '@brightchain/brightmail-lib';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { FC, memo, useCallback, useState } from 'react';

import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

export interface PassphraseDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called with the entered passphrase when the user submits. */
  onSubmit: (passphrase: string) => void;
  /** Called when the user cancels the dialog. */
  onCancel: () => void;
  /** Optional title override. Defaults to translated "Enter GPG Passphrase". */
  title?: string;
}

const PassphraseDialog: FC<PassphraseDialogProps> = ({
  open,
  onSubmit,
  onCancel,
  title,
}) => {
  const { t } = useBrightMailTranslation();
  const [passphrase, setPassphrase] = useState('');

  const handleSubmit = useCallback(() => {
    const value = passphrase;
    setPassphrase('');
    onSubmit(value);
  }, [passphrase, onSubmit]);

  const handleCancel = useCallback(() => {
    setPassphrase('');
    onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && passphrase.length > 0) {
        handleSubmit();
      }
    },
    [passphrase, handleSubmit],
  );

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      data-testid="passphrase-dialog"
      aria-labelledby="passphrase-dialog-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="passphrase-dialog-title">
        {title ?? t(BrightMailStrings.Passphrase_Title)}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t(BrightMailStrings.Passphrase_Label)}
          type="password"
          fullWidth
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={handleKeyDown}
          inputProps={{
            'aria-label': t(BrightMailStrings.Passphrase_Label),
            'data-testid': 'passphrase-input',
            autoComplete: 'off',
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} data-testid="passphrase-cancel-btn">
          {t(BrightMailStrings.Action_Cancel)}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={passphrase.length === 0}
          data-testid="passphrase-submit-btn"
        >
          {t(BrightMailStrings.Action_Submit)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(PassphraseDialog);
