/**
 * KeyRotationNotice — Inline system message for key rotation events.
 *
 * Renders a lock icon and descriptive text explaining why the encryption key
 * was rotated (member joined, left, or removed). Displayed inline in the
 * message thread at the chronological position of the event.
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5, 7.1, 7.4, 8.1, 9.6
 */

import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import LockIcon from '@mui/icons-material/Lock';
import { Box, Typography } from '@mui/material';
import { FC, memo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type KeyRotationReason =
  | 'member_joined'
  | 'member_left'
  | 'member_removed';

export interface KeyRotationNoticeProps {
  reason: KeyRotationReason;
  timestamp: Date | string;
}

// ─── Reason → i18n string key mapping ───────────────────────────────────────

const REASON_STRING_KEYS: Record<KeyRotationReason, string> = {
  member_joined: BrightChatStrings.KeyRotation_MemberJoined,
  member_left: BrightChatStrings.KeyRotation_MemberLeft,
  member_removed: BrightChatStrings.KeyRotation_MemberRemoved,
};

// ─── Component ──────────────────────────────────────────────────────────────

const KeyRotationNotice: FC<KeyRotationNoticeProps> = ({ reason }) => {
  const { tBranded: t } = useI18n();

  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="key-rotation-notice"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        py: 0.5,
        userSelect: 'none',
      }}
    >
      <LockIcon
        aria-hidden="true"
        sx={{ fontSize: 14, color: 'text.secondary' }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t(REASON_STRING_KEYS[reason])}
      </Typography>
    </Box>
  );
};

export default memo(KeyRotationNotice);
