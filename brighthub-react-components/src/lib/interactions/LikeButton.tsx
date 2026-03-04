/**
 * LikeButton Component
 *
 * A toggle button for liking/unliking posts with an animated
 * heart icon and like count display.
 *
 * @remarks
 * Implements Requirement 12.9
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { Favorite, FavoriteBorder } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the LikeButton component */
export interface LikeButtonProps {
  /** Whether the current user has liked the item */
  isLiked: boolean;
  /** Number of likes */
  count: number;
  /** Callback when the button is clicked */
  onClick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
}

/**
 * LikeButton
 *
 * Displays a heart icon that toggles between filled (liked) and
 * outlined (not liked) states, with an optional like count.
 */
export function LikeButton({
  isLiked,
  count,
  onClick,
  disabled = false,
  size = 'small',
}: LikeButtonProps) {
  const iconSize = size === 'small' ? 18 : 22;
  const { t } = useBrightHubTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        size={size}
        onClick={onClick}
        disabled={disabled}
        color={isLiked ? 'error' : 'default'}
        aria-label={
          isLiked
            ? t(BrightHubStrings.LikeButton_UnlikeAriaTemplate, {
                COUNT: String(count),
              })
            : t(BrightHubStrings.LikeButton_LikeAriaTemplate, {
                COUNT: String(count),
              })
        }
        aria-pressed={isLiked}
        sx={{
          transition: 'transform 0.15s',
          '&:active': { transform: 'scale(1.2)' },
        }}
      >
        {isLiked ? (
          <Favorite sx={{ fontSize: iconSize }} />
        ) : (
          <FavoriteBorder sx={{ fontSize: iconSize }} />
        )}
      </IconButton>
      {count > 0 && (
        <Typography
          variant="caption"
          color={isLiked ? 'error.main' : 'text.secondary'}
        >
          {count}
        </Typography>
      )}
    </Box>
  );
}

export default LikeButton;
