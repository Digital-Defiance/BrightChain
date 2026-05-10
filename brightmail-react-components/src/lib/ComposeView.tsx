/**
 * ComposeView — Email composition form with To/Cc/Bcc, subject, body,
 * attachments, and reply/forward pre-fill support.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.4, 5.5, 12.3
 */

import {
  IMailbox,
  MessageEncryptionScheme,
} from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

import AttachmentBar, { AttachmentFile } from './AttachmentBar';
import EncryptionSelector from './EncryptionSelector';
import PassphraseDialog from './PassphraseDialog';
import RichTextEditor from './RichTextEditor';
import { useEmailApi } from './hooks/useEmailApi';
import { AttachmentInput, MailboxInput } from './services/emailApi';
import {
  getEmailDomain,
  getExternalRecipients,
} from './utils/recipientVerification';

// ─── Exported utility functions (tested by property tests) ──────────────────

/**
 * Parses "user@domain.com" into { localPart, domain }.
 * Returns null if the input is not a valid email address.
 */
export function parseEmailAddress(input: string): MailboxInput | null {
  const trimmed = input.trim();
  if (!isValidEmail(trimmed)) return null;
  const atIndex = trimmed.lastIndexOf('@');
  return {
    localPart: trimmed.slice(0, atIndex),
    domain: trimmed.slice(atIndex + 1),
  };
}

/**
 * Validates email format: localPart@domain with non-empty parts.
 */
export function isValidEmail(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) return false;
  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (localPart.length === 0 || domain.length === 0) return false;
  if (!domain.includes('.')) return false;
  const dotIndex = domain.lastIndexOf('.');
  if (dotIndex === 0 || dotIndex === domain.length - 1) return false;
  return true;
}

/**
 * Maps an array of email address strings to MailboxInput objects.
 */
export function mapRecipientsToMailboxes(addresses: string[]): MailboxInput[] {
  const result: MailboxInput[] = [];
  for (const addr of addresses) {
    const parsed = parseEmailAddress(addr);
    if (parsed) result.push(parsed);
  }
  return result;
}

/**
 * Generates reply pre-fill data from an original email.
 */
export function getReplyPrefill(email: {
  from: { address?: string; localPart?: string; domain?: string };
  subject?: string;
  textBody?: string;
}): { to: string; subject: string; body: string } {
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
  return { to: fromAddr, subject, body };
}

/**
 * Generates forward pre-fill data from an original email.
 */
export function getForwardPrefill(email: {
  subject?: string;
  textBody?: string;
}): { to: string; subject: string; body: string } {
  const originalSubject = email.subject ?? '';
  const subject = originalSubject.startsWith('Fwd: ')
    ? originalSubject
    : `Fwd: ${originalSubject}`;
  const body = email.textBody ? `\n\n> ${email.textBody}` : '';
  return { to: '', subject, body };
}

// ─── Compose state → SendEmailParams mapping (Property 6) ──────────────────

/**
 * Maps compose form state to a SendEmailParams object.
 * Exported for property testing (Property 6).
 */
export function mapComposeStateToSendParams(state: {
  from: MailboxInput;
  to: MailboxInput[];
  cc?: MailboxInput[];
  bcc?: MailboxInput[];
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  attachments?: AttachmentInput[];
  encryptionScheme?: MessageEncryptionScheme;
}): import('./services/emailApi').SendEmailParams {
  return {
    from: state.from,
    to: state.to,
    cc: state.cc && state.cc.length > 0 ? state.cc : undefined,
    bcc: state.bcc && state.bcc.length > 0 ? state.bcc : undefined,
    subject: state.subject || undefined,
    htmlBody: state.htmlBody || undefined,
    textBody: state.textBody || undefined,
    attachments:
      state.attachments && state.attachments.length > 0
        ? state.attachments
        : undefined,
    encryptionScheme: state.encryptionScheme,
  };
}

/**
 * Reads a File as base64-encoded string.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

/** Result of resolving a single recipient's key availability. */
export interface RecipientKeyResolution {
  hasGpgKey: boolean;
  hasSmimeCert: boolean;
  hasEciesKey: boolean;
  isInternal: boolean;
}

