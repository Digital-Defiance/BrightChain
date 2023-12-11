/**
 * Unified notification counts across all BrightChain modules.
 *
 * Base interface lives in brightchain-lib so both frontend and backend
 * can consume it without pulling in Node-specific dependencies.
 *
 * @see Requirements: 57.2 (hub), 13.8 (email), future chat unread
 */
export interface IUnifiedNotificationCounts {
  /** Total unread count across all modules */
  total: number;
  /** BrightHub social notification unread count */
  hub: number;
  /** BrightMail email unread count */
  mail: number;
  /** BrightChat conversation unread count */
  chat: number;
  /** BrightPass vault/credential notification unread count */
  pass: number;
  /** DigitalBurnbag file/folder notification unread count */
  burnbag: number;
}

/**
 * Source module for a unified notification item.
 * Extensible as new modules are added.
 */
export type UnifiedNotificationSource =
  | 'hub'
  | 'mail'
  | 'chat'
  | 'pass'
  | 'burnbag';

/**
 * A single notification item normalized across all modules.
 * Used by the unified "View All" notifications page.
 */
export interface IUnifiedNotificationItem {
  /** Unique ID (original notification/email ID) */
  id: string;
  /** Which module this notification came from */
  source: UnifiedNotificationSource;
  /** Notification type or category label */
  type: string;
  /** Human-readable summary text */
  content: string;
  /** Whether the item has been read */
  isRead: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** Optional deep-link URL within the app */
  clickThroughUrl?: string;
  /** Actor/sender display identifier */
  actorId?: string;
}

/**
 * Paginated result for unified notifications.
 */
export interface IUnifiedNotificationsResult {
  items: IUnifiedNotificationItem[];
  hasMore: boolean;
  /** Cursor for next page (opaque string) */
  cursor?: string;
}
