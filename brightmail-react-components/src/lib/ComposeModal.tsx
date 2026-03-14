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

import { BrightMailStrings } from '@brightchain/brightmail-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CloseIcon from '@mui/icons-material/Close';
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
import {
  FC,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useBrightMail, type ComposePrefill } from './BrightMailContext';
import RecipientChipInput from './RecipientChipInput';
import { useEmailApi } from './hooks/useEmailApi';
import {
  isValidEmail,
  mapRecipientsToMailboxes,
} from './ComposeView';

// ─── Constants ──────────────────────────────────────────────────────────────

const MODAL_WIDTH = 480;
const TITLE_BAR_HEIGHT = 48;

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
 * Returns true when the body (after trimming) is non-empty.
 *
 * Exported for Property 9 testing.
 */
export function shouldConfirmClose(body: string): boolean {
  return body.trim().length > 0;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ComposeModalProps {
  open: boolean;
  minimized: boolean;
  prefill?: ComposePrefill;
  onClose: () => void;
  onMinimize: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const ComposeModalInner: FC<ComposeModalProps> = ({
  open,
  minimized,
  prefill,
  onClose,
  onMinimize,
}) => {
  const { tBranded: t } = useI18n();
  const emailApi = useEmailApi();
  const isMobile = useMediaQuery('(max-width:600px)');

  // ── Form state ──────────────────────────────────────────────────────────
  const [to, setTo] = useState<string[]>(prefill?.to ?? []);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(prefill?.subject ?? '');
  const [body, setBody] = useState(prefill?.body ?? '');
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // ── Drag state ──────────────────────────────────────────────────────────
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

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
      setBody(prefill.body ?? '');
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
  }, [open, minimized, body]);

  // ── Drag handlers ─────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile || minimized) return;
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isMobile, minimized, position],
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
    if (shouldConfirmClose(body)) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [body, onClose]);

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

  // ── Send handler ──────────────────────────────────────────────────────
  const hasValidRecipient = to.some(isValidEmail);

  const handleSend = useCallback(async () => {
    if (!hasValidRecipient) return;
    setSending(true);

    try {
      const toMailboxes = mapRecipientsToMailboxes(to);
      const ccMailboxes = mapRecipientsToMailboxes(cc);
      const bccMailboxes = mapRecipientsToMailboxes(bcc);

      const fromMailbox = toMailboxes[0];

      await emailApi.sendEmail({
        from: fromMailbox,
        to: toMailboxes,
        cc: ccMailboxes.length > 0 ? ccMailboxes : undefined,
        bcc: bccMailboxes.length > 0 ? bccMailboxes : undefined,
        subject: subject || undefined,
        textBody: body || undefined,
      });

      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Compose_SendSuccess),
        severity: 'success',
      });

      setTimeout(() => onClose(), 1500);
    } catch {
      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Compose_SendError),
        severity: 'error',
      });
    } finally {
      setSending(false);
    }
  }, [hasValidRecipient, to, cc, bcc, subject, body, t, onClose, emailApi]);

  // ── Title text ────────────────────────────────────────────────────────
  const titleText = subject || 'New Message';

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
        cursor: !isMobile && !minimized ? 'grab' : 'default',
        userSelect: 'none',
        borderTopLeftRadius: isMobile ? 0 : 8,
        borderTopRightRadius: isMobile ? 0 : 8,
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
          <Tooltip title="Restore">
            <IconButton
              size="small"
              onClick={handleRestore}
              sx={{ color: 'inherit' }}
              aria-label="Restore compose"
            >
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Minimize">
            <IconButton
              data-testid="compose-minimize-btn"
              size="small"
              onClick={onMinimize}
              sx={{ color: 'inherit' }}
              aria-label="Minimize compose"
            >
              <MinimizeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Close">
          <IconButton
            data-testid="compose-close-btn"
            size="small"
            onClick={handleCloseAttempt}
            sx={{ color: 'inherit' }}
            aria-label="Close compose"
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
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto', flexGrow: 1 }}>
      <RecipientChipInput
        value={to}
        onChange={setTo}
        label={t(BrightMailStrings.Compose_To)}
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
      <TextField
        data-testid="compose-body-field"
        label={t(BrightMailStrings.Compose_Body)}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        fullWidth
        multiline
        minRows={isMobile ? 8 : 4}
        inputProps={{
          'aria-label': t(BrightMailStrings.Compose_Body),
        }}
      />

      {!hasValidRecipient && to.length > 0 && (
        <Typography variant="caption" color="error" role="alert">
          {t(BrightMailStrings.Compose_InvalidRecipient)}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!hasValidRecipient || sending}
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
          Discard draft?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your message has unsaved content. Discard it?
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
            Discard
          </Button>
        </Box>
      </Card>
    </Box>
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
          onOpen={() => {/* required by SwipeableDrawer */}}
          disableSwipeToOpen
          PaperProps={{
            sx: { height: '100vh' },
            'data-testid': 'compose-modal',
            role: 'dialog',
            'aria-label': titleText,
          } as any}
        >
          <Box
            ref={modalRef}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
          >
            {titleBar}
            {composeBody}
            {confirmDialog}
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
      </>
    );
  }

  // ── Desktop: floating card ────────────────────────────────────────────
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
      </Card>
      {snackbarEl}
    </>
  );
};

// ─── Portal wrapper that reads from BrightMailContext ────────────────────────

const ComposeModal: FC = () => {
  const { composeModal, closeCompose, minimizeCompose } = useBrightMail();

  if (composeModal.status === 'closed') return null;

  const { prefill, minimized } = composeModal;

  const portalContent = (
    <ComposeModalInner
      open={true}
      minimized={minimized}
      prefill={prefill}
      onClose={closeCompose}
      onMinimize={minimizeCompose}
    />
  );

  return createPortal(portalContent, document.body);
};

export { ComposeModalInner };
export default memo(ComposeModal);
