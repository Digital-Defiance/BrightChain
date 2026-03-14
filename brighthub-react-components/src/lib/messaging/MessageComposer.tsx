/**
 * MessageComposer Component
 *
 * Rich text input with attachment support and reply-to indicator.
 *
 * @remarks
 * Implements Requirements 44.3, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { AttachFile, Close, Send } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the MessageComposer component */
export interface MessageComposerProps {
  /** Callback when a message is sent */
  onSend: (content: string, attachments?: File[]) => void;
  /** Message being replied to (shows reply indicator) */
  replyTo?: { id: string; preview: string };
  /** Callback to cancel the reply */
  onCancelReply?: () => void;
  /** Whether the composer is disabled */
  disabled?: boolean;
}

/**
 * MessageComposer
 *
 * Text field with send button, attachment button, and optional reply indicator.
 */
export function MessageComposer({
  onSend,
  replyTo,
  onCancelReply,
  disabled = false,
}: MessageComposerProps) {
  const { t } = useBrightHubTranslation();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      setAttachments((prev) => [...prev, ...files]);
    };
    input.click();
  };

  return (
    <Box aria-label={t(BrightHubStrings.MessageComposer_AriaLabel)}>
      {/* Reply indicator */}
      {replyTo && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            bgcolor: 'action.hover',
            borderRadius: '8px 8px 0 0',
          }}
          data-testid="reply-indicator"
        >
          <Typography variant="caption" color="text.secondary">
            {t(BrightHubStrings.MessageComposer_ReplyingTo)}
          </Typography>
          <Typography variant="caption" noWrap sx={{ flex: 1 }}>
            {replyTo.preview}
          </Typography>
          <IconButton
            size="small"
            onClick={onCancelReply}
            aria-label={t(BrightHubStrings.MessageComposer_CancelReply)}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <Box
          sx={{ display: 'flex', gap: 0.5, px: 2, py: 0.5, flexWrap: 'wrap' }}
        >
          {attachments.map((file, i) => (
            <Chip
              key={`${file.name}-${i}`}
              label={file.name}
              size="small"
              onDelete={() =>
                setAttachments((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </Box>
      )}

      {/* Input row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, p: 1 }}>
        <Tooltip title={t(BrightHubStrings.MessageComposer_AttachFile)}>
          <IconButton
            size="small"
            onClick={handleAttach}
            disabled={disabled}
            aria-label={t(BrightHubStrings.MessageComposer_AttachFile)}
          >
            <AttachFile fontSize="small" />
          </IconButton>
        </Tooltip>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder={t(BrightHubStrings.MessageComposer_Placeholder)}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          slotProps={{
            input: {
              'aria-label': t(BrightHubStrings.MessageComposer_Placeholder),
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={disabled || (!content.trim() && attachments.length === 0)}
          aria-label={t(BrightHubStrings.MessageComposer_Send)}
          data-testid="send-button"
        >
          <Send />
        </IconButton>
      </Box>
    </Box>
  );
}

export default MessageComposer;
