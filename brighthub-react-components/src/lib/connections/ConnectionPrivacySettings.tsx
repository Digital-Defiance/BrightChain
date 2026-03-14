/**
 * ConnectionPrivacySettings Component
 *
 * Provides privacy controls for follower/following visibility,
 * messaging permissions, online status, read receipts, and
 * approve followers mode selection.
 *
 * @remarks
 * Implements Requirements 35.11, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  ApproveFollowersMode,
  IBasePrivacySettings,
} from '@brightchain/brighthub-lib';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Switch,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConnectionPrivacySettings component */
export interface ConnectionPrivacySettingsProps {
  /** Current privacy settings */
  settings: IBasePrivacySettings;
  /** Current approve followers mode */
  approveFollowersMode: ApproveFollowersMode;
  /** Callback when any privacy toggle changes */
  onChange: (settings: IBasePrivacySettings) => void;
  /** Callback when approve followers mode changes */
  onApproveFollowersModeChange: (mode: ApproveFollowersMode) => void;
  /** Optional callback for save action */
  onSave?: () => void;
}

/**
 * ConnectionPrivacySettings
 *
 * Renders toggle switches for each privacy option and a selector
 * for the approve followers mode. Optionally shows a Save button.
 */
export function ConnectionPrivacySettings({
  settings,
  approveFollowersMode,
  onChange,
  onApproveFollowersModeChange,
  onSave,
}: ConnectionPrivacySettingsProps) {
  const { t } = useBrightHubTranslation();

  const handleToggle = (key: keyof IBasePrivacySettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  const handleModeChange = (event: SelectChangeEvent<string>) => {
    onApproveFollowersModeChange(event.target.value as ApproveFollowersMode);
  };

  const toggleItems: { key: keyof IBasePrivacySettings; label: string }[] = [
    {
      key: 'hideFollowerCount',
      label: t(BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount),
    },
    {
      key: 'hideFollowingCount',
      label: t(BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount),
    },
    {
      key: 'hideFollowersFromNonFollowers',
      label: t(
        BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers,
      ),
    },
    {
      key: 'hideFollowingFromNonFollowers',
      label: t(
        BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers,
      ),
    },
    {
      key: 'allowDmsFromNonFollowers',
      label: t(
        BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers,
      ),
    },
    {
      key: 'showOnlineStatus',
      label: t(BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus),
    },
    {
      key: 'showReadReceipts',
      label: t(BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts),
    },
  ];

  return (
    <Box
      aria-label={t(BrightHubStrings.ConnectionPrivacySettings_AriaLabel)}
      data-testid="connection-privacy-settings"
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t(BrightHubStrings.ConnectionPrivacySettings_Title)}
      </Typography>

      {/* Privacy toggles */}
      <FormGroup>
        {toggleItems.map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={
              <Switch
                checked={settings[key]}
                onChange={() => handleToggle(key)}
                data-testid={`privacy-toggle-${key}`}
              />
            }
            label={label}
          />
        ))}
      </FormGroup>

      {/* Approve followers mode selector */}
      <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel id="approve-followers-mode-label">
          {t(BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode)}
        </InputLabel>
        <Select
          labelId="approve-followers-mode-label"
          value={approveFollowersMode}
          label={t(
            BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode,
          )}
          onChange={handleModeChange}
          data-testid="approve-followers-mode-select"
        >
          <MenuItem value={ApproveFollowersMode.ApproveNone}>
            {t(BrightHubStrings.ConnectionPrivacySettings_ApproveNone)}
          </MenuItem>
          <MenuItem value={ApproveFollowersMode.ApproveAll}>
            {t(BrightHubStrings.ConnectionPrivacySettings_ApproveAll)}
          </MenuItem>
          <MenuItem value={ApproveFollowersMode.ApproveNonMutuals}>
            {t(BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals)}
          </MenuItem>
        </Select>
      </FormControl>

      {/* Optional save button */}
      {onSave && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={onSave}
            data-testid="privacy-save-button"
            aria-label={t(BrightHubStrings.ConnectionPrivacySettings_Save)}
          >
            {t(BrightHubStrings.ConnectionPrivacySettings_Save)}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default ConnectionPrivacySettings;