export interface ComposeViewProps {
  replyTo?: {
    from: IMailbox;
    subject?: string;
    textBody?: string;
    messageId?: string;
  };
  forwardFrom?: {
    subject?: string;
    textBody?: string;
    messageId?: string;
  };
  onClose?: () => void;
  /** Resolve key availability for a recipient email. */
  onResolveRecipientKeys?: (email: string) => Promise<RecipientKeyResolution>;
  /** Get the user's default encryption preference. */
  onGetEncryptionPreference?: () => Promise<{ scheme: string } | null>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Checks whether a given encryption scheme is available based on
 * resolved recipient key availability.
 */
export function isSchemeAvailable(
  scheme: MessageEncryptionScheme,
  allRecipientsHaveGpg: boolean,
  allRecipientsHaveSmime: boolean,
  hasExternalRecipients: boolean,
): boolean {
  switch (scheme) {
    case MessageEncryptionScheme.GPG:
      return allRecipientsHaveGpg;
    case MessageEncryptionScheme.S_MIME:
      return allRecipientsHaveSmime;
    case MessageEncryptionScheme.RECIPIENT_KEYS:
      return !hasExternalRecipients;
    case MessageEncryptionScheme.NONE:
      return true;
    default:
      return true;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

const ComposeView: FC<ComposeViewProps> = ({
  replyTo,
  forwardFrom,
  onClose,
  onResolveRecipientKeys,
  onGetEncryptionPreference,
}) => {
  const { t } = useBrightMailTranslation();
  const emailApi = useEmailApi();

  // Pre-fill from reply or forward
  const prefill = replyTo
    ? getReplyPrefill(replyTo)
    : forwardFrom
      ? getForwardPrefill(forwardFrom)
      : null;

  const [to, setTo] = useState(prefill?.to ?? '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(prefill?.subject ?? '');
  const [htmlBody, setHtmlBody] = useState(prefill?.body ?? '');
  const [textBody, setTextBody] = useState(prefill?.body ?? '');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [encryptionScheme, setEncryptionScheme] =
    useState<MessageEncryptionScheme>(MessageEncryptionScheme.NONE);
  const [sending, setSending] = useState(false);
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
  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
  const [pendingPassphraseCallback, setPendingPassphraseCallback] = useState<
    ((passphrase: string) => void) | null
  >(null);

  // Re-apply prefill when props change
  useEffect(() => {
    if (prefill) {
      setTo(prefill.to);
      setSubject(prefill.subject);
      setHtmlBody(prefill.body);
      setTextBody(prefill.body);
    }
    // Only run on mount / prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTo, forwardFrom]);

  // Escape key closes the compose form (Requirement 12.2)
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Parse comma-separated To field into individual addresses
  const toAddresses = to
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasValidRecipient = toAddresses.some(isValidEmail);

  // ── External recipient detection for ECIES warning ──────────────────
  const emailDomain = getEmailDomain();
  const ccAddresses = cc
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const bccAddresses = bcc
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allRecipients = [...toAddresses, ...ccAddresses, ...bccAddresses];
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

  // ── Pre-select encryption scheme from default preference ────────────
  useEffect(() => {
    if (!defaultPreference || !preferenceLoaded) return;
    // Check if the preferred scheme is available
    const schemeAvailable = isSchemeAvailable(
      defaultPreference,
      hasAnyGpgKey,
      hasAnySmimeCert,
      hasExternalRecipients,
    );
    if (schemeAvailable) {
      setEncryptionScheme(defaultPreference);
    } else {
      // Fall back to NONE
      setEncryptionScheme(MessageEncryptionScheme.NONE);
    }
  }, [
    defaultPreference,
    preferenceLoaded,
    hasAnyGpgKey,
    hasAnySmimeCert,
    hasExternalRecipients,
  ]);

  // ── Passphrase dialog handlers ──────────────────────────────────────
  const handlePassphraseSubmit = useCallback(
    (passphrase: string) => {
      setShowPassphraseDialog(false);
      if (pendingPassphraseCallback) {
        pendingPassphraseCallback(passphrase);
        setPendingPassphraseCallback(null);
      }
    },
    [pendingPassphraseCallback],
  );

  const handlePassphraseCancel = useCallback(() => {
    setShowPassphraseDialog(false);
    setPendingPassphraseCallback(null);
  }, []);

  const handleSend = useCallback(async () => {
    if (!hasValidRecipient) return;

    // If GPG is selected, prompt for passphrase before sending
    if (encryptionScheme === MessageEncryptionScheme.GPG) {
      setShowPassphraseDialog(true);
      setPendingPassphraseCallback(() => async (_passphrase: string) => {
        // Passphrase collected — proceed with send
        setSending(true);
        try {
          const toMailboxes = mapRecipientsToMailboxes(toAddresses);
          const ccMailboxes = mapRecipientsToMailboxes(
            cc
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          );
          const bccMailboxes = mapRecipientsToMailboxes(
            bcc
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          );
          const fromMailbox = toMailboxes[0];
          const attachmentInputs: AttachmentInput[] = await Promise.all(
            attachments.map(async (att) => ({
              filename: att.filename,
              mimeType: att.mimeType,
              data: att.base64Data ?? (await fileToBase64(att.file)),
            })),
          );
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
          setSnackbar({
            open: true,
            message: t(BrightMailStrings.Compose_SendSuccess),
            severity: 'success',
          });
          // Wait for the success Snackbar's autoHideDuration (4000ms) to
          // elapse before unmounting; the Snackbar lives inside this
          // component and would otherwise vanish with it.
          if (onClose) setTimeout(() => onClose(), 4500);
        } catch {
          setSnackbar({
            open: true,
            message: t(BrightMailStrings.Compose_SendError),
            severity: 'error',
          });
        } finally {
          setSending(false);
        }
      });
      return;
    }

    setSending(true);

    try {
      const toMailboxes = mapRecipientsToMailboxes(toAddresses);
      const ccMailboxes = mapRecipientsToMailboxes(
        cc
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const bccMailboxes = mapRecipientsToMailboxes(
        bcc
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );

      // Use the first To address as the from address for now
      const fromMailbox = toMailboxes[0];

      // Convert AttachmentFile[] to AttachmentInput[] (base64)
      const attachmentInputs: AttachmentInput[] = await Promise.all(
        attachments.map(async (att) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          data: att.base64Data ?? (await fileToBase64(att.file)),
        })),
      );

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

      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Compose_SendSuccess),
        severity: 'success',
      });

      // Close form on success after the success Snackbar's autoHideDuration
      // (4000ms) so the green confirmation is fully visible.
      if (onClose) {
        setTimeout(() => onClose(), 4500);
      }
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
    toAddresses,
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

  return (
    <Box component="form" noValidate data-testid="compose-form">
      <TextField
        id="compose-to"
        label={t(BrightMailStrings.Compose_To)}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        fullWidth
        margin="normal"
        required
        inputProps={{
          'aria-label': t(BrightMailStrings.Compose_To),
        }}
      />
      <TextField
        id="compose-cc"
        label={t(BrightMailStrings.Compose_Cc)}
        value={cc}
        onChange={(e) => setCc(e.target.value)}
        fullWidth
        margin="normal"
        inputProps={{
          'aria-label': t(BrightMailStrings.Compose_Cc),
        }}
      />
      <TextField
        id="compose-bcc"
        label={t(BrightMailStrings.Compose_Bcc)}
        value={bcc}
        onChange={(e) => setBcc(e.target.value)}
        fullWidth
        margin="normal"
        inputProps={{
          'aria-label': t(BrightMailStrings.Compose_Bcc),
        }}
      />
      <TextField
        id="compose-subject"
        label={t(BrightMailStrings.Compose_Subject)}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        fullWidth
        margin="normal"
        inputProps={{
          'aria-label': t(BrightMailStrings.Compose_Subject),
        }}
      />
      <RichTextEditor
        value={htmlBody}
        onChange={(html, text) => {
          setHtmlBody(html);
          setTextBody(text);
        }}
      />

      <AttachmentBar attachments={attachments} onChange={setAttachments} />

      {!hasValidRecipient && to.length > 0 && (
        <Typography
          variant="caption"
          color="error"
          role="alert"
          data-testid="validation-error"
        >
          {t(BrightMailStrings.Compose_InvalidRecipient)}
        </Typography>
      )}

      <Box mt={2} display="flex" gap={1} alignItems="center">
        <EncryptionSelector
          value={encryptionScheme}
          onChange={setEncryptionScheme}
          externalRecipientWarning={externalRecipientWarning}
          hasGpgKey={hasAnyGpgKey}
          hasSmimeCert={hasAnySmimeCert}
          hasExternalRecipients={hasExternalRecipients}
          recipientWarnings={recipientWarnings}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!hasValidRecipient || sending || hasExternalWithEncryption}
          data-testid="send-button"
        >
          {t(BrightMailStrings.Compose_Send)}
        </Button>
        {onClose && (
          <Button
            variant="outlined"
            onClick={onClose}
            data-testid="cancel-button"
          >
            {t(BrightMailStrings.Action_Cancel)}
          </Button>
        )}
      </Box>

      <PassphraseDialog
        open={showPassphraseDialog}
        onSubmit={handlePassphraseSubmit}
        onCancel={handlePassphraseCancel}
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

export default memo(ComposeView);
