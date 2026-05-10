/**
 * Notification Type Interfaces
 *
 * Defines the INotification interface and NotificationType enum used
 * by the BrightChart shell notification system.
 *
 * @module shell/notificationTypes
 */

/**
 * Types of in-app notifications, used for filtering by role.
 */
export enum NotificationType {
  /** New lab/diagnostic result available */
  Result = 'result',
  /** Unsigned or updated clinical note */
  Note = 'note',
  /** Appointment reminder or status change */
  Appointment = 'appointment',
  /** Claim status change (submitted, denied, paid) */
  Claim = 'claim',
  /** Secure message from another user */
  Message = 'message',
  /** System-level notification (maintenance, updates) */
  System = 'system',
}

/**
 * An in-app notification displayed in the BrightChart notification panel.
 */
export interface INotification {
  /** Unique notification ID */
  id: string;

  /** Notification category */
  type: NotificationType;

  /** Short title */
  title: string;

  /** Notification body text */
  body: string;

  /** When the notification was created */
  timestamp: Date;

  /** Whether the user has read this notification */
  read: boolean;

  /** Optional route to navigate to when clicked */
  actionRoute?: string;

  /** Priority level */
  priority: 'normal' | 'urgent';
}
