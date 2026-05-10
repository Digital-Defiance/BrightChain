/**
 * FollowRequestList Component
 *
 * Displays a list of pending follow requests with requester info,
 * optional custom messages, and approve/reject action buttons.
 *
 * @remarks
 * Implements Requirements 35.10, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** A pending follow request entry */
export interface FollowRequest {
  _id: string;
  requester: {
    _id: string;
    displayName: string;
    username: string;
    profilePictureUrl?: string;
  };
  message?: string;
  createdAt: string;
}

/** Props for the FollowRequestList component */
export interface FollowRequestListProps {
  /** The list of pending follow requests */
  requests: FollowRequest[];
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when the user approves a request */
  onApprove?: (requestId: string) => void;
  /** Callback when the user rejects a request */
  onReject?: (requestId: string) => void;
}

/**
 * FollowRequestList
 *
 * Renders a list of pending follow requests with avatars,
 * display names, usernames, optional custom messages,
 * and approve/reject action buttons.
 */
export function FollowRequestList({
  requests,
  loading = false,
  onApprove,
  onReject,
}: FollowRequestListProps) {
  const { t } = useBrightHubTranslation();

  const countLabel =
    requests.length === 1
      ? t(BrightHubStrings.FollowRequestList_PendingCountSingular)
      : t(BrightHubStrings.FollowRequestList_PendingCountTemplate, {
          COUNT: String(requests.length),
        });

  if (loading && requests.length === 0) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.FollowRequestList_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.FollowRequestList_Loading)}
        />
      </Box>
    );
  }

  return (
    <Box
      aria-label={t(BrightHubStrings.FollowRequestList_AriaLabel)}
      data-testid="follow-request-list"
    >
      {/* Header */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t(BrightHubStrings.FollowRequestList_Title)}
      </Typography>

      {requests.length > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
          data-testid="follow-request-count"
        >
          {countLabel}
        </Typography>
      )}

      {/* Empty state */}
      {requests.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.FollowRequestList_EmptyState)}
          </Typography>
        </Box>
      )}

      {/* Request list */}
      {requests.length > 0 && (
        <List disablePadding>
          {requests.map((request) => (
            <ListItem
              key={request._id}
              data-testid={`follow-request-${request._id}`}
              sx={{ px: 0, alignItems: 'flex-start' }}
              aria-label={request.requester.displayName}
            >
              <ListItemAvatar>
                <Avatar
                  src={request.requester.profilePictureUrl}
                  alt={request.requester.displayName}
                  sx={{ width: 40, height: 40 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={request.requester.displayName}
                secondary={
                  <React.Fragment>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                    >
                      @{request.requester.username}
                    </Typography>
                    {request.message && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        sx={{ display: 'block', mt: 0.5 }}
                        data-testid={`follow-request-message-${request._id}`}
                      >
                        {request.message}
                      </Typography>
                    )}
                  </React.Fragment>
                }
                primaryTypographyProps={{ fontWeight: 'bold', noWrap: true }}
              />
              <Stack direction="row" spacing={1} sx={{ ml: 1, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onApprove?.(request._id)}
                  data-testid={`approve-button-${request._id}`}
                  aria-label={t(BrightHubStrings.FollowRequestList_Approve)}
                >
                  {t(BrightHubStrings.FollowRequestList_Approve)}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onReject?.(request._id)}
                  data-testid={`reject-button-${request._id}`}
                  aria-label={t(BrightHubStrings.FollowRequestList_Reject)}
                >
                  {t(BrightHubStrings.FollowRequestList_Reject)}
                </Button>
              </Stack>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default FollowRequestList;
