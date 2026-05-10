/**
 * EmailList — Modern MUI List-based email list replacing EmailListTable.
 *
 * Renders EmailRow items in a MUI List with:
 * - Loading skeleton state (5 placeholder rows)
 * - Keyboard navigation (arrow keys, Enter, Space)
 * - Checkbox selection with select-all support
 * - Click-to-navigate to thread view
 *
 * Requirements: 3.1, 3.7, 3.8, 3.9, 8.2
 */

import { IEmailMetadata } from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Skeleton from '@mui/material/Skeleton';
import Toolbar from '@mui/material/Toolbar';
import { FC, KeyboardEvent, memo, useCallback, useRef } from 'react';

import EmailRow from './EmailRow';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EmailListProps {
  emails: IEmailMetadata[];
  selectedIds: Set<string>;
  onToggleSelect: (messageId: string) => void;
  onToggleSelectAll: () => void;
  onEmailClick?: (messageId: string) => void;
  loading?: boolean;
  locale?: string;
}

// ─── Helpers (exported for property testing — Property 4) ───────────────────

/**
 * Toggles a value in a Set: adds it if absent, removes it if present.
 * Returns a new Set — the original is not mutated.
 *
 * Exported for property testing (Property 4).
 */
export function toggleSelection(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

// ─── Skeleton loader ────────────────────────────────────────────────────────

const SKELETON_COUNT = 5;

function EmailListSkeleton() {
  return (
    <Box data-testid="email-list-skeleton">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <ListItem key={i} disablePadding sx={{ py: 0.5, px: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              width: '100%',
              py: 1,
            }}
          >
            {/* Checkbox placeholder */}
            <Skeleton
              variant="rectangular"
              width={20}
              height={20}
              sx={{ borderRadius: 0.5 }}
            />
            {/* Avatar placeholder */}
            <Skeleton variant="circular" width={36} height={36} />
            {/* Text lines */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="85%" height={18} />
            </Box>
            {/* Star placeholder */}
            <Skeleton variant="circular" width={24} height={24} />
          </Box>
        </ListItem>
      ))}
    </Box>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const EmailList: FC<EmailListProps> = ({
  emails,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEmailClick,
  loading = false,
  locale,
}) => {
  const { t } = useBrightMailTranslation();
  const listRef = useRef<HTMLUListElement>(null);

  // ── Select-all state ────────────────────────────────────────────────
  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  // ── Get focusable row elements ──────────────────────────────────────
  const getRowElements = useCallback((): HTMLElement[] => {
    if (!listRef.current) return [];
    return Array.from(
      listRef.current.querySelectorAll<HTMLElement>(
        '[data-testid^="email-row-"]',
      ),
    );
  }, []);

  // ── Keyboard navigation handler (Requirement 8.2) ──────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      const rows = getRowElements();
      if (rows.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      // Find the closest email-row ancestor of the active element
      const currentRow = activeEl?.closest(
        '[data-testid^="email-row-"]',
      ) as HTMLElement | null;
      const currentIndex = currentRow ? rows.indexOf(currentRow) : -1;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = Math.min(currentIndex + 1, rows.length - 1);
          const nextButton =
            rows[nextIndex]?.querySelector<HTMLElement>('[role="button"]');
          if (nextButton) nextButton.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          const prevButton =
            rows[prevIndex]?.querySelector<HTMLElement>('[role="button"]');
          if (prevButton) prevButton.focus();
          break;
        }
        case 'Enter': {
          if (currentIndex >= 0 && currentIndex < emails.length) {
            e.preventDefault();
            onEmailClick?.(emails[currentIndex].messageId);
          }
          break;
        }
        case ' ': {
          if (currentIndex >= 0 && currentIndex < emails.length) {
            e.preventDefault();
            onToggleSelect(emails[currentIndex].messageId);
          }
          break;
        }
        default:
          break;
      }
    },
    [emails, getRowElements, onEmailClick, onToggleSelect],
  );

  // ── Loading state (Requirement 3.9) ─────────────────────────────────
  if (loading) {
    return <EmailListSkeleton />;
  }

  return (
    <Box data-testid="email-list">
      {/* Select-all toolbar */}
      <Toolbar variant="dense" disableGutters sx={{ px: 1.5, minHeight: 40 }}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={onToggleSelectAll}
          inputProps={{
            'aria-label': t(BrightMailStrings.EmailList_SelectAll),
          }}
          size="small"
        />
      </Toolbar>

      {/* Email rows */}
      <List
        ref={listRef}
        disablePadding
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-label={t(BrightMailStrings.EmailList_AriaLabel)}
      >
        {emails.map((email) => (
          <EmailRow
            key={email.messageId}
            email={email}
            selected={selectedIds.has(email.messageId)}
            onToggleSelect={() => onToggleSelect(email.messageId)}
            onClick={() => onEmailClick?.(email.messageId)}
            locale={locale}
          />
        ))}
      </List>
    </Box>
  );
};

export default memo(EmailList);
