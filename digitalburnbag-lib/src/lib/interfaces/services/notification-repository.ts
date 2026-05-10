import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  INotification,
  INotificationPreferences,
} from '../bases/notification';

export interface INotificationRepository<TID extends PlatformID> {
  /** Store a queued notification */
  queueNotification(
    userId: TID,
    notification: INotification<TID>,
  ): Promise<void>;
  /** Get all queued (undelivered) notifications for a user */
  getQueuedNotifications(userId: TID): Promise<INotification<TID>[]>;
  /** Get count of unread notifications for a user */
  getUnreadCount(userId: TID): Promise<number>;
  /** Get recent notifications for a user, sorted by date descending */
  getRecentNotifications(
    userId: TID,
    limit: number,
  ): Promise<INotification<TID>[]>;
  /** Mark notifications as delivered */
  markDelivered(notificationIds: TID[]): Promise<void>;
  /** Mark notifications as read */
  markRead(notificationIds: TID[]): Promise<void>;
  /** Get notification preferences for a target (file/folder) */
  getPreferences(
    targetId: TID,
    ownerId: TID,
  ): Promise<INotificationPreferences | null>;
  /** Set notification preferences for a target */
  setPreferences(
    targetId: TID,
    ownerId: TID,
    prefs: Partial<INotificationPreferences>,
  ): Promise<void>;
}
