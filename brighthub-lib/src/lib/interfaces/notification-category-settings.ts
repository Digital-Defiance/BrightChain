import { NotificationChannel } from '../enumerations/notification-channel';

/**
 * Settings for a specific notification category
 */
export interface INotificationCategorySettings {
  /** Whether this category is enabled */
  enabled: boolean;
  /** Channels enabled for this category */
  channels: Record<NotificationChannel, boolean>;
}
