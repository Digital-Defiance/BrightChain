/**
 * MutualConnections Component
 *
 * Displays a list of mutual connections between two users,
 * showing avatars, display names, usernames, and pagination.
 *
 * @remarks
 * Implements Requirements 35.6, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { IBaseUserProfile } from '@brightchain/brighthub-lib';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the MutualConnections component */
export interface MutualConnectionsProps {
  /** The list of mutual connection profiles to display */
  connections: IBaseUserProfile<string>[];
  /** Total count of mutual connections (may exceed displayed list) */
  totalCount: number;
  /** Whether data is loading */
  loading?: boolean;
  /** Whether more connections can be loaded */
  hasMore?: boolean;
  /** Callback when the user clicks "Load more" */
  onLoadMore?: () => void;
  /** Callback when the user clicks on a connection */
  onSelect?: (userId: string) => void;
}

/**
 * MutualConnections
 *
 * Renders a paginated list of mutual connections with avatars,
 * display names, and usernames. Shows a count header and
 * supports loading more results.
 */
export function MutualConnections({
  connections,
  totalCount,
  loading = false,
  hasMore = false,
  onLoadMore,
  onSelect,
}: MutualConnectionsProps) {
  const { t } = useBrightHubTranslation();

  const countLabel =
    totalCount === 1
      ? t(BrightHubStrings.MutualConnections_CountSingular)
      : t(BrightHubStrings.MutualConnections_CountPluralTemplate, {
          COUNT: String(totalCount),
        });

  if (loading && connections.length === 0) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.MutualConnections_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.MutualConnections_Loading)}
        />
      </Box>
    );
  }

  return (
    <Box
      aria-label={t(BrightHubStrings.MutualConnections_AriaLabel)}
      data-testid="mutual-connections"
    >
      {/* Header with count */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t(BrightHubStrings.MutualConnections_Title)}
      </Typography>

      {totalCount > 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
          data-testid="mutual-connections-count"
        >
          {countLabel}
        </Typography>
      )}

      {/* Empty state */}
      {connections.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.MutualConnections_EmptyState)}
          </Typography>
        </Box>
      )}

      {/* Connection list */}
      {connections.length > 0 && (
        <List disablePadding>
          {connections.map((user) => (
            <ListItem
              key={user._id}
              data-testid={`mutual-connection-${user._id}`}
              sx={{
                px: 0,
                cursor: onSelect ? 'pointer' : undefined,
              }}
              onClick={() => onSelect?.(user._id)}
              role={onSelect ? 'button' : undefined}
              aria-label={user.displayName}
            >
              <ListItemAvatar>
                <Avatar
                  src={user.profilePictureUrl}
                  alt={user.displayName}
                  sx={{ width: 40, height: 40 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={user.displayName}
                secondary={`@${user.username}`}
                primaryTypographyProps={{ fontWeight: 'bold', noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Load more button */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="text"
            onClick={onLoadMore}
            disabled={loading}
            data-testid="load-more-button"
            aria-label={t(BrightHubStrings.MutualConnections_LoadMore)}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : (
              t(BrightHubStrings.MutualConnections_LoadMore)
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default MutualConnections;
