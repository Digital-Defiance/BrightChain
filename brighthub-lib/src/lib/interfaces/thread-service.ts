import { IBasePostData } from './base-post-data';
import { IBaseThread } from './base-thread';

/**
 * Options for retrieving a thread
 */
export interface IThreadOptions {
  /** Maximum depth of replies to retrieve */
  maxDepth?: number;
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of replies per level */
  limit?: number;
}

/**
 * Error codes for thread operations
 */
export enum ThreadErrorCode {
  /** Post not found */
  PostNotFound = 'POST_NOT_FOUND',
  /** Parent post not found */
  ParentPostNotFound = 'PARENT_POST_NOT_FOUND',
  /** Content is empty or whitespace only */
  EmptyContent = 'EMPTY_CONTENT',
  /** Content exceeds maximum character limit */
  ContentTooLong = 'CONTENT_TOO_LONG',
  /** Maximum thread depth exceeded */
  MaxDepthExceeded = 'MAX_DEPTH_EXCEEDED',
}

/**
 * Thread service error with code and message
 */
export class ThreadServiceError extends Error {
  constructor(
    public readonly code: ThreadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ThreadServiceError';
  }
}

/**
 * Maximum nesting depth for thread replies
 */
export const MAX_THREAD_DEPTH = 10;

/**
 * Interface for the Thread_Service
 * Manages threaded conversations and reply hierarchies
 * @see Requirements: 2.1-2.6
 */
export interface IThreadService {
  /**
   * Create a reply to an existing post
   * @param parentPostId ID of the post to reply to
   * @param authorId ID of the reply author
   * @param content Raw content of the reply
   * @returns The created reply post
   * @throws ThreadServiceError if parent not found or validation fails
   * @see Requirements: 2.1
   */
  createReply(
    parentPostId: string,
    authorId: string,
    content: string,
  ): Promise<IBasePostData<string>>;

  /**
   * Get a thread with all its replies in hierarchical order
   * @param rootPostId ID of the root post
   * @param options Optional settings for thread retrieval
   * @returns The thread with root post and nested replies
   * @throws ThreadServiceError if root post not found
   * @see Requirements: 2.2
   */
  getThread(
    rootPostId: string,
    options?: IThreadOptions,
  ): Promise<IBaseThread<string>>;

  /**
   * Get the depth of a post in its thread hierarchy
   * @param postId ID of the post to check
   * @returns The depth level (0 for root posts)
   * @throws ThreadServiceError if post not found
   * @see Requirements: 2.3
   */
  getReplyDepth(postId: string): Promise<number>;
}
