import { IBasePostData } from './base-post-data';

/**
 * Options for timeline/feed requests
 */
export interface ITimelineOptions {
  /** Cursor for pagination (ISO timestamp of last post) */
  cursor?: string;
  /** Maximum number of posts to return (default 20, max 50) */
  limit?: number;
  /** Connection list ID to filter by */
  listId?: string;
  /** Connection category ID to filter by */
  categoryId?: string;
  /** Whether to exclude muted users' posts */
  excludeMuted?: boolean;
}

/**
 * Result of a timeline/feed request
 */
export interface ITimelineResult {
  /** Array of posts in the timeline */
  posts: IBasePostData<string>[];
  /** Cursor for the next page (ISO timestamp of last post) */
  cursor?: string;
  /** Whether there are more posts available */
  hasMore: boolean;
}

/**
 * Error codes for feed operations
 */
export enum FeedErrorCode {
  /** User not found */
  UserNotFound = 'USER_NOT_FOUND',
  /** Invalid cursor format */
  InvalidCursor = 'INVALID_CURSOR',
  /** List not found */
  ListNotFound = 'LIST_NOT_FOUND',
  /** Hashtag is empty or invalid */
  InvalidHashtag = 'INVALID_HASHTAG',
}

/**
 * Feed service error with code and message
 */
export class FeedServiceError extends Error {
  constructor(
    public readonly code: FeedErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FeedServiceError';
  }
}

/**
 * Maximum number of posts per timeline request
 */
export const MAX_TIMELINE_POSTS = 50;

/**
 * Default number of posts per timeline request
 */
export const DEFAULT_TIMELINE_LIMIT = 20;

/**
 * Interface for the Feed_Service
 * Generates personalized and public timelines with filtering
 * @see Requirements: 5.1-5.5
 */
export interface IFeedService {
  /**
   * Get the home timeline for a user (posts from followed users)
   * Returns posts in reverse chronological order
   * @param userId ID of the requesting user
   * @param options Timeline options (pagination, filtering)
   * @returns Timeline result with posts, cursor, and hasMore flag
   * @see Requirements: 5.1, 5.3, 5.4, 5.6, 5.7
   */
  getHomeTimeline(
    userId: string,
    options?: ITimelineOptions,
  ): Promise<ITimelineResult>;

  /**
   * Get the public timeline (recent public posts from all users)
   * @param options Timeline options (pagination)
   * @param requestingUserId Optional ID of the requesting user for blocked user filtering
   * @returns Timeline result with posts, cursor, and hasMore flag
   * @see Requirements: 5.2, 5.3, 5.6, 5.7
   */
  getPublicTimeline(
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult>;

  /**
   * Get a specific user's feed (their posts and reposts)
   * @param targetUserId ID of the user whose feed to retrieve
   * @param options Timeline options (pagination)
   * @param requestingUserId Optional ID of the requesting user for blocked user filtering
   * @returns Timeline result with posts, cursor, and hasMore flag
   * @see Requirements: 5.5, 5.6
   */
  getUserFeed(
    targetUserId: string,
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult>;

  /**
   * Get posts containing a specific hashtag
   * @param hashtag The hashtag to search for (without # prefix)
   * @param options Timeline options (pagination)
   * @param requestingUserId Optional ID of the requesting user for blocked user filtering
   * @returns Timeline result with posts, cursor, and hasMore flag
   * @see Requirements: 7.4, 5.6
   */
  getHashtagFeed(
    hashtag: string,
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult>;

  /**
   * Get timeline filtered by connection list members
   * @param listId ID of the connection list
   * @param userId ID of the requesting user
   * @param options Timeline options (pagination)
   * @returns Timeline result with posts, cursor, and hasMore flag
   * @see Requirements: 5.8
   */
  getListTimeline(
    listId: string,
    userId: string,
    options?: ITimelineOptions,
  ): Promise<ITimelineResult>;

  /**
   * Get timeline filtered by connection category
   * Returns only posts from connections assigned to the given category
   * @param categoryId ID of the connection category
   * @param userId ID of the requesting user
   * @param options Timeline options (pagination)
   * @returns Timeline result with posts, cursor, and hasMore flag
   * @see Requirements: 5.9
   */
  getCategoryTimeline(
    categoryId: string,
    userId: string,
    options?: ITimelineOptions,
  ): Promise<ITimelineResult>;
}
