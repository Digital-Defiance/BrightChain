/**
 * MessageThreadView — Shared message thread component for conversations,
 * groups, and channels. Displays messages chronologically with cursor-based
 * pagination, real-time WebSocket updates, typing indicators, and
 * context-specific actions.
 *
 * Requirements: 3.2, 4.3, 5.3, 6.4, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6,
 *              11.4, 11.5, 11.6
 */

import type {
  ICommunicationMessage,
  IKeyRotationEvent,
  IPaginatedResult,
  IReaction,
} from '@brightchain/brightchain-lib';
import { BrightDateDisplayMode, brightDateNow, brightDateToDate, dateToBrightDate, formatDateByMode } from '@brightchain/brightchain-lib';
import { useAuth } from '@digitaldefiance/express-suite-react-components';
import PushPinIcon from '@mui/icons-material/PushPin';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Skeleton,
  Typography,
} from '@mui/material';
import {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';

import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import ComposeArea from './ComposeArea';
import EncryptionBanner from './EncryptionBanner';
import KeyRotationNotice from './KeyRotationNotice';
import { useChatApi } from './hooks/useChatApi';
import {
  applyKeyRotation,
  applyMessageDeleted,
  applyMessageEdited,
  applyMessageSent,
  applyReactionAdded,
  applyReactionRemoved,
  applyTypingStart,
  applyTypingStop,
  KeyRotationNoticeItem,
  ThreadItem,
  useChatWebSocket,
} from './hooks/useChatWebSocket';
import { useUserNames } from './hooks/useUserNames';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MessageThreadViewProps {
  contextType: 'conversation' | 'group' | 'channel';
}

const PAGE_SIZE = 20;

/** Route param key per context type. */
const PARAM_KEY_MAP: Record<MessageThreadViewProps['contextType'], string> = {
  conversation: 'conversationId',
  group: 'groupId',
  channel: 'channelId',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a BrightDateTimestamp (number), Date, or date-string into a short human-readable timestamp with BrightDate support. */
function formatTimestamp(date: number | Date | string, mode: BrightDateDisplayMode = BrightDateDisplayMode.Dual): string {
  const d = typeof date === 'number' ? brightDateToDate(date) : typeof date === 'string' ? new Date(date) : date;
  const bdValue = typeof date === 'number' ? date : dateToBrightDate(d);
  const nowBd = brightDateNow();
  const diffDays = Math.floor(nowBd - bdValue);

  if (diffDays === 0) {
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatDateByMode(d, timeStr, mode, 3);
  }
  if (diffDays === 1) {
    return formatDateByMode(d, 'Yesterday', mode, 3);
  }
  if (diffDays < 7) {
    const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
    return formatDateByMode(d, dayStr, mode, 3);
  }
  const localeStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return formatDateByMode(d, localeStr, mode, 3);
}

/** Group reactions by emoji with count. */
function groupReactions(
  reactions: IReaction[],
): Array<{ emoji: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
}

/**
 * Sort messages by createdAt ascending (chronological order).
 * createdAt is a BrightDateTimestamp (number) — direct numeric comparison.
 * Exported for property-based testing.
 */
export function sortMessagesChronologically(
  messages: ICommunicationMessage[],
): ICommunicationMessage[] {
  return [...messages].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Sort thread items (messages + key rotation notices) chronologically.
 * Messages use BrightDateTimestamp (number); notices use ISO string timestamp.
 */
function getItemTimestamp(item: ThreadItem): number {
  if (item.type === 'key_rotation') {
    // Key rotation notices carry an ISO string — convert to BrightDate for comparison
    return dateToBrightDate(new Date(item.timestamp));
  }
  return (item as ICommunicationMessage).createdAt;
}

function sortThreadItemsChronologically(items: ThreadItem[]): ThreadItem[] {
  return [...items].sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));
}

// ─── State ──────────────────────────────────────────────────────────────────

interface ThreadState {
  items: ThreadItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  cursor: string | undefined;
  hasMore: boolean;
}

const INITIAL_STATE: ThreadState = {
  items: [],
  loading: true,
  loadingMore: false,
  error: null,
  cursor: undefined,
  hasMore: false,
};

// ─── Component ──────────────────────────────────────────────────────────────

const MessageThreadView: FC<MessageThreadViewProps> = ({ contextType }) => {
  const params = useParams();
  const chatApi = useChatApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();

  const contextId = params[PARAM_KEY_MAP[contextType]] ?? '';

  const [state, setState] = useState<ThreadState>(INITIAL_STATE);
  const [typingMembers, setTypingMembers] = useState<Set<string>>(
    new Set<string>(),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── User display name resolution ──────────────────────────────
  // Collect unique sender IDs from loaded messages for batch resolution.
  const senderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of state.items) {
      if (
        item.type !== 'key_rotation' &&
        (item as ICommunicationMessage).senderId
      ) {
        ids.add(String((item as ICommunicationMessage).senderId));
      }
    }
    return Array.from(ids);
  }, [state.items]);

  const resolvedNames = useUserNames(senderIds);

  // Merge resolved names with the current user's info
  const userNames = useMemo(() => {
    const merged = new Map(resolvedNames);
    if (userData?.id) {
      merged.set(userData.id, userData.displayName || userData.username);
    }
    return merged;
  }, [resolvedNames, userData]);

  /** Resolve a senderId to a display name, falling back to a truncated ID. */
  const getSenderName = useCallback(
    (senderId: string | unknown): string => {
      const id = String(senderId);
      const cached = userNames.get(id);
      if (cached) return cached;
      // Truncate long hex IDs for readability
      if (id.length > 16) return `${id.slice(0, 8)}…`;
      return id;
    },
    [userNames],
  );

  // ─── Handle message sent from ComposeArea ──────────────────────
  const handleMessageSent = useCallback((msg: ICommunicationMessage) => {
    setState((prev) => {
      const messages = prev.items.filter(
        (i) => i.type !== 'key_rotation',
      ) as ICommunicationMessage[];
      const notices = prev.items.filter(
        (i) => i.type === 'key_rotation',
      ) as KeyRotationNoticeItem[];
      const updatedMessages = sortMessagesChronologically(
        applyMessageSent(messages, msg),
      );
      const merged: ThreadItem[] = [...updatedMessages, ...notices];
      return {
        ...prev,
        items: sortThreadItemsChronologically(merged),
      };
    });
    // Auto-scroll to bottom after sending
    setTimeout(() => {
      const container = scrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }, []);

  // ─── Fetch messages ─────────────────────────────────────────────

  const fetchMessages = useCallback(
    async (cursor?: string, append = false) => {
      if (!contextId) return;

      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      try {
        let result: IPaginatedResult<ICommunicationMessage>;

        switch (contextType) {
          case 'conversation':
            result = await chatApi.getConversationMessages(contextId, {
              cursor,
              limit: PAGE_SIZE,
            });
            break;
          case 'group':
            result = await chatApi.getGroupMessages(contextId, {
              cursor,
              limit: PAGE_SIZE,
            });
            break;
          case 'channel':
            result = await chatApi.getChannelMessages(contextId, {
              cursor,
              limit: PAGE_SIZE,
            });
            break;
        }

        setState((prev) => {
          const existingNotices = prev.items.filter(
            (i) => i.type === 'key_rotation',
          ) as KeyRotationNoticeItem[];
          const merged = append
            ? [
                ...(prev.items.filter(
                  (i) => i.type !== 'key_rotation',
                ) as ICommunicationMessage[]),
                ...result.items,
              ]
            : result.items;

          const sortedMessages = sortMessagesChronologically(merged);
          const allItems: ThreadItem[] = [
            ...sortedMessages,
            ...existingNotices,
          ];

          return {
            ...prev,
            items: sortThreadItemsChronologically(allItems),
            cursor: result.cursor,
            hasMore: result.hasMore,
            loading: false,
            loadingMore: false,
          };
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [chatApi, contextId, contextType],
  );

  // ─── Initial fetch ──────────────────────────────────────────────

  useEffect(() => {
    setState(INITIAL_STATE);
    setTypingMembers(new Set<string>());
    fetchMessages();
  }, [contextId, contextType, fetchMessages]);

  // ─── Scroll-based pagination (load older messages) ──────────────

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Load older messages when scrolled near the top
      if (
        container.scrollTop < 100 &&
        state.hasMore &&
        !state.loadingMore &&
        !state.loading
      ) {
        fetchMessages(state.cursor, true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [
    state.hasMore,
    state.loadingMore,
    state.loading,
    state.cursor,
    fetchMessages,
  ]);

  // ─── WebSocket real-time handlers ───────────────────────────────

  const wsHandlers = useMemo(
    () => ({
      onMessageSent: (msg: ICommunicationMessage) => {
        if (msg.contextId === contextId) {
          setState((prev) => {
            const messages = prev.items.filter(
              (i) => i.type !== 'key_rotation',
            ) as ICommunicationMessage[];
            const notices = prev.items.filter(
              (i) => i.type === 'key_rotation',
            ) as KeyRotationNoticeItem[];
            const updatedMessages = sortMessagesChronologically(
              applyMessageSent(messages, msg),
            );
            const merged: ThreadItem[] = [...updatedMessages, ...notices];
            return {
              ...prev,
              items: sortThreadItemsChronologically(merged),
            };
          });
        }
      },
      onMessageEdited: (msg: ICommunicationMessage) => {
        if (msg.contextId === contextId) {
          setState((prev) => {
            const messages = prev.items.filter(
              (i) => i.type !== 'key_rotation',
            ) as ICommunicationMessage[];
            const notices = prev.items.filter(
              (i) => i.type === 'key_rotation',
            ) as KeyRotationNoticeItem[];
            const updatedMessages = applyMessageEdited(messages, msg);
            const merged: ThreadItem[] = [...updatedMessages, ...notices];
            return {
              ...prev,
              items: sortThreadItemsChronologically(merged),
            };
          });
        }
      },
      onMessageDeleted: (data: { messageId: string; contextId: string }) => {
        if (data.contextId === contextId) {
          setState((prev) => {
            const messages = prev.items.filter(
              (i) => i.type !== 'key_rotation',
            ) as ICommunicationMessage[];
            const notices = prev.items.filter(
              (i) => i.type === 'key_rotation',
            ) as KeyRotationNoticeItem[];
            const updatedMessages = applyMessageDeleted(
              messages,
              data.messageId,
            );
            const merged: ThreadItem[] = [...updatedMessages, ...notices];
            return {
              ...prev,
              items: sortThreadItemsChronologically(merged),
            };
          });
        }
      },
      onTypingStart: (data: { memberId: string; contextId: string }) => {
        if (data.contextId === contextId) {
          setTypingMembers((prev) => applyTypingStart(prev, data.memberId));
        }
      },
      onTypingStop: (data: { memberId: string; contextId: string }) => {
        if (data.contextId === contextId) {
          setTypingMembers((prev) => applyTypingStop(prev, data.memberId));
        }
      },
      onReactionAdded: (data: { messageId: string; reaction: IReaction }) => {
        setState((prev) => {
          const messages = prev.items.filter(
            (i) => i.type !== 'key_rotation',
          ) as ICommunicationMessage[];
          const notices = prev.items.filter(
            (i) => i.type === 'key_rotation',
          ) as KeyRotationNoticeItem[];
          const updatedMessages = applyReactionAdded(
            messages,
            data.messageId,
            data.reaction,
          );
          const merged: ThreadItem[] = [...updatedMessages, ...notices];
          return {
            ...prev,
            items: sortThreadItemsChronologically(merged),
          };
        });
      },
      onReactionRemoved: (data: { messageId: string; reactionId: string }) => {
        setState((prev) => {
          const messages = prev.items.filter(
            (i) => i.type !== 'key_rotation',
          ) as ICommunicationMessage[];
          const notices = prev.items.filter(
            (i) => i.type === 'key_rotation',
          ) as KeyRotationNoticeItem[];
          const updatedMessages = applyReactionRemoved(
            messages,
            data.messageId,
            data.reactionId,
          );
          const merged: ThreadItem[] = [...updatedMessages, ...notices];
          return {
            ...prev,
            items: sortThreadItemsChronologically(merged),
          };
        });
      },
      onKeyRotated: (event: IKeyRotationEvent) => {
        if (event.contextId === contextId) {
          const notice: KeyRotationNoticeItem = {
            type: 'key_rotation',
            reason: event.reason,
            timestamp:
              typeof event.timestamp === 'number'
                ? brightDateToDate(event.timestamp).toISOString()
                : typeof event.timestamp === 'string'
                  ? event.timestamp
                  : new Date().toISOString(),
            epoch: event.newEpoch,
          };
          setState((prev) => ({
            ...prev,
            items: applyKeyRotation(prev.items, notice),
          }));
        }
      },
    }),
    [contextId],
  );

  useChatWebSocket(null, wsHandlers);

  // ─── Render: Loading ────────────────────────────────────────────

  if (state.loading) {
    return (
      <Box data-testid="message-thread-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={64} sx={{ my: 1 }} />
        ))}
      </Box>
    );
  }

  // ─── Render: Error ──────────────────────────────────────────────

  if (state.error) {
    return (
      <Box data-testid="message-thread-error">
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      </Box>
    );
  }

  // ─── Render: Empty ──────────────────────────────────────────────

  if (state.items.length === 0) {
    return (
      <Box
        data-testid="message-thread-empty"
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <EncryptionBanner />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {t(BrightChatStrings.MessageThread_Empty)}
          </Typography>
        </Box>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <ComposeArea
            contextType={contextType}
            contextId={contextId}
            onMessageSent={handleMessageSent}
          />
        </Box>
      </Box>
    );
  }

  // ─── Render: Message thread ─────────────────────────────────────

  const typingArray = Array.from(typingMembers);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Older messages loading indicator */}
      {state.loadingMore && (
        <Box display="flex" justifyContent="center" py={1}>
          <CircularProgress size={20} />
        </Box>
      )}

      <EncryptionBanner />

      {/* Scrollable message area */}
      <Box
        ref={scrollRef}
        sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}
        data-testid="message-thread-scroll"
      >
        {state.items.map((item) => {
          // Render key rotation notices
          if (item.type === 'key_rotation') {
            return (
              <KeyRotationNotice
                key={`key-rotation-${item.epoch}-${item.timestamp}`}
                reason={item.reason}
                timestamp={item.timestamp}
              />
            );
          }

          // Render regular messages
          const message = item as ICommunicationMessage;
          const grouped = groupReactions(message.reactions);

          return (
            <Box
              key={String(message.id)}
              data-testid={`message-bubble-${message.id}`}
              sx={{
                mb: 1.5,
                p: 1.5,
                borderRadius: 1,
                bgcolor: message.pinned
                  ? 'action.selected'
                  : 'background.paper',
                border: message.pinned ? '1px solid' : undefined,
                borderColor: message.pinned ? 'warning.light' : undefined,
              }}
              className={message.pinned ? 'message-pinned' : undefined}
            >
              {/* Header: sender + timestamp + indicators */}
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography
                  variant="subtitle2"
                  data-testid={`message-sender-${message.id}`}
                >
                  {getSenderName(message.senderId)}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  data-testid={`message-timestamp-${message.id}`}
                >
                  {formatTimestamp(message.createdAt)}
                </Typography>

                {message.editedAt && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontStyle="italic"
                    data-testid={`message-edited-${message.id}`}
                  >
                    {t(BrightChatStrings.MessageThread_Edited)}
                  </Typography>
                )}

                {message.pinned && (
                  <PushPinIcon
                    fontSize="small"
                    color="warning"
                    data-testid={`message-pin-${message.id}`}
                    aria-label={t(BrightChatStrings.MessageThread_Pinned)}
                  />
                )}
              </Box>

              {/* Message content */}
              <Typography
                variant="body1"
                data-testid={`message-content-${message.id}`}
              >
                {String(message.encryptedContent)}
              </Typography>

              {/* Reactions */}
              {grouped.length > 0 && (
                <Box
                  display="flex"
                  gap={0.5}
                  mt={0.5}
                  flexWrap="wrap"
                  data-testid={`message-reactions-${message.id}`}
                >
                  {grouped.map(({ emoji, count }) => (
                    <Chip
                      key={emoji}
                      label={`${emoji} ${count}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Typing indicators */}
      {typingArray.length > 0 && (
        <Box px={2} py={0.5} data-testid="typing-indicators">
          <Typography
            variant="caption"
            color="text.secondary"
            fontStyle="italic"
          >
            {typingArray.length === 1
              ? `${typingArray[0]} ${t(BrightChatStrings.MessageThread_TypingSingle)}`
              : `${typingArray.join(', ')} ${t(BrightChatStrings.MessageThread_TypingMultiple)}`}
          </Typography>
        </Box>
      )}

      {/* Compose area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <ComposeArea
          contextType={contextType}
          contextId={contextId}
          onMessageSent={handleMessageSent}
        />
      </Box>
    </Box>
  );
};

export default memo(MessageThreadView);
