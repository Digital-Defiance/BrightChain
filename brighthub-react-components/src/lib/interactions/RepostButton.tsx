/**
 * RepostButton Component
 *
 * A button for reposting content with a repost icon and count display.
 *
 * @remarks
 * Implements Requirement 12.10
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { Repeat } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the RepostButton component */
export interface RepostButtonProps {
  /** Whether the current user has reposted the item */
  isReposted: boolean;
  /** Number of reposts */
  count: number;
  /** Callback when the button is clicked */
  onClick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
}

/**
 * RepostButton
 *
 * Displays a repost icon that highlights when the user has reposted,
 * with an optional repost count.
 */
export function RepostButton({
  isReposted,
  count,
  onClick,
  disabled = false,
  size = 'small',
}: RepostButtonProps) {
  const iconSize = size === 'small' ? 18 : 22;
  const { t } = useBrightHubTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        size={size}
        onClick={onClick}
        disabled={disabled}
        color={isReposted ? 'success' : 'default'}
        aria-label={
          isReposted
            ? t(BrightHubStrings.RepostButton_UndoRepostAriaTemplate, {
                COUNT: String(count),
              })
            : t(BrightHubStrings.RepostButton_RepostAriaTemplate, {
                COUNT: String(count),
              })
        }
        aria-pressed={isReposted}
      >
        <Repeat sx={{ fontSize: iconSize }} />
      </IconButton>
      {count > 0 && (
        <Typography
          variant="caption"
          color={isReposted ? 'success.main' : 'text.secondary'}
        >
          {count}
        </Typography>
      )}
    </Box>
  );
}

export default RepostButton;
