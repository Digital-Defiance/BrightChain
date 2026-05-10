/**
 * ComposeModal — Floating compose card / full-screen drawer for email composition.
 *
 * - Fixed-position card at bottom-right, 480px wide, max-height 70vh (Req 5.1)
 * - Title bar with subject / "New Message", minimize, close buttons (Req 5.2)
 * - Minimize collapses to title-bar-only strip (Req 5.3)
 * - Close prompts confirmation if body has content (Req 5.4)
 * - Drag-to-reposition by title bar, clamped within viewport (Req 5.5)
 * - Retains send/reply/forward logic from ComposeView (Req 5.6)
 * - Full-screen SwipeableDrawer on viewports ≤600px (Req 5.7)
 * - Focus trap when open, return focus to trigger on close (Req 8.3)
 * - Uses RecipientChipInput for To, Cc, Bcc (Req 4.6)
 * - Rendered via React Portal at document root
 */

import { MessageEncryptionScheme } from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import CloseIcon from '@mui/icons-material/Close';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import MinimizeIcon from '@mui/icons-material/Minimize';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import AttachmentBar, { AttachmentFile } from './AttachmentBar';
import { useBrightMail, type ComposePrefill } from './BrightMailContext';
import {
  isValidEmail,
  mapComposeStateToSendParams,
  mapRecipientsToMailboxes,
  RecipientKeyResolution,
} from './ComposeView';
import EncryptionSelector from './EncryptionSelector';
import GpgSetupWizard from './GpgSetupWizard';
import RecipientChipInput from './RecipientChipInput';
import RichTextEditor from './RichTextEditor';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';
import { useEmailApi } from './hooks/useEmailApi';
import type { AttachmentInput } from './services/emailApi';
import {
  extractLocalPart,
  getEmailDomain,
  getExternalRecipients,
  isLocalDomain,
  verificationResultToChipStatus,
} from './utils/recipientVerification';

// ─── Constants ──────────────────────────────────────────────────────────────

const MODAL_WIDTH = 480;
const TITLE_BAR_HEIGHT = 48;
/** Approximate height of the form fields area (To, Cc, Bcc, Subject). */
const FORM_FIELDS_HEIGHT = 192;
/** Approximate height of the action bar (Send button row). */
const ACTION_BAR_HEIGHT = 52;
/** Minimum margin from the viewport bottom edge. */
const BOTTOM_MARGIN = 16;

/**
 * Compute the maximum height available for the compose body text field.
 *
 * Exported for Property 1 testing.
 */
export function computeComposeBodyMaxHeight(
  viewportHeight: number,
  titleBarHeight = TITLE_BAR_HEIGHT,
  formFieldsHeight = FORM_FIELDS_HEIGHT,
  actionBarHeight = ACTION_BAR_HEIGHT,
  bottomMargin = BOTTOM_MARGIN,
): number {
  const maxModalHeight = viewportHeight * 0.7;
  return Math.max(
    0,
    maxModalHeight -
      titleBarHeight -
      formFieldsHeight -
      actionBarHeight -
      bottomMargin,
  );
}

// ─── Exported helpers for property testing ───────────────────────────────────

/**
 * Clamp a modal position so it stays fully within the viewport.
 *
 * Exported for Property 10 testing.
 */
export function clampPosition(
  pos: { x: number; y: number },
  modalWidth: number,
  modalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  const x = Math.max(0, Math.min(pos.x, viewportWidth - modalWidth));
  const y = Math.max(0, Math.min(pos.y, viewportHeight - modalHeight));
  return { x, y };
}

/**
 * Determine whether closing the compose modal should show a confirmation prompt.
 * Returns true when any compose field has content that would be lost:
 * body text, recipients, subject, or attachments.
 *
 * Exported for Property 9 testing.
 */
export function shouldConfirmClose(
  body: string,
  recipients?: string[],
  subject?: string,
  attachmentCount?: number,
): boolean {
  if (body.trim().length > 0) return true;
  if (recipients && recipients.length > 0) return true;
  if (subject && subject.trim().length > 0) return true;
  if (attachmentCount && attachmentCount > 0) return true;
  return false;
}

/**
 * Returns the list of recipient email addresses that have a 'warning' chip status
 * (i.e. user not found on the local domain).
 *
 * Exported for property testing.
 */
