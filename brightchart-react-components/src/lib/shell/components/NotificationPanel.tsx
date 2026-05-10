/**
 * NotificationPanel — Slide-out panel listing recent notifications.
 *
 * @module shell/components/NotificationPanel
 */

import { BrightChartStrings } from '@brightchain/brightchart-lib';
import {
  Box,
  Button,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { useBrightChartTranslation } from '../../hooks/useBrightChartTranslation';
import { useNotifications } from '../contexts/NotificationContext';

export interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  onClose,
}) => {
  const { t } = useBrightChartTranslation();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { formatDateTime } = useFormattedDate();
  const navigate = useNavigate();

  const handleClick = (notificationId: string, actionRoute?: string) => {
    markAsRead(notificationId);
    if (actionRoute) {
      navigate(actionRoute);
      onClose();
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 360, p: 2 }} role="region" aria-label="Notifications">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">
            {t(BrightChartStrings.Shell_Notifications)}
          </Typography>
          <Button size="small" onClick={markAllAsRead}>
            {t(BrightChartStrings.Shell_MarkAllRead)}
          </Button>
        </Box>
        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t(BrightChartStrings.Shell_NoNotifications)}
          </Typography>
        ) : (
          <List disablePadding>
            {notifications.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleClick(n.id, n.actionRoute)}
                sx={{
                  bgcolor: n.read ? 'transparent' : 'action.hover',
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="body2"
                        fontWeight={n.read ? 'normal' : 'bold'}
                      >
                        {n.title}
                      </Typography>
                      {n.priority === 'urgent' && (
                        <Chip
                          label={t(
                            BrightChartStrings.Notification_Priority_Urgent,
                          )}
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block">
                        {n.body}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {n.timestamp instanceof Date
                          ? formatDateTime(n.timestamp)
                          : String(n.timestamp)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};
