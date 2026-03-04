import type { IBaseNotification } from '@brightchain/brighthub-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for a single notification
 * @see Requirements: 58.9
 */
export interface INotificationApiResponse extends IApiMessageResponse {
  data: IBaseNotification<string>;
}

/**
 * API response for a list of notifications with pagination
 * @see Requirements: 58.9
 */
export interface INotificationsApiResponse extends IApiMessageResponse {
  data: {
    notifications: IBaseNotification<string>[];
    cursor?: string;
    hasMore: boolean;
  };
}

/**
 * API response for unread notification count
 * @see Requirements: 58.9
 */
export interface IUnreadCountApiResponse extends IApiMessageResponse {
  data: {
    unreadCount: number;
  };
}
