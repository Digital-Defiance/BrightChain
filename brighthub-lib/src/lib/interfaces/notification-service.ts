import { NotificationCategory } from '../enumerations/notification-category';
import { NotificationType } from '../enumerations/notification-type';
import { IBaseNotification } from './base-notification';
import { IBaseNotificationGroup } from './base-notification-group';
import { IBaseNotificationPreferences } from './base-notification-preferences';
import { IDoNotDisturbConfig } from './do-not-disturb-config';
import { IQuietHoursConfig } from './quiet-hours-config';
import { IPaginatedResult, IPaginationOptions } from './user-profile-service';

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

/** Default page size for notification queries */
export const DEFAULT_NOTIFICATION_PAGE_LIMIT = 20;

/** Maximum page size for notification queries */
export const MAX_NOTIFICATION_PAGE_LIMIT = 100;

/** Undo-delete window for notifications (5 seconds in ms) */
export const NOTIFICATION_UNDO_DELETE_WINDOW_MS = 5 * 1000;

/** Grouping window for same-type notifications on same target (1 hour in ms) */
export const NOTIFICATION_GROUPING_WINDOW_MS = 60 * 60 * 1000;

/** Number of days of inactivity before a reconnect reminder is created */
export const RECONNECT_REMINDER_DAYS = 30;

// ═══════════════════════════════════════════════════════
// Options interfaces
// ═══════════════════════════════════════════════════════

/** Options for creating a notification */
export interface ICreateNotificationOptions {
  /** ID of the target content (post, message, etc.) */
  targetId?: string;
  /** Human-readable content of the notification */
  content?: string;
  /** URL to navigate to when clicking the notification */
  clickThroughUrl?: string;
}

/** Options for listing notifications */
export interface INotificationListOptions extends IPaginationOptions {
  /** Filter by notification category */
  category?: NotificationCategory;
  /** Filter by read status */
  isRead?: boolean;
}

// ═══════════════════════════════════════════════════════
// Error codes
// ═══════════════════════════════════════════════════════

/** Error codes for notification operations */
export enum NotificationErrorCode {
  // Notification errors
  NotificationNotFound = 'NOTIFICATION_NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',

  // Preference errors
  PreferencesNotFound = 'PREFERENCES_NOT_FOUND',
  InvalidQuietHoursConfig = 'INVALID_QUIET_HOURS_CONFIG',
  InvalidDndConfig = 'INVALID_DND_CONFIG',

  // General errors
  InvalidInput = 'INVALID_INPUT',
}

/** Notification service error with code and message */
export class NotificationServiceError extends Error {
  constructor(
    public readonly code: NotificationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'NotificationServiceError';
  }
}

// ═══════════════════════════════════════════════════════
// Service interface
// ═══════════════════════════════════════════════════════

/**
 * Interface for the Notification_Service
 * Handles notification CRUD, preferences, grouping, and real-time delivery
 * @see Requirements: 9.1-9.7, 54.1-54.8, 55.1-55.9, 56.1-56.12
 */
export interface INotificationService {
  // ── Notification CRUD (Req 9.1-9.7, 54.1-54.8) ──

  /**
   * Create a notification for a recipient.
   * If the actor is a quiet-mode connection of the recipient, the notification
   * is suppressed and `null` is returned (Req 9.10).
   */
  createNotification(
    recipientId: string,
    type: NotificationType,
    actorId: string,
    options?: ICreateNotificationOptions,
  ): Promise<IBaseNotification<string> | null>;

  /** Get notifications for a user with pagination and filtering */
  getNotifications(
    userId: string,
    options?: INotificationListOptions,
  ): Promise<IPaginatedResult<IBaseNotification<string>>>;

  /** Get the count of unread notifications for a user */
  getUnreadCount(userId: string): Promise<number>;

  /** Mark a single notification as read */
  markAsRead(notificationId: string, userId: string): Promise<void>;

  /** Mark all notifications as read for a user */
  markAllAsRead(userId: string): Promise<void>;

  /** Delete a single notification */
  deleteNotification(notificationId: string, userId: string): Promise<void>;

  /** Delete all notifications for a user */
  deleteAllNotifications(userId: string): Promise<void>;

  // ── Filtering (Req 9.8-9.12) ──

  /**
   * Get notifications filtered by connection list members (Req 9.8).
   * Returns only notifications where the actorId is a member of the given list.
   */
  getNotificationsByList(
    userId: string,
    listId: string,
    options?: INotificationListOptions,
  ): Promise<IPaginatedResult<IBaseNotification<string>>>;

  /**
   * Get notifications filtered by connection category (Req 9.9).
   * Returns only notifications where the actorId is in the given category.
   */
  getNotificationsByConnectionCategory(
    userId: string,
    categoryId: string,
    options?: INotificationListOptions,
  ): Promise<IPaginatedResult<IBaseNotification<string>>>;

  /**
   * Check if a connection has quiet mode enabled (Req 9.10).
   */
  isQuietModeConnection(userId: string, connectionId: string): Promise<boolean>;

  /**
   * Create a reconnect reminder for a 30-day inactive connection (Req 9.12).
   * Creates a notification with type ReconnectReminder and category Connections.
   */
  createReconnectReminder(
    userId: string,
    connectionId: string,
  ): Promise<IBaseNotification<string>>;

  // ── Preferences (Req 56.1-56.12) ──

  /** Get notification preferences for a user */
  getPreferences(userId: string): Promise<IBaseNotificationPreferences<string>>;

  /** Update notification preferences for a user */
  updatePreferences(
    userId: string,
    preferences: Partial<IBaseNotificationPreferences<string>>,
  ): Promise<IBaseNotificationPreferences<string>>;

  /** Set quiet hours configuration */
  setQuietHours(userId: string, config: IQuietHoursConfig): Promise<void>;

  /** Set Do Not Disturb configuration */
  setDoNotDisturb(userId: string, config: IDoNotDisturbConfig): Promise<void>;

  // ── Grouping (Req 55.6-55.9) ──

  /**
   * Group notifications by type and target within the grouping window.
   * @param notifications - Notifications to group
   * @param skipGrouping  - When true, returns each notification as its own group (Req 55.9 ungrouping preference)
   */
  groupNotifications(
    notifications: IBaseNotification<string>[],
    skipGrouping?: boolean,
  ): Promise<IBaseNotificationGroup<string>[]>;

  // ── Real-time ──

  /** Subscribe to real-time notifications for a user */
  subscribeToNotifications(
    userId: string,
    callback: (notification: IBaseNotification<string>) => void,
  ): () => void;

  /** Broadcast a notification to the recipient via real-time channel */
  broadcastNotification(notification: IBaseNotification<string>): Promise<void>;
}
