/**
 * FollowButton Component
 *
 * A toggle button for following/unfollowing users with
 * visual state feedback.
 *
 * @remarks
 * Implements Requirement 12.8
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { PersonAdd, PersonRemove } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the FollowButton component */
export interface FollowButtonProps {
  /** Whether the current user is following the target user */
  isFollowing: boolean;
  /** Callback when the button is clicked */
  onClick?: () => void;
  /** Whether the button is disabled (e.g., during API call) */
  disabled?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Whether this is the current user's own profile (hides button) */
  isSelf?: boolean;
}

/**
 * FollowButton
 *
 * Displays a follow/unfollow button that changes appearance
 * based on the current follow state. Shows "Unfollow" on hover
 * when already following.
 */
export function FollowButton({
  isFollowing,
  onClick,
  disabled = false,
  size = 'small',
  isSelf = false,
}: FollowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useBrightHubTranslation();

  if (isSelf) return null;

  const showUnfollow = isFollowing && isHovered;

  return (
    <Button
      variant={isFollowing ? 'outlined' : 'contained'}
      size={size}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      startIcon={
        showUnfollow ? (
          <PersonRemove />
        ) : !isFollowing ? (
          <PersonAdd />
        ) : undefined
      }
      color={showUnfollow ? 'error' : 'primary'}
      aria-label={
        isFollowing
          ? t(BrightHubStrings.FollowButton_Unfollow)
          : t(BrightHubStrings.FollowButton_Follow)
      }
      aria-pressed={isFollowing}
      sx={{
        minWidth: 100,
        borderColor: showUnfollow ? 'error.main' : undefined,
      }}
    >
      {showUnfollow
        ? t(BrightHubStrings.FollowButton_Unfollow)
        : isFollowing
          ? t(BrightHubStrings.FollowButton_Following)
          : t(BrightHubStrings.FollowButton_Follow)}
    </Button>
  );
}

export default FollowButton;
