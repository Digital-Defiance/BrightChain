/**
 * ThreadView — Displays an email thread in chronological order with
 * reply, forward, and delete actions. Auto-marks unread emails as read.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.5, 7.1
 */

import {
  BrightChainComponentId,
  BrightChainStrings,
  IEmailMetadata,
  IMailbox,
} from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ComposeView from './ComposeView';
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

// ─── Types ──────────────────────────────────────────────────────────────────

type ComposeMode =
  | { type: 'reply'; email: IEmailMetadata }
  | { type: 'forward'; email: IEmailMetadata }
  | null;

// ─── Component ──────────────────────────────────────────────────────────────

const ThreadView: FC = () => {
  const { tComponent } = useI18n();
  const t = (key: string) => tComponent(BrightChainComponentId, key);
  const emailApi = useEmailApi();
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();

  const [emails, setEmails] = useState<IEmailMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

  // ─── Render helpers ─────────────────────────────────────────────────
  const formatRecipients = (mailboxes: IMailbox[] | undefined): string => {
    if (!mailboxes || mailboxes.length === 0) return '';
    return mailboxes.map(getMailboxDisplay).join(', ');
  };

  // ─── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Box data-testid="thread-loading">
        <Typography variant="body2" aria-live="polite">
          {t(BrightChainStrings.BrightMail_Loading)}
        </Typography>
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

  // ─── Compose overlay ───────────────────────────────────────────────
  if (composeMode) {
    const email = composeMode.email;
    if (composeMode.type === 'reply') {
      return (
        <ComposeView
          replyTo={{
            from: email.from,
            subject: email.subject,
            textBody: (email as any).textBody,
            messageId: email.messageId,
          }}
          onClose={() => setComposeMode(null)}
        />
      );
    }
    return (
      <ComposeView
        forwardFrom={{
          subject: email.subject,
          textBody: (email as any).textBody,
          messageId: email.messageId,
        }}
        onClose={() => setComposeMode(null)}
      />
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

      {emails.map((email) => (
        <Paper
          key={email.messageId}
          variant="outlined"
          sx={{ p: 2, mb: 2 }}
          data-testid={`thread-message-${email.messageId}`}
        >
          <Typography variant="subtitle2" data-testid="message-from">
            {getMailboxDisplay(email.from)}
          </Typography>

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
            variant="body2"
            color="text.secondary"
            data-testid="message-date"
          >
            {formatDateTimeLocale(email.date)}
          </Typography>

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

          <Box display="flex" gap={1} mt={2}>
            <Button
              size="small"
              variant="outlined"
              data-testid={`reply-btn-${email.messageId}`}
              onClick={() => setComposeMode({ type: 'reply', email })}
            >
              {t(BrightChainStrings.BrightMail_Thread_Reply)}
            </Button>
            <Button
              size="small"
              variant="outlined"
              data-testid={`forward-btn-${email.messageId}`}
              onClick={() => setComposeMode({ type: 'forward', email })}
            >
              {t(BrightChainStrings.BrightMail_Thread_Forward)}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              data-testid={`delete-btn-${email.messageId}`}
              onClick={() => setDeleteTarget(email.messageId)}
            >
              {t(BrightChainStrings.BrightMail_Action_Delete)}
            </Button>
          </Box>
        </Paper>
      ))}

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
