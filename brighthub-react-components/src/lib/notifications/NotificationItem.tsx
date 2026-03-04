/**
 * NotificationItem Component
 *
 * Displays a single notification with click-through navigation,
 * grouped notification expansion, and hover action buttons.
 *
 * @remarks
 * Implements Requirements 53.3, 53.7, 53.8, 54.7, 61.4, 61.6
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import type { IBaseNotification } from '@brightchain/brighthub-lib';
import { Delete, DoneAll, ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  Avatar,
  Box,
  IconButton,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the NotificationItem component */
export interface NotificationItemProps {
  /** The notification to display */
  notification: IBaseNotification<string>;
  /** Optional actor display name */
  actorName?: string;
  /** Optional actor avatar URL */
  actorAvatarUrl?: string;
  /** Grouped notification count (if part of a group) */
  groupCount?: number;
  /** Grouped sub-notifications */
  groupItems?: IBaseNotification<string>[];
  /** Callback when the notification is clicked */
  onClick?: (notification: IBaseNotification<string>) => void;
  /** Callback to mark as read */
  onMarkRead?: (notificationId: string) => void;
  /** Callback to delete */
  onDelete?: (notificationId: string) => void;
}

/**
 * NotificationItem
 *
 * Single notification row with hover actions and optional group expansion.
 */
export const NotificationItem: FC<NotificationItemProps> = ({
  notification,
  actorName,
  actorAvatarUrl,
  groupCount,
  groupItems,
  onClick,
  onMarkRead,
  onDelete,
}) => {
  const { t } = useBrightHubTranslation();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isGrouped = groupCount !== undefined && groupCount > 1;

  const handleClick = () => {
    onClick?.(notification);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <Box data-testid={`notification-item-${notification._id}`}>
      <ListItemButton
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          bgcolor: notification.isRead ? 'transparent' : 'action.hover',
          position: 'relative',
        }}
        aria-label={t(BrightHubStrings.NotificationItem_AriaLabel)}
      >
        <ListItemAvatar>
          <Avatar src={actorAvatarUrl}>
            {actorName ? actorName.charAt(0).toUpperCase() : '?'}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={notification.content}
          secondary={
            <Typography
              variant="caption"
              color="text.secondary"
              component="span"
            >
              {notification.createdAt}
            </Typography>
          }
        />

        {/* Hover action buttons */}
        {hovered && (
          <Box
            sx={{ display: 'flex', gap: 0.5 }}
            data-testid="notification-actions"
          >
            {!notification.isRead && onMarkRead && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification._id);
                }}
                aria-label={t(BrightHubStrings.NotificationItem_MarkRead)}
                data-testid="mark-read-btn"
              >
                <DoneAll fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification._id);
                }}
                aria-label={t(BrightHubStrings.NotificationItem_Delete)}
                data-testid="delete-btn"
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}

        {/* Group expand toggle */}
        {isGrouped && (
          <IconButton
            size="small"
            onClick={handleToggleExpand}
            aria-label={
              expanded
                ? t(BrightHubStrings.NotificationItem_GroupCollapseTemplate)
                : t(BrightHubStrings.NotificationItem_GroupExpandTemplate, {
                    COUNT: String(groupCount),
                  })
            }
            data-testid="group-toggle"
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}

        {/* Unread indicator dot */}
        {!notification.isRead && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              position: 'absolute',
              right: 8,
              top: 8,
            }}
            data-testid="unread-dot"
          />
        )}
      </ListItemButton>

      {/* Expanded group items */}
      {isGrouped && expanded && groupItems && (
        <Box sx={{ pl: 4 }} data-testid="group-items">
          {groupItems.map((item) => (
            <ListItemButton
              key={item._id}
              onClick={() => onClick?.(item)}
              sx={{ py: 0.5 }}
            >
              <ListItemText
                primary={
                  <Typography variant="body2">{item.content}</Typography>
                }
                secondary={item.createdAt}
              />
            </ListItemButton>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default NotificationItem;
