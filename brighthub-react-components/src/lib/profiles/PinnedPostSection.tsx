/**
 * PinnedPostSection Component
 *
 * Displays a user's pinned post above the regular post timeline,
 * with a visual pin indicator and an optional unpin action for the
 * profile owner.
 *
 * @remarks
 * Implements Requirements: 6.1, 6.2, 6.3, 6.4
 */

import {
  BrightHubStrings,
  IBasePostData,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import { PushPin } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { PostCard } from '../posts/PostCard';

/** Props for the PinnedPostSection component */
export interface PinnedPostSectionProps {
  /** The pinned post data */
  pinnedPost: IBasePostData<string>;
  /** Author of the pinned post (same as profile owner) */
  author: IBaseUserProfile<string>;
  /** Whether the pinned post feature is enabled */
  featureEnabled: boolean;
  /** Whether the current user is the profile owner */
  isSelf?: boolean;
  /** Callback when unpin is clicked (only shown for profile owner) */
  onUnpin?: (postId: string) => void;
  /** Callback when the post is clicked */
  onPostClick?: (postId: string) => void;
}

/**
 * PinnedPostSection
 *
 * Renders the pinned post section with a "Pinned" header row and the
 * post content via PostCard. Shows an "Unpin" button when the viewer
 * is the profile owner and an onUnpin callback is provided.
 *
 * Returns null when the feature is disabled or the post has been soft-deleted.
 */
export function PinnedPostSection({
  pinnedPost,
  author,
  featureEnabled,
  isSelf = false,
  onUnpin,
  onPostClick,
}: PinnedPostSectionProps) {
  // i18n hook — keys wired up in task 8
  const { t } = useBrightHubTranslation();

  // Requirement 6.4: hide when feature is disabled
  if (!featureEnabled) {
    return null;
  }

  // Requirement 6.3: hide when the pinned post has been soft-deleted
  if (pinnedPost.isDeleted) {
    return null;
  }

  const handleUnpin = () => {
    onUnpin?.(pinnedPost._id);
  };

  return (
    <Box aria-label={t(BrightHubStrings.PinnedPostSection_AriaLabel)}>
      {/* Requirement 6.2: visual pin indicator */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PushPin sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {t(BrightHubStrings.PinnedPostSection_Pinned)}
          </Typography>
        </Box>

        {/* Requirement 6.1 / 6.4: unpin button only for profile owner */}
        {isSelf && onUnpin && (
          <Button
            size="small"
            variant="text"
            onClick={handleUnpin}
            sx={{ textTransform: 'none', minWidth: 'auto', p: '2px 6px' }}
          >
            {t(BrightHubStrings.PinnedPostSection_Unpin)}
          </Button>
        )}
      </Box>

      {/* Requirement 6.1: delegate post rendering to PostCard */}
      <PostCard post={pinnedPost} author={author} onClick={onPostClick} />
    </Box>
  );
}

export default PinnedPostSection;
