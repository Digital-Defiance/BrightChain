/**
 * PresenceStatusDropdown — Dropdown for setting the current user's presence status.
 *
 * Requirements: 9.4, 9.5
 */
import { PresenceStatus } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback } from 'react';
import PresenceIndicator, { PRESENCE_STRING_KEYS } from './PresenceIndicator';

// ─── Component ──────────────────────────────────────────────────────────────

export interface PresenceStatusDropdownProps {
  status: PresenceStatus;
  onStatusChange: (status: PresenceStatus) => void;
}

const STATUS_OPTIONS: PresenceStatus[] = [
  PresenceStatus.ONLINE,
  PresenceStatus.IDLE,
  PresenceStatus.DO_NOT_DISTURB,
  PresenceStatus.OFFLINE,
];

const PresenceStatusDropdown: FC<PresenceStatusDropdownProps> = ({
  status,
  onStatusChange,
}) => {
  const { tBranded: t } = useI18n();

  const handleChange = useCallback(
    (e: SelectChangeEvent) => {
      onStatusChange(e.target.value as PresenceStatus);
    },
    [onStatusChange],
  );

  return (
    <Select
      size="small"
      value={status}
      onChange={handleChange}
      aria-label={t(BrightChatStrings.Presence_SetStatus)}
      renderValue={(val) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PresenceIndicator status={val as PresenceStatus} size="small" />
          <Typography variant="body2">
            {t(PRESENCE_STRING_KEYS[val as PresenceStatus])}
          </Typography>
        </Box>
      )}
      sx={{ minWidth: 140 }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <MenuItem key={opt} value={opt}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PresenceIndicator status={opt} size="small" />
            <Typography variant="body2">
              {t(PRESENCE_STRING_KEYS[opt])}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
};

export default memo(PresenceStatusDropdown);
