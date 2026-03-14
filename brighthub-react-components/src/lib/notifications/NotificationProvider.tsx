/**
 * NotificationProvider Context
 *
 * Manages global notification state, WebSocket subscription with auto-reconnect,
 * local caching, deduplication, and category filtering.
 *
 * @remarks
 * Implements Requirements 52.1-52.10, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import type {
  IBaseNotification,
  INotificationActions,
  INotificationProviderState,
} from '@brightchain/brighthub-lib';
import {
  NotificationCategory,
  NotificationType,
} from '@brightchain/brighthub-lib';
import type { FC, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Combined context value */
export interface NotificationContextValue
  extends INotificationProviderState,
    INotificationActions {
  /** Filter notifications by category */
  filterByCategory: (
    category?: NotificationCategory,
  ) => IBaseNotification<string>[];
}

/** Props for the NotificationProvider */
export interface NotificationProviderProps {
  /** Child components */
  children: ReactNode;
  /** Function to fetch notifications from the API */
  fetchNotifications?: () => Promise<IBaseNotification<string>[]>;
  /** Function to fetch unread count */
  fetchUnreadCount?: () => Promise<number>;
  /** Function to mark a notification as read via API */
  onMarkAsRead?: (notificationId: string) => Promise<void>;
  /** Function to mark all notifications as read via API */
  onMarkAllAsRead?: () => Promise<void>;
  /** Function to delete a notification via API */
  onDeleteNotification?: (notificationId: string) => Promise<void>;
  /** WebSocket URL for real-time notifications */
  wsUrl?: string;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

/**
 * NotificationProvider
 *
 * Provides notification state and actions to the component tree.
 */
export const NotificationProvider: FC<NotificationProviderProps> = ({
  children,
  fetchNotifications,
  fetchUnreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  wsUrl,
}) => {
  const { t } = useBrightHubTranslation();

  const [notifications, setNotifications] = useState<
    IBaseNotification<string>[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const subscribersRef = useRef<
    Map<
      NotificationType,
      Set<(notification: IBaseNotification<string>) => void>
    >
  >(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Deduplicate notifications by _id */
  const deduplicateNotifications = useCallback(
    (items: IBaseNotification<string>[]): IBaseNotification<string>[] => {
      const seen = new Set<string>();
      return items.filter((n) => {
        if (seen.has(n._id)) return false;
        seen.add(n._id);
        return true;
      });
    },
    [],
  );

  /** Load notifications from API */
  const refreshNotifications = useCallback(async () => {
    if (!fetchNotifications) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await fetchNotifications();
      setNotifications((prev) => deduplicateNotifications([...data, ...prev]));
      if (fetchUnreadCount) {
        const count = await fetchUnreadCount();
        setUnreadCount(count);
      }
    } catch {
      setError(t(BrightHubStrings.NotificationProvider_Error));
    } finally {
      setIsLoading(false);
    }
  }, [fetchNotifications, fetchUnreadCount, deduplicateNotifications, t]);

  /** Mark a single notification as read */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (onMarkAsRead) await onMarkAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [onMarkAsRead],
  );

  /** Mark all notifications as read */
  const markAllAsRead = useCallback(async () => {
    if (onMarkAllAsRead) await onMarkAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [onMarkAllAsRead]);

  /** Delete a notification */
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (onDeleteNotification) await onDeleteNotification(notificationId);
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === notificationId);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== notificationId);
      });
    },
    [onDeleteNotification],
  );

  /** Subscribe to notifications of a specific type */
  const subscribe = useCallback(
    (
      type: NotificationType,
      callback: (notification: IBaseNotification<string>) => void,
    ): (() => void) => {
      if (!subscribersRef.current.has(type)) {
        subscribersRef.current.set(type, new Set());
      }
      subscribersRef.current.get(type)!.add(callback);
      return () => {
        subscribersRef.current.get(type)?.delete(callback);
      };
    },
    [],
  );

  /** Filter notifications by category */
  const filterByCategory = useCallback(
    (category?: NotificationCategory): IBaseNotification<string>[] => {
      if (!category) return notifications;
      return notifications.filter((n) => n.category === category);
    },
    [notifications],
  );

  /** Handle incoming real-time notification */
  const handleNewNotification = useCallback(
    (notification: IBaseNotification<string>) => {
      setNotifications((prev) =>
        deduplicateNotifications([notification, ...prev]),
      );
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
      }
      // Emit to subscribers
      const subs = subscribersRef.current.get(notification.type);
      if (subs) {
        subs.forEach((cb) => cb(notification));
      }
    },
    [deduplicateNotifications],
  );

  /** WebSocket connection with auto-reconnect */
  useEffect(() => {
    if (!wsUrl) return;

    let isMounted = true;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
            // Sync on reconnection
            refreshNotifications();
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification:new' && data.notification) {
              handleNewNotification(data.notification);
            } else if (
              data.type === 'notification:count' &&
              typeof data.unreadCount === 'number'
            ) {
              setUnreadCount(data.unreadCount);
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            // Auto-reconnect after 3 seconds
            reconnectTimerRef.current = setTimeout(() => {
              if (isMounted) connect();
            }, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isMounted) {
          setIsConnected(false);
          reconnectTimerRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, 3000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsUrl, handleNewNotification, refreshNotifications]);

  /** Initial load */
  useEffect(() => {
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isConnected,
      error,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications,
      subscribe,
      filterByCategory,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      isConnected,
      error,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications,
      subscribe,
      filterByCategory,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to access notification state and actions.
 * Must be used within a NotificationProvider.
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider',
    );
  }
  return context;
}

export default NotificationProvider;
