/**
 * ConnectionListCard Component
 *
 * Compact card displaying a connection list preview with member count,
 * follower count, visibility indicator, and creation date.
 *
 * @remarks
 * Implements Requirements 35.2, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  ConnectionVisibility,
  IBaseConnectionList,
} from '@brightchain/brighthub-lib';
import { Lock, People, Public } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import React from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConnectionListCard component */
export interface ConnectionListCardProps {
  /** The connection list data to display */
  list: IBaseConnectionList<string>;
  /** Callback when the card is clicked */
  onClick?: (listId: string) => void;
}

/** Visibility icon mapping */
const visibilityIcons: Record<ConnectionVisibility, React.ReactNode> = {
  [ConnectionVisibility.Private]: <Lock fontSize="small" />,
  [ConnectionVisibility.FollowersOnly]: <People fontSize="small" />,
  [ConnectionVisibility.Public]: <Public fontSize="small" />,
};

/**
 * ConnectionListCard
 *
 * Displays a compact preview of a connection list including name,
 * description, member/follower counts, visibility, and creation date.
 * Clickable for navigation to list details.
 */
export function ConnectionListCard({ list, onClick }: ConnectionListCardProps) {
  const { t } = useBrightHubTranslation();

  const visibilityLabel = (v: ConnectionVisibility) => {
    switch (v) {
      case ConnectionVisibility.Private:
        return t(BrightHubStrings.ConnectionListCard_VisibilityPrivate);
      case ConnectionVisibility.FollowersOnly:
        return t(BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly);
      case ConnectionVisibility.Public:
        return t(BrightHubStrings.ConnectionListCard_VisibilityPublic);
    }
  };

  const formattedDate = new Date(list.createdAt).toLocaleDateString();

  return (
    <Card
      variant="outlined"
      aria-label={t(BrightHubStrings.ConnectionListCard_AriaLabel, {
        NAME: list.name,
      })}
    >
      <CardActionArea
        onClick={() => onClick?.(list._id)}
        data-testid="connection-list-card"
      >
        <CardContent sx={{ pb: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {list.name}
            </Typography>
            <Chip
              size="small"
              icon={visibilityIcons[list.visibility] as React.ReactElement}
              label={visibilityLabel(list.visibility)}
              data-testid={`visibility-${list.visibility}`}
            />
          </Box>

          {list.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
              noWrap
            >
              {list.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {t(BrightHubStrings.ConnectionListCard_MembersTemplate, {
                COUNT: String(list.memberCount),
              })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ·
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(BrightHubStrings.ConnectionListCard_FollowersTemplate, {
                COUNT: String(list.followerCount),
              })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ·
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(BrightHubStrings.ConnectionListCard_CreatedAtTemplate, {
                DATE: formattedDate,
              })}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default ConnectionListCard;
