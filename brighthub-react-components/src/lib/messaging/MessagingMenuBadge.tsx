/**
 * MessagingMenuBadge Component
 *
 * Top menu integration showing messaging icon with unread count badge.
 *
 * @remarks
 * Implements Requirements 44.12, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { Mail } from '@mui/icons-material';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the MessagingMenuBadge component */
export interface MessagingMenuBadgeProps {
  /** Number of unread conversations */
  unreadCount: number;
  /** Callback when the badge is clicked */
  onClick?: () => void;
}

/**
 * MessagingMenuBadge
 *
 * Icon button with a badge overlay for unread message count.
 */
export function MessagingMenuBadge({
  unreadCount,
  onClick,
}: MessagingMenuBadgeProps) {
  const { t } = useBrightHubTranslation();

  const tooltip =
    unreadCount > 0
      ? t(BrightHubStrings.MessagingMenuBadge_UnreadTemplate, {
          COUNT: String(unreadCount),
        })
      : t(BrightHubStrings.MessagingMenuBadge_NoUnread);

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={onClick}
        aria-label={t(BrightHubStrings.MessagingMenuBadge_AriaLabel)}
        data-testid="messaging-menu-badge"
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          invisible={unreadCount === 0}
        >
          <Mail />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

export default MessagingMenuBadge;
