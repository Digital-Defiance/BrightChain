/**
 * ThreadView Component
 *
 * Displays a hierarchical thread structure with a root post
 * and nested replies. Supports reply callbacks and shows
 * indicators for deleted parent posts.
 *
 * @remarks
 * Implements Requirement 12.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import {
  IBasePostData,
  IBaseThread,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import { Box, Divider, Typography } from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { PostCard } from '../posts/PostCard';

/** Props for the ThreadView component */
export interface ThreadViewProps {
  /** The thread data containing root post and replies */
  thread: IBaseThread<string>;
  /** Map of author profiles keyed by user ID */
  authors?: Record<string, IBaseUserProfile<string>>;
  /** Map of quoted posts keyed by post ID */
  quotedPosts?: Record<string, IBasePostData<string>>;
  /** Set of post IDs the current user has liked */
  likedPostIds?: Set<string>;
  /** Set of post IDs the current user has reposted */
  repostedPostIds?: Set<string>;
  /** Callback when the reply button is clicked on any post */
  onReply?: (postId: string) => void;
  /** Callback when the like button is clicked */
  onLike?: (postId: string) => void;
  /** Callback when the repost button is clicked */
  onRepost?: (postId: string) => void;
  /** Callback when a post is clicked */
  onPostClick?: (postId: string) => void;
}

/**
 * Builds a tree structure from a flat list of replies.
 */
interface ReplyNode {
  post: IBasePostData<string>;
  children: ReplyNode[];
}

function buildReplyTree(
  rootPostId: string,
  replies: IBasePostData<string>[],
): ReplyNode[] {
  const childrenMap = new Map<string, ReplyNode[]>();

  // Initialize map entries
  replies.forEach((reply) => {
    const parentId = reply.parentPostId ?? rootPostId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push({
      post: reply,
      children: [],
    });
  });

  // Recursively attach children
  function attachChildren(node: ReplyNode): void {
    const kids = childrenMap.get(node.post._id) ?? [];
    node.children = kids;
    kids.forEach(attachChildren);
  }

  const rootChildren = childrenMap.get(rootPostId) ?? [];
  rootChildren.forEach(attachChildren);

  // Find orphaned replies (parent was deleted but not the root)
  const allParentIds = new Set([rootPostId, ...replies.map((r) => r._id)]);
  const orphans: ReplyNode[] = [];
  childrenMap.forEach((nodes, parentId) => {
    if (parentId !== rootPostId && !allParentIds.has(parentId)) {
      orphans.push(...nodes);
    }
  });

  return [...rootChildren, ...orphans];
}

/** Renders a single reply node and its children recursively */
function ReplyThread({
  node,
  depth,
  isOrphaned,
  authors,
  quotedPosts,
  likedPostIds,
  repostedPostIds,
  onReply,
  onLike,
  onRepost,
  onPostClick,
  t,
}: {
  node: ReplyNode;
  depth: number;
  isOrphaned?: boolean;
  authors: Record<string, IBaseUserProfile<string>>;
  quotedPosts: Record<string, IBasePostData<string>>;
  likedPostIds: Set<string>;
  repostedPostIds: Set<string>;
  onReply?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onPostClick?: (postId: string) => void;
  t: (
    key: import('@brightchain/brightchain-lib').BrightHubStringKey,
    vars?: Record<string, string>,
  ) => string;
}) {
  return (
    <Box
      sx={{
        ml: Math.min(depth, 5) * 3,
        borderLeft: depth > 0 ? 2 : 0,
        borderColor: 'divider',
        pl: depth > 0 ? 1.5 : 0,
      }}
    >
      {/* Orphaned reply indicator */}
      {isOrphaned && (
        <Typography
          variant="caption"
          color="text.secondary"
          fontStyle="italic"
          sx={{ display: 'block', mb: 0.5, ml: 1 }}
        >
          {t(BrightHubStrings.ThreadView_ParentDeleted)}
        </Typography>
      )}

      <PostCard
        post={node.post}
        author={authors[node.post.authorId]}
        quotedPost={
          node.post.quotedPostId
            ? quotedPosts[node.post.quotedPostId]
            : undefined
        }
        quotedPostAuthor={
          node.post.quotedPostId && quotedPosts[node.post.quotedPostId]
            ? authors[quotedPosts[node.post.quotedPostId].authorId]
            : undefined
        }
        isLiked={likedPostIds.has(node.post._id)}
        isReposted={repostedPostIds.has(node.post._id)}
        onReply={onReply}
        onLike={onLike}
        onRepost={onRepost}
        onClick={onPostClick}
      />

      {node.children.map((child) => (
        <ReplyThread
          key={child.post._id}
          node={child}
          depth={depth + 1}
          authors={authors}
          quotedPosts={quotedPosts}
          likedPostIds={likedPostIds}
          repostedPostIds={repostedPostIds}
          onReply={onReply}
          onLike={onLike}
          onRepost={onRepost}
          onPostClick={onPostClick}
          t={t}
        />
      ))}
    </Box>
  );
}

