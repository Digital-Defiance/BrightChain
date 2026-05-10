/**
 * ThreadView — Displays an email thread in chronological order with
 * collapsible messages, reply, forward, and delete actions.
 * Auto-marks unread emails as read.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.3, 8.6
 */

import {
  EmailEncryptionService,
  IEmailEncryptionMetadata,
  IEmailMetadata,
  IMailbox,
  MessageEncryptionScheme,
} from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import {
  useAuth,
  useAuthenticatedApi,
} from '@digitaldefiance/express-suite-react-components';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ForwardIcon from '@mui/icons-material/Forward';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReplyIcon from '@mui/icons-material/Reply';
import ReplyAllIcon from '@mui/icons-material/ReplyAll';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
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
import type { AxiosInstance } from 'axios';
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

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
 * date is a BrightDateTimestamp (number) — direct numeric comparison.
 */
export function sortByDateAscending(
  emails: IEmailMetadata[],
): IEmailMetadata[] {
  return [...emails].sort((a, b) => a.date - b.date);
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
  const raw = email as unknown as Record<string, unknown>;
  if (!email.textBody && raw['encryptedBody']) return '[Encrypted]';
  const body = email.textBody ?? '';
  const oneLine = body.replace(/[\r\n]+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen) + '…';
}

/** Formats a byte count as a human-readable string (e.g. "1.2 KB"). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AttachmentCategory = 'image' | 'audio' | 'video' | 'pdf' | 'file';

/** Categorises a MIME type for attachment rendering purposes. */
function getAttachmentCategory(
  mimeType: string | undefined,
): AttachmentCategory {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
}

/**
 * Constructs the authenticated download URL for a vault file attachment.
 * Uses the Digital Burnbag file download endpoint: GET /burnbag/files/:fileId
 */
function getAttachmentDownloadPath(vaultFileId: string): string {
  return `/burnbag/files/${vaultFileId}`;
}

/**
 * Downloads a vault file attachment using the authenticated API instance.
 * Fetches the file as a blob and triggers a browser download.
 */
