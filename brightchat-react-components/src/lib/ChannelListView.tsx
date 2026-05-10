/**
 * ChannelListView — Displays discoverable channels (public + private visibility)
 * sorted by most recent activity with cursor-based infinite scrolling.
 * Provides a "Join" action for channels.
 *
 * Requirements: 5.1, 5.2, 11.3
 */

import type { IChannel, IPaginatedResult } from '@brightchain/brightchain-lib';
import { brightDateNow, brightDateToDate, dateToBrightDate, ChannelVisibility, toBrightDateString } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import React from 'react';
import { useChatApi } from './hooks/useChatApi';

const PAGE_SIZE = 20;

interface ChannelListState {
  channels: IChannel[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  cursor: string | undefined;
  hasMore: boolean;
  joiningId: string | null;
}

const INITIAL_STATE: ChannelListState = {
  channels: [],
  loading: true,
  loadingMore: false,
  error: null,
  cursor: undefined,
  hasMore: false,
  joiningId: null,
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

const ChannelListView: FC = () => {
  const chatApi = useChatApi();
  const navigate = useNavigate();
  const { tBranded: t } = useI18n();

  const [state, setState] = useState<ChannelListState>(INITIAL_STATE);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Fetch channels ───────────────────────────────────────────────
  const fetchChannels = useCallback(
    async (cursor?: string, append = false) => {
      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      try {
        const result: IPaginatedResult<IChannel> = await chatApi.listChannels({
          cursor,
          limit: PAGE_SIZE,
        });

        // Filter to only discoverable channels (public + private)
        const discoverable = result.items.filter(
          (ch) =>
            ch.visibility === ChannelVisibility.PUBLIC ||
            ch.visibility === ChannelVisibility.PRIVATE,
        );

        setState((prev) => {
          const merged = append
            ? [...prev.channels, ...discoverable]
            : discoverable;

          // Sort by lastMessageAt descending (most recent first)
          const sorted = [...merged].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

          return {
            ...prev,
            channels: sorted,
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
    fetchChannels();
  }, [fetchChannels]);

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
        fetchChannels(state.cursor, true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [
    state.hasMore,
    state.loadingMore,
    state.loading,
    state.cursor,
    fetchChannels,
  ]);

  // ─── Click handler ────────────────────────────────────────────────
  const handleChannelClick = useCallback(
    (channelId: string) => {
      navigate(`/brightchat/channel/${encodeURIComponent(channelId)}`);
    },
    [navigate],
  );

  // ─── Join handler ─────────────────────────────────────────────────
  const handleJoin = useCallback(
    async (e: React.MouseEvent, channelId: string) => {
      e.stopPropagation();
      setState((prev) => ({ ...prev, joiningId: channelId }));
      try {
        await chatApi.joinChannel(channelId);
        // Refresh the list after joining
        await fetchChannels();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          joiningId: null,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [chatApi, fetchChannels],
  );

  // ─── Render: Loading ──────────────────────────────────────────────
  if (state.loading) {
    return (
      <Box data-testid="channel-list-loading">
        <Typography variant="h6">
          {t(BrightChatStrings.ChannelList_Title)}
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
      <Box data-testid="channel-list-error">
        <Typography variant="h6">
          {t(BrightChatStrings.ChannelList_Title)}
        </Typography>
        <Alert severity="error" role="alert">
          {state.error}
        </Alert>
      </Box>
    );
  }

  // ─── Render: Empty ────────────────────────────────────────────────
  if (state.channels.length === 0) {
    return (
      <Box data-testid="channel-list-empty">
        <Typography variant="h6">
          {t(BrightChatStrings.ChannelList_Title)}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {t(BrightChatStrings.ChannelList_Empty)}
        </Typography>
      </Box>
    );
  }

  // ─── Render: Channel list ─────────────────────────────────────────
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t(BrightChatStrings.ChannelList_Title)}
      </Typography>

      <Box
        ref={scrollRef}
        sx={{ maxHeight: '70vh', overflowY: 'auto' }}
        data-testid="channel-list-scroll"
      >
        <List disablePadding>
          {state.channels.map((channel) => (
            <ListItemButton
              key={String(channel.id)}
              onClick={() => handleChannelClick(String(channel.id))}
              data-testid={`channel-row-${channel.id}`}
            >
              <ListItemText
                primary={channel.name}
                secondary={
                  <>
                    {channel.topic ? truncate(channel.topic) : null}
                    {channel.topic ? ' · ' : ''}
                    {channel.members.length}{' '}
                    {t(BrightChatStrings.ChannelList_MemberCount)}
                  </>
                }
              />
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {formatTimestamp(channel.lastMessageAt)}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={state.joiningId === String(channel.id)}
                  onClick={(e) => handleJoin(e, String(channel.id))}
                  data-testid={`join-channel-${channel.id}`}
                >
                  {state.joiningId === String(channel.id)
                    ? t(BrightChatStrings.ChannelList_Joining)
                    : t(BrightChatStrings.ChannelList_Join)}
                </Button>
              </Box>
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

export default memo(ChannelListView);
