/**
 * SearchResults Component
 *
 * Displays combined search results for posts and users
 * with tab-based filtering and pagination support.
 *
 * @remarks
 * Implements Requirement 12.7
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { IBasePostData, IBaseUserProfile } from '@brightchain/brighthub-lib';
import { Search } from '@mui/icons-material';
import { Box, CircularProgress, Tab, Tabs, Typography } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { PostCard } from '../posts/PostCard';
import { UserProfileCard } from '../profiles/UserProfileCard';

/** Search result tab values */
export type SearchTab = 'all' | 'posts' | 'users';

/** Props for the SearchResults component */
export interface SearchResultsProps {
  /** The search query string */
  query: string;
  /** Post results */
  posts: IBasePostData<string>[];
  /** User results */
  users: IBaseUserProfile<string>[];
  /** Map of author profiles keyed by user ID (for post authors) */
  postAuthors?: Record<string, IBaseUserProfile<string>>;
  /** Set of post IDs the current user has liked */
  likedPostIds?: Set<string>;
  /** Set of post IDs the current user has reposted */
  repostedPostIds?: Set<string>;
  /** Whether results are loading */
  isLoading?: boolean;
  /** Whether there are more post results */
  hasMorePosts?: boolean;
  /** Whether there are more user results */
  hasMoreUsers?: boolean;
  /** Callback to load more posts */
  onLoadMorePosts?: () => void;
  /** Callback to load more users */
  onLoadMoreUsers?: () => void;
  /** Callback when a post's like button is clicked */
  onLike?: (postId: string) => void;
  /** Callback when a post's repost button is clicked */
  onRepost?: (postId: string) => void;
  /** Callback when a post's reply button is clicked */
  onReply?: (postId: string) => void;
  /** Callback when a post card is clicked */
  onPostClick?: (postId: string) => void;
  /** Callback when a user card is clicked */
  onUserClick?: (userId: string) => void;
  /** Optional action element factory for user cards (e.g., FollowButton) */
  renderUserAction?: (user: IBaseUserProfile<string>) => React.ReactNode;
}

/**
 * SearchResults
 *
 * Renders combined post and user search results with
 * tab-based filtering and IntersectionObserver pagination.
 */
export function SearchResults({
  query,
  posts,
  users,
  postAuthors = {},
  likedPostIds = new Set(),
  repostedPostIds = new Set(),
  isLoading = false,
  hasMorePosts = false,
  hasMoreUsers = false,
  onLoadMorePosts,
  onLoadMoreUsers,
  onLike,
  onRepost,
  onReply,
  onPostClick,
  onUserClick,
  renderUserAction,
}: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const { t } = useBrightHubTranslation();
  const postSentinelRef = useRef<HTMLDivElement>(null);
  const userSentinelRef = useRef<HTMLDivElement>(null);

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showUsers = activeTab === 'all' || activeTab === 'users';
  const hasMore =
    activeTab === 'posts'
      ? hasMorePosts
      : activeTab === 'users'
        ? hasMoreUsers
        : hasMorePosts || hasMoreUsers;

  // IntersectionObserver for post pagination
  const handlePostIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasMorePosts &&
        !isLoading &&
        onLoadMorePosts
      ) {
        onLoadMorePosts();
      }
    },
    [hasMorePosts, isLoading, onLoadMorePosts],
  );

  // IntersectionObserver for user pagination
  const handleUserIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasMoreUsers &&
        !isLoading &&
        onLoadMoreUsers
      ) {
        onLoadMoreUsers();
      }
    },
    [hasMoreUsers, isLoading, onLoadMoreUsers],
  );

  useEffect(() => {
    const sentinel = postSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handlePostIntersection, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handlePostIntersection]);

  useEffect(() => {
    const sentinel = userSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleUserIntersection, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleUserIntersection]);

  const totalResults = posts.length + users.length;
  const isEmpty = totalResults === 0 && !isLoading;

  return (
    <Box
      aria-label={t(BrightHubStrings.SearchResults_AriaTemplate, {
        QUERY: query,
      })}
      role="region"
    >
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, value: SearchTab) => setActiveTab(value)}
        aria-label="Search result tabs"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab
          label={t(BrightHubStrings.SearchResults_TabAll)}
          value="all"
          id="search-tab-all"
          aria-controls="search-panel-all"
        />
        <Tab
          label={
            posts.length > 0
              ? t(BrightHubStrings.SearchResults_TabPostsTemplate, {
                  COUNT: String(posts.length),
                })
              : t(BrightHubStrings.SearchResults_TabPosts)
          }
          value="posts"
          id="search-tab-posts"
          aria-controls="search-panel-posts"
        />
        <Tab
          label={
            users.length > 0
              ? t(BrightHubStrings.SearchResults_TabUsersTemplate, {
                  COUNT: String(users.length),
                })
              : t(BrightHubStrings.SearchResults_TabUsers)
          }
          value="users"
          id="search-tab-users"
          aria-controls="search-panel-users"
        />
      </Tabs>

      {/* Empty state */}
      {isEmpty && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            {query
              ? t(BrightHubStrings.SearchResults_NoResultsTemplate, {
                  QUERY: query,
                })
              : t(BrightHubStrings.SearchResults_EnterSearchTerm)}
          </Typography>
        </Box>
      )}

      {/* User results section */}
      {showUsers && users.length > 0 && (
        <Box
          role="tabpanel"
          id="search-panel-users"
          aria-labelledby="search-tab-users"
        >
          {activeTab === 'all' && (
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {t(BrightHubStrings.SearchResults_SectionPeople)}
            </Typography>
          )}
          {users.map((user) => (
            <UserProfileCard
              key={user._id}
              user={user}
              onClick={onUserClick}
              actionElement={renderUserAction?.(user)}
            />
          ))}
          {showUsers && hasMoreUsers && (
            <div ref={userSentinelRef} aria-hidden="true" />
          )}
        </Box>
      )}

      {/* Post results section */}
      {showPosts && posts.length > 0 && (
        <Box
          role="tabpanel"
          id="search-panel-posts"
          aria-labelledby="search-tab-posts"
        >
          {activeTab === 'all' && (
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1, mt: users.length > 0 ? 2 : 0 }}
            >
              {t(BrightHubStrings.SearchResults_SectionPosts)}
            </Typography>
          )}
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              author={postAuthors[post.authorId]}
              isLiked={likedPostIds.has(post._id)}
              isReposted={repostedPostIds.has(post._id)}
              onLike={onLike}
              onRepost={onRepost}
              onReply={onReply}
              onClick={onPostClick}
            />
          ))}
          {showPosts && hasMorePosts && (
            <div ref={postSentinelRef} aria-hidden="true" />
          )}
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress
            size={32}
            aria-label={t(BrightHubStrings.SearchResults_Loading)}
          />
        </Box>
      )}

      {/* End of results */}
      {!hasMore && totalResults > 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {t(BrightHubStrings.SearchResults_EndOfResults)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default SearchResults;
