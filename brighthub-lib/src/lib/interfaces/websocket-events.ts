/**
 * WebSocket event interfaces for BrightHub real-time communication.
 *
 * These interfaces define the contract between client and server for
 * Socket.IO typed events. They live in brighthub-lib so both frontend
 * and backend can share the same type definitions.
 *
 * @see Requirements: 49.1-49.7, 52.4, 52.5
 */

import { IBaseConversation } from './base-conversation';
import { IBaseDirectMessage } from './base-direct-message';
import { IBaseMessageReaction } from './base-message-reaction';
import { IBaseNotification } from './base-notification';
import { ISendMessageOptions } from './messaging-service';

// ═══════════════════════════════════════════════════════
// Server → Client events
// ═══════════════════════════════════════════════════════

/**
 * Events emitted by the server to connected clients.
 */
export interface ServerToClientEvents {
  // ── Messaging events (Req 49.1-49.6) ──

  /** A new message was sent in a conversation the client is subscribed to */
  'message:new': (message: IBaseDirectMessage<string>) => void;

  /** A message was edited in a conversation the client is subscribed to */
  'message:edited': (message: IBaseDirectMessage<string>) => void;

  /** A message was deleted in a conversation the client is subscribed to */
  'message:deleted': (messageId: string, conversationId: string) => void;

  /** A reaction was added/removed on a message */
  'message:reaction': (
    messageId: string,
    reactions: IBaseMessageReaction<string>[],
  ) => void;

  /** A user is typing in a conversation */
  'conversation:typing': (conversationId: string, userId: string) => void;

  /** A user read messages in a conversation */
  'conversation:read': (
    conversationId: string,
    userId: string,
    lastReadAt: string,
  ) => void;

  /** A conversation was updated (participants changed, settings updated, etc.) */
  'conversation:updated': (conversation: IBaseConversation<string>) => void;

  // ── Notification events (Req 52.4, 52.5) ──

  /** A new notification was created for the client */
  'notification:new': (notification: IBaseNotification<string>) => void;

  /** A notification was marked as read */
  'notification:read': (notificationId: string) => void;

  /** A notification was deleted */
  'notification:deleted': (notificationId: string) => void;

  /** Updated unread notification count for badge display */
  'notification:count': (unreadCount: number) => void;
}

// ═══════════════════════════════════════════════════════
// Client → Server events
// ═══════════════════════════════════════════════════════

/**
 * Events emitted by clients to the server.
 */
export interface ClientToServerEvents {
  // ── Messaging events ──

  /** Client sends a message in a conversation */
  'message:send': (
    conversationId: string,
    content: string,
    options?: ISendMessageOptions,
    callback?: (message: IBaseDirectMessage<string>) => void,
  ) => void;

  /** Client signals they are typing in a conversation */
  'message:typing': (conversationId: string) => void;

  /** Client marks a conversation as read */
  'message:read': (conversationId: string) => void;

  // ── Subscription events ──

  /** Subscribe to real-time updates for a specific conversation */
  'subscribe:conversation': (conversationId: string) => void;

  /** Unsubscribe from a conversation's real-time updates */
  'unsubscribe:conversation': (conversationId: string) => void;

  /** Subscribe to real-time notification updates */
  'subscribe:notifications': () => void;

  /** Unsubscribe from notification updates */
  'unsubscribe:notifications': () => void;
}

// ═══════════════════════════════════════════════════════
// Inter-server events (for internal Socket.IO usage)
// ═══════════════════════════════════════════════════════

/**
 * Events used between Socket.IO server instances (for scaling).
 * Currently empty but reserved for future multi-node deployments.
 */

export interface InterServerEvents {
  // Reserved for future multi-node scaling
}

// ═══════════════════════════════════════════════════════
// Socket data (per-connection metadata)
// ═══════════════════════════════════════════════════════

/**
 * Per-socket metadata stored on each authenticated connection.
 */
export interface SocketData {
  /** Authenticated user ID */
  userId: string;
  /** Timestamp when the connection was established */
  connectedAt: string;
}

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

/** Typing indicator broadcast target latency in ms (Req 49.3) */
export const TYPING_INDICATOR_TARGET_LATENCY_MS = 100;

/** Default reconnection delay in ms */
export const DEFAULT_RECONNECT_DELAY_MS = 1000;

/** Maximum reconnection delay in ms (for exponential backoff) */
export const MAX_RECONNECT_DELAY_MS = 30000;

/** Reconnection backoff multiplier */
export const RECONNECT_BACKOFF_MULTIPLIER = 2;

/** Maximum number of reconnection attempts before giving up */
export const MAX_RECONNECT_ATTEMPTS = 10;