async function downloadAttachment(
  api: AxiosInstance,
  vaultFileId: string,
  filename: string,
): Promise<void> {
  const response = await api.get(getAttachmentDownloadPath(vaultFileId), {
    responseType: 'blob',
  });
  const blob = new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Collapsible section showing raw email headers. */
const HeadersSection: FC<{ email: IEmailMetadata }> = ({ email }) => {
  const [open, setOpen] = useState(false);

  const headerEntries: Array<[string, string]> = [];
  if (email.messageId) headerEntries.push(['Message-ID', email.messageId]);
  if (email.inReplyTo) headerEntries.push(['In-Reply-To', email.inReplyTo]);
  if (email.references && email.references.length > 0)
    headerEntries.push(['References', email.references.join(' ')]);
  if (email.mimeVersion)
    headerEntries.push(['MIME-Version', email.mimeVersion]);
  if (email.contentType)
    headerEntries.push([
      'Content-Type',
      `${email.contentType.type}/${email.contentType.subtype}`,
    ]);

  const customHeaders = email.customHeaders;
  if (customHeaders) {
    const entries =
      customHeaders instanceof Map
        ? Array.from(customHeaders.entries())
        : Object.entries(customHeaders as Record<string, string[]>);
    for (const [key, values] of entries) {
      const vals = Array.isArray(values) ? values : [String(values)];
      for (const v of vals) {
        headerEntries.push([key, v]);
      }
    }
  }

  if (headerEntries.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }} data-testid="headers-section">
      <ButtonBase
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'text.secondary',
        }}
        data-testid="headers-toggle"
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
        <Typography variant="caption">
          {open ? 'Hide headers' : 'View headers'}
        </Typography>
      </ButtonBase>
      <Collapse in={open} timeout={150}>
        <Box
          component="table"
          sx={{
            mt: 1,
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
          }}
          data-testid="headers-table"
        >
          <tbody>
            {headerEntries.map(([key, value], idx) => (
              <Box component="tr" key={idx} sx={{ verticalAlign: 'top' }}>
                <Box
                  component="td"
                  sx={{
                    pr: 2,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                  }}
                >
                  {key}:
                </Box>
                <Box component="td" sx={{ wordBreak: 'break-all' }}>
                  {value}
                </Box>
              </Box>
            ))}
          </tbody>
        </Box>
      </Collapse>
    </Box>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const ThreadView: FC = () => {
  const { t } = useBrightMailTranslation();
  const emailApi = useEmailApi();
  const { messageId } = useParams<{ messageId: string }>();
  const { openCompose } = useBrightMail();
  const { wallet, userData } = useAuth();
  const api = useAuthenticatedApi() as AxiosInstance;

  const [emails, setEmails] = useState<IEmailMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [decryptedBodies, setDecryptedBodies] = useState<Map<string, string>>(
    new Map(),
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const emailEncryptionService = useMemo(
    () => new EmailEncryptionService(),
    [],
  );

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
        const rr = email.readReceipts;
        const isRead =
          rr instanceof Map
            ? rr.size > 0
            : rr != null &&
              typeof rr === 'object' &&
              Object.keys(rr).length > 0;
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
  }, [messageId, emailApi]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // ─── Decrypt encrypted emails when wallet is available ──────────────
  useEffect(() => {
    if (!wallet || !userData?.email || emails.length === 0) return;
    const privateKey = wallet.getPrivateKey();
    for (const email of emails) {
      const raw = email as unknown as Record<string, unknown>;
      if (!raw['encryptedBody']) continue;
      const encryptedBodyB64 = raw['encryptedBody'] as string;
      const encryptedBodyBytes = Uint8Array.from(atob(encryptedBodyB64), (c) =>
        c.charCodeAt(0),
      );
      const encryptedKeysRaw = raw['encryptedKeys'] as
        | Record<string, string>
        | undefined;
      const encryptedKeysMap = new Map<string, Uint8Array>(
        Object.entries(encryptedKeysRaw ?? {}).map(([k, v]) => [
          k,
          Uint8Array.from(atob(v), (c) => c.charCodeAt(0)),
        ]),
      );
      const ivB64 = raw['encryptionIv'] as string | undefined;
      const authTagB64 = raw['encryptionAuthTag'] as string | undefined;
      const iv = ivB64
        ? Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
        : new Uint8Array(12);
      const authTag = authTagB64
        ? Uint8Array.from(atob(authTagB64), (c) => c.charCodeAt(0))
        : new Uint8Array(16);
      const encMeta: IEmailEncryptionMetadata = {
        scheme: MessageEncryptionScheme.RECIPIENT_KEYS,
        encryptedKeys: encryptedKeysMap,
        iv,
        authTag,
        isSigned: email.isSigned ?? false,
      };
      emailEncryptionService
        .decryptContent(encryptedBodyBytes, encMeta, userData.email, privateKey)
        .then((decrypted) => {
          const text = new TextDecoder().decode(decrypted);
          setDecryptedBodies((prev) =>
            new Map(prev).set(email.messageId, text),
          );
        })
        .catch(() => {
          setDecryptedBodies((prev) =>
            new Map(prev).set(
              email.messageId,
              '[Encrypted — unable to decrypt]',
            ),
          );
        });
    }
  }, [wallet, userData, emails, emailEncryptionService]);

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
        message: t(BrightMailStrings.Delete_Success),
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Delete_ErrorTemplate).replace(
          '{MESSAGE_ID}',
          deleteTarget,
        ),
        severity: 'error',
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, t, emailApi]);

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
      const body = email.textBody ? `\n\n> ${email.textBody}` : '';
      openCompose({
        mode: 'reply',
        to: fromAddr ? [fromAddr] : [],
        subject,
        body,
        inReplyTo: email.messageId,
        originalMessageId: email.messageId,
      });
    },
    [openCompose],
  );

  const handleReplyAll = useCallback(
    (email: IEmailMetadata) => {
      const originalSubject = email.subject ?? '';
      const subject = originalSubject.startsWith('Re: ')
        ? originalSubject
        : `Re: ${originalSubject}`;
      const body = email.textBody ? `\n\n> ${email.textBody}` : '';
      // Collect all To + Cc addresses to pre-populate the compose modal
      const toAddresses = [...(email.to ?? []), ...(email.cc ?? [])]
        .map(
          (m) =>
            m.address ??
            (m.localPart && m.domain ? `${m.localPart}@${m.domain}` : ''),
        )
        .filter(Boolean) as string[];
      openCompose({
        mode: 'reply',
        to: toAddresses,
        subject,
        body,
        inReplyTo: email.messageId,
        originalMessageId: email.messageId,
        replyAll: true,
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
      const body = email.textBody ? `\n\n> ${email.textBody}` : '';
      openCompose({
        mode: 'forward',
        to: [],
        subject,
        body,
        originalMessageId: email.messageId,
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
        message: t(BrightMailStrings.Compose_SendSuccess),
        severity: 'success',
      });
      // Refresh thread to show the new reply
      fetchThread();
    } catch {
      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Compose_SendError),
        severity: 'error',
      });
    }
  }, [replyText, emails, t, fetchThread, emailApi]);

  // ─── Render helpers ─────────────────────────────────────────────────
  const formatRecipients = (mailboxes: IMailbox[] | undefined): string => {
    if (!mailboxes || mailboxes.length === 0) return '';
    return mailboxes.map(getMailboxDisplay).join(', ');
  };

  // ─── Attachment download handler ────────────────────────────────────
  const handleAttachmentDownload = useCallback(
    async (vaultFileId: string, filename: string) => {
      try {
        await downloadAttachment(api, vaultFileId, filename);
      } catch {
        setSnackbar({
          open: true,
          message: 'Failed to download attachment',
          severity: 'error',
        });
      }
    },
    [api],
  );

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
          {t(BrightMailStrings.Thread_Error)}
        </Alert>
        <Button
          component={Link}
          to="/brightmail"
          variant="outlined"
          sx={{ mt: 1 }}
          data-testid="back-to-inbox"
        >
          {t(BrightMailStrings.Thread_BackToInbox)}
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
        {t(BrightMailStrings.Thread_BackToInbox)}
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
              <AvatarCircle
                displayName={getMailboxDisplay(email.from)}
                size={36}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    noWrap
                    data-testid="message-from"
                  >
                    {getMailboxDisplay(email.from)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    data-testid="message-date"
                  >
                    {formatDateTimeLocale(email.date)}
                  </Typography>
                </Box>
                {email.subject && (
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    noWrap
                    data-testid="message-subject-collapsed"
                  >
                    {email.subject}
                  </Typography>
                )}
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
            <Collapse in={isExpanded} timeout={200} easing="ease">
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
                  {decryptedBodies.get(email.messageId) ??
                    email.textBody ??
                    ((email as unknown as Record<string, unknown>)[
                      'encryptedBody'
                    ]
                      ? '[Encrypted]'
                      : '')}
                </Typography>

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                  <Box sx={{ mt: 2 }} data-testid="message-attachments">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 1,
                      }}
                    >
                      <AttachFileIcon fontSize="inherit" />
                      {email.attachments.length} attachment
                      {email.attachments.length !== 1 ? 's' : ''}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'flex-start',
                      }}
                    >
                      {email.attachments.map((att, idx) => {
                        const hasVaultFile = !!(
                          att.vaultFileId && email.vaultContainerId
                        );
                        const category = getAttachmentCategory(att.mimeType);

                        // ── Image: inline thumbnail ───────────────────────────
                        if (category === 'image' && hasVaultFile) {
                          return (
                            <Box
                              key={idx}
                              component="button"
                              onClick={() =>
                                handleAttachmentDownload(
                                  att.vaultFileId!,
                                  att.filename,
                                )
                              }
                              sx={{
                                textDecoration: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                maxWidth: 160,
                                cursor: 'pointer',
                                background: 'none',
                                padding: 0,
                                '&:hover img': { opacity: 0.85 },
                              }}
                              data-testid={`attachment-image-${idx}`}
                            >
                              <Box
                                component="img"
                                src={getAttachmentDownloadPath(
                                  att.vaultFileId!,
                                )}
                                alt={att.filename}
                                sx={{
                                  width: '100%',
                                  maxWidth: 160,
                                  maxHeight: 120,
                                  objectFit: 'cover',
                                  display: 'block',
                                  transition: 'opacity 0.15s',
                                }}
                              />
                              <Typography
                                variant="caption"
                                noWrap
                                title={att.filename}
                                sx={{
                                  px: 0.5,
                                  py: 0.25,
                                  width: '100%',
                                  textAlign: 'center',
                                  color: 'text.secondary',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {att.filename}
                              </Typography>
                            </Box>
                          );
                        }

                        // ── Audio: inline player ──────────────────────────────
                        if (category === 'audio' && hasVaultFile) {
                          return (
                            <Box
                              key={idx}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                p: 1,
                                maxWidth: 280,
                              }}
                              data-testid={`attachment-audio-${idx}`}
                            >
                              <Box
                                sx={{
                                  '& audio': {
                                    width: '100%',
                                    display: 'block',
                                  },
                                }}
                              >
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <audio
                                  controls
                                  src={getAttachmentDownloadPath(
                                    att.vaultFileId!,
                                  )}
                                />
                              </Box>
                              <Typography
                                variant="caption"
                                noWrap
                                title={att.filename}
                                sx={{
                                  display: 'block',
                                  mt: 0.5,
                                  textAlign: 'center',
                                  color: 'text.secondary',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {att.filename}
                              </Typography>
                            </Box>
                          );
                        }

                        // ── Video: inline player ──────────────────────────────
                        if (category === 'video' && hasVaultFile) {
                          return (
                            <Box
                              key={idx}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                maxWidth: 300,
                              }}
                              data-testid={`attachment-video-${idx}`}
                            >
                              <Box
                                sx={{
                                  '& video': {
                                    width: '100%',
                                    maxHeight: 200,
                                    display: 'block',
                                  },
                                }}
                              >
                                <video
                                  controls
                                  src={getAttachmentDownloadPath(
                                    att.vaultFileId!,
                                  )}
                                >
                                  <track kind="captions" />
                                </video>
                              </Box>
                              <Typography
                                variant="caption"
                                noWrap
                                title={att.filename}
                                sx={{
                                  display: 'block',
                                  px: 0.5,
                                  py: 0.25,
                                  textAlign: 'center',
                                  color: 'text.secondary',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {att.filename}
                              </Typography>
                            </Box>
                          );
                        }

                        // ── PDF / generic file with vault: clickable card ─────
                        if (hasVaultFile) {
                          return (
                            <Box
                              key={idx}
                              component="button"
                              onClick={() =>
                                handleAttachmentDownload(
                                  att.vaultFileId!,
                                  att.filename,
                                )
                              }
                              sx={{
                                textDecoration: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                width: 120,
                                py: 1.5,
                                cursor: 'pointer',
                                background: 'none',
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                              data-testid={`attachment-file-${idx}`}
                            >
                              {category === 'pdf' ? (
                                <PictureAsPdfIcon
                                  sx={{ fontSize: 48, color: 'error.main' }}
                                />
                              ) : (
                                <InsertDriveFileIcon
                                  sx={{ fontSize: 48, color: 'text.secondary' }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                noWrap
                                title={att.filename}
                                sx={{
                                  px: 0.5,
                                  mt: 0.5,
                                  width: '100%',
                                  textAlign: 'center',
                                  color: 'text.secondary',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {att.filename}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.disabled',
                                  fontSize: '0.6rem',
                                }}
                              >
                                {formatBytes(att.size)}
                              </Typography>
                            </Box>
                          );
                        }

                        // ── No vault URL: chip with type-appropriate icon and download icon ─────
                        const chipIcon = (() => {
                          switch (category) {
                            case 'audio':
                              return <AudiotrackIcon />;
                            case 'video':
                              return <VideocamIcon />;
                            case 'pdf':
                              return <PictureAsPdfIcon />;
                            default:
                              return <InsertDriveFileIcon />;
                          }
                        })();
                        return (
                          <Chip
                            key={idx}
                            icon={chipIcon}
                            label={`${att.filename} (${formatBytes(att.size)})`}
                            size="small"
                            variant="outlined"
                            data-testid={`attachment-chip-${idx}`}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* Headers view */}
                {(() => {
                  const hasHeaders =
                    email.messageId ||
                    email.inReplyTo ||
                    (email.references && email.references.length > 0) ||
                    (email.customHeaders &&
                      (email.customHeaders instanceof Map
                        ? email.customHeaders.size > 0
                        : Object.keys(email.customHeaders).length > 0));
                  if (!hasHeaders) return null;
                  return <HeadersSection email={email} />;
                })()}

                {/* Action toolbar */}
                <Box display="flex" gap={1} mt={2}>
                  <Tooltip title={t(BrightMailStrings.Thread_Reply)}>
                    <IconButton
                      size="small"
                      data-testid={`reply-btn-${email.messageId}`}
                      onClick={() => handleReply(email)}
                      aria-label={t(BrightMailStrings.Thread_Reply)}
                    >
                      <ReplyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(BrightMailStrings.Thread_ReplyAll)}>
                    <IconButton
                      size="small"
                      data-testid={`reply-all-btn-${email.messageId}`}
                      onClick={() => handleReplyAll(email)}
                      aria-label={t(BrightMailStrings.Thread_ReplyAll)}
                    >
                      <ReplyAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(BrightMailStrings.Thread_Forward)}>
                    <IconButton
                      size="small"
                      data-testid={`forward-btn-${email.messageId}`}
                      onClick={() => handleForward(email)}
                      aria-label={t(BrightMailStrings.Thread_Forward)}
                    >
                      <ForwardIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(BrightMailStrings.Action_Delete)}>
                    <IconButton
                      size="small"
                      color="error"
                      data-testid={`delete-btn-${email.messageId}`}
                      onClick={() => setDeleteTarget(email.messageId)}
                      aria-label={t(BrightMailStrings.Action_Delete)}
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
            {t(BrightMailStrings.Thread_Reply)}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder={t(BrightMailStrings.Thread_Reply)}
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
            {t(BrightMailStrings.Compose_Send)}
          </Button>
        </Paper>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t(BrightMailStrings.Action_Delete)}
        message={t(BrightMailStrings.Delete_Confirm)}
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
