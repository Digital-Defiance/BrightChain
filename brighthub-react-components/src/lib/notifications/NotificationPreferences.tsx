/**
 * NotificationPreferences Component
 *
 * Per-category enable/disable, per-channel settings, quiet hours
 * configuration with timezone, DND duration selection, and sound preferences.
 *
 * @remarks
 * Implements Requirements 53.5, 56.1-56.10, 61.4
 */

import type { BrightHubStringKey } from '@brightchain/brightchain-lib';
import { BrightHubStrings } from '@brightchain/brightchain-lib';
import type {
  IBaseNotificationPreferences,
  IDoNotDisturbConfig,
  INotificationCategorySettings,
  IQuietHoursConfig,
} from '@brightchain/brighthub-lib';
import {
  MuteDuration,
  NotificationCategory,
  NotificationChannel,
} from '@brightchain/brighthub-lib';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the NotificationPreferences component */
export interface NotificationPreferencesProps {
  /** Current preferences */
  preferences: IBaseNotificationPreferences<string>;
  /** Callback when preferences are saved */
  onSave?: (preferences: IBaseNotificationPreferences<string>) => void;
}

const CATEGORY_LABEL_MAP: Record<NotificationCategory, BrightHubStringKey> = {
  [NotificationCategory.Social]:
    BrightHubStrings.NotificationPreferences_CategorySocial,
  [NotificationCategory.Messages]:
    BrightHubStrings.NotificationPreferences_CategoryMessages,
  [NotificationCategory.Connections]:
    BrightHubStrings.NotificationPreferences_CategoryConnections,
  [NotificationCategory.System]:
    BrightHubStrings.NotificationPreferences_CategorySystem,
};

const CHANNEL_LABEL_MAP: Record<NotificationChannel, BrightHubStringKey> = {
  [NotificationChannel.InApp]:
    BrightHubStrings.NotificationPreferences_ChannelInApp,
  [NotificationChannel.Email]:
    BrightHubStrings.NotificationPreferences_ChannelEmail,
  [NotificationChannel.Push]:
    BrightHubStrings.NotificationPreferences_ChannelPush,
};

/**
 * NotificationPreferences
 *
 * Form for managing notification delivery preferences.
 */
