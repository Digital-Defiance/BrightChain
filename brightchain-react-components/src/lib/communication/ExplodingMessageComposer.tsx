/**
 * ExplodingMessageComposer — Expiration settings for message composition.
 *
 * Provides time-based and read-count-based expiration selectors
 * that can be integrated into the message composer.
 *
 * Requirements: 8.1, 8.2
 */

import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExpirationSettings {
  enabled: boolean;
  expiresInMs?: number;
  maxReads?: number;
}

interface ExplodingMessageComposerProps {
  /** Current expiration settings */
  value: ExpirationSettings;
  /** Called when settings change */
  onChange: (settings: ExpirationSettings) => void;
}

const TIME_PRESETS = [
  { label: '30 seconds', ms: 30_000 },
  { label: '1 minute', ms: 60_000 },
  { label: '5 minutes', ms: 300_000 },
  { label: '1 hour', ms: 3_600_000 },
  { label: '24 hours', ms: 86_400_000 },
  { label: '7 days', ms: 604_800_000 },
  { label: 'Custom', ms: 0 },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const ExplodingMessageComposer: FC<ExplodingMessageComposerProps> = ({
  value,
  onChange,
}) => {
  const [timePreset, setTimePreset] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');

  const handleToggle = (enabled: boolean) => {
    onChange({ ...value, enabled });
  };

  const handleTimePreset = (ms: number) => {
    setTimePreset(ms);
    if (ms > 0) {
      onChange({ ...value, expiresInMs: ms });
    }
  };

  const handleCustomTime = (minutes: string) => {
    setCustomMinutes(minutes);
    const parsed = parseInt(minutes, 10);
    if (parsed > 0) {
      onChange({ ...value, expiresInMs: parsed * 60_000 });
    }
  };

  const handleMaxReads = (reads: string) => {
    const parsed = parseInt(reads, 10);
    if (parsed > 0) {
      onChange({ ...value, maxReads: parsed });
    } else {
      const { maxReads: _, ...rest } = value;
      onChange(rest as ExpirationSettings);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: value.enabled ? 2 : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">💣 Exploding Message</Typography>
          {value.enabled && (
            <Chip label="Active" size="small" color="warning" />
          )}
        </Box>
        <Switch
          checked={value.enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          size="small"
          inputProps={{ 'aria-label': 'Enable exploding message' }}
        />
      </Box>

      {value.enabled && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Time-based expiration */}
          <FormControl size="small" fullWidth>
            <InputLabel id="time-preset-label">Self-destruct after</InputLabel>
            <Select
              labelId="time-preset-label"
              value={timePreset ?? ''}
              onChange={(e) => handleTimePreset(Number(e.target.value))}
              label="Self-destruct after"
            >
              {TIME_PRESETS.map((preset) => (
                <MenuItem key={preset.label} value={preset.ms}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {timePreset === 0 && (
            <TextField
              label="Custom duration (minutes)"
              value={customMinutes}
              onChange={(e) => handleCustomTime(e.target.value)}
              type="number"
              size="small"
              fullWidth
              inputProps={{
                min: 1,
                'aria-label': 'Custom expiration in minutes',
              }}
            />
          )}

          {/* Read-count expiration */}
          <TextField
            label="Max reads (optional)"
            value={value.maxReads ?? ''}
            onChange={(e) => handleMaxReads(e.target.value)}
            type="number"
            size="small"
            fullWidth
            placeholder="Unlimited"
            inputProps={{
              min: 1,
              'aria-label': 'Maximum number of reads before self-destruct',
            }}
          />
        </Box>
      )}
    </Box>
  );
};
