/**
 * InboxView — Primary BrightMail inbox with paginated email list,
 * bulk actions, unread count, and loading/error/empty states.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 7.1
 */

import { IEmailMetadata } from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Snackbar,
  Toolbar,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FC, memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// EmailApiClient is provided by the consuming application (brightchain-react)
// via tsconfig path mapping: @brightchain/brightchain-react/services/emailApi
import { useBrightMail } from './BrightMailContext';
import { buildDeleteErrorMessage, bulkDelete } from './bulkActions';
import ConfirmDialog from './ConfirmDialog';
import EmailList from './EmailList';
import { useEmailApi } from './hooks/useEmailApi';

// ─── Scroll position preservation ─────────────────────────────────────
const SCROLL_STORAGE_KEY = 'brightmail-inbox-scroll';
const PAGE_STORAGE_KEY = 'brightmail-inbox-page';

function saveScrollState(scrollTop: number, page: number): void {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, String(scrollTop));
    sessionStorage.setItem(PAGE_STORAGE_KEY, String(page));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

function loadScrollState(): { scrollTop: number; page: number } | null {
  try {
    const scrollTop = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    const page = sessionStorage.getItem(PAGE_STORAGE_KEY);
    if (scrollTop !== null && page !== null) {
      return { scrollTop: Number(scrollTop), page: Number(page) };
    }
  } catch {
    // sessionStorage may be unavailable
  }
  return null;
}

