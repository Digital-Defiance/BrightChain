/**
 * NotificationList Component
 *
 * Full notifications page with infinite scroll and read/unread filtering.
 *
 * @remarks
 * Implements Requirements 12.6, 53.4, 53.9, 53.10, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import type { IBaseNotification } from '@brightchain/brighthub-lib';
import {
  Box,
  CircularProgress,
  List,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { NotificationItem } from './NotificationItem';

/** Read status filter */
export type ReadFilter = 'all' | 'unread' | 'read';

/** Props for the NotificationList component */
export interface NotificationListProps {
  /** Notifications to display */
  notifications: IBaseNotification<string>[];
  /** Whether data is loading */
  loading?: boolean;
  /** Whether there are more notifications to load */
  hasMore?: boolean;
  /** Callback to load more notifications */
  onLoadMore?: () => void;
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: IBaseNotification<string>) => void;
  /** Callback to mark a notification as read */
  onMarkRead?: (notificationId: string) => void;
  /** Callback to delete a notification */
  onDelete?: (notificationId: string) => void;
}

/**
 * NotificationList
 *
 * Full-page notification list with filtering and infinite scroll.
 */
export const NotificationList: FC<NotificationListProps> = ({
  notifications,
  loading = false,
  hasMore = false,
  onLoadMore,
  onNotificationClick,
  onMarkRead,
  onDelete,
}) => {
  const { t } = useBrightHubTranslation();
  const [filter, setFilter] = useState<ReadFilter>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const handleFilterChange = (
    _: React.SyntheticEvent,
    newValue: ReadFilter,
  ) => {
    setFilter(newValue);
  };

  return (
    <Box aria-label={t(BrightHubStrings.NotificationList_AriaLabel)}>
      {/* Header */}
      <Typography variant="h5" sx={{ px: 2, pt: 2, pb: 1 }}>
        {t(BrightHubStrings.NotificationList_Title)}
      </Typography>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onChange={handleFilterChange}
        sx={{ px: 2 }}
        data-testid="filter-tabs"
      >
        <Tab
          label={t(BrightHubStrings.NotificationList_FilterAll)}
          value="all"
        />
        <Tab
          label={t(BrightHubStrings.NotificationList_FilterUnread)}
          value="unread"
        />
        <Tab
          label={t(BrightHubStrings.NotificationList_FilterRead)}
          value="read"
        />
      </Tabs>

      {/* Loading state */}
      {loading && notifications.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress
            aria-label={t(BrightHubStrings.NotificationList_Loading)}
          />
        </Box>
      ) : filteredNotifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.NotificationList_EmptyState)}
          </Typography>
        </Box>
      ) : (
        <>
          <List disablePadding>
            {filteredNotifications.map((notif) => (
              <NotificationItem
                key={notif._id}
                notification={notif}
                onClick={onNotificationClick}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
              />
            ))}
          </List>

          {/* Load more / end of list */}
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {loading ? (
              <CircularProgress size={24} />
            ) : hasMore ? (
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer' }}
                onClick={onLoadMore}
                data-testid="load-more"
              >
                {t(BrightHubStrings.NotificationList_LoadMore)}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                data-testid="end-of-list"
              >
                {t(BrightHubStrings.NotificationList_EndOfList)}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default NotificationList;