/**
 * ThreadView
 *
 * Renders a complete thread with the root post prominently displayed
 * and replies shown in a hierarchical, indented structure.
 */
export function ThreadView({
  thread,
  authors = {},
  quotedPosts = {},
  likedPostIds = new Set(),
  repostedPostIds = new Set(),
  onReply,
  onLike,
  onRepost,
  onPostClick,
}: ThreadViewProps) {
  const { t } = useBrightHubTranslation();
  const replyTree = buildReplyTree(thread.rootPost._id, thread.replies);

  // Identify orphaned top-level nodes
  const directChildIds = new Set(
    thread.replies
      .filter((r) => r.parentPostId === thread.rootPost._id)
      .map((r) => r._id),
  );

  return (
    <Box role="article" aria-label={t(BrightHubStrings.ThreadView_AriaLabel)}>
      {/* Root post */}
      <PostCard
        post={thread.rootPost}
        author={authors[thread.rootPost.authorId]}
        quotedPost={
          thread.rootPost.quotedPostId
            ? quotedPosts[thread.rootPost.quotedPostId]
            : undefined
        }
        quotedPostAuthor={
          thread.rootPost.quotedPostId &&
          quotedPosts[thread.rootPost.quotedPostId]
            ? authors[quotedPosts[thread.rootPost.quotedPostId].authorId]
            : undefined
        }
        isLiked={likedPostIds.has(thread.rootPost._id)}
        isReposted={repostedPostIds.has(thread.rootPost._id)}
        onReply={onReply}
        onLike={onLike}
        onRepost={onRepost}
        onClick={onPostClick}
      />

      {/* Thread metadata */}
      <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {thread.replyCount === 1
            ? t(BrightHubStrings.ThreadView_ReplyCountSingular)
            : t(BrightHubStrings.ThreadView_ReplyCountPluralTemplate, {
                COUNT: String(thread.replyCount),
              })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {thread.participantCount === 1
            ? t(BrightHubStrings.ThreadView_ParticipantCountSingular)
            : t(BrightHubStrings.ThreadView_ParticipantCountPluralTemplate, {
                COUNT: String(thread.participantCount),
              })}
        </Typography>
      </Box>

      <Divider />

      {/* Replies */}
      {replyTree.length > 0 ? (
        <Box sx={{ mt: 1 }}>
          {replyTree.map((node) => (
            <ReplyThread
              key={node.post._id}
              node={node}
              depth={0}
              isOrphaned={!directChildIds.has(node.post._id)}
              authors={authors}
              quotedPosts={quotedPosts}
              likedPostIds={likedPostIds}
              repostedPostIds={repostedPostIds}
              onReply={onReply}
              onLike={onLike}
              onRepost={onRepost}
              onPostClick={onPostClick}
              t={t}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {t(BrightHubStrings.ThreadView_NoReplies)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default ThreadView;