export function getWarningRecipients(
  allRecipients: string[],
  recipientStatuses: Record<string, 'valid' | 'warning' | 'error'>,
): string[] {
  return allRecipients.filter(
    (email) => recipientStatuses[email] === 'warning',
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ComposeModalProps {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  prefill?: ComposePrefill;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  /** Resolve key availability for a recipient email. */
  onResolveRecipientKeys?: (email: string) => Promise<RecipientKeyResolution>;
  /** Get the user's default encryption preference. */
  onGetEncryptionPreference?: () => Promise<{ scheme: string } | null>;
  /** Generate a new GPG keypair (for wizard). */
  onGenerateGpgKeyPair?: (passphrase: string) => Promise<void>;
  /** Import a GPG public key (for wizard). */
  onImportGpgPublicKey?: (armoredKey: string) => Promise<void>;
  /** Import a GPG key by email from keyserver (for wizard). */
  onImportGpgByEmail?: (email: string) => Promise<void>;
  /** Publish GPG key to keyserver (for wizard). */
  onPublishGpgKey?: () => Promise<void>;
  /** Set default encryption preference (for wizard). */
  onSetDefaultEncryption?: (scheme: MessageEncryptionScheme) => Promise<void>;
  /** Fingerprint of the user's GPG key (for wizard success step). */
  gpgKeyFingerprint?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const ComposeModalInner: FC<ComposeModalProps> = ({
  open,
  minimized,
  maximized,
  prefill,
  onClose,
  onMinimize,
  onToggleMaximize,
  onResolveRecipientKeys,
  onGetEncryptionPreference,
  onGenerateGpgKeyPair,
  onImportGpgPublicKey,
  onImportGpgByEmail,
  onPublishGpgKey,
  onSetDefaultEncryption,
  gpgKeyFingerprint,
}) => {
  const { t } = useBrightMailTranslation();
  const emailApi = useEmailApi();
  const isMobile = useMediaQuery('(max-width:600px)');

  // ── Form state ──────────────────────────────────────────────────────────
  const [to, setTo] = useState<string[]>(prefill?.to ?? []);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(prefill?.subject ?? '');
  const [htmlBody, setHtmlBody] = useState(prefill?.body ?? '');
  const [textBody, setTextBody] = useState(prefill?.body ?? '');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [encryptionScheme, setEncryptionScheme] =
    useState<MessageEncryptionScheme>(MessageEncryptionScheme.NONE);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBounceWarning, setShowBounceWarning] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // ── Recipient key resolution state ──────────────────────────────────
  const [resolvedKeys, setResolvedKeys] = useState<
    Record<string, RecipientKeyResolution>
  >({});
  const [defaultPreference, setDefaultPreference] =
    useState<MessageEncryptionScheme | null>(null);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  // ── GPG wizard state ────────────────────────────────────────────────
  const [showGpgWizard, setShowGpgWizard] = useState(false);

  // ── Recipient verification state ────────────────────────────────────
  const [recipientStatuses, setRecipientStatuses] = useState<
    Record<string, 'valid' | 'warning' | 'error'>
  >({});
  const emailDomain = getEmailDomain();

  // ── External recipient detection for ECIES warning ──────────────────
  const allRecipients = [...to, ...cc, ...bcc];
  const externalRecipients = getExternalRecipients(allRecipients, emailDomain);
  const encryptionRequiresLocalOnly =
    encryptionScheme === MessageEncryptionScheme.RECIPIENT_KEYS ||
    encryptionScheme === MessageEncryptionScheme.S_MIME;
  const hasExternalWithEncryption =
    encryptionRequiresLocalOnly && externalRecipients.length > 0;

  const externalRecipientWarning = hasExternalWithEncryption
    ? t(BrightMailStrings.Compose_ExternalRecipientsWarningTemplate).replace(
        '{ADDRESSES}',
        externalRecipients.join(', '),
      )
    : undefined;

  // ── Load default encryption preference on mount ─────────────────────
  useEffect(() => {
    if (!onGetEncryptionPreference || preferenceLoaded) return;
    let cancelled = false;
    onGetEncryptionPreference()
      .then((pref) => {
        if (cancelled) return;
        setPreferenceLoaded(true);
        if (pref?.scheme) {
          setDefaultPreference(pref.scheme as MessageEncryptionScheme);
        }
      })
      .catch(() => {
        if (!cancelled) setPreferenceLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [onGetEncryptionPreference, preferenceLoaded]);

  // ── Apply default encryption preference once loaded ─────────────────
  useEffect(() => {
    if (
      defaultPreference &&
      encryptionScheme === MessageEncryptionScheme.NONE
    ) {
      setEncryptionScheme(defaultPreference);
    }
    // Only run when preference first loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPreference]);

  // ── Resolve recipient keys when recipients change ───────────────────
  useEffect(() => {
    if (!onResolveRecipientKeys) return;
    const validRecipients = allRecipients.filter(isValidEmail);
    if (validRecipients.length === 0) {
      setResolvedKeys({});
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      const results: Record<string, RecipientKeyResolution> = {};
      for (const email of validRecipients) {
        try {
          results[email] = await onResolveRecipientKeys(email);
        } catch {
          results[email] = {
            hasGpgKey: false,
            hasSmimeCert: false,
            hasEciesKey: false,
            isInternal: false,
          };
        }
      }
      if (!cancelled) setResolvedKeys(results);
    };
    resolve();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, cc, bcc, onResolveRecipientKeys]);

  // ── Derive key availability from resolved keys ──────────────────────
  const resolvedEmails = Object.keys(resolvedKeys);
  const hasAnyGpgKey =
    resolvedEmails.length > 0 &&
    resolvedEmails.every((e) => resolvedKeys[e].hasGpgKey);
  const hasAnySmimeCert =
    resolvedEmails.length > 0 &&
    resolvedEmails.every((e) => resolvedKeys[e].hasSmimeCert);
  const hasExternalRecipients = resolvedEmails.some(
    (e) => !resolvedKeys[e].isInternal,
  );

  // ── Compute recipient warnings for GPG / S/MIME ─────────────────────
  const missingGpgRecipients = resolvedEmails.filter(
    (e) => !resolvedKeys[e].hasGpgKey,
  );
  const missingSmimeRecipients = resolvedEmails.filter(
    (e) => !resolvedKeys[e].hasSmimeCert,
  );
  const recipientWarnings =
    encryptionScheme === MessageEncryptionScheme.GPG
      ? missingGpgRecipients
      : encryptionScheme === MessageEncryptionScheme.S_MIME
        ? missingSmimeRecipients
        : undefined;

  const handleChipCommit = useCallback(
    async (email: string) => {
      if (!isLocalDomain(email, emailDomain)) return;
      const localPart = extractLocalPart(email);
      if (!localPart) return;

      try {
        const result = await emailApi.verifyRecipient(localPart);
        if (result) {
          setRecipientStatuses((prev) => ({
            ...prev,
            [email]: verificationResultToChipStatus(result.exists),
          }));
        }
      } catch (err) {
        console.warn('Recipient verification failed:', err);
      }
    },
    [emailApi, emailDomain],
  );

  // ── Drag state ──────────────────────────────────────────────────────────
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Pre-maximize position (for restore) ─────────────────────────────
  const preMaximizePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Focus trap refs ─────────────────────────────────────────────────────
  const triggerRef = useRef<Element | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  // Capture the element that had focus when the modal opened
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Re-apply prefill when it changes
  useEffect(() => {
    if (prefill) {
      setTo(prefill.to ?? []);
      setSubject(prefill.subject ?? '');
      setHtmlBody(prefill.body ?? '');
      setTextBody(prefill.body ?? '');
    }
  }, [prefill]);

  // Reset position when opening
  useEffect(() => {
    if (open) {
      setPosition({ x: 0, y: 0 });
      setShowConfirm(false);
    }
  }, [open]);

  // Focus the first focusable element when modal opens
  useEffect(() => {
    if (open && !minimized) {
      // Small delay to let the DOM render
      const timer = setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, minimized]);

  // Return focus to trigger on close
  useEffect(() => {
    if (!open && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  // ── Focus trap: keep Tab cycling within the modal ─────────────────────
  useEffect(() => {
    if (!open || minimized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseAttempt();
        return;
      }
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, minimized, htmlBody]);

  // ── Drag handlers ─────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile || minimized || maximized) return;
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isMobile, minimized, maximized, position],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rawX = e.clientX - dragOffset.current.x;
      const rawY = e.clientY - dragOffset.current.y;
      const modalHeight = modalRef.current?.offsetHeight ?? 400;
      const clamped = clampPosition(
        { x: rawX, y: rawY },
        MODAL_WIDTH,
        modalHeight,
        window.innerWidth,
        window.innerHeight,
      );
      setPosition(clamped);
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // ── Close logic ───────────────────────────────────────────────────────
  const handleCloseAttempt = useCallback(() => {
    if (
      shouldConfirmClose(textBody, allRecipients, subject, attachments.length)
    ) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [textBody, allRecipients, subject, attachments.length, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  const handleCancelDiscard = useCallback(() => {
    setShowConfirm(false);
  }, []);

  // ── Restore from minimized ────────────────────────────────────────────
  const handleRestore = useCallback(() => {
    // Toggle minimized off — the parent controls this via context
    // We call onMinimize which in the context toggles the minimized state
    // But the design says minimize collapses; clicking the title bar restores.
    // We need a restore action. For now, we'll use onMinimize as a toggle.
    onMinimize();
  }, [onMinimize]);

  // ── Maximize / restore toggle ─────────────────────────────────────────
  const handleToggleMaximize = useCallback(() => {
    if (!maximized) {
      // Store current position before maximizing
      preMaximizePosition.current = { ...position };
    } else {
      // Restore to pre-maximize position
      setPosition(preMaximizePosition.current);
    }
    onToggleMaximize();
  }, [maximized, position, onToggleMaximize]);

  // ── Send handler ──────────────────────────────────────────────────────
  const hasValidRecipient = to.some(isValidEmail);

  const warningRecipients = getWarningRecipients(
    allRecipients,
    recipientStatuses,
  );

  /** Actually perform the send (called directly or after bounce warning confirmation). */
  const executeSend = useCallback(async () => {
    if (!hasValidRecipient) return;
    setSending(true);

    try {
      const toMailboxes = mapRecipientsToMailboxes(to);
      const ccMailboxes = mapRecipientsToMailboxes(cc);
      const bccMailboxes = mapRecipientsToMailboxes(bcc);

      // Convert AttachmentFile[] to AttachmentInput[] (base64)
      const attachmentInputs: AttachmentInput[] = await Promise.all(
        attachments.map(async (att) => {
          const base64 =
            att.base64Data ??
            (await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1] ?? result);
              };
              reader.onerror = reject;
              reader.readAsDataURL(att.file);
            }));
          return {
            filename: att.filename,
            mimeType: att.mimeType,
            data: base64,
          };
        }),
      );

      // Route to the correct API endpoint based on compose mode
      if (prefill?.mode === 'reply' && prefill.originalMessageId) {
        // Use the reply endpoint so the backend sets In-Reply-To + References
        await emailApi.replyToEmail(prefill.originalMessageId, {
          from: toMailboxes[0] ?? {
            localPart: 'user',
            domain: 'brightchain.local',
          },
          subject,
          textBody,
          htmlBody,
          replyAll: prefill.replyAll ?? false,
        });
      } else if (prefill?.mode === 'forward' && prefill.originalMessageId) {
        // Use the forward endpoint so the backend adds Resent-* headers
        await emailApi.forwardEmail(prefill.originalMessageId, {
          forwardTo: toMailboxes,
        });
      } else {
        const fromMailbox = toMailboxes[0];
        const params = mapComposeStateToSendParams({
          from: fromMailbox,
          to: toMailboxes,
          cc: ccMailboxes,
          bcc: bccMailboxes,
          subject,
          htmlBody,
          textBody,
          attachments: attachmentInputs,
          encryptionScheme,
        });
        await emailApi.sendEmail(params);
      }

      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Compose_SendSuccess),
        severity: 'success',
      });

      // Wait long enough for the success Snackbar's autoHideDuration
      // (4000ms) to elapse before unmounting the modal; otherwise the
      // Snackbar disappears with its parent and the user never sees the
      // green confirmation.
      setTimeout(() => onClose(), 4500);
    } catch {
      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Compose_SendError),
        severity: 'error',
      });
    } finally {
      setSending(false);
    }
  }, [
    hasValidRecipient,
    prefill,
    to,
    cc,
    bcc,
    subject,
    htmlBody,
    textBody,
    attachments,
    encryptionScheme,
    t,
    onClose,
    emailApi,
  ]);

  /** Click handler for the Send button — shows bounce warning if needed. */
  const handleSend = useCallback(async () => {
    if (!hasValidRecipient) return;

    if (warningRecipients.length > 0) {
      setShowBounceWarning(true);
      return;
    }

    await executeSend();
  }, [hasValidRecipient, warningRecipients, executeSend]);

  /** Confirm sending despite bounce warning. */
  const handleBounceConfirmSend = useCallback(async () => {
    setShowBounceWarning(false);
    await executeSend();
  }, [executeSend]);

  const handleBounceCancelSend = useCallback(() => {
    setShowBounceWarning(false);
  }, []);

  // ── Title text ────────────────────────────────────────────────────────
  const titleText = subject || t(BrightMailStrings.NewMessage);

  if (!open) return null;

  // ── Title bar (shared between card and drawer) ────────────────────────
  const titleBar = (
    <Box
      data-testid="compose-title-bar"
      onMouseDown={!isMobile ? handleDragStart : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        py: 0.5,
        height: TITLE_BAR_HEIGHT,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        cursor: !isMobile && !minimized && !maximized ? 'grab' : 'default',
        userSelect: 'none',
        borderTopLeftRadius: isMobile || maximized ? 0 : 8,
        borderTopRightRadius: isMobile || maximized ? 0 : 8,
      }}
    >
      <Typography
        variant="subtitle2"
        noWrap
        sx={{ flexGrow: 1, fontWeight: 600 }}
        onClick={minimized ? handleRestore : undefined}
        role={minimized ? 'button' : undefined}
        tabIndex={minimized ? 0 : undefined}
      >
        {titleText}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {minimized ? (
          <Tooltip title={t(BrightMailStrings.ComposeModal_Restore)}>
            <IconButton
              size="small"
              onClick={handleRestore}
              sx={{ color: 'inherit' }}
              aria-label={t(BrightMailStrings.ComposeModal_Restore)}
            >
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t(BrightMailStrings.ComposeModal_Minimize)}>
            <IconButton
              data-testid="compose-minimize-btn"
              size="small"
              onClick={onMinimize}
              sx={{ color: 'inherit' }}
              aria-label={t(BrightMailStrings.ComposeModal_Minimize)}
            >
              <MinimizeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {/* Maximize/Restore button — hidden on mobile and when minimized */}
        {!isMobile && !minimized && (
          <Tooltip
            title={
              maximized
                ? t(BrightMailStrings.ComposeModal_RestoreDown)
                : t(BrightMailStrings.ComposeModal_Maximize)
            }
          >
            <IconButton
              data-testid="compose-maximize-btn"
              size="small"
              onClick={handleToggleMaximize}
              sx={{ color: 'inherit' }}
              aria-label={
                maximized
                  ? t(BrightMailStrings.ComposeModal_RestoreDown)
                  : t(BrightMailStrings.ComposeModal_Maximize)
              }
            >
              {maximized ? (
                <CloseFullscreenIcon fontSize="small" />
              ) : (
                <OpenInFullIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t(BrightMailStrings.ComposeModal_Close)}>
          <IconButton
            data-testid="compose-close-btn"
            size="small"
            onClick={handleCloseAttempt}
            sx={{ color: 'inherit' }}
            aria-label={t(BrightMailStrings.ComposeModal_Close)}
            ref={(el) => {
              if (!firstFocusableRef.current && el) {
                firstFocusableRef.current = el;
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  // ── Compose form body ─────────────────────────────────────────────────
  const composeBody = (
    <Box
      data-testid="compose-body-container"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        maxHeight: maximized
          ? 'none'
          : `calc(70vh - ${TITLE_BAR_HEIGHT}px - ${BOTTOM_MARGIN}px)`,
        p: 2,
        gap: 1.5,
      }}
    >
      {/* Form fields: To, Cc, Bcc, Subject — fixed height region */}
      <RecipientChipInput
        value={to}
        onChange={setTo}
        label={t(BrightMailStrings.Compose_To)}
        chipStatuses={recipientStatuses}
        onChipCommit={handleChipCommit}
        emailDomain={emailDomain}
      />
      <RecipientChipInput
        value={cc}
        onChange={setCc}
        label={t(BrightMailStrings.Compose_Cc)}
      />
      <RecipientChipInput
        value={bcc}
        onChange={setBcc}
        label={t(BrightMailStrings.Compose_Bcc)}
      />
      <TextField
        label={t(BrightMailStrings.Compose_Subject)}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        fullWidth
        size="small"
        inputProps={{
          'aria-label': t(BrightMailStrings.Compose_Subject),
        }}
      />

      {/* Body field — flex: 1 with overflow-y: auto so it scrolls within the modal */}
      <Box
        data-testid="compose-body-field-wrapper"
        sx={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <RichTextEditor
          value={htmlBody}
          onChange={(html, text) => {
            setHtmlBody(html);
            setTextBody(text);
          }}
        />
      </Box>

      <AttachmentBar attachments={attachments} onChange={setAttachments} />

      {!hasValidRecipient && to.length > 0 && (
        <Typography variant="caption" color="error" role="alert">
          {t(BrightMailStrings.Compose_InvalidRecipient)}
        </Typography>
      )}

      {/* Action bar: Send button with encryption selector */}
      <Box
        sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}
      >
        <EncryptionSelector
          value={encryptionScheme}
          onChange={setEncryptionScheme}
          externalRecipientWarning={externalRecipientWarning}
          hasGpgKey={hasAnyGpgKey}
          hasSmimeCert={hasAnySmimeCert}
          hasExternalRecipients={hasExternalRecipients}
          recipientWarnings={recipientWarnings}
          onSetupGpg={
            onGenerateGpgKeyPair ? () => setShowGpgWizard(true) : undefined
          }
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!hasValidRecipient || sending || hasExternalWithEncryption}
          data-testid="compose-send-button"
        >
          {t(BrightMailStrings.Compose_Send)}
        </Button>
      </Box>
    </Box>
  );

  // ── Confirmation dialog ───────────────────────────────────────────────
  const confirmDialog = showConfirm ? (
    <Box
      data-testid="compose-confirm-dialog"
      role="alertdialog"
      aria-label="Discard draft?"
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: isMobile ? 0 : 2,
      }}
    >
      <Card sx={{ p: 3, maxWidth: 320 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t(BrightMailStrings.DiscardDraftTitle)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(BrightMailStrings.DiscardDraftMessage)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={handleCancelDiscard}>
            {t(BrightMailStrings.Action_Cancel)}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDiscard}
            data-testid="compose-confirm-discard-btn"
          >
            {t(BrightMailStrings.Action_Discard)}
          </Button>
        </Box>
      </Card>
    </Box>
  ) : null;

  // ── Bounce warning dialog ─────────────────────────────────────────────
  const bounceWarningDialog = showBounceWarning ? (
    <Box
      data-testid="compose-bounce-warning-dialog"
      role="alertdialog"
      aria-label={t(BrightMailStrings.Compose_BounceWarningTitle)}
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: isMobile ? 0 : 2,
      }}
    >
      <Card sx={{ p: 3, maxWidth: 360 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t(BrightMailStrings.Compose_BounceWarningTitle)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(BrightMailStrings.Compose_BounceWarningMessage).replace(
            '{ADDRESSES}',
            warningRecipients.join(', '),
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={handleBounceCancelSend}>
            {t(BrightMailStrings.Action_Cancel)}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleBounceConfirmSend}
            data-testid="compose-bounce-send-anyway-btn"
          >
            {t(BrightMailStrings.Compose_BounceWarningSendAnyway)}
          </Button>
        </Box>
      </Card>
    </Box>
  ) : null;

  // ── GPG Setup Wizard ───────────────────────────────────────────────
  const gpgWizardEl =
    onGenerateGpgKeyPair && onImportGpgPublicKey && onImportGpgByEmail ? (
      <GpgSetupWizard
        open={showGpgWizard}
        onClose={() => setShowGpgWizard(false)}
        onGenerateKeyPair={onGenerateGpgKeyPair}
        onImportPublicKey={onImportGpgPublicKey}
        onImportByEmail={onImportGpgByEmail}
        onPublishKey={onPublishGpgKey}
        onSetDefaultEncryption={onSetDefaultEncryption}
        keyFingerprint={gpgKeyFingerprint}
      />
    ) : null;

  // ── Snackbar ──────────────────────────────────────────────────────────
  const snackbarEl = (
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
  );

  // ── Mobile: full-screen SwipeableDrawer ────────────────────────────────
  if (isMobile) {
    return (
      <>
        <SwipeableDrawer
          anchor="bottom"
          open={open && !minimized}
          onClose={handleCloseAttempt}
          onOpen={() => {
            /* required by SwipeableDrawer */
          }}
          disableSwipeToOpen
          PaperProps={
            {
              sx: { height: '100vh' },
              'data-testid': 'compose-modal',
              role: 'dialog',
              'aria-label': titleText,
            } as React.HTMLAttributes<HTMLDivElement> & { sx: object }
          }
        >
          <Box
            ref={modalRef}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              position: 'relative',
            }}
          >
            {titleBar}
            {composeBody}
            {confirmDialog}
            {bounceWarningDialog}
          </Box>
        </SwipeableDrawer>
        {/* Minimized strip at bottom on mobile */}
        {minimized && (
          <Box
            data-testid="compose-modal"
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: (theme) => theme.zIndex.modal,
            }}
          >
            {titleBar}
          </Box>
        )}
        {snackbarEl}
        {gpgWizardEl}
      </>
    );
  }

  // ── Desktop: floating card or maximized overlay ─────────────────────
  if (maximized) {
    // Maximized mode: centered overlay with backdrop
    return (
      <>
        {/* Semi-transparent backdrop */}
        <Box
          data-testid="compose-maximize-backdrop"
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 1299,
          }}
        />
        <Card
          ref={modalRef}
          data-testid="compose-modal"
          role="dialog"
          aria-label={titleText}
          elevation={16}
          sx={{
            position: 'fixed',
            top: '5vh',
            left: '5vw',
            width: '90vw',
            height: '90vh',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {titleBar}
          {!minimized && composeBody}
          {confirmDialog}
          {bounceWarningDialog}
        </Card>
        {snackbarEl}
        {gpgWizardEl}
      </>
    );
  }

  // Compute position: default is bottom-right; drag offsets from there
  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: position.y === 0 ? 16 : 'auto',
    right: position.x === 0 ? 16 : 'auto',
    top: position.y !== 0 ? position.y : 'auto',
    left: position.x !== 0 ? position.x : 'auto',
    width: MODAL_WIDTH,
    maxHeight: minimized ? TITLE_BAR_HEIGHT : '70vh',
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    transition: dragging ? 'none' : 'max-height 200ms ease',
  };

  return (
    <>
      <Card
        ref={modalRef}
        data-testid="compose-modal"
        role="dialog"
        aria-label={titleText}
        style={cardStyle}
        elevation={8}
      >
        {titleBar}
        {!minimized && composeBody}
        {confirmDialog}
        {bounceWarningDialog}
      </Card>
      {snackbarEl}
      {gpgWizardEl}
    </>
  );
};

