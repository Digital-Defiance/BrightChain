/**
 * ThreadView — Displays an email thread in chronological order with
 * collapsible messages, reply, forward, and delete actions.
 * Auto-marks unread emails as read.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.3, 8.6
 */

import {
  BrightChainStrings,
  IEmailMetadata,
  IMailbox,
} from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import DeleteIcon from '@mui/icons-material/Delete';
import ForwardIcon from '@mui/icons-material/Forward';
import ReplyIcon from '@mui/icons-material/Reply';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import AvatarCircle from './AvatarCircle';
import { useBrightMail } from './BrightMailContext';
import ConfirmDialog from './ConfirmDialog';
import { formatDateTimeLocale } from './dateFormatting';
import { useEmailApi } from './hooks/useEmailApi';

// ─── Exported utility functions (tested by property tests) ──────────────────

/**
 * Returns a display string for a mailbox: displayName if present,
 * otherwise "localPart@domain".
 */
export function getMailboxDisplay(mailbox: IMailbox): string {
  if (mailbox.displayName) return mailbox.displayName;
  if (mailbox.address) return mailbox.address;
  return `${mailbox.localPart}@${mailbox.domain}`;
}

/**
 * Sorts emails by date ascending (chronological order).
 */
export function sortByDateAscending(
  emails: IEmailMetadata[],
): IEmailMetadata[] {
  return [...emails].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/**
 * Returns a Set containing only the messageId of the last (most recent) email.
 * Used to determine which messages start expanded in the thread view.
 * Exported for Property 11 testing.
 */
export function getInitialExpandedSet(
  emails: { messageId: string }[],
): Set<string> {
  if (emails.length === 0) return new Set();
  return new Set([emails[emails.length - 1].messageId]);
}

/**
 * Returns a one-line snippet from the email body, truncated to maxLen chars.
 */
function getSnippet(email: IEmailMetadata, maxLen = 80): string {
  const body = (email as any).textBody ?? '';
  const oneLine = body.replace(/[\r\n]+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen) + '…';
}

// ─── Component ──────────────────────────────────────────────────────────────

const ThreadView: FC = () => {
  const { tBranded: t } = useI18n();
  const emailApi = useEmailApi();
  const { messageId } = useParams<{ messageId: string }>();
  const { openCompose } = useBrightMail();

  const [emails, setEmails] = useState<IEmailMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // ─── Fetch thread ───────────────────────────────────────────────────
  const fetchThread = useCallback(async () => {
    if (!messageId) return;
    setLoading(true);
    setError(null);
    try {
      const thread = await emailApi.getEmailThread(messageId);
      const sorted = sortByDateAscending(Array.isArray(thread) ? thread : []);
      setEmails(sorted);
      setExpandedIds(getInitialExpandedSet(sorted));

      // Auto mark-as-read for unread emails
      for (const email of sorted) {
        const isRead = email.readReceipts && email.readReceipts.size > 0;
        if (!isRead) {
          try {
            await emailApi.markAsRead(email.messageId);
          } catch {
            // Silently ignore mark-as-read failures
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // ─── Toggle expand/collapse ─────────────────────────────────────────
  const toggleExpanded = useCallback((msgId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  }, []);

  // ─── Delete handler ─────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await emailApi.deleteEmail(deleteTarget);
      setEmails((prev) => prev.filter((e) => e.messageId !== deleteTarget));
      setSnackbar({
        open: true,
        message: t(BrightChainStrings.BrightMail_Delete_Success),
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: t(BrightChainStrings.BrightMail_Delete_ErrorTemplate).replace(
          '{MESSAGE_ID}',
          deleteTarget,
        ),
        severity: 'error',
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, t]);

  // ─── Reply / Forward via context ────────────────────────────────────
  const handleReply = useCallback(
    (email: IEmailMetadata) => {
      const fromAddr =
        email.from?.address ??
        (email.from?.localPart && email.from?.domain
          ? `${email.from.localPart}@${email.from.domain}`
          : '');
      const originalSubject = email.subject ?? '';
      const subject = originalSubject.startsWith('Re: ')
        ? originalSubject
        : `Re: ${originalSubject}`;
      const body = (email as any).textBody
        ? `\n\n> ${(email as any).textBody}`
        : '';
      openCompose({
        mode: 'reply',
        to: fromAddr ? [fromAddr] : [],
        subject,
        body,
        inReplyTo: email.messageId,
      });
    },
    [openCompose],
  );

  const handleForward = useCallback(
    (email: IEmailMetadata) => {
      const originalSubject = email.subject ?? '';
      const subject = originalSubject.startsWith('Fwd: ')
        ? originalSubject
        : `Fwd: ${originalSubject}`;
      const body = (email as any).textBody
        ? `\n\n> ${(email as any).textBody}`
        : '';
      openCompose({
        mode: 'forward',
        to: [],
        subject,
        body,
      });
    },
    [openCompose],
  );

  // ─── Inline reply send ──────────────────────────────────────────────
  const handleInlineReplySend = useCallback(async () => {
    if (!replyText.trim() || emails.length === 0) return;
    const lastEmail = emails[emails.length - 1];
    const fromAddr =
      lastEmail.to?.[0]?.address ??
      (lastEmail.to?.[0]?.localPart && lastEmail.to?.[0]?.domain
        ? `${lastEmail.to[0].localPart}@${lastEmail.to[0].domain}`
        : 'user@brightchain.local');
    const fromParts = fromAddr.split('@');
    try {
      await emailApi.replyToEmail(lastEmail.messageId, {
        from: {
          localPart: fromParts[0] ?? 'user',
          domain: fromParts[1] ?? 'brightchain.local',
        },
        textBody: replyText,
      });
      setReplyText('');
      setSnackbar({
        open: true,
        message: t(BrightChainStrings.BrightMail_Compose_SendSuccess),
        severity: 'success',
      });
      // Refresh thread to show the new reply
      fetchThread();
    } catch {
      setSnackbar({
        open: true,
        message: t(BrightChainStrings.BrightMail_Compose_SendError),
        severity: 'error',
      });
    }
  }, [replyText, emails, t, fetchThread]);

  // ─── Render helpers ─────────────────────────────────────────────────
  const formatRecipients = (mailboxes: IMailbox[] | undefined): string => {
    if (!mailboxes || mailboxes.length === 0) return '';
    return mailboxes.map(getMailboxDisplay).join(', ');
  };

  // Determine which message is the most recent (last in sorted order)
  const lastMessageId = useMemo(
    () => (emails.length > 0 ? emails[emails.length - 1].messageId : null),
    [emails],
  );

  // ─── Loading state (Requirement 3.9, 7.4) ─────────────────────────
  if (loading) {
    return (
      <Box data-testid="thread-loading" aria-live="polite">
        {Array.from({ length: 3 }).map((_, i) => (
          <Paper
            key={i}
            variant="outlined"
            sx={{ mb: 2, p: 2 }}
            data-testid={`thread-skeleton-${i}`}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="text" width="70%" height={18} />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <Box data-testid="thread-error">
        <Alert severity="error" role="alert">
          {t(BrightChainStrings.BrightMail_Thread_Error)}
        </Alert>
        <Button
          component={Link}
          to="/brightmail"
          variant="outlined"
          sx={{ mt: 1 }}
          data-testid="back-to-inbox"
        >
          {t(BrightChainStrings.BrightMail_Thread_BackToInbox)}
        </Button>
      </Box>
    );
  }

  // ─── Thread messages ───────────────────────────────────────────────
  return (
    <Box data-testid="thread-view">
      <Button
        component={Link}
        to="/brightmail"
        variant="text"
        sx={{ mb: 2 }}
        data-testid="back-to-inbox"
      >
        {t(BrightChainStrings.BrightMail_Thread_BackToInbox)}
      </Button>

      {emails.map((email) => {
        const isExpanded = expandedIds.has(email.messageId);
        const isLastMessage = email.messageId === lastMessageId;

        return (
          <Paper
            key={email.messageId}
            variant="outlined"
            sx={{ mb: 2, overflow: 'hidden' }}
            data-testid={`thread-message-${email.messageId}`}
            aria-expanded={isExpanded}
          >
            {/* Collapsed header — always visible, clickable to toggle (except last message) */}
            <ButtonBase
              component="div"
              onClick={() => {
                if (!isLastMessage) {
                  toggleExpanded(email.messageId);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                width: '100%',
                textAlign: 'left',
                cursor: isLastMessage ? 'default' : 'pointer',
              }}
              data-testid={`thread-header-${email.messageId}`}
              disabled={isLastMessage}
            >
              <AvatarCircle displayName={getMailboxDisplay(email.from)} size={36} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" noWrap data-testid="message-from">
                    {getMailboxDisplay(email.from)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" data-testid="message-date">
                    {formatDateTimeLocale(email.date)}
                  </Typography>
                </Box>
                {!isExpanded && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    data-testid="message-snippet"
                  >
                    {getSnippet(email)}
                  </Typography>
                )}
              </Box>
            </ButtonBase>

            {/* Expanded content with smooth transition */}
            <Collapse
              in={isExpanded}
              timeout={200}
              easing="ease"
            >
              <Box sx={{ px: 2, pb: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  data-testid="message-to"
                >
                  To: {formatRecipients(email.to)}
                </Typography>

                {email.cc && email.cc.length > 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="message-cc"
                  >
                    Cc: {formatRecipients(email.cc)}
                  </Typography>
                )}

                <Typography
                  variant="subtitle1"
                  sx={{ mt: 1 }}
                  data-testid="message-subject"
                >
                  {email.subject ?? ''}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Typography
                  variant="body1"
                  sx={{ whiteSpace: 'pre-wrap' }}
                  data-testid="message-body"
                >
                  {(email as any).textBody ?? ''}
                </Typography>

                {/* Action toolbar */}
                <Box display="flex" gap={1} mt={2}>
                  <Tooltip title={t(BrightChainStrings.BrightMail_Thread_Reply)}>
                    <IconButton
                      size="small"
                      data-testid={`reply-btn-${email.messageId}`}
                      onClick={() => handleReply(email)}
                      aria-label={t(BrightChainStrings.BrightMail_Thread_Reply)}
                    >
                      <ReplyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(BrightChainStrings.BrightMail_Thread_Forward)}>
                    <IconButton
                      size="small"
                      data-testid={`forward-btn-${email.messageId}`}
                      onClick={() => handleForward(email)}
                      aria-label={t(BrightChainStrings.BrightMail_Thread_Forward)}
                    >
                      <ForwardIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(BrightChainStrings.BrightMail_Action_Delete)}>
                    <IconButton
                      size="small"
                      color="error"
                      data-testid={`delete-btn-${email.messageId}`}
                      onClick={() => setDeleteTarget(email.messageId)}
                      aria-label={t(BrightChainStrings.BrightMail_Action_Delete)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      {/* Inline reply box below the most recent message */}
      {emails.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }} data-testid="inline-reply-box">
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t(BrightChainStrings.BrightMail_Thread_Reply)}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder={t(BrightChainStrings.BrightMail_Thread_Reply)}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            data-testid="inline-reply-input"
            sx={{ mb: 1 }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<SendIcon />}
            onClick={handleInlineReplySend}
            disabled={!replyText.trim()}
            data-testid="inline-reply-send"
          >
            {t(BrightChainStrings.BrightMail_Compose_Send)}
          </Button>
        </Paper>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t(BrightChainStrings.BrightMail_Action_Delete)}
        message={t(BrightChainStrings.BrightMail_Delete_Confirm)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          role="alert"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default memo(ThreadView);
