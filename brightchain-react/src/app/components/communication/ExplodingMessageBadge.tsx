/**
 * ExplodingMessageBadge — Visual indicator for self-destructing messages.
 *
 * Displays a countdown timer and/or read count for exploding messages.
 *
 * Requirements: 8.8
 */

import { Box, Chip, Typography } from '@mui/material';
import { FC, useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExplodingMessageBadgeProps {
  /** When the message expires (ISO string or Date) */
  expiresAt?: string | Date;
  /** Maximum reads before explosion */
  maxReads?: number;
  /** Current read count */
  readCount?: number;
  /** Whether the message has already exploded */
  exploded?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ExplodingMessageBadge: FC<ExplodingMessageBadgeProps> = ({
  expiresAt,
  maxReads,
  readCount,
  exploded,
}) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt || exploded) return;

    const expiry =
      typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;

    const update = () => {
      const ms = expiry.getTime() - Date.now();
      setRemaining(Math.max(0, ms));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, exploded]);

  if (exploded) {
    return (
      <Chip
        label="💥 Message exploded"
        size="small"
        color="error"
        variant="outlined"
      />
    );
  }

  const hasTimer = expiresAt !== undefined;
  const hasReadLimit = maxReads !== undefined;

  if (!hasTimer && !hasReadLimit) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {hasTimer && remaining !== null && (
        <Chip
          label={`⏱ ${formatTimeRemaining(remaining)}`}
          size="small"
          color={remaining < 60_000 ? 'error' : 'warning'}
          variant="outlined"
        />
      )}
      {hasReadLimit && (
        <Chip
          label={`👁 ${readCount ?? 0}/${maxReads}`}
          size="small"
          color={
            readCount !== undefined && readCount >= maxReads!
              ? 'error'
              : 'default'
          }
          variant="outlined"
        />
      )}
      <Typography variant="caption" color="text.secondary">
        💣
      </Typography>
    </Box>
  );
};
