/**
 * useChatWebSocket — React hook for subscribing to BrightChat real-time
 * WebSocket events. Manages connection lifecycle, reconnection with
 * exponential backoff, and event dispatch to registered handlers.
 *
 * Also exports pure helper functions for state transformations triggered
 * by WebSocket events, enabling property-based testing without React.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import type {
  ICommunicationMessage,
  IKeyRotationEvent,
  IReaction,
} from '@brightchain/brightchain-lib';
import {
  CommunicationEventType,
  dateToBrightDate,
  PresenceStatus,
} from '@brightchain/brightchain-lib';
import { useCallback, useEffect, useRef } from 'react';

// ─── Handler interface ──────────────────────────────────────────────────────

export interface ChatWebSocketHandlers {
  onMessageSent?: (msg: ICommunicationMessage) => void;
  onMessageEdited?: (msg: ICommunicationMessage) => void;
  onMessageDeleted?: (data: { messageId: string; contextId: string }) => void;
  onTypingStart?: (data: { memberId: string; contextId: string }) => void;
  onTypingStop?: (data: { memberId: string; contextId: string }) => void;
  onReactionAdded?: (data: { messageId: string; reaction: IReaction }) => void;
  onReactionRemoved?: (data: { messageId: string; reactionId: string }) => void;
  onPresenceChanged?: (data: {
    memberId: string;
    status: PresenceStatus;
  }) => void;
  onMemberJoined?: (data: { memberId: string; contextId: string }) => void;
  onMemberLeft?: (data: { memberId: string; contextId: string }) => void;

  // Key rotation event (Requirement 6.1)
  onKeyRotated?: (event: IKeyRotationEvent) => void;

  // Server events (Requirements 10.1–10.4)
  onServerChannelCreated?: (data: {
    serverId: string;
    channelId: string;
    channelName: string;
    categoryId: string;
  }) => void;
  onServerChannelDeleted?: (data: {
    serverId: string;
    channelId: string;
  }) => void;
  onServerMemberJoined?: (data: { serverId: string; memberId: string }) => void;
  onServerMemberRemoved?: (data: {
    serverId: string;
    memberId: string;
  }) => void;
}

// ─── Pure helper functions (exported for property-based testing) ─────────────

/**
 * Prepends a new message to the list (message_sent event).
 * Returns a new array with the message added at the beginning.
 */
export function applyMessageSent<T extends { id: string }>(
  messages: T[],
  newMsg: T,
): T[] {
  return [newMsg, ...messages];
}

/**
 * Updates a message in place (message_edited event).
 * Returns a new array with the matching message replaced.
 * editedAt is a BrightDateTimestamp (number) or undefined.
 */
export function applyMessageEdited<
  T extends { id: string; encryptedContent: string; editedAt?: number },
>(messages: T[], editedMsg: T): T[] {
  return messages.map((m) =>
    m.id === editedMsg.id
      ? {
          ...m,
          encryptedContent: editedMsg.encryptedContent,
          editedAt: editedMsg.editedAt,
        }
      : m,
  );
}

/**
 * Removes a message from the list (message_deleted event).
 * Returns a new array without the message matching the given ID.
 */
export function applyMessageDeleted<T extends { id: string }>(
  messages: T[],
  deletedId: string,
): T[] {
  return messages.filter((m) => m.id !== deletedId);
}

/**
 * Adds a member to the typing set (typing_start event).
 */
export function applyTypingStart(
  typingSet: Set<string>,
  memberId: string,
): Set<string> {
  const next = new Set(typingSet);
  next.add(memberId);
  return next;
}

/**
 * Removes a member from the typing set (typing_stop event).
 */
export function applyTypingStop(
  typingSet: Set<string>,
  memberId: string,
): Set<string> {
  const next = new Set(typingSet);
  next.delete(memberId);
  return next;
}

