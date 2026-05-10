/**
 * NotificationBell — Bell icon with unread count badge.
 *
 * @module shell/components/Header/NotificationBell
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge, IconButton } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { useNotifications } from '../../contexts/NotificationContext';

export interface NotificationBellProps {
  /** Callback when the bell is clicked */
  onClick?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onClick,
}) => {
  const { t } = useBrightChartTranslation();
  const { unreadCount } = useNotifications();

  return (
    <IconButton
      aria-label={
        unreadCount > 0
          ? t(BrightChartStrings.NotificationBell_UnreadTemplate).replace(
              '{COUNT}',
              String(unreadCount),
            )
          : t(BrightChartStrings.NotificationBell_AriaLabel)
      }
      onClick={onClick}
      color="inherit"
    >
      <Badge badgeContent={unreadCount} color="error" max={99}>
        <NotificationsIcon />
      </Badge>
    </IconButton>
  );
};
