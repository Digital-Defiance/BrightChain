/**
 * TemporaryMuteDialog Component
 *
 * Dialog for selecting a mute duration for a user.
 * Supports timed durations (1h, 8h, 24h, 7d, 30d) and a permanent option.
 *
 * @remarks
 * Implements Requirements 35.12, 61.4
 */

import type { BrightHubStringKey } from '@brightchain/brightchain-lib';
import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { MuteDuration } from '@brightchain/brighthub-lib';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the TemporaryMuteDialog component */
export interface TemporaryMuteDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The username of the user being muted */
  username: string;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Callback when the user confirms the mute with the selected duration */
  onMute: (duration: MuteDuration) => void;
}

/** Map of MuteDuration values to their i18n label keys */
const durationLabels: Record<MuteDuration, BrightHubStringKey> = {
  [MuteDuration.OneHour]: BrightHubStrings.TemporaryMuteDialog_Duration1h,
  [MuteDuration.EightHours]: BrightHubStrings.TemporaryMuteDialog_Duration8h,
  [MuteDuration.TwentyFourHours]:
    BrightHubStrings.TemporaryMuteDialog_Duration24h,
  [MuteDuration.SevenDays]: BrightHubStrings.TemporaryMuteDialog_Duration7d,
  [MuteDuration.ThirtyDays]: BrightHubStrings.TemporaryMuteDialog_Duration30d,
  [MuteDuration.Permanent]: BrightHubStrings.TemporaryMuteDialog_Permanent,
};

/**
 * TemporaryMuteDialog
 *
 * Presents radio buttons for mute duration selection including
 * timed options and a permanent mute option. Calls onMute with
 * the selected MuteDuration when confirmed.
 */
export function TemporaryMuteDialog({
  open,
  username,
  onClose,
  onMute,
}: TemporaryMuteDialogProps) {
  const { t } = useBrightHubTranslation();
  const [selected, setSelected] = useState<MuteDuration>(MuteDuration.OneHour);

  const handleMute = () => {
    onMute(selected);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-label={t(BrightHubStrings.TemporaryMuteDialog_AriaLabel)}
      data-testid="temporary-mute-dialog"
    >
      <DialogTitle>{t(BrightHubStrings.TemporaryMuteDialog_Title)}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate, {
            USERNAME: username,
          })}
        </Typography>
        <RadioGroup
          value={selected}
          onChange={(e) => setSelected(e.target.value as MuteDuration)}
          data-testid="duration-radio-group"
        >
          {Object.values(MuteDuration).map((duration) => (
            <FormControlLabel
              key={duration}
              value={duration}
              control={<Radio />}
              label={t(durationLabels[duration])}
              data-testid={`duration-option-${duration}`}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="cancel-button">
          {t(BrightHubStrings.TemporaryMuteDialog_Cancel)}
        </Button>
        <Button
          variant="contained"
          onClick={handleMute}
          data-testid="mute-button"
        >
          {t(BrightHubStrings.TemporaryMuteDialog_Mute)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TemporaryMuteDialog;
