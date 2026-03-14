/**
 * MessageBubble Component
 *
 * Displays an individual message with reactions, edited/forwarded indicators.
 *
 * @remarks
 * Implements Requirements 44.5, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import type { IBaseDirectMessage } from '@brightchain/brighthub-lib';
import { Forward } from '@mui/icons-material';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import type { AggregatedReaction } from './MessageReactions';
import { MessageReactions } from './MessageReactions';

/** Props for the MessageBubble component */
export interface MessageBubbleProps {
  /** The message to display */
  message: IBaseDirectMessage<string>;
  /** Whether this message was sent by the current user */
  isOwn: boolean;
  /** Aggregated reactions on this message */
  reactions?: AggregatedReaction[];
  /** Callback when a reaction is toggled */
  onToggleReaction?: (emoji: string) => void;
  /** Callback to open the reaction picker */
  onAddReaction?: () => void;
  /** Callback when reply is clicked */
  onReply?: () => void;
  /** Preview text of the message being replied to */
  replyPreview?: string;
}

/**
 * MessageBubble
 *
 * Chat bubble with alignment based on sender, plus metadata indicators.
 */
export function MessageBubble({
  message,
  isOwn,
  reactions = [],
  onToggleReaction,
  onAddReaction,
  onReply,
  replyPreview,
}: MessageBubbleProps) {
  const { t } = useBrightHubTranslation();

  if (message.isDeleted) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: isOwn ? 'flex-end' : 'flex-start',
          mb: 1,
          px: 2,
        }}
      >
        <Typography
          variant="body2"
          color="text.disabled"
          fontStyle="italic"
          data-testid="deleted-indicator"
        >
          {t(BrightHubStrings.MessageBubble_Deleted)}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 1,
        px: 2,
      }}
      aria-label={t(BrightHubStrings.MessageBubble_AriaLabel)}
    >
      <Box sx={{ maxWidth: '70%' }}>
        {/* Forwarded indicator */}
        {message.forwardedFromId && (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
          >
            <Forward fontSize="inherit" color="action" />
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid="forwarded-indicator"
            >
              {t(BrightHubStrings.MessageBubble_Forwarded)}
            </Typography>
          </Box>
        )}

        {/* Reply preview */}
        {message.replyToMessageId && replyPreview && (
          <Box
            sx={{
              borderLeft: 2,
              borderColor: 'primary.main',
              pl: 1,
              mb: 0.5,
            }}
            data-testid="reply-preview"
          >
            <Typography variant="caption" color="text.secondary">
              {t(BrightHubStrings.MessageBubble_ReplyTo)}
            </Typography>
            <Typography variant="caption" display="block" noWrap>
              {replyPreview}
            </Typography>
          </Box>
        )}

        {/* Message content */}
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: isOwn ? 'primary.main' : 'grey.100',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
          }}
        >
          <Typography
            variant="body2"
            dangerouslySetInnerHTML={{ __html: message.formattedContent }}
          />
        </Paper>

        {/* Metadata row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.25,
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {message.createdAt}
          </Typography>
          {message.isEdited && (
            <Chip
              label={t(BrightHubStrings.MessageBubble_Edited)}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: 10 }}
              data-testid="edited-indicator"
            />
          )}
        </Box>

        {/* Reactions */}
        {reactions.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <MessageReactions
              reactions={reactions}
              onToggleReaction={onToggleReaction}
              onAddReaction={onAddReaction}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default MessageBubble;
