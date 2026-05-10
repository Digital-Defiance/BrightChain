import { NotificationType } from '../enumerations/notification-type';
import { IBaseNotification } from './base-notification';

/**
 * Actions available in the notification provider (React context)
 */
export interface INotificationActions {
  /** Mark a single notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Delete a notification */
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Refresh the notifications list */
  refreshNotifications: () => Promise<void>;
  /** Subscribe to notifications of a specific type */
  subscribe: (
    type: NotificationType,
    callback: (notification: IBaseNotification<string>) => void,
  ) => () => void;
}
