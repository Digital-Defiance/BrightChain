/**
 * NotificationBell Component
 *
 * Displays a bell icon with an unread notification badge.
 * Shows "99+" when count exceeds 99.
 *
 * @remarks
 * Implements Requirements 51.1, 51.2, 51.7, 53.1, 61.4
 */

import { faBell } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the NotificationBell component */
export interface NotificationBellProps {
  /** Number of unread notifications */
  unreadCount: number;
  /** Callback when the bell is clicked */
  onClick?: () => void;
}

/**
 * NotificationBell
 *
 * Bell icon button with badge showing unread notification count.
 */
export function NotificationBell({
  unreadCount,
  onClick,
}: NotificationBellProps) {
  const { t } = useBrightHubTranslation();

  const tooltip =
    unreadCount > 0
      ? unreadCount > 99
        ? t(BrightHubStrings.NotificationBell_Overflow)
        : t(BrightHubStrings.NotificationBell_UnreadTemplate, {
            COUNT: String(unreadCount),
          })
      : t(BrightHubStrings.NotificationBell_NoUnread);

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={onClick}
        aria-label={t(BrightHubStrings.NotificationBell_AriaLabel)}
        data-testid="notification-bell"
      >
        <Badge
          badgeContent={unreadCount > 99 ? '99+' : unreadCount}
          color="error"
          max={99}
          invisible={unreadCount === 0}
        >
          <FontAwesomeIcon icon={faBell} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

export default NotificationBell;
