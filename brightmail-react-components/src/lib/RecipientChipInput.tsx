/**
 * RecipientChipInput — Converts typed/pasted email addresses into MUI Chips.
 *
 * - Commits on Enter, Tab, or comma (Requirement 4.1)
 * - Each chip shows email text + remove (×) button (Requirement 4.2)
 * - Remove button removes the chip (Requirement 4.3)
 * - Invalid emails render with color="error" (Requirement 4.4)
 * - Paste of comma-separated addresses splits and converts each (Requirement 4.5)
 * - aria-live="polite" region for chip add/remove announcements (Requirement 8.5)
 */

import { BrightMailStrings } from '@brightchain/brightmail-lib';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import {
  ClipboardEvent,
  FC,
  KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface RecipientChipInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  label: string;
  error?: boolean;
  /** Optional map of email → verification status for chip coloring. */
  chipStatuses?: Record<string, 'valid' | 'warning' | 'error'>;
  /** Called when a new chip is committed (for triggering verification). */
  onChipCommit?: (email: string) => void;
  /** The local email domain (used in warning tooltip text). */
  emailDomain?: string;
}

// ─── Email validation ───────────────────────────────────────────────────────

/**
 * Basic email validation.
 * Checks for non-empty local part, single @, and domain with at least one dot.
 *
 * Exported for property testing (Properties 5, 7, 8).
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;

  const atIndex = trimmed.indexOf('@');
  // Must have exactly one @
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  // Local part must be non-empty
  if (localPart.length === 0) return false;

  // Domain must have at least one dot and non-empty parts
  const dotIndex = domain.indexOf('.');
  if (dotIndex <= 0 || dotIndex === domain.length - 1) return false;

  return true;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Split a raw string on commas, trim each part, and filter out empties. */
function splitEmails(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─── Component ──────────────────────────────────────────────────────────────

const RecipientChipInput: FC<RecipientChipInputProps> = ({
  value,
  onChange,
  label,
  error,
  chipStatuses,
  onChipCommit,
  emailDomain,
}) => {
  const { t } = useBrightMailTranslation();
  const [inputValue, setInputValue] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** Commit one or more email strings to the chip list. */
  const commitEmails = useCallback(
    (raw: string) => {
      const parts = splitEmails(raw);
      if (parts.length === 0) return;

      const newEmails = [...value, ...parts];
      onChange(newEmails);

      // Notify parent of each newly committed email (for verification)
      if (onChipCommit) {
        for (const email of parts) {
          onChipCommit(email);
        }
      }

      // Build announcement for screen readers
      const added = parts.join(', ');
      setAnnouncement(
        parts.length === 1
          ? t(BrightMailStrings.Recipient_AddedOneTemplate).replace(
              '{EMAIL}',
              added,
            )
          : t(BrightMailStrings.Recipient_AddedManyTemplate).replace(
              '{EMAILS}',
              added,
            ),
      );
      setInputValue('');
    },
    [value, onChange, onChipCommit],
  );

  /** Handle key presses that commit the current input. */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        const trimmed = inputValue.trim();
        if (trimmed.length > 0) {
          e.preventDefault();
          commitEmails(trimmed);
        }
      }
      // Comma triggers commit (the comma character itself should not appear in input)
      if (e.key === ',') {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed.length > 0) {
          commitEmails(trimmed);
        }
      }
      // Backspace on empty input removes the last chip
      if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
        const removed = value[value.length - 1];
        onChange(value.slice(0, -1));
        setAnnouncement(
          t(BrightMailStrings.Recipient_RemovedTemplate).replace(
            '{EMAIL}',
            removed,
          ),
        );
      }
    },
    [inputValue, commitEmails, value, onChange],
  );

  /** Handle paste of comma-separated addresses. */
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      const pasted = e.clipboardData.getData('text');
      if (pasted.includes(',')) {
        e.preventDefault();
        commitEmails(pasted);
      }
    },
    [commitEmails],
  );

  /** Remove a chip at a given index. */
  const handleDelete = useCallback(
    (index: number) => {
      const removed = value[index];
      const next = value.filter((_, i) => i !== index);
      onChange(next);
      setAnnouncement(
        t(BrightMailStrings.Recipient_RemovedTemplate).replace(
          '{EMAIL}',
          removed,
        ),
      );
      // Return focus to the input after removal
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  return (
    <Box data-testid="recipient-chip-input">
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center',
          mb: value.length > 0 ? 0.5 : 0,
        }}
      >
        {value.map((email, index) => {
          const valid = isValidEmail(email);
          const status = chipStatuses?.[email];

          // Determine chip color based on verification status or validity
          let chipColor: 'default' | 'error' | 'warning' | 'success' = valid
            ? 'default'
            : 'error';
          if (status === 'warning') chipColor = 'warning';
          else if (status === 'error') chipColor = 'error';
          else if (status === 'valid') chipColor = 'success';
          else if (!valid) chipColor = 'error';

          // Build tooltip for warning status
          const tooltipText =
            status === 'warning'
              ? t(BrightMailStrings.Recipient_NotFoundTemplate)
                  .replace('{LOCAL}', email.split('@')[0])
                  .replace('{DOMAIN}', emailDomain ?? 'this domain')
              : '';

          const chip = (
            <Chip
              key={`${email}-${index}`}
              label={email}
              onDelete={() => handleDelete(index)}
              color={chipColor}
              size="small"
              data-testid={
                !valid
                  ? 'recipient-chip-error'
                  : status === 'warning'
                    ? 'recipient-chip-warning'
                    : 'recipient-chip'
              }
            />
          );

          return tooltipText ? (
            <Tooltip key={`${email}-${index}`} title={tooltipText}>
              {chip}
            </Tooltip>
          ) : (
            chip
          );
        })}
      </Box>

      <TextField
        inputRef={inputRef}
        label={label}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        error={error}
        fullWidth
        size="small"
        variant="outlined"
        inputProps={{
          'aria-label': label,
        }}
      />

      {/* Screen reader announcements */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        data-testid="recipient-aria-live"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </Box>
    </Box>
  );
};

export default RecipientChipInput;
