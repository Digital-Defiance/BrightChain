/**
 * BrightDateDisplaySelector — A form control that lets users choose
 * how BrightDate is displayed alongside traditional dates.
 *
 * Designed to be used as an `additionalFields` render prop inside
 * the UserSettingsForm from express-suite-react-components.
 *
 * @module settings/BrightDateDisplaySelector
 */

import { BrightDateDisplayMode } from '@brightchain/brightchain-lib';
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import type { FC } from 'react';

/** Human-readable labels and descriptions for each display mode. */
const MODE_OPTIONS: Array<{
  value: BrightDateDisplayMode;
  label: string;
  description: string;
}> = [
  {
    value: BrightDateDisplayMode.Dual,
    label: 'Dual',
    description: 'Jan 15, 2025 (BD 9146.438)',
  },
  {
    value: BrightDateDisplayMode.BrightDateOnly,
    label: 'BrightDate Only',
    description: 'BD 9146.438',
  },
  {
    value: BrightDateDisplayMode.LocaleOnly,
    label: 'Regular Date Only',
    description: 'Jan 15, 2025',
  },
  {
    value: BrightDateDisplayMode.Hover,
    label: 'Hover (BrightDate on tooltip)',
    description: 'Shows regular date; hover to see BrightDate',
  },
  {
    value: BrightDateDisplayMode.HoverReverse,
    label: 'Hover Reverse (regular date on tooltip)',
    description: 'Shows BrightDate; hover to see regular date',
  },
];

export interface BrightDateDisplaySelectorProps {
  /** Current value */
  value: string;
  /** Change handler — receives the new BrightDateDisplayMode string value */
  onChange: (value: string) => void;
}

/**
 * Radio group for selecting the BrightDate display mode.
 */
export const BrightDateDisplaySelector: FC<BrightDateDisplaySelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <FormControl component="fieldset" fullWidth sx={{ mt: 2, mb: 1 }}>
      <FormLabel component="legend" id="bright-date-display-label">
        Date Display Format
      </FormLabel>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        Choose how BrightDate is shown alongside traditional dates
      </Typography>
      <RadioGroup
        aria-labelledby="bright-date-display-label"
        name="brightDateDisplay"
        value={value || BrightDateDisplayMode.Dual}
        onChange={(e) => onChange(e.target.value)}
      >
        {MODE_OPTIONS.map((opt) => (
          <FormControlLabel
            key={opt.value}
            value={opt.value}
            control={<Radio size="small" />}
            label={
              <span>
                {opt.label}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  — {opt.description}
                </Typography>
              </span>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

export default BrightDateDisplaySelector;
