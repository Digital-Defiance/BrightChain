/**
 * ConversationListView — Displays the member's direct message conversations
 * sorted by most recent activity with cursor-based infinite scrolling.
 *
 * Requirements: 3.1, 3.2, 11.1
 */

import type {
  IChannel,
  IConversation,
  IPaginatedResult,
} from '@brightchain/brightchain-lib';
import { brightDateNow, brightDateToDate, dateToBrightDate, toBrightDateString } from '@brightchain/brightchain-lib';
import { useAuth } from '@digitaldefiance/express-suite-react-components';
import AddIcon from '@mui/icons-material/Add';
import TagIcon from '@mui/icons-material/Tag';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
import { useNavigate, useOutletContext } from 'react-router-dom';

import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import type { BrightChatOutletContext } from './BrightChatApp';
import { useChatApi } from './hooks/useChatApi';
import { useUserNames } from './hooks/useUserNames';

/**
 * Safely retrieve the BrightChat outlet context.
 * Returns undefined when rendered outside an Outlet (e.g. in tests).
 */
function useBrightChatOutletContext(): BrightChatOutletContext | undefined {
  try {
    return useOutletContext<BrightChatOutletContext | undefined>();
  } catch {
    return undefined;
  }
}

const PAGE_SIZE = 20;

interface ConversationListState {
  conversations: IConversation[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  cursor: string | undefined;
  hasMore: boolean;
}

const INITIAL_STATE: ConversationListState = {
  conversations: [],
  loading: true,
  loadingMore: false,
  error: null,
  cursor: undefined,
  hasMore: false,
};

/**
 * Format a BrightDateTimestamp (number), Date, or date-string into a short human-readable timestamp.
 */
function formatTimestamp(date: number | Date | string): string {
  const d = typeof date === 'number' ? brightDateToDate(date) : typeof date === 'string' ? new Date(date) : date;
  const bdValue = typeof date === 'number' ? date : dateToBrightDate(d);
  const nowBd = brightDateNow();
  const diffDays = Math.floor(nowBd - bdValue);

  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  const localeStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const bd = toBrightDateString(d, 3);
  return bd ? `${localeStr} (BD ${bd})` : localeStr;
}

/**
 * Truncate a string to a maximum length, appending ellipsis if needed.
 */
function truncate(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Get the other participant's ID from a conversation.
 */
function getOtherParticipantId(
  conversation: IConversation,
  currentUserId?: string,
): string {
  const [first, second] = conversation.participants;
  const otherId = currentUserId
    ? first === currentUserId
      ? second
      : first
    : first;
  return otherId || first || second || 'Unknown';
}

export interface ConversationListViewProps {
  onNewMessage?: () => void;
}

const ConversationListView: FC<ConversationListViewProps> = ({
  onNewMessage,
}) => {
  const chatApi = useChatApi();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const outletContext = useBrightChatOutletContext();
  const { tBranded: t } = useI18n();

  const handleNewMessage = useCallback(() => {
    if (onNewMessage) {
      onNewMessage();
    } else if (outletContext?.onNewMessage) {
      outletContext.onNewMessage();
    } else {
      navigate('/brightchat/conversation/new');
    }
  }, [onNewMessage, outletContext, navigate]);

  const [state, setState] = useState<ConversationListState>(INITIAL_STATE);
  const [recentChannels, setRecentChannels] = useState<IChannel[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Resolve participant display names ────────────────────────
  const participantIds = useMemo(
    () =>
      state.conversations.map((conv) =>
        getOtherParticipantId(conv, userData?.id),
      ),
    [state.conversations, userData?.id],
  );
  const userNames = useUserNames(participantIds);

  // ─── Fetch conversations ──────────────────────────────────────────
  const fetchConversations = useCallback(
    async (cursor?: string, append = false) => {
      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      try {
        const result: IPaginatedResult<IConversation> =
          await chatApi.listConversations({ cursor, limit: PAGE_SIZE });

        setState((prev) => {
          const merged = append
            ? [...prev.conversations, ...result.items]
            : result.items;

          // Sort by lastMessageAt descending (most recent first)
          const sorted = [...merged].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

          return {
            ...prev,
            conversations: sorted,
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
    [chatApi],
  );

  // ─── Initial fetch on mount ───────────────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Fetch recent channels for the home view ─────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await chatApi.listChannels({ limit: 10 });
        if (!cancelled) {
          setRecentChannels(result.items ?? []);
        }
      } catch {
        // Silently handle — empty channel list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatApi]);

  // ─── Scroll-based infinite loading ────────────────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      if (
        scrollHeight - scrollTop - clientHeight < 100 &&
        state.hasMore &&
        !state.loadingMore &&
        !state.loading
      ) {
        fetchConversations(state.cursor, true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [
    state.hasMore,
    state.loadingMore,
    state.loading,
    state.cursor,
    fetchConversations,
  ]);

  // ─── Click handler ────────────────────────────────────────────────
  const handleConversationClick = useCallback(
    (conversationId: string) => {
      navigate(
        `/brightchat/conversation/${encodeURIComponent(conversationId)}`,
      );
    },
    [navigate],
  );

  // ─── Render: Loading ──────────────────────────────────────────────
  if (state.loading) {
    return (
      <Box data-testid="conversation-list-loading" sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t(BrightChatStrings.ConversationList_Title)}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleNewMessage}
          >
            {t(BrightChatStrings.ConversationList_NewMessage)}
          </Button>
        </Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={56} sx={{ my: 1 }} />
        ))}
      </Box>
    );
  }

  // ─── Render: Error ────────────────────────────────────────────────
  if (state.error) {
    return (
      <Box data-testid="conversation-list-error" sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t(BrightChatStrings.ConversationList_Title)}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleNewMessage}
          >
            {t(BrightChatStrings.ConversationList_NewMessage)}
          </Button>
        </Box>
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      </Box>
    );
  }

  // ─── Render: Empty ────────────────────────────────────────────────
  if (state.conversations.length === 0) {
    return (
      <Box data-testid="conversation-list-empty" sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t(BrightChatStrings.ConversationList_Title)}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleNewMessage}
          >
            {t(BrightChatStrings.ConversationList_NewMessage)}
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {t(BrightChatStrings.ConversationList_Empty)}
        </Typography>

        {/* Show recent channels when there are no DM conversations */}
        {recentChannels.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t(BrightChatStrings.ConversationList_RecentChannels)}
            </Typography>
            <List disablePadding>
              {recentChannels.map((channel) => (
                <ListItemButton
                  key={String(channel.id)}
                  onClick={() =>
                    navigate(
                      `/brightchat/channel/${encodeURIComponent(String(channel.id))}`,
                    )
                  }
                  data-testid={`channel-row-${channel.id}`}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <TagIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={channel.name}
                    secondary={channel.topic || undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}
      </Box>
    );
  }

  // ─── Render: Conversation list ────────────────────────────────────
  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="h6">
          {t(BrightChatStrings.ConversationList_Title)}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleNewMessage}
        >
          {t(BrightChatStrings.ConversationList_NewMessage)}
        </Button>
      </Box>

      <Box
        ref={scrollRef}
        sx={{ maxHeight: '70vh', overflowY: 'auto' }}
        data-testid="conversation-list-scroll"
      >
        <List disablePadding>
          {state.conversations.map((conversation) => (
            <ListItemButton
              key={String(conversation.id)}
              onClick={() => handleConversationClick(String(conversation.id))}
              data-testid={`conversation-row-${conversation.id}`}
            >
              <ListItemText
                primary={(() => {
                  const otherId = getOtherParticipantId(
                    conversation,
                    userData?.id,
                  );
                  return (
                    userNames.get(otherId) ??
                    (otherId.length > 16 ? `${otherId.slice(0, 8)}…` : otherId)
                  );
                })()}
                secondary={
                  conversation.lastMessagePreview
                    ? truncate(conversation.lastMessagePreview)
                    : undefined
                }
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap', ml: 1 }}
              >
                {formatTimestamp(conversation.lastMessageAt)}
              </Typography>
            </ListItemButton>
          ))}
        </List>

        {state.loadingMore && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default memo(ConversationListView);
