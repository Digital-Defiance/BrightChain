/**
 * MessageReactions Component
 *
 * Display and add emoji reactions to a message.
 *
 * @remarks
 * Implements Requirements 44.8, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { AddReaction } from '@mui/icons-material';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Aggregated reaction for display */
export interface AggregatedReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

/** Props for the MessageReactions component */
export interface MessageReactionsProps {
  /** Aggregated reactions to display */
  reactions: AggregatedReaction[];
  /** Callback when a reaction is toggled */
  onToggleReaction?: (emoji: string) => void;
  /** Callback to open the reaction picker */
  onAddReaction?: () => void;
}

/**
 * MessageReactions
 *
 * Row of emoji reaction chips with counts, plus an add-reaction button.
 */
export function MessageReactions({
  reactions,
  onToggleReaction,
  onAddReaction,
}: MessageReactionsProps) {
  const { t } = useBrightHubTranslation();

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}
      aria-label={t(BrightHubStrings.MessageReactions_AriaLabel)}
      role="group"
    >
      {reactions.map((r) => (
        <Chip
          key={r.emoji}
          label={`${r.emoji} ${r.count}`}
          size="small"
          variant={r.reacted ? 'filled' : 'outlined'}
          color={r.reacted ? 'primary' : 'default'}
          onClick={() => onToggleReaction?.(r.emoji)}
          aria-label={
            r.reacted
              ? t(BrightHubStrings.MessageReactions_RemoveReaction)
              : t(BrightHubStrings.MessageReactions_CountTemplate, {
                  COUNT: String(r.count),
                })
          }
          data-testid={`reaction-${r.emoji}`}
        />
      ))}
      {onAddReaction && (
        <Tooltip title={t(BrightHubStrings.MessageReactions_AddReaction)}>
          <IconButton
            size="small"
            onClick={onAddReaction}
            aria-label={t(BrightHubStrings.MessageReactions_AddReaction)}
          >
            <AddReaction fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export default MessageReactions;
