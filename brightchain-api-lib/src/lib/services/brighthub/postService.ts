import {
  IBaseMediaAttachment,
  IBasePostData,
  ICreatePostOptions,
  IInteractionStatus,
  INotificationService,
  IPostService,
  NotificationType,
  PostErrorCode,
  PostServiceError,
  PostType,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';
import { moderateContent } from './autoModerationService';
import { getTextFormatter } from './textFormatter';

/**
 * Maximum character limit for timeline posts (microblog style)
 */
export const POST_MAX_CHARACTERS = 280;

/**
 * Maximum character limit for hub posts (long-form discussions)
 */
export const HUB_POST_MAX_CHARACTERS = 10000;

/**
 * Maximum number of media attachments per post
 */
export const MAX_MEDIA_ATTACHMENTS = 4;

/**
 * Maximum total size of media attachments in bytes (20MB)
 */
export const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024;

/**
 * Edit window duration in milliseconds (15 minutes)
 */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Allowed media MIME types
 */
export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Type for allowed media MIME types
 */
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

/**
 * Database record type for posts
 */
interface PostRecord {
  _id: string;
  authorId: string;
  content: string;
  formattedContent: string;
  postType: string;
  parentPostId?: string;
  quotedPostId?: string;
  mediaAttachments: IBaseMediaAttachment<string>[];
  mentions: string[];
  hashtags: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  isEdited: boolean;
  editedAt?: string;
  hubIds?: string[];
  isBlogPost: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * Database record type for likes
 */
interface LikeRecord {
  _id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

/**
 * Database record type for reposts
 */
interface RepostRecord {
  _id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

/**
 * Database record type for votes (upvote/downvote tracking)
 */
interface VoteRecord {
  _id: string;
  userId: string;
  postId: string;
  voteType: 'up' | 'down';
  createdAt: string;
}

/**
 * Collection interface for database operations
 */
interface Collection<T> {
  create(record: T): Promise<T>;
  findOne(filter: Partial<T>): { exec(): Promise<T | null> };
  find(filter: Partial<T>): { exec(): Promise<T[]> };
  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> };
  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> };
}

/**
 * Application interface for accessing database collections
 */
interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

/**
 * Post_Service implementation
 * Handles post creation, editing, deletion, likes, reposts, and quotes
 * @see Requirements: 1.1-1.8, 3.1-3.7, 17.1-17.5
 */
export class PostService implements IPostService {
  private readonly postsCollection: Collection<PostRecord>;
  private readonly likesCollection: Collection<LikeRecord>;
  private readonly repostsCollection: Collection<RepostRecord>;
  private readonly votesCollection: Collection<VoteRecord>;
  private readonly textFormatter = getTextFormatter();
  private notificationService?: INotificationService;

  constructor(application: IApplicationWithCollections) {
    this.postsCollection = application.getModel<PostRecord>('brighthub_posts');
    this.likesCollection = application.getModel<LikeRecord>('brighthub_likes');
    this.repostsCollection =
      application.getModel<RepostRecord>('brighthub_reposts');
    this.votesCollection = application.getModel<VoteRecord>('brighthub_votes');
  }

  /**
   * Set the notification service for creating notifications on interactions.
   * Called after construction to avoid circular dependency issues.
   */
  setNotificationService(service: INotificationService): void {
    this.notificationService = service;
  }

  /**
   * Set the reputation collection for tracking hub-scoped reputation.
   */
  setReputationCollection(
    collection: Collection<{
      _id: string;
      userId: string;
      hubId: string;
      score: number;
      postCount: number;
      upvotesReceived: number;
      lastActiveAt: string;
    }>,
  ): void {
    this.reputationCollection = collection;
  }

  private reputationCollection?: Collection<{
    _id: string;
    userId: string;
    hubId: string;
    score: number;
    postCount: number;
    upvotesReceived: number;
    lastActiveAt: string;
  }>;

  /**
   * Update hub reputation for a user when they receive an upvote or create a post.
   */
  private async updateHubReputation(
    authorId: string,
    hubIds: string[] | undefined,
    event: 'post' | 'upvote',
  ): Promise<void> {
    if (!this.reputationCollection || !hubIds || hubIds.length === 0) return;

    const now = new Date().toISOString();
    for (const hubId of hubIds) {
      const existing = await this.reputationCollection
        .findOne({ userId: authorId, hubId } as never)
        .exec();

      if (existing) {
        const update: Record<string, unknown> = { lastActiveAt: now };
        if (event === 'post') {
          update['postCount'] = existing.postCount + 1;
          update['score'] = existing.score + 1;
        } else {
          update['upvotesReceived'] = existing.upvotesReceived + 1;
          update['score'] = existing.score + 1;
        }
        await this.reputationCollection
          .updateOne({ _id: existing._id } as never, update as never)
          .exec();
      } else {
        await this.reputationCollection.create({
          _id: randomUUID(),
          userId: authorId,
          hubId,
          score: 1,
          postCount: event === 'post' ? 1 : 0,
          upvotesReceived: event === 'upvote' ? 1 : 0,
          lastActiveAt: now,
        });
      }
    }
  }

  /**
   * Validate post content
   * @throws PostServiceError if content is invalid
   */
  private validateContent(content: string, maxChars?: number): void {
    // Check for empty content
    if (!content || content.trim().length === 0) {
      throw new PostServiceError(
        PostErrorCode.EmptyContent,
        'Post content cannot be empty',
      );
    }

    // Check character count using smart counting
    const limit = maxChars ?? POST_MAX_CHARACTERS;
    const charCount = this.textFormatter.getCharacterCount(content);
    if (charCount > limit) {
      throw new PostServiceError(
        PostErrorCode.ContentTooLong,
        `Post content exceeds maximum of ${limit} characters (current: ${charCount})`,
      );
    }
  }

  /**
   * Validate media attachments
   * @throws PostServiceError if attachments are invalid
   */
  private validateMediaAttachments(
    attachments?: IBaseMediaAttachment<string>[],
  ): void {
    if (!attachments || attachments.length === 0) {
      return;
    }

    // Check attachment count
    if (attachments.length > MAX_MEDIA_ATTACHMENTS) {
      throw new PostServiceError(
        PostErrorCode.TooManyAttachments,
        `Maximum ${MAX_MEDIA_ATTACHMENTS} attachments allowed (provided: ${attachments.length})`,
      );
    }

    // Check total size
    const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      throw new PostServiceError(
        PostErrorCode.AttachmentSizeTooLarge,
        `Total attachment size exceeds ${MAX_TOTAL_ATTACHMENT_SIZE / (1024 * 1024)}MB limit`,
      );
    }

    // Check media types
    for (const attachment of attachments) {
      if (
        !ALLOWED_MEDIA_TYPES.includes(attachment.mimeType as AllowedMediaType)
      ) {
        throw new PostServiceError(
          PostErrorCode.InvalidMediaFormat,
          `Invalid media format: ${attachment.mimeType}. Allowed: ${ALLOWED_MEDIA_TYPES.join(', ')}`,
        );
      }
    }
  }

  /**
   * Convert a database record to the API response format
   */
  private recordToPost(record: PostRecord): IBasePostData<string> {
    return {
      _id: record._id,
      authorId: record.authorId,
      content: record.content,
      formattedContent: record.formattedContent,
      postType: record.postType as PostType,
      parentPostId: record.parentPostId,
      quotedPostId: record.quotedPostId,
      mediaAttachments: record.mediaAttachments,
      mentions: record.mentions,
      hashtags: record.hashtags,
      likeCount: record.likeCount,
      repostCount: record.repostCount,
      replyCount: record.replyCount,
      quoteCount: record.quoteCount,
      upvoteCount: record.upvoteCount || 0,
      downvoteCount: record.downvoteCount || 0,
      score: record.score || 0,
      isEdited: record.isEdited,
      editedAt: record.editedAt,
      hubIds: record.hubIds,
      isBlogPost: record.isBlogPost,
      isDeleted: record.isDeleted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    };
  }

  /**
   * Create a new post
   * @see Requirements: 1.1-1.3, 1.8
   */
  async createPost(
    authorId: string,
    content: string,
    options?: ICreatePostOptions,
  ): Promise<IBasePostData<string>> {
    // Validate content — hub posts get the higher limit
    const isHubPost = options?.hubIds && options.hubIds.length > 0;
    this.validateContent(
      content,
      isHubPost ? HUB_POST_MAX_CHARACTERS : undefined,
    );

    // Auto-moderation check
    const modResult = moderateContent(content);
    if (modResult.decision === 'reject') {
      throw new PostServiceError(
        PostErrorCode.ContentTooLong, // Reuse existing error code
        `Post rejected by auto-moderation: ${modResult.reasons.join(', ')}`,
      );
    }

    // Validate media attachments
    this.validateMediaAttachments(options?.mediaAttachments);

    // If this is a reply, verify parent exists
    if (options?.parentPostId) {
      const parent = await this.postsCollection
        .findOne({ _id: options.parentPostId })
        .exec();
      if (!parent || parent.isDeleted) {
        throw new PostServiceError(
          PostErrorCode.ParentPostNotFound,
          'Parent post not found',
        );
      }
    }

    // Format content
    const formatted = this.textFormatter.format(content);

    const now = new Date().toISOString();
    const postId = randomUUID();

    const postRecord: PostRecord = {
      _id: postId,
      authorId,
      content: formatted.raw,
      formattedContent: formatted.formatted,
      postType: options?.parentPostId ? PostType.Reply : PostType.Original,
      parentPostId: options?.parentPostId,
      mediaAttachments: options?.mediaAttachments || [],
      mentions: formatted.mentions,
      hashtags: formatted.hashtags,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
      isEdited: false,
      hubIds: options?.hubIds,
      isBlogPost: !options?.parentPostId,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: authorId,
      updatedBy: authorId,
    };

    const created = await this.postsCollection.create(postRecord);

    // Update parent's reply count if this is a reply
    if (options?.parentPostId) {
      const parent = await this.postsCollection
        .findOne({ _id: options.parentPostId })
        .exec();
      if (parent) {
        await this.postsCollection
          .updateOne(
            { _id: options.parentPostId },
            { replyCount: parent.replyCount + 1, updatedAt: now },
          )
          .exec();

        // Notify the parent post author about the reply (don't notify self-replies)
        if (this.notificationService && parent.authorId !== authorId) {
          try {
            await this.notificationService.createNotification(
              parent.authorId,
              NotificationType.Reply,
              authorId,
              { targetId: parent._id, content: formatted.raw.slice(0, 100) },
            );
          } catch {
            // Non-fatal
          }
        }
      }
    }

    // Notify mentioned users
    if (this.notificationService && formatted.mentions.length > 0) {
      for (const mentionedUsername of formatted.mentions) {
        // Mentions are usernames — in a real system we'd resolve to userId.
        // For now, use the username as the recipientId (the notification service
        // or a resolver layer would map this).
        if (mentionedUsername !== authorId) {
          try {
            await this.notificationService.createNotification(
              mentionedUsername,
              NotificationType.Mention,
              authorId,
              { targetId: created._id, content: formatted.raw.slice(0, 100) },
            );
          } catch {
            // Non-fatal
          }
        }
      }
    }

    // Update hub reputation for the post author
    this.updateHubReputation(authorId, options?.hubIds, 'post').catch(() => {});

    return this.recordToPost(created);
  }

  /**
   * Edit an existing post
   * @see Requirements: 1.4-1.5, 1.7
   */
  async editPost(
    postId: string,
    userId: string,
    newContent: string,
  ): Promise<IBasePostData<string>> {
    // Find the post
    const post = await this.postsCollection.findOne({ _id: postId }).exec();

    if (!post) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    if (post.isDeleted) {
      throw new PostServiceError(
        PostErrorCode.AlreadyDeleted,
        'Cannot edit a deleted post',
      );
    }

    // Check authorization
    if (post.authorId !== userId) {
      throw new PostServiceError(
        PostErrorCode.Unauthorized,
        'You can only edit your own posts',
      );
    }

    // Check edit window (15 minutes)
    const createdAt = new Date(post.createdAt).getTime();
    const now = Date.now();
    if (now - createdAt > EDIT_WINDOW_MS) {
      throw new PostServiceError(
        PostErrorCode.EditWindowExpired,
        'Edit window has expired (15 minutes)',
      );
    }

    // Validate new content
    this.validateContent(newContent);

    // Format new content
    const formatted = this.textFormatter.format(newContent);

    const updatedAt = new Date().toISOString();

    await this.postsCollection
      .updateOne(
        { _id: postId },
        {
          content: formatted.raw,
          formattedContent: formatted.formatted,
          mentions: formatted.mentions,
          hashtags: formatted.hashtags,
          isEdited: true,
          editedAt: updatedAt,
          updatedAt,
          updatedBy: userId,
        },
      )
      .exec();

    // Fetch and return updated post
    const updated = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!updated) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    return this.recordToPost(updated);
  }

  /**
   * Delete a post (soft-delete)
   * @see Requirements: 1.6-1.7
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    // Find the post
    const post = await this.postsCollection.findOne({ _id: postId }).exec();

    if (!post) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    if (post.isDeleted) {
      throw new PostServiceError(
        PostErrorCode.AlreadyDeleted,
        'Post is already deleted',
      );
    }

    // Check authorization
    if (post.authorId !== userId) {
      throw new PostServiceError(
        PostErrorCode.Unauthorized,
        'You can only delete your own posts',
      );
    }

    const now = new Date().toISOString();

    // Soft-delete the post
    await this.postsCollection
      .updateOne(
        { _id: postId },
        {
          isDeleted: true,
          updatedAt: now,
          updatedBy: userId,
        },
      )
      .exec();

    // Cascade: delete all likes on this post
    const likes = await this.likesCollection.find({ postId }).exec();
    for (const like of likes) {
      await this.likesCollection.deleteOne({ _id: like._id }).exec();
    }

    // Cascade: delete all reposts of this post
    const reposts = await this.repostsCollection.find({ postId }).exec();
    for (const repost of reposts) {
      await this.repostsCollection.deleteOne({ _id: repost._id }).exec();
    }

    // Update parent's reply count if this was a reply
    if (post.parentPostId) {
      const parent = await this.postsCollection
        .findOne({ _id: post.parentPostId })
        .exec();
      if (parent && parent.replyCount > 0) {
        await this.postsCollection
          .updateOne(
            { _id: post.parentPostId },
            { replyCount: parent.replyCount - 1, updatedAt: now },
          )
          .exec();
      }
    }
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<IBasePostData<string>> {
    const post = await this.postsCollection.findOne({ _id: postId }).exec();

    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    return this.recordToPost(post);
  }

  /**
   * Like a post
   * @see Requirements: 3.1, 3.5
   */
  async likePost(postId: string, userId: string): Promise<void> {
    // Verify post exists
    const post = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    // Check if already liked (idempotence)
    const existingLike = await this.likesCollection
      .findOne({ userId, postId })
      .exec();
    if (existingLike) {
      // Idempotent: already liked, just return
      return;
    }

    // Create like record
    const now = new Date().toISOString();
    await this.likesCollection.create({
      _id: randomUUID(),
      userId,
      postId,
      createdAt: now,
    });

    // Increment like count
    await this.postsCollection
      .updateOne(
        { _id: postId },
        { likeCount: post.likeCount + 1, updatedAt: now },
      )
      .exec();

    // Create notification for the post author (don't notify self-likes)
    if (this.notificationService && post.authorId !== userId) {
      try {
        await this.notificationService.createNotification(
          post.authorId,
          NotificationType.Like,
          userId,
          {
            targetId: postId,
            content: 'liked your post',
            clickThroughUrl: `/posts/${postId}`,
          },
        );
      } catch {
        // Non-fatal: notification failure should not break the like operation
      }
    }
  }

  /**
   * Unlike a post
   * @see Requirements: 3.2
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    // Verify post exists
    const post = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    // Check if liked
    const existingLike = await this.likesCollection
      .findOne({ userId, postId })
      .exec();
    if (!existingLike) {
      // Idempotent: not liked, just return
      return;
    }

    // Delete like record
    await this.likesCollection.deleteOne({ _id: existingLike._id }).exec();

    // Decrement like count
    const now = new Date().toISOString();
    await this.postsCollection
      .updateOne(
        { _id: postId },
        {
          likeCount: Math.max(0, post.likeCount - 1),
          updatedAt: now,
        },
      )
      .exec();
  }

  /**
   * Upvote a post. If the user already downvoted, switches to upvote.
   * If already upvoted, idempotent (no-op).
   * Uses the votes collection for persistent, tamper-proof tracking.
   */
  async upvotePost(postId: string, userId: string): Promise<void> {
    const post = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    // Check for existing vote in the votes collection
    const existingVote = await this.votesCollection
      .findOne({ userId, postId })
      .exec();

    const now = new Date().toISOString();

    if (existingVote) {
      if (existingVote.voteType === 'up') {
        // Already upvoted — idempotent
        return;
      }
      // Was a downvote — switch to upvote
      await this.votesCollection
        .updateOne({ _id: existingVote._id }, {
          voteType: 'up',
          createdAt: now,
        } as Partial<VoteRecord>)
        .exec();

      // Adjust counts: remove downvote, add upvote
      await this.postsCollection
        .updateOne(
          { _id: postId },
          {
            upvoteCount: (post.upvoteCount || 0) + 1,
            downvoteCount: Math.max(0, (post.downvoteCount || 0) - 1),
            score:
              (post.upvoteCount || 0) +
              1 -
              Math.max(0, (post.downvoteCount || 0) - 1),
            updatedAt: now,
          },
        )
        .exec();
    } else {
      // New upvote
      await this.votesCollection.create({
        _id: randomUUID(),
        userId,
        postId,
        voteType: 'up',
        createdAt: now,
      });

      await this.postsCollection
        .updateOne(
          { _id: postId },
          {
            upvoteCount: (post.upvoteCount || 0) + 1,
            score: (post.upvoteCount || 0) + 1 - (post.downvoteCount || 0),
            updatedAt: now,
          },
        )
        .exec();
    }

    // Update hub reputation for the post author
    this.updateHubReputation(post.authorId, post.hubIds, 'upvote').catch(
      () => {},
    );
  }

  /**
   * Downvote a post. If the user already upvoted, switches to downvote.
   * If already downvoted, idempotent (no-op).
   * Uses the votes collection for persistent, tamper-proof tracking.
   */
  async downvotePost(postId: string, userId: string): Promise<void> {
    const post = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    // Check for existing vote
    const existingVote = await this.votesCollection
      .findOne({ userId, postId })
      .exec();

    const now = new Date().toISOString();

    if (existingVote) {
      if (existingVote.voteType === 'down') {
        // Already downvoted — idempotent
        return;
      }
      // Was an upvote — switch to downvote
      await this.votesCollection
        .updateOne({ _id: existingVote._id }, {
          voteType: 'down',
          createdAt: now,
        } as Partial<VoteRecord>)
        .exec();

      // Adjust counts: remove upvote, add downvote
      await this.postsCollection
        .updateOne(
          { _id: postId },
          {
            upvoteCount: Math.max(0, (post.upvoteCount || 0) - 1),
            downvoteCount: (post.downvoteCount || 0) + 1,
            score:
              Math.max(0, (post.upvoteCount || 0) - 1) -
              ((post.downvoteCount || 0) + 1),
            updatedAt: now,
          },
        )
        .exec();
    } else {
      // New downvote
      await this.votesCollection.create({
        _id: randomUUID(),
        userId,
        postId,
        voteType: 'down',
        createdAt: now,
      });

      await this.postsCollection
        .updateOne(
          { _id: postId },
          {
            downvoteCount: (post.downvoteCount || 0) + 1,
            score: (post.upvoteCount || 0) - ((post.downvoteCount || 0) + 1),
            updatedAt: now,
          },
        )
        .exec();
    }
  }

  /**
   * Repost a post
   * @see Requirements: 3.3, 3.6
   */
  async repostPost(
    postId: string,
    userId: string,
  ): Promise<IBasePostData<string>> {
    // Verify post exists
    const post = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    // Check if already reposted (prevent duplicates)
    const existingRepost = await this.repostsCollection
      .findOne({ userId, postId })
      .exec();
    if (existingRepost) {
      throw new PostServiceError(
        PostErrorCode.AlreadyReposted,
        'You have already reposted this post',
      );
    }

    const now = new Date().toISOString();
    const repostId = randomUUID();

    // Create repost record
    await this.repostsCollection.create({
      _id: repostId,
      userId,
      postId,
      createdAt: now,
    });

    // Create repost post entry
    const repostRecord: PostRecord = {
      _id: repostId,
      authorId: userId,
      content: '',
      formattedContent: '',
      postType: PostType.Repost,
      quotedPostId: postId,
      mediaAttachments: [],
      mentions: [],
      hashtags: [],
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
      isEdited: false,
      isBlogPost: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const created = await this.postsCollection.create(repostRecord);

    // Increment original post's repost count
    await this.postsCollection
      .updateOne(
        { _id: postId },
        { repostCount: post.repostCount + 1, updatedAt: now },
      )
      .exec();

    // Notify the original post author about the repost
    if (this.notificationService && post.authorId !== userId) {
      try {
        await this.notificationService.createNotification(
          post.authorId,
          NotificationType.Repost,
          userId,
          { targetId: postId },
        );
      } catch {
        // Non-fatal
      }
    }

    return this.recordToPost(created);
  }

  /**
   * Create a quote post
   * @see Requirements: 3.4
   */
  async createQuotePost(
    postId: string,
    userId: string,
    commentary: string,
  ): Promise<IBasePostData<string>> {
    // Verify quoted post exists
    const quotedPost = await this.postsCollection
      .findOne({ _id: postId })
      .exec();
    if (!quotedPost || quotedPost.isDeleted) {
      throw new PostServiceError(
        PostErrorCode.QuotedPostNotFound,
        'Quoted post not found',
      );
    }

    // Validate commentary content
    this.validateContent(commentary);

    // Format content
    const formatted = this.textFormatter.format(commentary);

    const now = new Date().toISOString();
    const quoteId = randomUUID();

    const quoteRecord: PostRecord = {
      _id: quoteId,
      authorId: userId,
      content: formatted.raw,
      formattedContent: formatted.formatted,
      postType: PostType.Quote,
      quotedPostId: postId,
      mediaAttachments: [],
      mentions: formatted.mentions,
      hashtags: formatted.hashtags,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
      isEdited: false,
      isBlogPost: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const created = await this.postsCollection.create(quoteRecord);

    // Increment original post's quote count
    await this.postsCollection
      .updateOne(
        { _id: postId },
        { quoteCount: quotedPost.quoteCount + 1, updatedAt: now },
      )
      .exec();

    // Notify the quoted post author
    if (this.notificationService && quotedPost.authorId !== userId) {
      try {
        await this.notificationService.createNotification(
          quotedPost.authorId,
          NotificationType.Quote,
          userId,
          { targetId: postId, content: formatted.raw.slice(0, 100) },
        );
      } catch {
        // Non-fatal
      }
    }

    return this.recordToPost(created);
  }

  /**
   * Get aggregate post statistics for the admin dashboard.
   * Returns total non-deleted posts and count of distinct authors
   * active in the last 30 days.
   * @see Requirements: 2.4
   */
  async getStats(): Promise<{
    totalPosts: number;
    activeUsersLast30Days: number;
  }> {
    try {
      // Get all non-deleted posts
      const activePosts = await this.postsCollection
        .find({ isDeleted: false } as Partial<PostRecord>)
        .exec();

      const totalPosts = activePosts.length;

      // Compute distinct authors active in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString();

      const recentAuthors = new Set<string>();
      for (const post of activePosts) {
        if (post.createdAt >= cutoff) {
          recentAuthors.add(post.authorId);
        }
      }

      return {
        totalPosts,
        activeUsersLast30Days: recentAuthors.size,
      };
    } catch {
      return { totalPosts: 0, activeUsersLast30Days: 0 };
    }
  }

  /**
   * Get the interaction status for a user on a post
   * @see Requirements: 3.7
   */
  async getInteractionStatus(
    postId: string,
    userId: string,
  ): Promise<IInteractionStatus> {
    // Check if post exists
    const post = await this.postsCollection.findOne({ _id: postId }).exec();
    if (!post || post.isDeleted) {
      throw new PostServiceError(PostErrorCode.PostNotFound, 'Post not found');
    }

    // Check like status
    const like = await this.likesCollection.findOne({ userId, postId }).exec();

    // Check repost status
    const repost = await this.repostsCollection
      .findOne({ userId, postId })
      .exec();

    return {
      hasLiked: !!like,
      hasReposted: !!repost,
    };
  }
}

/**
 * Create a new PostService instance
 */
export function createPostService(
  application: IApplicationWithCollections,
): PostService {
  return new PostService(application);
}
