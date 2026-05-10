/**
 * ComposeArea — Message input component that routes to the correct API
 * endpoint based on context type (conversation, group, channel).
 *
 * Features:
 * - Empty input validation (no whitespace-only submissions)
 * - Enter to submit, Shift+Enter for newline
 * - Privacy-preserving error display for 404 on DM send
 * - Clears input on successful send
 *
 * Requirements: 3.3, 3.5, 4.4, 5.4
 */

import LockIcon from '@mui/icons-material/Lock';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Box,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { FC, KeyboardEvent, memo, useCallback, useState } from 'react';

import type { ICommunicationMessage } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useChatApi } from './hooks/useChatApi';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComposeAreaProps {
  contextType: 'conversation' | 'group' | 'channel';
  contextId: string;
  /** Called after a message is successfully sent, with the returned message object. */
  onMessageSent?: (message: ICommunicationMessage) => void;
}

// ─── Privacy-preserving error message ───────────────────────────────────────

/**
 * For 404 errors on DM send, return a generic message that does not reveal
 * whether the recipient is blocked or non-existent (Req 3.5).
 */
function getPrivacyPreservingError(
  error: unknown,
  contextType: ComposeAreaProps['contextType'],
): string {
  if (
    contextType === 'conversation' &&
    isAxiosError(error) &&
    error.response?.status === 404
  ) {
    return 'Message could not be delivered';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to send message';
}

// ─── Component ──────────────────────────────────────────────────────────────

const ComposeArea: FC<ComposeAreaProps> = ({
  contextType,
  contextId,
  onMessageSent,
}) => {
  const chatApi = useChatApi();
  const { tBranded: t } = useI18n();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    try {
      let result: ICommunicationMessage;
      switch (contextType) {
        case 'conversation':
          result = await chatApi.sendDirectMessage({
            conversationId: contextId,
            content: trimmed,
          });
          break;
        case 'group':
          result = await chatApi.sendGroupMessage(contextId, {
            content: trimmed,
          });
          break;
        case 'channel':
          result = await chatApi.sendChannelMessage(contextId, {
            content: trimmed,
          });
          break;
      }
      setContent('');
      onMessageSent?.(result);
    } catch (err) {
      setError(getPrivacyPreservingError(err, contextType));
    } finally {
      setSending(false);
    }
  }, [chatApi, content, contextId, contextType, onMessageSent]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <Box data-testid="compose-area">
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 1 }}
          data-testid="compose-error"
        >
          {error}
        </Alert>
      )}
      <Box display="flex" alignItems="flex-end" gap={1}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={t(BrightChatStrings.Compose_Placeholder)}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          size="small"
          data-testid="compose-input"
          inputProps={{ 'aria-label': 'Encrypted message input' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon
                  fontSize="small"
                  color="action"
                  data-testid="encryption-icon-compose"
                />
              </InputAdornment>
            ),
          }}
        />
        <IconButton
          onClick={handleSubmit}
          disabled={sending || !content.trim()}
          color="primary"
          data-testid="compose-send"
          aria-label={t(BrightChatStrings.Compose_SendLabel)}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default memo(ComposeArea);
