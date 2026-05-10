import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Button,
  ButtonGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback } from 'react';

const PRESETS = [7, 30, 90, 365] as const;

export interface IStorageDurationPickerProps {
  value: number;
  onChange: (days: number) => void;
  disabled?: boolean;
}

/**
 * Combined duration picker with quick-select presets (7, 30, 90, 365 days)
 * and a free-form numeric input. Minimum value is 1 day.
 *
 * Requirement 8.5
 */
export function StorageDurationPicker({
  value,
  onChange,
  disabled = false,
}: IStorageDurationPickerProps) {
  const { tBranded: t } = useI18n();
  const handlePreset = useCallback(
    (days: number) => {
      onChange(days);
    },
    [onChange],
  );

  const handleFreeform = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        onChange(parsed);
      }
    },
    [onChange],
  );

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom id="storage-duration-label">
        {t(DigitalBurnbagStrings.Joule_StorageDurationTitle)}
      </Typography>
      <Stack spacing={1}>
        <ButtonGroup
          variant="outlined"
          size="small"
          aria-label={t(DigitalBurnbagStrings.Joule_DurationPresetsAriaLabel)}
          disabled={disabled}
        >
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              onClick={() => handlePreset(preset)}
              variant={value === preset ? 'contained' : 'outlined'}
              aria-label={t(
                DigitalBurnbagStrings.Joule_DurationPresetAriaLabel,
                { count: preset },
              )}
              aria-pressed={value === preset}
            >
              {preset === 365
                ? t(DigitalBurnbagStrings.Joule_DurationPreset1Year)
                : t(DigitalBurnbagStrings.Joule_DurationPresetDays, {
                    count: preset,
                  })}
            </Button>
          ))}
        </ButtonGroup>
        <TextField
          type="number"
          label={t(DigitalBurnbagStrings.Joule_DurationCustomLabel)}
          value={value}
          onChange={handleFreeform}
          disabled={disabled}
          inputProps={{
            min: 1,
            'aria-label': t(
              DigitalBurnbagStrings.Joule_DurationCustomAriaLabel,
            ),
            'aria-labelledby': 'storage-duration-label',
          }}
          size="small"
          sx={{ maxWidth: 160 }}
        />
      </Stack>
    </Box>
  );
}
