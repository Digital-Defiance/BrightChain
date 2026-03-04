import { IBaseMediaAttachment } from './base-media-attachment';
import { IBasePostData } from './base-post-data';

/**
 * Options for creating a new post
 */
export interface ICreatePostOptions {
  /** ID of the parent post (for replies) */
  parentPostId?: string;
  /** Media attachments (max 4) */
  mediaAttachments?: IBaseMediaAttachment<string>[];
  /** Hub IDs for restricted visibility */
  hubIds?: string[];
}

/**
 * Status of user interactions on a post
 */
export interface IInteractionStatus {
  /** Whether the user has liked the post */
  hasLiked: boolean;
  /** Whether the user has reposted the post */
  hasReposted: boolean;
}

/**
 * Result of a post creation or update operation
 */
export interface IPostResult {
  /** Whether the operation was successful */
  success: boolean;
  /** The post data if successful */
  post?: IBasePostData<string>;
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Error codes for post operations
 */
export enum PostErrorCode {
  /** Content is empty or whitespace only */
  EmptyContent = 'EMPTY_CONTENT',
  /** Content exceeds maximum character limit */
  ContentTooLong = 'CONTENT_TOO_LONG',
  /** Post not found */
  PostNotFound = 'POST_NOT_FOUND',
  /** User is not authorized to perform this action */
  Unauthorized = 'UNAUTHORIZED',
  /** Edit window has expired (15 minutes) */
  EditWindowExpired = 'EDIT_WINDOW_EXPIRED',
  /** Post has already been deleted */
  AlreadyDeleted = 'ALREADY_DELETED',
  /** User has already liked this post */
  AlreadyLiked = 'ALREADY_LIKED',
  /** User has not liked this post */
  NotLiked = 'NOT_LIKED',
  /** User has already reposted this post */
  AlreadyReposted = 'ALREADY_REPOSTED',
  /** Invalid media attachment */
  InvalidMediaAttachment = 'INVALID_MEDIA_ATTACHMENT',
  /** Too many media attachments */
  TooManyAttachments = 'TOO_MANY_ATTACHMENTS',
  /** Total attachment size exceeds limit */
  AttachmentSizeTooLarge = 'ATTACHMENT_SIZE_TOO_LARGE',
  /** Invalid media format */
  InvalidMediaFormat = 'INVALID_MEDIA_FORMAT',
  /** Quoted post not found */
  QuotedPostNotFound = 'QUOTED_POST_NOT_FOUND',
  /** Parent post not found */
  ParentPostNotFound = 'PARENT_POST_NOT_FOUND',
}

/**
 * Post service error with code and message
 */
export class PostServiceError extends Error {
  constructor(
    public readonly code: PostErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PostServiceError';
  }
}

/**
 * Interface for the Post_Service
 * Handles post creation, editing, deletion, and interactions
 * @see Requirements: 1.1-1.8, 3.1-3.7, 17.1-17.5
 */
export interface IPostService {
  /**
   * Create a new post
   * @param authorId ID of the post author
   * @param content Raw content of the post
   * @param options Optional settings for the post
   * @returns The created post
   * @throws PostServiceError if validation fails
   * @see Requirements: 1.1-1.3, 1.8
   */
  createPost(
    authorId: string,
    content: string,
    options?: ICreatePostOptions,
  ): Promise<IBasePostData<string>>;

  /**
   * Edit an existing post
   * @param postId ID of the post to edit
   * @param userId ID of the user attempting to edit
   * @param newContent New content for the post
   * @returns The updated post
   * @throws PostServiceError if edit is not allowed
   * @see Requirements: 1.4-1.5, 1.7
   */
  editPost(
    postId: string,
    userId: string,
    newContent: string,
  ): Promise<IBasePostData<string>>;

  /**
   * Delete a post (soft-delete)
   * @param postId ID of the post to delete
   * @param userId ID of the user attempting to delete
   * @throws PostServiceError if deletion is not allowed
   * @see Requirements: 1.6-1.7
   */
  deletePost(postId: string, userId: string): Promise<void>;

  /**
   * Get a single post by ID
   * @param postId ID of the post to retrieve
   * @returns The post data
   * @throws PostServiceError if post not found
   */
  getPost(postId: string): Promise<IBasePostData<string>>;

  /**
   * Like a post
   * @param postId ID of the post to like
   * @param userId ID of the user liking the post
   * @throws PostServiceError if already liked
   * @see Requirements: 3.1, 3.5
   */
  likePost(postId: string, userId: string): Promise<void>;

  /**
   * Unlike a post
   * @param postId ID of the post to unlike
   * @param userId ID of the user unliking the post
   * @throws PostServiceError if not liked
   * @see Requirements: 3.2
   */
  unlikePost(postId: string, userId: string): Promise<void>;

  /**
   * Repost a post
   * @param postId ID of the post to repost
   * @param userId ID of the user reposting
   * @returns The created repost entry
   * @throws PostServiceError if already reposted
   * @see Requirements: 3.3, 3.6
   */
  repostPost(postId: string, userId: string): Promise<IBasePostData<string>>;

  /**
   * Create a quote post
   * @param postId ID of the post to quote
   * @param userId ID of the user creating the quote
   * @param commentary Additional commentary for the quote
   * @returns The created quote post
   * @see Requirements: 3.4
   */
  createQuotePost(
    postId: string,
    userId: string,
    commentary: string,
  ): Promise<IBasePostData<string>>;

  /**
   * Get the interaction status for a user on a post
   * @param postId ID of the post
   * @param userId ID of the user
   * @returns The interaction status
   * @see Requirements: 3.7
   */
  getInteractionStatus(
    postId: string,
    userId: string,
  ): Promise<IInteractionStatus>;
}
