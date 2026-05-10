/**
 * PresenceIndicator — Colored dot badge showing a user's online status.
 *
 * Renders a small colored circle based on the PresenceStatus value:
 * - green for ONLINE
 * - yellow for IDLE
 * - red for DO_NOT_DISTURB
 * - gray for OFFLINE
 *
 * Requirements: 9.1, 9.2
 */
import { PresenceStatus } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { FC, memo } from 'react';

// ─── Color mapping (exported for property-based testing) ────────────────────

/**
 * Maps a PresenceStatus to its display color.
 * The mapping is total — every enum value produces a defined color.
 */
export function presenceStatusColor(status: PresenceStatus): string {
  switch (status) {
    case PresenceStatus.ONLINE:
      return '#43b581'; // green
    case PresenceStatus.IDLE:
      return '#faa61a'; // yellow
    case PresenceStatus.DO_NOT_DISTURB:
      return '#f04747'; // red
    case PresenceStatus.OFFLINE:
    default:
      return '#747f8d'; // gray
  }
}

/**
 * Maps a PresenceStatus to a human-readable label for accessibility.
 * Kept for backward compatibility and tests.
 */
export function presenceStatusLabel(status: PresenceStatus): string {
  switch (status) {
    case PresenceStatus.ONLINE:
      return 'Online';
    case PresenceStatus.IDLE:
      return 'Idle';
    case PresenceStatus.DO_NOT_DISTURB:
      return 'Do Not Disturb';
    case PresenceStatus.OFFLINE:
    default:
      return 'Offline';
  }
}

// ─── i18n string key map ────────────────────────────────────────────────────

export const PRESENCE_STRING_KEYS: Record<PresenceStatus, string> = {
  [PresenceStatus.ONLINE]: BrightChatStrings.Presence_Online,
  [PresenceStatus.IDLE]: BrightChatStrings.Presence_Idle,
  [PresenceStatus.DO_NOT_DISTURB]: BrightChatStrings.Presence_DoNotDisturb,
  [PresenceStatus.OFFLINE]: BrightChatStrings.Presence_Offline,
};

/**
 * Returns true if notifications should be suppressed for the given status.
 * Only DO_NOT_DISTURB suppresses notifications (Requirement 9.5).
 */
export function shouldSuppressNotification(status: PresenceStatus): boolean {
  return status === PresenceStatus.DO_NOT_DISTURB;
}

// ─── Size constants (visual) ────────────────────────────────────────────────

const SIZE_MAP = {
  small: 8,
  medium: 12,
} as const;

// ─── Component ──────────────────────────────────────────────────────────────

export interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'small' | 'medium';
}

const PresenceIndicator: FC<PresenceIndicatorProps> = ({
  status,
  size = 'medium',
}) => {
  const { tBranded: t } = useI18n();
  const dotSize = SIZE_MAP[size];
  const color = presenceStatusColor(status);
  const label = t(PRESENCE_STRING_KEYS[status]);

  return (
    <Tooltip title={label} arrow>
      <Box
        component="span"
        role="status"
        aria-label={label}
        sx={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: color,
          border: '2px solid',
          borderColor: 'background.paper',
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
};

export default memo(PresenceIndicator);
