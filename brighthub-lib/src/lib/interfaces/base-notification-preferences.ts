import { NotificationCategory } from '../enumerations/notification-category';
import { NotificationChannel } from '../enumerations/notification-channel';
import { IDoNotDisturbConfig } from './do-not-disturb-config';
import { INotificationCategorySettings } from './notification-category-settings';
import { IQuietHoursConfig } from './quiet-hours-config';

/**
 * User preferences for notifications
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseNotificationPreferences<TId> {
  /** ID of the user these preferences belong to */
  userId: TId;
  /** Settings per notification category */
  categorySettings: Record<NotificationCategory, INotificationCategorySettings>;
  /** Global channel settings */
  channelSettings: Record<NotificationChannel, boolean>;
  /** Quiet hours configuration */
  quietHours?: IQuietHoursConfig;
  /** Do Not Disturb configuration */
  dndConfig?: IDoNotDisturbConfig;
  /** Whether notification sounds are enabled */
  soundEnabled: boolean;
}
