/**
 * PostCard Component
 *
 * Displays an individual post with author info, content, timestamps,
 * interaction counts, and action callbacks.
 *
 * @remarks
 * Implements Requirement 12.1
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import {
  IBasePostData,
  IBaseUserProfile,
  PostType,
} from '@brightchain/brighthub-lib';
import {
  ChatBubbleOutline,
  Edit,
  Favorite,
  FavoriteBorder,
  Lock,
  Repeat,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { type MouseEvent } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the PostCard component */
export interface PostCardProps {
  /** The post data to display */
  post: IBasePostData<string>;
  /** Author profile information */
  author?: IBaseUserProfile<string>;
  /** The quoted post data (for quote posts) */
  quotedPost?: IBasePostData<string>;
  /** Author of the quoted post */
  quotedPostAuthor?: IBaseUserProfile<string>;
  /** Whether the current user has liked this post */
  isLiked?: boolean;
  /** Whether the current user has reposted this post */
  isReposted?: boolean;
  /** Callback when the like button is clicked */
  onLike?: (postId: string) => void;
  /** Callback when the repost button is clicked */
  onRepost?: (postId: string) => void;
  /** Callback when the reply button is clicked */
  onReply?: (postId: string) => void;
  /** Callback when the post card is clicked */
  onClick?: (postId: string) => void;
}

/**
 * Formats a timestamp into a relative or absolute time string.
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * PostCard
 *
 * Displays a single post with author avatar, content, timestamps,
 * interaction counts, and action buttons for like, repost, and reply.
 */
export function PostCard({
  post,
  author,
  quotedPost,
  quotedPostAuthor,
  isLiked = false,
  isReposted = false,
  onLike,
  onRepost,
  onReply,
  onClick,
}: PostCardProps) {
  const displayName = author?.displayName ?? 'Unknown';
  const username = author?.username ?? 'unknown';
  const avatarUrl = author?.profilePictureUrl;
  const isHubRestricted = post.hubIds && post.hubIds.length > 0;
  const { t } = useBrightHubTranslation();

  const handleCardClick = () => {
    onClick?.(post._id);
  };

  const handleLike = (e: MouseEvent) => {
    e.stopPropagation();
    onLike?.(post._id);
  };

  const handleRepost = (e: MouseEvent) => {
    e.stopPropagation();
    onRepost?.(post._id);
  };

  const handleReply = (e: MouseEvent) => {
    e.stopPropagation();
    onReply?.(post._id);
  };

  if (post.isDeleted) {
    return (
      <Card variant="outlined" sx={{ mb: 1, opacity: 0.6 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            {t(BrightHubStrings.PostCard_Deleted)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
        transition: 'background-color 0.15s',
      }}
      onClick={handleCardClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={t(BrightHubStrings.PostCard_PostByAriaTemplate, {
        NAME: displayName,
      })}
    >
      <CardContent sx={{ pb: '8px !important' }}>
        {/* Repost indicator */}
        {post.postType === PostType.Repost && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 5 }}>
            <Repeat sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {t(BrightHubStrings.PostCard_Reposted)}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {/* Avatar */}
          <Avatar
            src={avatarUrl}
            alt={displayName}
            sx={{ width: 40, height: 40 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Content area */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Header: name, username, timestamp, indicators */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              <Typography variant="subtitle2" component="span" noWrap>
                {displayName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                noWrap
              >
                @{username}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
              >
                · {formatTimestamp(post.createdAt as string)}
              </Typography>
              {post.isEdited && (
                <Tooltip
                  title={`${t(BrightHubStrings.PostCard_Edited)}${post.editedAt ? ` ${formatTimestamp(post.editedAt as string)}` : ''}`}
                >
                  <Edit
                    sx={{ fontSize: 14, color: 'text.secondary' }}
                    aria-label={t(BrightHubStrings.PostCard_Edited)}
                  />
                </Tooltip>
              )}
              {isHubRestricted && (
                <Tooltip title={t(BrightHubStrings.PostCard_HubRestricted)}>
                  <Lock
                    sx={{ fontSize: 14, color: 'text.secondary' }}
                    aria-label={t(BrightHubStrings.PostCard_HubRestricted)}
                  />
                </Tooltip>
              )}
            </Box>

            {/* Post content */}
            <Box
              sx={{ mt: 0.5, '& p': { m: 0 }, wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: post.formattedContent }}
            />

            {/* Media attachments */}
            {post.mediaAttachments.length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  display: 'grid',
                  gridTemplateColumns:
                    post.mediaAttachments.length === 1 ? '1fr' : '1fr 1fr',
                  gap: 0.5,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {post.mediaAttachments.map((attachment) => (
                  <Box
                    key={attachment._id}
                    component="img"
                    src={attachment.url}
                    alt={attachment.altText ?? 'Post attachment'}
                    sx={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Quoted post */}
            {post.postType === PostType.Quote && quotedPost && (
              <Card variant="outlined" sx={{ mt: 1, p: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <Avatar
                    src={quotedPostAuthor?.profilePictureUrl}
                    sx={{ width: 20, height: 20 }}
                  >
                    {(quotedPostAuthor?.displayName ?? '?').charAt(0)}
                  </Avatar>
                  <Typography variant="caption" fontWeight="bold">
                    {quotedPostAuthor?.displayName ?? 'Unknown'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{quotedPostAuthor?.username ?? 'unknown'}
                  </Typography>
                </Box>
                <Box
                  sx={{ '& p': { m: 0 }, wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{
                    __html: quotedPost.formattedContent,
                  }}
                />
              </Card>
            )}

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {post.hashtags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    variant="outlined"
                    clickable
                  />
                ))}
              </Box>
            )}

            {/* Interaction buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, ml: -1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                <IconButton
                  size="small"
                  onClick={handleReply}
                  aria-label={t(BrightHubStrings.PostCard_ReplyAriaTemplate, {
                    COUNT: String(post.replyCount),
                  })}
                  color="default"
                >
                  <ChatBubbleOutline sx={{ fontSize: 18 }} />
                </IconButton>
                {post.replyCount > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {post.replyCount}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                <IconButton
                  size="small"
                  onClick={handleRepost}
                  aria-label={t(BrightHubStrings.PostCard_RepostAriaTemplate, {
                    COUNT: String(post.repostCount),
                  })}
                  color={isReposted ? 'success' : 'default'}
                >
                  <Repeat sx={{ fontSize: 18 }} />
                </IconButton>
                {post.repostCount > 0 && (
                  <Typography
                    variant="caption"
                    color={isReposted ? 'success.main' : 'text.secondary'}
                  >
                    {post.repostCount}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  onClick={handleLike}
                  aria-label={
                    isLiked
                      ? t(BrightHubStrings.PostCard_UnlikeAriaTemplate, {
                          COUNT: String(post.likeCount),
                        })
                      : t(BrightHubStrings.PostCard_LikeAriaTemplate, {
                          COUNT: String(post.likeCount),
                        })
                  }
                  color={isLiked ? 'error' : 'default'}
                >
                  {isLiked ? (
                    <Favorite sx={{ fontSize: 18 }} />
                  ) : (
                    <FavoriteBorder sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
                {post.likeCount > 0 && (
                  <Typography
                    variant="caption"
                    color={isLiked ? 'error.main' : 'text.secondary'}
                  >
                    {post.likeCount}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default PostCard;
