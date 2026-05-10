import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  INotification,
  INotificationPreferences,
} from '../bases/notification';

export interface INotificationService<TID extends PlatformID> {
  notifyUser(userId: TID, notification: INotification<TID>): Promise<void>;
  queueNotification(
    userId: TID,
    notification: INotification<TID>,
  ): Promise<void>;
  getQueuedNotifications(userId: TID): Promise<INotification<TID>[]>;
  /** Get count of unread (queued) notifications for a user */
  getUnreadCount(userId: TID): Promise<number>;
  /** Get recent notifications for a user (for unified notification dropdown) */
  getRecentNotifications(
    userId: TID,
    limit: number,
  ): Promise<INotification<TID>[]>;
  markDelivered(notificationIds: TID[]): Promise<void>;
  /** Mark notifications as read by IDs */
  markRead(notificationIds: TID[]): Promise<void>;
  getPreferences(
    targetId: TID,
    ownerId: TID,
  ): Promise<INotificationPreferences>;
  setPreferences(
    targetId: TID,
    ownerId: TID,
    prefs: Partial<INotificationPreferences>,
  ): Promise<void>;
}
