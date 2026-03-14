import {
  IBasePostData,
  IBaseThread,
  IThreadOptions,
  IThreadService,
  MAX_THREAD_DEPTH,
  PostType,
  ThreadErrorCode,
  ThreadServiceError,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';
import { getTextFormatter } from './textFormatter';

/**
 * Maximum character limit for replies (same as posts)
 */
export const REPLY_MAX_CHARACTERS = 280;

/**
 * Database record type for posts (same as PostService)
 */
interface PostRecord {
  _id: string;
  authorId: string;
  content: string;
  formattedContent: string;
  postType: string;
  parentPostId?: string;
  quotedPostId?: string;
  mediaAttachments: Array<{
    _id: string;
    url: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    altText?: string;
  }>;
  mentions: string[];
  hashtags: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
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
}

/**
 * Application interface for accessing database collections
 */
interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

/**
 * Thread_Service implementation
 * Manages threaded conversations and reply hierarchies
 * @see Requirements: 2.1-2.6
 */
export class ThreadService implements IThreadService {
  private readonly postsCollection: Collection<PostRecord>;
  private readonly textFormatter = getTextFormatter();

  constructor(application: IApplicationWithCollections) {
    this.postsCollection = application.getModel<PostRecord>('brighthub_posts');
  }

  /**
   * Validate reply content
   * @throws ThreadServiceError if content is invalid
   */
  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new ThreadServiceError(
        ThreadErrorCode.EmptyContent,
        'Reply content cannot be empty',
      );
    }

    const charCount = this.textFormatter.getCharacterCount(content);
    if (charCount > REPLY_MAX_CHARACTERS) {
      throw new ThreadServiceError(
        ThreadErrorCode.ContentTooLong,
        `Reply content exceeds maximum of ${REPLY_MAX_CHARACTERS} characters (current: ${charCount})`,
      );
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
   * Get the depth of a post by traversing up the parent chain
   * @param postId ID of the post
   * @returns The depth (0 for root posts, 1 for direct replies, etc.)
   */
  async getReplyDepth(postId: string): Promise<number> {
    let depth = 0;
    let currentId: string | undefined = postId;

    while (currentId) {
      const post = await this.postsCollection
        .findOne({ _id: currentId })
        .exec();

      if (!post) {
        throw new ThreadServiceError(
          ThreadErrorCode.PostNotFound,
          'Post not found',
        );
      }

      if (!post.parentPostId) {
        // Reached the root
        break;
      }

      depth++;
      currentId = post.parentPostId;
    }

    return depth;
  }

  /**
   * Find the appropriate parent for a reply, enforcing max depth
   * If the target parent is at max depth, reassign to the deepest allowed parent
   * @see Requirements: 2.3, 2.4
   */
  private async findEffectiveParent(parentPostId: string): Promise<string> {
    // Build the ancestor chain from parent to root
    const ancestors: string[] = [];
    let currentId: string | undefined = parentPostId;

    while (currentId) {
      ancestors.push(currentId);
      const post = await this.postsCollection
        .findOne({ _id: currentId })
        .exec();

      if (!post) {
        throw new ThreadServiceError(
          ThreadErrorCode.ParentPostNotFound,
          'Parent post not found',
        );
      }

      if (post.isDeleted) {
        // Parent is deleted but we can still reply (with indicator)
        // Continue traversing to find depth
      }

      currentId = post.parentPostId;
    }

    // ancestors[0] is the requested parent, ancestors[length-1] is the root
    // The depth of the requested parent is ancestors.length - 1
    const parentDepth = ancestors.length - 1;

    // If adding a reply would exceed max depth, reassign to deepest allowed parent
    // New reply depth would be parentDepth + 1
    // MAX_THREAD_DEPTH = 10 means depths 0-9 are allowed (10 levels)
    // So if parentDepth + 1 > MAX_THREAD_DEPTH - 1, we need to reassign
    if (parentDepth + 1 > MAX_THREAD_DEPTH - 1) {
      // We need to find an ancestor such that replying to it gives depth <= MAX_THREAD_DEPTH - 1
      // If we reply to ancestor at depth D, the reply will be at depth D + 1
      // So we need D + 1 <= MAX_THREAD_DEPTH - 1, meaning D <= MAX_THREAD_DEPTH - 2
      // The ancestor at depth D is at index (ancestors.length - 1 - D) from the start
      // We want D = MAX_THREAD_DEPTH - 2, so index = ancestors.length - 1 - (MAX_THREAD_DEPTH - 2)
      //                                           = ancestors.length - MAX_THREAD_DEPTH + 1
      const targetIndex = ancestors.length - MAX_THREAD_DEPTH + 1;
      if (targetIndex >= 0 && targetIndex < ancestors.length) {
        return ancestors[targetIndex];
      }
      // Fallback to the root
      return ancestors[ancestors.length - 1];
    }

    return parentPostId;
  }

  /**
   * Create a reply to an existing post
   * @see Requirements: 2.1, 2.3, 2.4, 2.6
   */
  async createReply(
    parentPostId: string,
    authorId: string,
    content: string,
  ): Promise<IBasePostData<string>> {
    // Validate content
    this.validateContent(content);

    // Find the effective parent (handles depth limiting)
    const effectiveParentId = await this.findEffectiveParent(parentPostId);

    // Verify parent exists
    const parent = await this.postsCollection
      .findOne({ _id: effectiveParentId })
      .exec();

    if (!parent) {
      throw new ThreadServiceError(
        ThreadErrorCode.ParentPostNotFound,
        'Parent post not found',
      );
    }

    // Format content
    const formatted = this.textFormatter.format(content);

    const now = new Date().toISOString();
    const replyId = randomUUID();

    const replyRecord: PostRecord = {
      _id: replyId,
      authorId,
      content: formatted.raw,
      formattedContent: formatted.formatted,
      postType: PostType.Reply,
      parentPostId: effectiveParentId,
      mediaAttachments: [],
      mentions: formatted.mentions,
      hashtags: formatted.hashtags,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0,
      isEdited: false,
      isBlogPost: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: authorId,
      updatedBy: authorId,
    };

    const created = await this.postsCollection.create(replyRecord);

    // Update parent's reply count
    // Note: Even if parent is deleted, we track the count
    await this.postsCollection
      .updateOne(
        { _id: effectiveParentId },
        {
          replyCount: parent.replyCount + 1,
          updatedAt: now,
        },
      )
      .exec();

    return this.recordToPost(created);
  }

  /**
   * Get a thread with all its replies in hierarchical order
   * @see Requirements: 2.2, 2.5
   */
  async getThread(
    rootPostId: string,
    options?: IThreadOptions,
  ): Promise<IBaseThread<string>> {
    // Get the root post
    const rootRecord = await this.postsCollection
      .findOne({ _id: rootPostId })
      .exec();

    if (!rootRecord) {
      throw new ThreadServiceError(
        ThreadErrorCode.PostNotFound,
        'Root post not found',
      );
    }

    // Get all replies recursively
    const allReplies = await this.getAllReplies(
      rootPostId,
      options?.maxDepth ?? MAX_THREAD_DEPTH,
    );

    // Count unique participants
    const participantIds = new Set<string>();
    participantIds.add(rootRecord.authorId);
    for (const reply of allReplies) {
      participantIds.add(reply.authorId);
    }

    return {
      rootPost: this.recordToPost(rootRecord),
      replies: allReplies.map((r) => this.recordToPost(r)),
      replyCount: allReplies.length,
      participantCount: participantIds.size,
    };
  }

  /**
   * Recursively get all replies to a post
   */
  private async getAllReplies(
    postId: string,
    maxDepth: number,
    currentDepth: number = 0,
  ): Promise<PostRecord[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    // Find direct replies to this post
    const directReplies = await this.postsCollection
      .find({ parentPostId: postId })
      .exec();

    // Filter out deleted posts but preserve structure
    // (deleted posts show as "deleted" indicator per requirement 2.5)
    const results: PostRecord[] = [];

    for (const reply of directReplies) {
      results.push(reply);

      // Recursively get replies to this reply
      const nestedReplies = await this.getAllReplies(
        reply._id,
        maxDepth,
        currentDepth + 1,
      );
      results.push(...nestedReplies);
    }

    // Sort by creation time
    results.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return results;
  }
}

/**
 * Create a new ThreadService instance
 */
export function createThreadService(
  application: IApplicationWithCollections,
): ThreadService {
  return new ThreadService(application);
}
