/**
 * MnemonicRegistrationInput — Optional mnemonic input for registration.
 *
 * Hidden by default behind a toggle. When revealed, validates client-side
 * against the provided mnemonicRegex before calling onMnemonicChange.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { FC, useCallback, useState } from 'react';

export interface MnemonicRegistrationInputProps {
  /** Called when the mnemonic value changes (undefined when cleared/hidden) */
  onMnemonicChange: (mnemonic: string | undefined) => void;
  /** Backend error message to display */
  error?: string;
  /** Regex to validate mnemonic format client-side */
  mnemonicRegex: RegExp;
}

export const MnemonicRegistrationInput: FC<MnemonicRegistrationInputProps> = ({
  onMnemonicChange,
  error,
  mnemonicRegex,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState('');
  const [clientError, setClientError] = useState<string | undefined>();

  const handleToggle = useCallback(
    (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setShowInput(checked);
      if (!checked) {
        setValue('');
        setClientError(undefined);
        onMnemonicChange(undefined);
      }
    },
    [onMnemonicChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setValue(raw);
      const trimmed = raw.trim();

      if (!trimmed) {
        setClientError(undefined);
        onMnemonicChange(undefined);
        return;
      }

      if (!mnemonicRegex.test(trimmed)) {
        setClientError(
          'Invalid mnemonic format: must be 12, 15, 18, 21, or 24 words',
        );
        onMnemonicChange(undefined);
      } else {
        setClientError(undefined);
        onMnemonicChange(trimmed);
      }
    },
    [mnemonicRegex, onMnemonicChange],
  );

  const displayError = clientError || error;

  return (
    <Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={showInput}
            onChange={handleToggle}
            data-testid="mnemonic-toggle"
          />
        }
        label="I have my own recovery phrase"
      />
      {showInput && (
        <>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Recovery phrase (mnemonic)"
            placeholder="Enter your 12, 15, 18, 21, or 24 word mnemonic"
            value={value}
            onChange={handleChange}
            error={!!displayError}
            helperText={displayError}
            inputProps={{ 'data-testid': 'mnemonic-input' }}
            sx={{ mt: 1 }}
          />
          {displayError && (
            <Alert severity="error" sx={{ mt: 1 }} data-testid="mnemonic-error">
              {displayError}
            </Alert>
          )}
        </>
      )}
    </Box>
  );
};
