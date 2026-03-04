/**
 * Timeline Component
 *
 * Displays a feed of posts with infinite scroll support,
 * loading states, and filter capabilities.
 *
 * @remarks
 * Implements Requirement 12.3
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { IBasePostData, IBaseUserProfile } from '@brightchain/brighthub-lib';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { PostCard } from '../posts/PostCard';

/** Filter options for the timeline */
export interface TimelineFilter {
  /** Filter by connection list ID */
  listId?: string;
  /** Filter by connection category ID */
  categoryId?: string;
  /** Filter label to display */
  label?: string;
}

/** Props for the Timeline component */
export interface TimelineProps {
  /** Array of posts to display */
  posts: IBasePostData<string>[];
  /** Map of author profiles keyed by user ID */
  authors?: Record<string, IBaseUserProfile<string>>;
  /** Map of quoted posts keyed by post ID */
  quotedPosts?: Record<string, IBasePostData<string>>;
  /** Set of post IDs the current user has liked */
  likedPostIds?: Set<string>;
  /** Set of post IDs the current user has reposted */
  repostedPostIds?: Set<string>;
  /** Whether more posts are being loaded */
  isLoading?: boolean;
  /** Whether there are more posts to load */
  hasMore?: boolean;
  /** Active filter */
  filter?: TimelineFilter;
  /** Callback to load more posts */
  onLoadMore?: () => void;
  /** Callback when a post's like button is clicked */
  onLike?: (postId: string) => void;
  /** Callback when a post's repost button is clicked */
  onRepost?: (postId: string) => void;
  /** Callback when a post's reply button is clicked */
  onReply?: (postId: string) => void;
  /** Callback when a post card is clicked */
  onPostClick?: (postId: string) => void;
  /** Callback when the filter is changed */
  onFilterChange?: (filter: TimelineFilter | undefined) => void;
  /** Message to display when there are no posts */
  emptyMessage?: string;
}

/**
 * Timeline
 *
 * Renders a scrollable feed of PostCard components with
 * IntersectionObserver-based infinite scroll.
 */
export function Timeline({
  posts,
  authors = {},
  quotedPosts = {},
  likedPostIds = new Set(),
  repostedPostIds = new Set(),
  isLoading = false,
  hasMore = false,
  filter,
  onLoadMore,
  onLike,
  onRepost,
  onReply,
  onPostClick,
  onFilterChange,
  emptyMessage,
}: TimelineProps) {
  const { t } = useBrightHubTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection]);

  return (
    <Box
      role="feed"
      aria-label={t(BrightHubStrings.Timeline_AriaLabel)}
      aria-busy={isLoading}
    >
      {/* Active filter indicator */}
      {filter?.label && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            mb: 1,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t(BrightHubStrings.Timeline_FilteredByTemplate, {
              LABEL: filter.label,
            })}
          </Typography>
          {onFilterChange && (
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer' }}
              onClick={() => onFilterChange(undefined)}
              role="button"
              tabIndex={0}
              aria-label={t(BrightHubStrings.Timeline_ClearFilter)}
            >
              {t(BrightHubStrings.Timeline_ClearFilter)}
            </Typography>
          )}
        </Box>
      )}

      {/* Posts list */}
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          author={authors[post.authorId]}
          quotedPost={
            post.quotedPostId ? quotedPosts[post.quotedPostId] : undefined
          }
          quotedPostAuthor={
            post.quotedPostId && quotedPosts[post.quotedPostId]
              ? authors[quotedPosts[post.quotedPostId].authorId]
              : undefined
          }
          isLiked={likedPostIds.has(post._id)}
          isReposted={repostedPostIds.has(post._id)}
          onLike={onLike}
          onRepost={onRepost}
          onReply={onReply}
          onClick={onPostClick}
        />
      ))}

      {/* Empty state */}
      {posts.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            {emptyMessage ?? t(BrightHubStrings.Timeline_EmptyDefault)}
          </Typography>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress
            size={32}
            aria-label={t(BrightHubStrings.Timeline_LoadingPosts)}
          />
        </Box>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" />}

      {/* End of feed indicator */}
      {!hasMore && posts.length > 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {t(BrightHubStrings.Timeline_AllCaughtUp)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default Timeline;
