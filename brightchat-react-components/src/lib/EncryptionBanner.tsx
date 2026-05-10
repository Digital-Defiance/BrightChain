/**
 * EncryptionBanner — Static banner indicating end-to-end encryption status.
 *
 * Renders a lock icon and "End-to-end encrypted" caption in a horizontal row.
 * Used at the top of the message thread area to reassure users their
 * conversation is encrypted.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 8.1, 8.3, 9.2
 */

import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import LockIcon from '@mui/icons-material/Lock';
import { Box, Typography } from '@mui/material';
import { FC, memo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EncryptionBannerProps {
  /** data-testid override, defaults to "encryption-banner" */
  testId?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const EncryptionBanner: FC<EncryptionBannerProps> = ({ testId }) => {
  const { tBranded: t } = useI18n();

  return (
    <Box
      role="status"
      aria-label={t(BrightChatStrings.Encryption_E2E_AriaLabel)}
      data-testid={testId ?? 'encryption-banner'}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 2,
        py: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <LockIcon
        aria-hidden="true"
        sx={{ fontSize: 14, color: 'text.secondary' }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t(BrightChatStrings.Encryption_E2E)}
      </Typography>
    </Box>
  );
};

export default memo(EncryptionBanner);