function clearScrollState(): void {
  try {
    sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    sessionStorage.removeItem(PAGE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export {
  clearScrollState,
  loadScrollState,
  PAGE_STORAGE_KEY,
  saveScrollState,
  SCROLL_STORAGE_KEY,
};

interface InboxState {
  emails: IEmailMetadata[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  selectedIds: Set<string>;
}

const INITIAL_STATE: InboxState = {
  emails: [],
  totalCount: 0,
  unreadCount: 0,
  page: 1,
  pageSize: 20,
  hasMore: false,
  loading: true,
  loadingMore: false,
  error: null,
  selectedIds: new Set(),
};

export interface InboxViewProps {
  /** Mail folder to display. Defaults to 'inbox'. */
  folder?: 'inbox' | 'sent' | 'drafts' | 'trash';
}

const InboxView: FC<InboxViewProps> = ({ folder = 'inbox' }) => {
  const { tBranded: t } = useI18n();
  const emailApi = useEmailApi();
  const navigate = useNavigate();
  const { setSelectedEmailId } = useBrightMail();
  const isWideDesktop = useMediaQuery('(min-width:1280px)');

  const [state, setState] = useState<InboxState>(INITIAL_STATE);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredScrollRef = useRef(false);

  // ─── Fetch first page on mount (or restore saved page) ─────────────
  const fetchInbox = useCallback(
    async (page = 1, append = false) => {
      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      try {
        const result = await emailApi.queryInbox({
          page: String(page),
          pageSize: String(state.pageSize),
        });

        setState((prev) => ({
          ...prev,
          emails: append ? [...prev.emails, ...result.emails] : result.emails,
          totalCount: result.totalCount,
          unreadCount: result.unreadCount,
          page: result.page,
          hasMore: result.hasMore,
          loading: false,
          loadingMore: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [state.pageSize],
  );

  // Fetch unread count separately
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await emailApi.getUnreadCount();
      setState((prev) => ({ ...prev, unreadCount: result.unreadCount }));
    } catch {
      // Silently ignore unread count errors
    }
  }, []);

  // On mount: restore saved pagination state or fetch page 1
  useEffect(() => {
    const saved = loadScrollState();
    if (saved && saved.page > 1) {
      // Fetch all pages up to the saved page to restore full list
      const fetchAllPages = async () => {
        for (let p = 1; p <= saved.page; p++) {
          await fetchInbox(p, p > 1);
        }
      };
      fetchAllPages();
    } else {
      fetchInbox(1);
    }
    fetchUnreadCount();
  }, []);

  // Restore scroll position after emails are loaded
  useEffect(() => {
    if (
      !restoredScrollRef.current &&
      !state.loading &&
      state.emails.length > 0 &&
      scrollRef.current
    ) {
      const saved = loadScrollState();
      if (saved) {
        scrollRef.current.scrollTop = saved.scrollTop;
        clearScrollState();
      }
      restoredScrollRef.current = true;
    }
  }, [state.loading, state.emails.length]);

  // ─── Scroll-based pagination ────────────────────────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // Persist scroll position for restoration after navigation
      saveScrollState(scrollTop, state.page);

      if (
        scrollHeight - scrollTop - clientHeight < 100 &&
        state.hasMore &&
        !state.loadingMore &&
        !state.loading
      ) {
        fetchInbox(state.page + 1, true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [state.hasMore, state.loadingMore, state.loading, state.page, fetchInbox]);

  // ─── Selection handlers ─────────────────────────────────────────────
  const handleToggleSelect = useCallback((messageId: string) => {
    setState((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return { ...prev, selectedIds: next };
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setState((prev) => {
      if (prev.selectedIds.size === prev.emails.length) {
        return { ...prev, selectedIds: new Set() };
      }
      return {
        ...prev,
        selectedIds: new Set(prev.emails.map((e) => e.messageId)),
      };
    });
  }, []);

  // ─── Bulk actions ───────────────────────────────────────────────────
  const handleBulkDelete = useCallback(async () => {
    setDeleteConfirmOpen(false);
    const ids = Array.from(state.selectedIds);

    const { failed } = await bulkDelete(ids, (id) => emailApi.deleteEmail(id));

    if (failed.length > 0) {
      const template = t(BrightMailStrings.Delete_ErrorTemplate);
      setSnackbar({
        open: true,
        message: failed
          .map((id) => buildDeleteErrorMessage(template, id))
          .join('; '),
        severity: 'error',
      });
    } else {
      setSnackbar({
        open: true,
        message: t(BrightMailStrings.Delete_Success),
        severity: 'success',
      });
    }

    // Remove successfully deleted emails from view
    setState((prev) => ({
      ...prev,
      emails: prev.emails.filter(
        (e) => failed.includes(e.messageId) || !ids.includes(e.messageId),
      ),
      selectedIds: new Set(failed),
    }));
    fetchUnreadCount();
  }, [state.selectedIds, t, fetchUnreadCount]);

  const handleBulkMarkAsRead = useCallback(async () => {
    const ids = Array.from(state.selectedIds);
    for (const id of ids) {
      try {
        await emailApi.markAsRead(id);
      } catch {
        // ignore individual failures
      }
    }
    setState((prev) => ({ ...prev, selectedIds: new Set() }));
    fetchInbox(1);
    fetchUnreadCount();
  }, [state.selectedIds, fetchInbox, fetchUnreadCount]);

  const hasSelection = state.selectedIds.size > 0;

  // ─── Email click: wide → reading pane, narrow → navigate ──────────
  const handleEmailClick = useCallback(
    (messageId: string) => {
      if (isWideDesktop) {
        setSelectedEmailId(messageId);
      } else {
        navigate(`/brightmail/thread/${encodeURIComponent(messageId)}`);
      }
    },
    [isWideDesktop, setSelectedEmailId, navigate],
  );

  // ─── Render ─────────────────────────────────────────────────────────

  // Loading skeleton
  if (state.loading) {
    return (
      <Box data-testid="inbox-loading">
        <Typography variant="h6">
          {t(BrightMailStrings.Inbox_Title)}
        </Typography>
        <Typography variant="body2" aria-live="polite">
          {t(BrightMailStrings.Loading)}
        </Typography>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} sx={{ my: 1 }} />
        ))}
      </Box>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Box data-testid="inbox-error">
        <Typography variant="h6">
          {t(BrightMailStrings.Inbox_Title)}
        </Typography>
        <Alert severity="error" role="alert">
          {t(BrightMailStrings.Inbox_Error)}
        </Alert>
        <Button
          onClick={() => fetchInbox(1)}
          variant="outlined"
          sx={{ mt: 1 }}
          data-testid="inbox-retry"
        >
          {t(BrightMailStrings.Inbox_Retry)}
        </Button>
      </Box>
    );
  }

  // Empty state
  if (state.emails.length === 0) {
    return (
      <Box data-testid="inbox-empty">
        <Typography variant="h6">
          {t(BrightMailStrings.Inbox_Title)}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {t(BrightMailStrings.Inbox_Empty)}
        </Typography>
      </Box>
    );
  }

  const unreadText = t(
    BrightMailStrings.Inbox_UnreadCountTemplate,
  ).replace('{COUNT}', String(state.unreadCount));

  const bulkDeleteMessage = t(
    BrightMailStrings.Delete_ConfirmBulkTemplate,
  ).replace('{COUNT}', String(state.selectedIds.size));

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
      >
        <Typography variant="h6">
          {t(BrightMailStrings.Inbox_Title)}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="unread-count"
        >
          {unreadText}
        </Typography>
      </Box>

      {hasSelection && (
        <Toolbar
          variant="dense"
          sx={{ gap: 1, pl: 0 }}
          data-testid="bulk-actions"
        >
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            {t(BrightMailStrings.Action_Delete)}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleBulkMarkAsRead}
          >
            {t(BrightMailStrings.Action_MarkAsRead)}
          </Button>
        </Toolbar>
      )}

      <Box
        ref={scrollRef}
        sx={{ maxHeight: '70vh', overflowY: 'auto' }}
        data-testid="inbox-scroll-container"
      >
        <EmailList
          emails={state.emails}
          selectedIds={state.selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onEmailClick={handleEmailClick}
          loading={false}
        />
        {state.loadingMore && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t(BrightMailStrings.Action_Delete)}
        message={bulkDeleteMessage}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
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

export default memo(InboxView);