/**
 * Adds a reaction to a message's reaction list (reaction_added event).
 * Returns a new array with the message's reactions updated.
 */
export function applyReactionAdded<
  T extends { id: string; reactions: IReaction[] },
>(messages: T[], messageId: string, reaction: IReaction): T[] {
  return messages.map((m) =>
    m.id === messageId ? { ...m, reactions: [...m.reactions, reaction] } : m,
  );
}

/**
 * Removes a reaction from a message's reaction list (reaction_removed event).
 * Returns a new array with the matching reaction removed.
 */
export function applyReactionRemoved<
  T extends { id: string; reactions: IReaction[] },
>(messages: T[], messageId: string, reactionId: string): T[] {
  return messages.map((m) =>
    m.id === messageId
      ? { ...m, reactions: m.reactions.filter((r) => r.id !== reactionId) }
      : m,
  );
}

/**
 * Updates a member's presence status in the presence map (presence_changed event).
 */
export function applyPresenceChanged(
  presenceMap: Map<string, string>,
  memberId: string,
  status: string,
): Map<string, string> {
  const next = new Map(presenceMap);
  next.set(memberId, status);
  return next;
}

/**
 * Adds a member to the member list (member_joined event).
 */
export function applyMemberJoined(
  members: string[],
  memberId: string,
): string[] {
  return [...members, memberId];
}

/**
 * Removes a member from the member list (member_left event).
 */
export function applyMemberLeft(members: string[], memberId: string): string[] {
  return members.filter((m) => m !== memberId);
}

// ─── Server event transform functions (Requirements 10.1–10.4) ──────────────

/**
 * Adds a channel to the channel list (server_channel_created event).
 * Returns a new array with the channel appended.
 */
export function applyServerChannelCreated<T extends { id: string }>(
  channels: T[],
  newChannel: T,
): T[] {
  return [...channels, newChannel];
}

/**
 * Removes a channel from the channel list (server_channel_deleted event).
 * Returns a new array without the channel matching the given ID.
 */
export function applyServerChannelDeleted<T extends { id: string }>(
  channels: T[],
  deletedChannelId: string,
): T[] {
  return channels.filter((ch) => ch.id !== deletedChannelId);
}

/**
 * Adds a member to the server member list (server_member_joined event).
 * Returns a new array with the member appended.
 */
export function applyServerMemberJoined(
  members: string[],
  memberId: string,
): string[] {
  return [...members, memberId];
}

/**
 * Removes a server from the server list when the current user is removed
 * (server_member_removed event for current user).
 * Returns a new array without the server matching the given ID.
 */
export function applyServerMemberRemoved<T extends { id: string }>(
  servers: T[],
  removedServerId: string,
): T[] {
  return servers.filter((s) => s.id !== removedServerId);
}

// ─── Key rotation types and helper (Requirements 6.1) ───────────────────────

/**
 * Represents a key rotation notice inserted into the message thread.
 */
export interface KeyRotationNoticeItem {
  type: 'key_rotation';
  reason: 'member_joined' | 'member_left' | 'member_removed';
  timestamp: string;
  epoch: number;
}

/**
 * Union type for items that can appear in a message thread:
 * regular messages or key rotation notices.
 */
export type ThreadItem =
  | (ICommunicationMessage & { type?: 'message' })
  | KeyRotationNoticeItem;

/**
 * Returns the comparable BrightDate value for a thread item.
 * Messages use `createdAt` (BrightDateTimestamp number); notices use `timestamp` (ISO string → converted).
 */
function getTimestamp(item: ThreadItem): number {
  if (item.type === 'key_rotation') {
    return dateToBrightDate(new Date(item.timestamp));
  }
  return (item as ICommunicationMessage).createdAt;
}

/**
 * Insert a key rotation notice into a chronologically sorted list of thread
 * items. Returns a new sorted array. Uses binary search for O(log n) insertion.
 */
