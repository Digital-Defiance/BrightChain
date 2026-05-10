import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  Badge,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

export interface INotificationDisplay {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface INotificationPanelProps {
  notifications: INotificationDisplay[];
  onMarkRead: (ids: string[]) => void;
}

/**
 * Notification bell icon with popover list of notifications.
 */
export function NotificationPanel({
  notifications,
  onMarkRead,
}: INotificationPanelProps) {
  const { tBranded: t } = useI18n();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) onMarkRead(unreadIds);
    },
    [notifications, onMarkRead],
  );

  const handleClose = useCallback(() => setAnchorEl(null), []);

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-label={t(DigitalBurnbagStrings.Notifications_Label)}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              py={3}
            >
              {t(DigitalBurnbagStrings.Notifications_Empty)}
            </Typography>
          ) : (
            <List dense>
              {notifications.map((n) => (
                <ListItem
                  key={n.id}
                  sx={{ bgcolor: n.read ? 'transparent' : 'action.hover' }}
                >
                  <ListItemText
                    primary={n.message}
                    secondary={formatDateWithBD(n.timestamp)}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
