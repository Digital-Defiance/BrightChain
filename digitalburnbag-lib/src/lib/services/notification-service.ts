import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import type {
  INotification,
  INotificationPreferences,
} from '../interfaces/bases/notification';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { INotificationRepository } from '../interfaces/services/notification-repository';
import type { INotificationService } from '../interfaces/services/notification-service';

/**
 * Dependencies injected into NotificationService that come from other services.
 */
export interface INotificationServiceDeps<TID extends PlatformID> {
  /** Send real-time notification via WebSocket (returns true if user is online) */
  sendWebSocket: (
    userId: TID,
    notification: INotification<TID>,
  ) => Promise<boolean>;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
}

/**
 * Manages real-time and queued notifications for file platform events.
 *
 * Attempts WebSocket delivery first; if the user is offline the notification
 * is queued for later retrieval. Per-file/folder notification preferences
 * allow owners to control which events they receive and via which channels.
 */
export class NotificationService<TID extends PlatformID>
  implements INotificationService<TID>
{
  constructor(
    private readonly repository: INotificationRepository<TID>,
    private readonly deps: INotificationServiceDeps<TID>,
  ) {}

  /**
   * Notify a user of a file platform event.
   * Tries WebSocket first; queues the notification if the user is offline.
   */
  async notifyUser(
    userId: TID,
    notification: INotification<TID>,
  ): Promise<void> {
    const delivered = await this.deps.sendWebSocket(userId, notification);

    if (!delivered) {
      await this.repository.queueNotification(userId, notification);
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.OwnerNotified,
        actorId: userId,
        targetId: notification.targetId,
        targetType: 'file',
        metadata: {
          notificationType: notification.type,
          delivered,
        },
      });
    }
  }

  /**
   * Queue a notification for later delivery.
   */
  async queueNotification(
    userId: TID,
    notification: INotification<TID>,
  ): Promise<void> {
    await this.repository.queueNotification(userId, notification);
  }

  /**
   * Get all queued (undelivered) notifications for a user.
   */
  async getQueuedNotifications(userId: TID): Promise<INotification<TID>[]> {
    return this.repository.getQueuedNotifications(userId);
  }

  /**
   * Get count of unread notifications for a user.
   */
  async getUnreadCount(userId: TID): Promise<number> {
    return this.repository.getUnreadCount(userId);
  }

  /**
   * Get recent notifications for a user (for unified notification dropdown).
   */
  async getRecentNotifications(
    userId: TID,
    limit: number,
  ): Promise<INotification<TID>[]> {
    return this.repository.getRecentNotifications(userId, limit);
  }

  /**
   * Mark notifications as delivered.
   */
  async markDelivered(notificationIds: TID[]): Promise<void> {
    await this.repository.markDelivered(notificationIds);
  }

  /**
   * Mark notifications as read.
   */
  async markRead(notificationIds: TID[]): Promise<void> {
    await this.repository.markRead(notificationIds);
  }

  /**
   * Get notification preferences for a target (file/folder).
   * Returns sensible defaults if no preferences are stored.
   */
  async getPreferences(
    targetId: TID,
    ownerId: TID,
  ): Promise<INotificationPreferences> {
    const prefs = await this.repository.getPreferences(targetId, ownerId);
    if (prefs) {
      return prefs;
    }
    return { enabled: true, accessTypes: [], channels: ['websocket'] };
  }

  /**
   * Set notification preferences for a target (file/folder).
   */
  async setPreferences(
    targetId: TID,
    ownerId: TID,
    prefs: Partial<INotificationPreferences>,
  ): Promise<void> {
    await this.repository.setPreferences(targetId, ownerId, prefs);
  }
}
