import { Box, Button, ButtonGroup, TextField } from '@mui/material';
import { useCallback, useMemo } from 'react';

export interface IDateRangeSelectorProps {
  value: { since: Date; until: Date };
  onChange: (range: { since: Date; until: Date }) => void;
}

const PRESETS: { label: string; hours: number }[] = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 7 * 24 },
  { label: '30d', hours: 30 * 24 },
  { label: '90d', hours: 90 * 24 },
];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * MUI-based date range selector with predefined range buttons
 * and custom date pickers for arbitrary start/end dates.
 */
export function DateRangeSelector({
  value,
  onChange,
}: IDateRangeSelectorProps) {
  const handlePreset = useCallback(
    (hours: number) => {
      const until = new Date();
      const since = new Date(until.getTime() - hours * 60 * 60 * 1000);
      onChange({ since, until });
    },
    [onChange],
  );

  const activePreset = useMemo(() => {
    const spanMs = value.until.getTime() - value.since.getTime();
    const nowMs = Date.now();
    // Consider a preset "active" if until is within 1 minute of now
    // and the span matches within 1 minute tolerance
    if (Math.abs(value.until.getTime() - nowMs) > 60_000) return null;
    for (const p of PRESETS) {
      const expectedMs = p.hours * 60 * 60 * 1000;
      if (Math.abs(spanMs - expectedMs) < 60_000) return p.label;
    }
    return null;
  }, [value]);

  const handleSinceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const since = new Date(e.target.value + 'T00:00:00Z');
      if (!isNaN(since.getTime())) {
        onChange({ since, until: value.until });
      }
    },
    [onChange, value.until],
  );

  const handleUntilChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const until = new Date(e.target.value + 'T23:59:59Z');
      if (!isNaN(until.getTime())) {
        onChange({ since: value.since, until });
      }
    },
    [onChange, value.since],
  );

  return (
    <Box
      data-testid="date-range-selector"
      sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
    >
      <ButtonGroup size="small" variant="outlined">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant={activePreset === p.label ? 'contained' : 'outlined'}
            onClick={() => handlePreset(p.hours)}
            data-testid={`preset-${p.label}`}
          >
            {p.label}
          </Button>
        ))}
      </ButtonGroup>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          type="date"
          size="small"
          label="From"
          value={toDateInputValue(value.since)}
          onChange={handleSinceChange}
          InputLabelProps={{ shrink: true }}
          data-testid="date-since"
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={toDateInputValue(value.until)}
          onChange={handleUntilChange}
          InputLabelProps={{ shrink: true }}
          data-testid="date-until"
        />
      </Box>
    </Box>
  );
}
