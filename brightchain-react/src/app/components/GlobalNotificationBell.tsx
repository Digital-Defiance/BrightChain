/**
 * GlobalNotificationBell
 *
 * App-level notification bell rendered inside the TopMenu toolbar.
 * Aggregates notifications across all BrightChain modules (Hub, Mail, Chat, Pass).
 * Uses the existing NotificationBell + NotificationDropdown from brighthub-react-components.
 */
import type { IUnifiedNotificationCounts } from '@brightchain/brightchain-lib';
import type { IBaseNotification } from '@brightchain/brighthub-lib';
// Import notification components directly (not via barrel) to avoid pulling
// in the full brighthub-react-components bundle which includes PostComposer
// and the 56MB FontAwesome icon kit.
import { NotificationBell } from '@brightchain/brighthub-react-components/lib/notifications/NotificationBell';
import { NotificationDropdown } from '@brightchain/brighthub-react-components/lib/notifications/NotificationDropdown';
import {
  useAuth,
  useAuthenticatedApi,
} from '@digitaldefiance/express-suite-react-components';
import { Box } from '@mui/material';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const GlobalNotificationBell: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownNotifs, setDropdownNotifs] = useState<
    IBaseNotification<string>[]
  >([]);
  const bellRef = useRef<HTMLButtonElement>(null);

  const userId = userData?.id;

  useEffect(() => {
    if (!userId) return;
    api
      .get(`/unified-notifications/unread-counts?userId=${userId}`)
      .then((res) => {
        const data: IUnifiedNotificationCounts | undefined = res.data?.data;
        setUnreadCount(typeof data?.total === 'number' ? data.total : 0);
      })
      .catch(() => {});
  }, [api, userId]);

  const handleBellClick = useCallback(() => {
    setDropdownOpen((prev) => !prev);
    if (!dropdownOpen) {
      api
        .get(`/brighthub/notifications?userId=${userId}&limit=10`)
        .then((res) => {
          const data = res.data?.data;
          if (Array.isArray(data)) setDropdownNotifs(data);
          else if (data?.notifications) setDropdownNotifs(data.notifications);
        })
        .catch(() => {});
    }
  }, [api, dropdownOpen, userId]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
      <Box
        ref={bellRef}
        component="span"
        sx={{ '& .MuiIconButton-root': { color: 'inherit' } }}
      >
        <NotificationBell unreadCount={unreadCount} onClick={handleBellClick} />
      </Box>
      <NotificationDropdown
        open={dropdownOpen}
        anchorEl={bellRef.current}
        notifications={dropdownNotifs}
        onClose={() => setDropdownOpen(false)}
        onViewAll={() => {
          setDropdownOpen(false);
          navigate('/notifications');
        }}
        onMarkAllRead={() => {
          api
            .post('/brighthub/notifications/read-all', { userId })
            .then(() => {
              setUnreadCount(0);
              setDropdownNotifs((prev) =>
                prev.map((n) => ({ ...n, isRead: true })),
              );
            })
            .catch(() => {});
        }}
      />
    </Box>
  );
};

export default GlobalNotificationBell;
