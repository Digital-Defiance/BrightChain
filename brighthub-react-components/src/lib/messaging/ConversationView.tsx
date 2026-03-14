/**
 * ConversationView Component
 *
 * Displays a message thread with real-time updates and send support.
 *
 * @remarks
 * Implements Requirements 44.2, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import type { IBaseDirectMessage } from '@brightchain/brighthub-lib';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import type { AggregatedReaction } from './MessageReactions';
import { TypingIndicator } from './TypingIndicator';

/** Props for the ConversationView component */
export interface ConversationViewProps {
  /** Messages in the conversation */
  messages: IBaseDirectMessage<string>[];
  /** Current user's ID */
  currentUserId: string;
  /** Whether messages are loading */
  loading?: boolean;
  /** Whether there are more messages to load */
  hasMore?: boolean;
  /** Callback to load older messages */
  onLoadMore?: () => void;
  /** Callback when a message is sent */
  onSend: (content: string, attachments?: File[]) => void;
  /** Users currently typing */
  typingUsers?: string[];
  /** Reactions per message ID */
  reactionsMap?: Record<string, AggregatedReaction[]>;
  /** Callback when a reaction is toggled */
  onToggleReaction?: (messageId: string, emoji: string) => void;
  /** Callback to open reaction picker for a message */
  onAddReaction?: (messageId: string) => void;
}

/**
 * ConversationView
 *
 * Full conversation thread with message bubbles, composer, and typing indicator.
 */
export function ConversationView({
  messages,
  currentUserId,
  loading = false,
  hasMore = false,
  onLoadMore,
  onSend,
  typingUsers = [],
  reactionsMap = {},
  onToggleReaction,
  onAddReaction,
}: ConversationViewProps) {
  const { t } = useBrightHubTranslation();

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      aria-label={t(BrightHubStrings.ConversationView_AriaLabel)}
    >
      {/* Messages area */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress
              size={24}
              aria-label={t(BrightHubStrings.ConversationView_Loading)}
            />
          </Box>
        )}

        {hasMore && !loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <Button size="small" onClick={onLoadMore}>
              {t(BrightHubStrings.ConversationView_LoadMore)}
            </Button>
          </Box>
        )}

        {!loading && messages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
            <Typography variant="body1" color="text.secondary">
              {t(BrightHubStrings.ConversationView_EmptyState)}
            </Typography>
          </Box>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            reactions={reactionsMap[msg._id]}
            onToggleReaction={
              onToggleReaction
                ? (emoji) => onToggleReaction(msg._id, emoji)
                : undefined
            }
            onAddReaction={
              onAddReaction ? () => onAddReaction(msg._id) : undefined
            }
          />
        ))}

        <TypingIndicator typingUsers={typingUsers} />
      </Box>

      {/* Composer */}
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <MessageComposer onSend={onSend} />
      </Box>
    </Box>
  );
}

export default ConversationView;
