/**
 * UnifiedNotificationsPage
 *
 * Full-page view of notifications aggregated across all BrightChain modules.
 * Fetches from the /unified-notifications/recent endpoint.
 */
import type {
  IUnifiedNotificationItem,
  UnifiedNotificationSource,
} from '@brightchain/brightchain-lib';
import {
  useAuth,
  useAuthenticatedApi,
} from '@digitaldefiance/express-suite-react-components';
import ChatIcon from '@mui/icons-material/Chat';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { FC, ReactElement, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SOURCE_CONFIG: Record<
  UnifiedNotificationSource,
  { label: string; color: 'primary' | 'secondary' | 'success' | 'warning'; icon: ReactElement }
> = {
  hub: { label: 'Hub', color: 'primary', icon: <NotificationsIcon /> },
  mail: { label: 'Mail', color: 'secondary', icon: <EmailIcon /> },
  chat: { label: 'Chat', color: 'success', icon: <ChatIcon /> },
  pass: { label: 'Pass', color: 'warning', icon: <LockIcon /> },
};

export const UnifiedNotificationsPage: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [items, setItems] = useState<IUnifiedNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const fetchNotifications = useCallback(
    (append = false, cursorParam?: string) => {
      if (!userId) return;
      const params = new URLSearchParams({ userId, limit: '30' });
      if (cursorParam) params.set('cursor', cursorParam);

      if (!append) setLoading(true);
      api
        .get(`/unified-notifications/recent?${params}`)
        .then((res) => {
          const data = res.data?.data;
          if (data) {
            setItems((prev) => (append ? [...prev, ...data.items] : data.items));
            setHasMore(data.hasMore ?? false);
            setCursor(data.cursor);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [api, userId],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleItemClick = (item: IUnifiedNotificationItem) => {
    if (item.clickThroughUrl) {
      navigate(item.clickThroughUrl);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        All Notifications
      </Typography>

      {loading && items.length === 0 ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          No notifications yet.
        </Typography>
      ) : (
        <>
          <List disablePadding>
            {items.map((item, idx) => {
              const cfg = SOURCE_CONFIG[item.source];
              return (
                <Box key={item.id}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItem
                    alignItems="flex-start"
                    onClick={() => handleItemClick(item)}
                    sx={{
                      cursor: item.clickThroughUrl ? 'pointer' : 'default',
                      bgcolor: item.isRead ? 'transparent' : 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${cfg.color}.main` }}>
                        {cfg.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: item.isRead ? 'normal' : 'bold',
                              flex: 1,
                            }}
                          >
                            {item.content}
                          </Typography>
                          <Chip
                            label={cfg.label}
                            color={cfg.color}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          {item.actorId && `${item.actorId} · `}
                          {new Date(item.createdAt).toLocaleString()}
                        </>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
          {hasMore && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                variant="outlined"
                onClick={() => fetchNotifications(true, cursor)}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Load more'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default UnifiedNotificationsPage;
