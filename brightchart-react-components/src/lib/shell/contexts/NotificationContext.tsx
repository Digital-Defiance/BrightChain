/**
 * NotificationContext — React context provider for in-app notifications.
 *
 * Holds INotification[], provides addNotification, markAsRead, getUnreadCount.
 *
 * @module shell/contexts/NotificationContext
 */

import type { INotification } from '@brightchain/brightchart-lib';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface NotificationContextValue {
  /** All notifications */
  notifications: INotification[];
  /** Add a new notification */
  addNotification(notification: INotification): void;
  /** Mark a notification as read */
  markAsRead(notificationId: string): void;
  /** Mark all notifications as read */
  markAllAsRead(): void;
  /** Get the count of unread notifications */
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export interface NotificationContextProviderProps {
  /** Optional initial notifications */
  initialNotifications?: INotification[];
  children: React.ReactNode;
}

export const NotificationContextProvider: React.FC<
  NotificationContextProviderProps
> = ({ initialNotifications = [], children }) => {
  const [notifications, setNotifications] =
    useState<INotification[]>(initialNotifications);

  const addNotification = useCallback((notification: INotification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      unreadCount,
    }),
    [notifications, addNotification, markAsRead, markAllAsRead, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to consume the NotificationContext.
 * Throws if used outside of NotificationContextProvider.
 */
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used within a NotificationContextProvider',
    );
  }
  return ctx;
}

export { NotificationContext };
