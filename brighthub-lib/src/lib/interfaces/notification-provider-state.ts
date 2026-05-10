import { IBaseNotification } from './base-notification';

/**
 * State for the notification provider (React context)
 */
export interface INotificationProviderState {
  /** List of notifications */
  notifications: IBaseNotification<string>[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Whether notifications are being loaded */
  isLoading: boolean;
  /** Whether connected to real-time updates */
  isConnected: boolean;
  /** Error message if any */
  error?: string;
}
