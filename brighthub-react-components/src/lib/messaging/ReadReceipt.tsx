/**
 * ReadReceipt Component
 *
 * Shows message delivery/read status with timestamp.
 *
 * @remarks
 * Implements Requirements 44.7, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { Check, DoneAll } from '@mui/icons-material';
import { Box, Tooltip, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Read status of a message */
export type ReadStatus = 'sent' | 'delivered' | 'seen';

/** Props for the ReadReceipt component */
export interface ReadReceiptProps {
  /** Current read status */
  status: ReadStatus;
  /** Timestamp when the message was seen (for 'seen' status) */
  seenAt?: string;
}

/**
 * ReadReceipt
 *
 * Compact status indicator: single check for sent, double check for delivered,
 * colored double check for seen.
 */
export function ReadReceipt({ status, seenAt }: ReadReceiptProps) {
  const { t } = useBrightHubTranslation();

  const label =
    status === 'seen' && seenAt
      ? t(BrightHubStrings.ReadReceipt_SeenTemplate, { TIMESTAMP: seenAt })
      : status === 'delivered'
        ? t(BrightHubStrings.ReadReceipt_Delivered)
        : t(BrightHubStrings.ReadReceipt_Sent);

  const icon =
    status === 'sent' ? (
      <Check fontSize="inherit" />
    ) : (
      <DoneAll
        fontSize="inherit"
        color={status === 'seen' ? 'primary' : 'inherit'}
      />
    );

  return (
    <Tooltip title={label}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 14,
          color: status === 'seen' ? 'primary.main' : 'text.secondary',
        }}
        aria-label={t(BrightHubStrings.ReadReceipt_AriaLabel)}
        role="status"
      >
        {icon}
        {status === 'seen' && seenAt && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {seenAt}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

export default ReadReceipt;
