/**
 * GroupListView — Displays the member's group chats sorted by most recent
 * activity with cursor-based infinite scrolling.
 *
 * Requirements: 4.1, 11.2
 */

import type { IGroup, IPaginatedResult } from '@brightchain/brightchain-lib';
import { brightDateNow, brightDateToDate, dateToBrightDate } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useChatApi } from './hooks/useChatApi';

const PAGE_SIZE = 20;

interface GroupListState {
  groups: IGroup[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  cursor: string | undefined;
  hasMore: boolean;
}

const INITIAL_STATE: GroupListState = {
  groups: [],
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const GroupListView: FC = () => {
  const chatApi = useChatApi();
  const navigate = useNavigate();
  const { tBranded: t } = useI18n();

  const [state, setState] = useState<GroupListState>(INITIAL_STATE);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Fetch groups ─────────────────────────────────────────────────
  const fetchGroups = useCallback(
    async (cursor?: string, append = false) => {
      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      try {
        const result: IPaginatedResult<IGroup> = await chatApi.listGroups({
          cursor,
          limit: PAGE_SIZE,
        });

        setState((prev) => {
          const merged = append
            ? [...prev.groups, ...result.items]
            : result.items;

          // Sort by lastMessageAt descending (most recent first)
          const sorted = [...merged].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

          return {
            ...prev,
            groups: sorted,
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
    fetchGroups();
  }, [fetchGroups]);

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
        fetchGroups(state.cursor, true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [
    state.hasMore,
    state.loadingMore,
    state.loading,
    state.cursor,
    fetchGroups,
  ]);

  // ─── Click handler ────────────────────────────────────────────────
  const handleGroupClick = useCallback(
    (groupId: string) => {
      navigate(`/brightchat/group/${encodeURIComponent(groupId)}`);
    },
    [navigate],
  );

  // ─── Render: Loading ──────────────────────────────────────────────
  if (state.loading) {
    return (
      <Box data-testid="group-list-loading">
        <Typography variant="h6">
          {t(BrightChatStrings.GroupList_Title)}
        </Typography>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={56} sx={{ my: 1 }} />
        ))}
      </Box>
    );
  }

  // ─── Render: Error ────────────────────────────────────────────────
  if (state.error) {
    return (
      <Box data-testid="group-list-error">
        <Typography variant="h6">
          {t(BrightChatStrings.GroupList_Title)}
        </Typography>
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      </Box>
    );
  }

  // ─── Render: Empty ────────────────────────────────────────────────
  if (state.groups.length === 0) {
    return (
      <Box data-testid="group-list-empty">
        <Typography variant="h6">
          {t(BrightChatStrings.GroupList_Title)}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {t(BrightChatStrings.GroupList_Empty)}
        </Typography>
      </Box>
    );
  }

  // ─── Render: Group list ───────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t(BrightChatStrings.GroupList_Title)}
      </Typography>

      <Box
        ref={scrollRef}
        sx={{ maxHeight: '70vh', overflowY: 'auto' }}
        data-testid="group-list-scroll"
      >
        <List disablePadding>
          {state.groups.map((group) => (
            <ListItemButton
              key={String(group.id)}
              onClick={() => handleGroupClick(String(group.id))}
              data-testid={`group-row-${group.id}`}
            >
              <ListItemText
                primary={group.name}
                secondary={`${group.members.length} ${t(BrightChatStrings.GroupList_MemberCount)}`}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap', ml: 1 }}
              >
                {formatTimestamp(group.lastMessageAt)}
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

export default memo(GroupListView);
