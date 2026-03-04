/**
 * UserProfileCard Component
 *
 * Displays user profile information including bio, follower/following counts,
 * mutual connections preview, and connection strength indicator.
 *
 * @remarks
 * Implements Requirement 12.5
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import {
  ConnectionStrength,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import { Language, LocationOn, Shield, Verified } from '@mui/icons-material';
import {
  Avatar,
  AvatarGroup,
  Box,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Mutual connection preview data */
export interface MutualConnectionPreview {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Profile picture URL */
  profilePictureUrl?: string;
}

/** Props for the UserProfileCard component */
export interface UserProfileCardProps {
  /** The user profile to display */
  user: IBaseUserProfile<string>;
  /** Whether the current user is following this user */
  isFollowing?: boolean;
  /** Whether this is the current user's own profile */
  isSelf?: boolean;
  /** Mutual connections to preview (up to 3) */
  mutualConnections?: MutualConnectionPreview[];
  /** Total count of mutual connections */
  mutualConnectionCount?: number;
  /** Connection strength with this user */
  connectionStrength?: ConnectionStrength;
  /** Callback when the card is clicked */
  onClick?: (userId: string) => void;
  /** Callback when the follow button area is clicked */
  onFollowClick?: (userId: string) => void;
  /** Optional action element (e.g., FollowButton) rendered in the header */
  actionElement?: React.ReactNode;
}

/** Color mapping for connection strength indicators */
const strengthColors: Record<ConnectionStrength, string> = {
  [ConnectionStrength.Strong]: '#17BF63',
  [ConnectionStrength.Moderate]: '#1DA1F2',
  [ConnectionStrength.Weak]: '#FFAD1F',
  [ConnectionStrength.Dormant]: '#AAB8C2',
};

/**
 * Formats a large number into a compact string (e.g., 1200 → "1.2K").
 */
function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/**
 * UserProfileCard
 *
 * Displays a user's profile with avatar, bio, stats,
 * mutual connections preview, and connection strength.
 */
export function UserProfileCard({
  user,
  isFollowing: _isFollowing = false,
  isSelf = false,
  mutualConnections = [],
  mutualConnectionCount = 0,
  connectionStrength,
  onClick,
  actionElement,
}: UserProfileCardProps) {
  const { t } = useBrightHubTranslation();

  const strengthLabels: Record<ConnectionStrength, string> = {
    [ConnectionStrength.Strong]: t(
      BrightHubStrings.UserProfileCard_StrongConnection,
    ),
    [ConnectionStrength.Moderate]: t(
      BrightHubStrings.UserProfileCard_ModerateConnection,
    ),
    [ConnectionStrength.Weak]: t(
      BrightHubStrings.UserProfileCard_WeakConnection,
    ),
    [ConnectionStrength.Dormant]: t(
      BrightHubStrings.UserProfileCard_DormantConnection,
    ),
  };

  const handleClick = () => {
    onClick?.(user._id);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
        transition: 'background-color 0.15s',
      }}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={t(BrightHubStrings.UserProfileCard_ProfileOfTemplate, {
        NAME: user.displayName,
      })}
    >
      {/* Header image */}
      {user.headerImageUrl && (
        <Box
          component="img"
          src={user.headerImageUrl}
          alt=""
          sx={{ width: '100%', height: 100, objectFit: 'cover' }}
        />
      )}

      <CardContent sx={{ pb: '12px !important' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {/* Avatar */}
          <Avatar
            src={user.profilePictureUrl}
            alt={user.displayName}
            sx={{
              width: 56,
              height: 56,
              mt: user.headerImageUrl ? -4 : 0,
              border: '3px solid',
              borderColor: 'background.paper',
            }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Action element (e.g., FollowButton) */}
          {actionElement && <Box>{actionElement}</Box>}
        </Box>

        {/* Name and username */}
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="subtitle1"
            component="span"
            fontWeight="bold"
            noWrap
          >
            {user.displayName}
          </Typography>
          {user.isVerified && (
            <Tooltip title={t(BrightHubStrings.UserProfileCard_Verified)}>
              <Verified
                sx={{ fontSize: 18, color: 'primary.main' }}
                aria-label={t(BrightHubStrings.UserProfileCard_Verified)}
              />
            </Tooltip>
          )}
          {user.isProtected && (
            <Tooltip
              title={t(BrightHubStrings.UserProfileCard_ProtectedAccount)}
            >
              <Shield
                sx={{ fontSize: 18, color: 'text.secondary' }}
                aria-label={t(
                  BrightHubStrings.UserProfileCard_ProtectedAccount,
                )}
              />
            </Tooltip>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          @{user.username}
        </Typography>

        {/* Bio */}
        {user.bio && (
          <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-word' }}>
            {user.bio}
          </Typography>
        )}

        {/* Location and website */}
        {(user.location || user.websiteUrl) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mt: 1,
              flexWrap: 'wrap',
            }}
          >
            {user.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {user.location}
                </Typography>
              </Box>
            )}
            {user.websiteUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Language sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography
                  variant="caption"
                  color="primary"
                  component="a"
                  href={user.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {user.websiteUrl.replace(/^https?:\/\//, '')}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Follower/following counts */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="body2" fontWeight="bold">
              {formatCount(user.followingCount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(BrightHubStrings.UserProfileCard_Following)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="body2" fontWeight="bold">
              {formatCount(user.followerCount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(BrightHubStrings.UserProfileCard_Followers)}
            </Typography>
          </Box>
        </Box>

        {/* Connection strength indicator */}
        {connectionStrength && !isSelf && (
          <Box sx={{ mt: 1.5 }}>
            <Chip
              size="small"
              label={strengthLabels[connectionStrength]}
              sx={{
                bgcolor: `${strengthColors[connectionStrength]}20`,
                color: strengthColors[connectionStrength],
                fontWeight: 500,
                '& .MuiChip-label': { px: 1 },
              }}
              icon={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: strengthColors[connectionStrength],
                    ml: 1,
                  }}
                  component="span"
                />
              }
            />
          </Box>
        )}

        {/* Mutual connections preview */}
        {mutualConnectionCount > 0 && !isSelf && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <AvatarGroup
              max={3}
              sx={{
                '& .MuiAvatar-root': {
                  width: 24,
                  height: 24,
                  fontSize: '0.75rem',
                },
              }}
            >
              {mutualConnections.slice(0, 3).map((mc) => (
                <Avatar
                  key={mc.userId}
                  src={mc.profilePictureUrl}
                  alt={mc.displayName}
                >
                  {mc.displayName.charAt(0)}
                </Avatar>
              ))}
            </AvatarGroup>
            <Typography variant="caption" color="text.secondary">
              {mutualConnectionCount === 1
                ? t(BrightHubStrings.UserProfileCard_MutualConnectionSingular)
                : t(
                    BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate,
                    { COUNT: String(mutualConnectionCount) },
                  )}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default UserProfileCard;
