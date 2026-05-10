import { NotificationCategory } from '../enumerations/notification-category';
import { NotificationType } from '../enumerations/notification-type';

/**
 * Base notification interface
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseNotification<TId> {
  /** Unique identifier for the notification */
  _id: TId;
  /** ID of the user receiving the notification */
  recipientId: TId;
  /** Type of notification */
  type: NotificationType;
  /** Category of the notification */
  category: NotificationCategory;
  /** ID of the user who triggered the notification */
  actorId: TId;
  /** ID of the target content (post, message, etc.) */
  targetId?: TId;
  /** Human-readable content of the notification */
  content: string;
  /** URL to navigate to when clicking the notification */
  clickThroughUrl: string;
  /** ID of the notification group (for aggregated notifications) */
  groupId?: TId;
  /** Whether the notification has been read */
  isRead: boolean;
  /** Timestamp when the notification was created */
  createdAt: TId extends string ? string : Date;
}
