/**
 * HubSelector Component
 *
 * Multi-select checkbox list for choosing which hubs a post is visible to.
 * Displays hub name, member count, and default indicators.
 *
 * @remarks
 * Implements Requirements 35.9, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { IBaseHub } from '@brightchain/brighthub-lib';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the HubSelector component */
export interface HubSelectorProps {
  /** Available hubs to choose from */
  hubs: IBaseHub<string>[];
  /** Currently selected hub IDs */
  selectedHubIds: string[];
  /** Callback when selection changes */
  onChange: (selectedIds: string[]) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * HubSelector
 *
 * Compact multi-select list of hubs with member counts and default indicators.
 * Used to control post visibility by selecting which hubs can see the content.
 */
export function HubSelector({
  hubs,
  selectedHubIds,
  onChange,
  disabled = false,
}: HubSelectorProps) {
  const { t } = useBrightHubTranslation();

  const handleToggle = (hubId: string) => {
    if (disabled) return;
    const isSelected = selectedHubIds.includes(hubId);
    const next = isSelected
      ? selectedHubIds.filter((id) => id !== hubId)
      : [...selectedHubIds, hubId];
    onChange(next);
  };

  return (
    <Box
      role="group"
      aria-label={t(BrightHubStrings.HubSelector_AriaLabel)}
      data-testid="hub-selector"
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {t(BrightHubStrings.HubSelector_Title)}
      </Typography>

      {hubs.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="no-hubs"
        >
          {t(BrightHubStrings.HubSelector_NoneAvailable)}
        </Typography>
      ) : (
        <>
          <FormGroup>
            {hubs.map((hub) => {
              const checked = selectedHubIds.includes(hub._id);
              return (
                <FormControlLabel
                  key={hub._id}
                  disabled={disabled}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleToggle(hub._id)}
                      size="small"
                      data-testid={`hub-checkbox-${hub._id}`}
                    />
                  }
                  label={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <Typography variant="body2">{hub.name}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        data-testid={`hub-members-${hub._id}`}
                      >
                        {t(BrightHubStrings.HubSelector_MembersTemplate, {
                          COUNT: String(hub.memberCount),
                        })}
                      </Typography>
                      {hub.isDefault && (
                        <Chip
                          label={t(BrightHubStrings.HubSelector_DefaultBadge)}
                          size="small"
                          variant="outlined"
                          data-testid={`hub-default-${hub._id}`}
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                />
              );
            })}
          </FormGroup>

          <Typography
            variant="caption"
            color="text.secondary"
            data-testid="hub-selection-summary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {selectedHubIds.length === 0
              ? t(BrightHubStrings.HubSelector_NoneSelected)
              : t(BrightHubStrings.HubSelector_SelectedCountTemplate, {
                  COUNT: String(selectedHubIds.length),
                })}
          </Typography>
        </>
      )}
    </Box>
  );
}

export default HubSelector;