export function applyKeyRotation(
  items: ThreadItem[],
  notice: KeyRotationNoticeItem,
): ThreadItem[] {
  const noticeBd = dateToBrightDate(new Date(notice.timestamp));
  let lo = 0;
  let hi = items.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (getTimestamp(items[mid]) <= noticeBd) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const result = items.slice();
  result.splice(lo, 0, notice);
  return result;
}

// ─── Event type → handler key mapping ───────────────────────────────────────

const EVENT_HANDLER_MAP: Record<string, keyof ChatWebSocketHandlers> = {
  [CommunicationEventType.MESSAGE_SENT]: 'onMessageSent',
  [CommunicationEventType.MESSAGE_EDITED]: 'onMessageEdited',
  [CommunicationEventType.MESSAGE_DELETED]: 'onMessageDeleted',
  [CommunicationEventType.TYPING_START]: 'onTypingStart',
  [CommunicationEventType.TYPING_STOP]: 'onTypingStop',
  [CommunicationEventType.REACTION_ADDED]: 'onReactionAdded',
  [CommunicationEventType.REACTION_REMOVED]: 'onReactionRemoved',
  [CommunicationEventType.PRESENCE_CHANGED]: 'onPresenceChanged',
  [CommunicationEventType.MEMBER_JOINED]: 'onMemberJoined',
  [CommunicationEventType.MEMBER_LEFT]: 'onMemberLeft',
  [CommunicationEventType.SERVER_CHANNEL_CREATED]: 'onServerChannelCreated',
  [CommunicationEventType.SERVER_CHANNEL_DELETED]: 'onServerChannelDeleted',
  [CommunicationEventType.SERVER_MEMBER_JOINED]: 'onServerMemberJoined',
  [CommunicationEventType.SERVER_MEMBER_REMOVED]: 'onServerMemberRemoved',
  [CommunicationEventType.KEY_ROTATED]: 'onKeyRotated',
};

// ─── Reconnection constants ─────────────────────────────────────────────────

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

// ─── React hook ─────────────────────────────────────────────────────────────

/**
 * Subscribes to BrightChat WebSocket events and dispatches to the provided
 * handlers. Manages connection lifecycle and reconnection with exponential
 * backoff.
 *
 * @param wsUrl - WebSocket URL to connect to, or null to skip connection
 * @param handlers - Callback handlers for each event type
 */
export function useChatWebSocket(
  wsUrl: string | null,
  handlers: ChatWebSocketHandlers,
): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const handlersRef = useRef(handlers);

  // Keep handlers ref current to avoid stale closures
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!wsUrl) return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Reset backoff on successful connection
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;

          const handlerKey = EVENT_HANDLER_MAP[type];
          if (handlerKey) {
            // Validate KEY_ROTATED event data before dispatching
            if (type === CommunicationEventType.KEY_ROTATED) {
              if (
                !data ||
                typeof data.reason !== 'string' ||
                (typeof data.timestamp !== 'string' &&
                  !(data.timestamp instanceof Date)) ||
                typeof data.newEpoch !== 'number' ||
                typeof data.contextId !== 'string' ||
                typeof data.contextType !== 'string'
              ) {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn(
                    '[useChatWebSocket] Malformed KEY_ROTATED event data:',
                    data,
                  );
                }
                return;
              }
            }

            const handler = handlersRef.current[handlerKey];
            if (handler) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (handler as (d: any) => void)(data);
            }
          }
        } catch (err) {
          // Silently log malformed payloads — do not crash
          console.warn('[useChatWebSocket] Malformed event payload:', err);
        }
      };

      ws.onclose = () => {
        // Attempt reconnection with exponential backoff
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        // Close will fire after error, triggering reconnection
        ws.close();
      };
    } catch (err) {
      console.warn('[useChatWebSocket] Connection error:', err);
    }
  }, [wsUrl]);

  useEffect(() => {
    connect();

    return () => {
      // Clean up on unmount
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnection on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
