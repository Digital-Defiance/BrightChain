/**
 * NotificationDropdown Component
 *
 * Shows the 10 most recent notifications with actor avatar, action,
 * timestamp, read indicator. Includes "View all" and "Mark all as read"
 * actions. Closes on outside click and supports keyboard navigation.
 *
 * @remarks
 * Implements Requirements 51.3-51.10, 53.2, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import type { IBaseNotification } from '@brightchain/brighthub-lib';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { NotificationItem } from './NotificationItem';

/** Props for the NotificationDropdown component */
export interface NotificationDropdownProps {
  /** Whether the dropdown is open */
  open: boolean;
  /** Anchor element for positioning */
  anchorEl: HTMLElement | null;
  /** Notifications to display (max 10 shown) */
  notifications: IBaseNotification<string>[];
  /** Whether notifications are loading */
  loading?: boolean;
  /** Callback to close the dropdown */
  onClose: () => void;
  /** Callback for "View all" action */
  onViewAll?: () => void;
  /** Callback for "Mark all as read" action */
  onMarkAllRead?: () => void;
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: IBaseNotification<string>) => void;
  /** Callback to mark a notification as read */
  onMarkRead?: (notificationId: string) => void;
  /** Callback to delete a notification */
  onDelete?: (notificationId: string) => void;
}

/**
 * NotificationDropdown
 *
 * Popper-based dropdown showing recent notifications.
 */
export const NotificationDropdown: FC<NotificationDropdownProps> = ({
  open,
  anchorEl,
  notifications,
  loading = false,
  onClose,
  onViewAll,
  onMarkAllRead,
  onNotificationClick,
  onMarkRead,
  onDelete,
}) => {
  const { t } = useBrightHubTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const recentNotifications = notifications.slice(0, 10);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, anchorEl]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-end"
      data-testid="notification-dropdown"
      role="dialog"
      aria-label={t(BrightHubStrings.NotificationDropdown_AriaLabel)}
    >
      <Paper
        ref={dropdownRef}
        elevation={8}
        sx={{ width: 360, maxHeight: 480, overflow: 'auto' }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 1,
          }}
        >
          <Typography variant="h6">
            {t(BrightHubStrings.NotificationDropdown_Title)}
          </Typography>
          {onMarkAllRead && (
            <Button
              size="small"
              onClick={onMarkAllRead}
              data-testid="mark-all-read"
            >
              {t(BrightHubStrings.NotificationDropdown_MarkAllRead)}
            </Button>
          )}
        </Box>
        <Divider />

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress
              size={24}
              aria-label={t(BrightHubStrings.NotificationDropdown_Loading)}
            />
          </Box>
        ) : recentNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
            <Typography variant="body2" color="text.secondary">
              {t(BrightHubStrings.NotificationDropdown_EmptyState)}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {recentNotifications.map((notif) => (
              <NotificationItem
                key={notif._id}
                notification={notif}
                onClick={onNotificationClick}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
              />
            ))}
          </List>
        )}

        {/* Footer */}
        {onViewAll && (
          <>
            <Divider />
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Button size="small" onClick={onViewAll} data-testid="view-all">
                {t(BrightHubStrings.NotificationDropdown_ViewAll)}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Popper>
  );
};

export default NotificationDropdown;
