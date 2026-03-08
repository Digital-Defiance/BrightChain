/**
 * EmailRow — A single email summary row for the modern email list.
 *
 * Renders a MUI ListItem with:
 * - Left: Checkbox + AvatarCircle
 * - Center: Two-line layout (sender + date / subject + body snippet)
 * - Right: Star toggle + optional label chips
 *
 * Unread emails get bold text and a primary-colored left border.
 * Hover applies a subtle background transition.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.2, 7.3
 */

import { IEmailMetadata } from '@brightchain/brightchain-lib';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { FC, memo, MouseEvent, useCallback, useState } from 'react';

import AvatarCircle from './AvatarCircle';
import { formatDateLocale } from './dateFormatting';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EmailRowProps {
  email: IEmailMetadata;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
  locale?: string;
}

// ─── Helpers (exported for property tests) ──────────────────────────────────

/**
 * Extracts a display-friendly sender name from an IMailbox.
 * Falls back to the full address if no displayName is set.
 */
export function getSenderDisplay(email: IEmailMetadata): string {
  if (email.from?.displayName) {
    return email.from.displayName;
  }
  if (email.from?.address) {
    return email.from.address;
  }
  if (email.from?.localPart && email.from?.domain) {
    return `${email.from.localPart}@${email.from.domain}`;
  }
  return '';
}

/**
 * Truncates a body string to at most `maxLen` characters.
 * Appends "…" if truncation occurs.
 *
 * Exported for property testing (Property 2).
 */
export function truncateSnippet(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

/**
 * Determines whether an email is read based on its readReceipts map.
 * An email is considered read if readReceipts has at least one entry.
 */
export function isEmailRead(email: IEmailMetadata): boolean {
  return email.readReceipts != null && email.readReceipts.size > 0;
}

// ─── Component ──────────────────────────────────────────────────────────────

const EmailRow: FC<EmailRowProps> = ({
  email,
  selected,
  onToggleSelect,
  onClick,
  locale,
}) => {
  const theme = useTheme();
  const [starred, setStarred] = useState(false);

  const read = isEmailRead(email);
  const senderName = getSenderDisplay(email);
  const subject = email.subject ?? '';
  const dateStr = formatDateLocale(email.date, locale);
  const fontWeight = read ? 400 : 600;

  // Labels from the keywords field (if present)
  const labels: string[] = email.keywords ?? [];

  const handleStarClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setStarred((prev) => !prev);
    },
    [],
  );

  const handleCheckboxClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onToggleSelect();
    },
    [onToggleSelect],
  );

  return (
    <ListItem
      disablePadding
      data-testid={`email-row-${email.messageId}`}
      sx={{
        borderLeft: read
          ? '3px solid transparent'
          : `3px solid ${theme.palette.primary.main}`,
      }}
    >
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          transition: 'background-color 150ms ease',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          py: 1,
          px: 1.5,
          gap: 1.5,
        }}
      >
        {/* Left section: Checkbox + Avatar */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}
        >
          <Checkbox
            checked={selected}
            onClick={handleCheckboxClick}
            inputProps={{
              'aria-label': `Select email from ${senderName}`,
            }}
            size="small"
          />
          <AvatarCircle displayName={senderName} size={36} />
        </Box>

        {/* Center section: Two-line layout */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Line 1: Sender name + date */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              noWrap
              data-testid="email-sender"
              sx={{ fontWeight, flex: 1, minWidth: 0 }}
            >
              {senderName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              data-testid="email-date"
              sx={{ flexShrink: 0 }}
            >
              {dateStr}
            </Typography>
          </Box>

          {/* Line 2: Subject + body snippet */}
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            data-testid="email-subject"
            sx={{ fontWeight: read ? 400 : 600 }}
          >
            {subject}
            {subject && ' — '}
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 400 }}
              data-testid="email-snippet"
            >
              {truncateSnippet('')}
            </Typography>
          </Typography>
        </Box>

        {/* Right section: Star toggle + label chips */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          {labels.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              data-testid="email-label-chip"
            />
          ))}
          <Tooltip title={starred ? 'Unstar' : 'Star'}>
            <IconButton
              size="small"
              onClick={handleStarClick}
              aria-label={starred ? 'Unstar' : 'Star'}
              data-testid="star-toggle"
            >
              {starred ? (
                <StarIcon sx={{ color: theme.palette.warning.main }} />
              ) : (
                <StarBorderIcon />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </ListItemButton>
    </ListItem>
  );
};

export default memo(EmailRow);