export const NotificationPreferences: FC<NotificationPreferencesProps> = ({
  preferences,
  onSave,
}) => {
  const { t } = useBrightHubTranslation();
  const [state, setState] = useState(preferences);

  const updateCategorySetting = (
    category: NotificationCategory,
    update: Partial<INotificationCategorySettings>,
  ) => {
    setState((prev) => ({
      ...prev,
      categorySettings: {
        ...prev.categorySettings,
        [category]: { ...prev.categorySettings[category], ...update },
      },
    }));
  };

  const updateChannelSetting = (
    channel: NotificationChannel,
    enabled: boolean,
  ) => {
    setState((prev) => ({
      ...prev,
      channelSettings: { ...prev.channelSettings, [channel]: enabled },
    }));
  };

  const updateQuietHours = (update: Partial<IQuietHoursConfig>) => {
    setState((prev) => ({
      ...prev,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...prev.quietHours,
        ...update,
      },
    }));
  };

  const updateDnd = (update: Partial<IDoNotDisturbConfig>) => {
    setState((prev) => ({
      ...prev,
      dndConfig: {
        enabled: false,
        ...prev.dndConfig,
        ...update,
      },
    }));
  };

  const handleSave = () => {
    onSave?.(state);
  };

  return (
    <Box
      aria-label={t(BrightHubStrings.NotificationPreferences_AriaLabel)}
      data-testid="notification-preferences"
    >
      <Typography variant="h5" sx={{ px: 2, pt: 2, pb: 1 }}>
        {t(BrightHubStrings.NotificationPreferences_Title)}
      </Typography>

      {/* Category Settings */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="h6" gutterBottom>
          {t(BrightHubStrings.NotificationPreferences_CategorySettings)}
        </Typography>
        {Object.values(NotificationCategory).map((category) => (
          <Box key={category} sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.categorySettings[category]?.enabled ?? true}
                  onChange={(e) =>
                    updateCategorySetting(category, {
                      enabled: e.target.checked,
                    })
                  }
                  data-testid={`category-toggle-${category}`}
                />
              }
              label={t(CATEGORY_LABEL_MAP[category])}
            />
            {/* Per-channel toggles for this category */}
            {state.categorySettings[category]?.enabled && (
              <Box sx={{ pl: 4 }}>
                {Object.values(NotificationChannel).map((channel) => (
                  <FormControlLabel
                    key={channel}
                    control={
                      <Switch
                        size="small"
                        checked={
                          state.categorySettings[category]?.channels?.[
                            channel
                          ] ?? true
                        }
                        onChange={(e) =>
                          updateCategorySetting(category, {
                            channels: {
                              ...state.categorySettings[category]?.channels,
                              [channel]: e.target.checked,
                            },
                          })
                        }
                        data-testid={`category-channel-${category}-${channel}`}
                      />
                    }
                    label={t(CHANNEL_LABEL_MAP[channel])}
                  />
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Global Channel Settings */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="h6" gutterBottom>
          {t(BrightHubStrings.NotificationPreferences_ChannelSettings)}
        </Typography>
        {Object.values(NotificationChannel).map((channel) => (
          <FormControlLabel
            key={channel}
            control={
              <Switch
                checked={state.channelSettings[channel] ?? true}
                onChange={(e) =>
                  updateChannelSetting(channel, e.target.checked)
                }
                data-testid={`channel-toggle-${channel}`}
              />
            }
            label={t(CHANNEL_LABEL_MAP[channel])}
          />
        ))}
      </Box>

      <Divider />

      {/* Quiet Hours */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="h6" gutterBottom>
          {t(BrightHubStrings.NotificationPreferences_QuietHours)}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={state.quietHours?.enabled ?? false}
              onChange={(e) => updateQuietHours({ enabled: e.target.checked })}
              data-testid="quiet-hours-toggle"
            />
          }
          label={t(BrightHubStrings.NotificationPreferences_QuietHoursEnabled)}
        />
        {state.quietHours?.enabled && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              label={t(
                BrightHubStrings.NotificationPreferences_QuietHoursStart,
              )}
              type="time"
              size="small"
              value={state.quietHours?.startTime ?? '22:00'}
              onChange={(e) => updateQuietHours({ startTime: e.target.value })}
              data-testid="quiet-hours-start"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t(BrightHubStrings.NotificationPreferences_QuietHoursEnd)}
              type="time"
              size="small"
              value={state.quietHours?.endTime ?? '08:00'}
              onChange={(e) => updateQuietHours({ endTime: e.target.value })}
              data-testid="quiet-hours-end"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t(
                BrightHubStrings.NotificationPreferences_QuietHoursTimezone,
              )}
              size="small"
              value={state.quietHours?.timezone ?? ''}
              onChange={(e) => updateQuietHours({ timezone: e.target.value })}
              data-testid="quiet-hours-timezone"
            />
          </Box>
        )}
      </Box>

      <Divider />

      {/* Do Not Disturb */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="h6" gutterBottom>
          {t(BrightHubStrings.NotificationPreferences_DoNotDisturb)}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={state.dndConfig?.enabled ?? false}
              onChange={(e) => updateDnd({ enabled: e.target.checked })}
              data-testid="dnd-toggle"
            />
          }
          label={t(BrightHubStrings.NotificationPreferences_DndEnabled)}
        />
        {state.dndConfig?.enabled && (
          <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
            <InputLabel>
              {t(BrightHubStrings.NotificationPreferences_DndDuration)}
            </InputLabel>
            <Select
              value={state.dndConfig?.duration ?? MuteDuration.OneHour}
              label={t(BrightHubStrings.NotificationPreferences_DndDuration)}
              onChange={(e) =>
                updateDnd({ duration: e.target.value as MuteDuration })
              }
              data-testid="dnd-duration"
            >
              {Object.values(MuteDuration).map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Divider />

      {/* Sound Preferences */}
      <Box sx={{ px: 2, py: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={state.soundEnabled}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  soundEnabled: e.target.checked,
                }))
              }
              data-testid="sound-toggle"
            />
          }
          label={t(BrightHubStrings.NotificationPreferences_SoundEnabled)}
        />
      </Box>

      {/* Save */}
      <Box sx={{ px: 2, py: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          data-testid="save-preferences"
        >
          {t(BrightHubStrings.NotificationPreferences_Save)}
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationPreferences;