// ─── Portal wrapper that reads from BrightMailContext ────────────────────────

const ComposeModal: FC = () => {
  const {
    composeModal,
    closeCompose,
    minimizeCompose,
    toggleMaximize,
    onResolveRecipientKeys,
    onGetEncryptionPreference,
    onGenerateGpgKeyPair,
    onImportGpgPublicKey,
    onImportGpgByEmail,
    onPublishGpgKey,
    onSetDefaultEncryption,
    gpgKeyFingerprint,
  } = useBrightMail();

  if (composeModal.status === 'closed') return null;

  const { prefill, minimized, maximized } = composeModal;

  const portalContent = (
    <ComposeModalInner
      open={true}
      minimized={minimized}
      maximized={maximized}
      prefill={prefill}
      onClose={closeCompose}
      onMinimize={minimizeCompose}
      onToggleMaximize={toggleMaximize}
      onResolveRecipientKeys={onResolveRecipientKeys}
      onGetEncryptionPreference={onGetEncryptionPreference}
      onGenerateGpgKeyPair={onGenerateGpgKeyPair}
      onImportGpgPublicKey={onImportGpgPublicKey}
      onImportGpgByEmail={onImportGpgByEmail}
      onPublishGpgKey={onPublishGpgKey}
      onSetDefaultEncryption={
        onSetDefaultEncryption as
          | ((scheme: MessageEncryptionScheme) => Promise<void>)
          | undefined
      }
      gpgKeyFingerprint={gpgKeyFingerprint}
    />
  );

  return createPortal(portalContent, document.body);
};

export { ComposeModalInner };
export default memo(ComposeModal);
