/**
 * MessageRequestsList Component
 *
 * Displays pending message requests with sender info and accept/decline actions.
 *
 * @remarks
 * Implements Requirements 44.4, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import type { IBaseMessageRequest } from '@brightchain/brighthub-lib';
import { MessageRequestStatus } from '@brightchain/brighthub-lib';
import { Check, Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the MessageRequestsList component */
export interface MessageRequestsListProps {
  /** Pending message requests */
  requests: IBaseMessageRequest<string>[];
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when a request is accepted */
  onAccept?: (requestId: string) => void;
  /** Callback when a request is declined */
  onDecline?: (requestId: string) => void;
  /** Resolve sender display name from ID */
  getSenderName?: (senderId: string) => string;
}

/**
 * MessageRequestsList
 *
 * List of pending message requests with accept/decline actions.
 */
export function MessageRequestsList({
  requests,
  loading = false,
  onAccept,
  onDecline,
  getSenderName,
}: MessageRequestsListProps) {
  const { t } = useBrightHubTranslation();

  const pending = requests.filter(
    (r) => r.status === MessageRequestStatus.Pending,
  );

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.MessageRequestsList_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.MessageRequestsList_Loading)}
        />
      </Box>
    );
  }

  return (
    <Box aria-label={t(BrightHubStrings.MessageRequestsList_AriaLabel)}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {t(BrightHubStrings.MessageRequestsList_Title)}
        </Typography>
        {pending.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {t(BrightHubStrings.MessageRequestsList_PendingCountTemplate, {
              COUNT: String(pending.length),
            })}
          </Typography>
        )}
      </Box>

      {pending.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.MessageRequestsList_EmptyState)}
          </Typography>
        </Box>
      )}

      {pending.map((request) => (
        <Card key={request._id} variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ pb: 0 }}>
            <Typography variant="subtitle2">
              {getSenderName?.(request.senderId) ?? request.senderId}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ mt: 0.5 }}
            >
              {request.messagePreview}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              color="primary"
              startIcon={<Check />}
              onClick={() => onAccept?.(request._id)}
              aria-label={t(BrightHubStrings.MessageRequestsList_Accept)}
            >
              {t(BrightHubStrings.MessageRequestsList_Accept)}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<Close />}
              onClick={() => onDecline?.(request._id)}
              aria-label={t(BrightHubStrings.MessageRequestsList_Decline)}
            >
              {t(BrightHubStrings.MessageRequestsList_Decline)}
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}

export default MessageRequestsList;
