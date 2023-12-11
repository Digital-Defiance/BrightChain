import {
  DEFAULT_TIMELINE_LIMIT,
  FeedErrorCode,
  FeedServiceError,
  IBasePostData,
  IFeedService,
  ITimelineOptions,
  ITimelineResult,
  MAX_TIMELINE_POSTS,
  PostType,
} from '@brightchain/brighthub-lib';

/**
 * Database record type for posts (matches PostService's PostRecord)
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
    altText?: string;
  }>;
  mentions: string[];
  hashtags: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  upvoteCount?: number;
  downvoteCount?: number;
  score?: number;
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
 * Database record type for follows
 */
interface FollowRecord {
  _id: string;
  followerId: string;
  followedId: string;
  createdAt: string;
}

/**
 * Database record type for blocks
 */
interface BlockRecord {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

/**
 * Database record type for mutes
 */
interface MuteRecord {
  _id: string;
  muterId: string;
  mutedId: string;
  createdAt: string;
}

/**
 * Database record type for connection list members
 */
interface ConnectionListMemberRecord {
  _id: string;
  listId: string;
  userId: string;
  addedAt: string;
}

/**
 * Database record type for connection metadata (priority, quiet, categories)
 */
interface ConnectionMetadataRecord {
  _id: string;
  userId: string;
  connectionId: string;
  isPriority: boolean;
  isQuiet: boolean;
  categoryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Database record type for hub members
 */
interface HubMemberRecord {
  _id: string;
  hubId: string;
  userId: string;
  addedAt: string;
}

/**
 * Database record type for temporary mutes
 */
interface TemporaryMuteRecord {
  _id: string;
  userId: string;
  connectionId: string;
  duration: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Find query interface for chaining
 */
interface FindQuery<T> {
  sort?(field: Record<string, 1 | -1>): FindQuery<T>;
  skip?(count: number): FindQuery<T>;
  limit?(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

/**
 * Collection interface for database operations
 */
interface Collection<T> {
  create(record: T): Promise<T>;
  findOne(filter: Partial<T>): { exec(): Promise<T | null> };
  find(filter: Partial<T>): FindQuery<T>;
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
 * Feed_Service implementation
 * Generates personalized and public timelines with filtering
 * @see Requirements: 5.1-5.5
 */
export class FeedService implements IFeedService {
  private readonly postsCollection: Collection<PostRecord>;
  private readonly followsCollection: Collection<FollowRecord>;
  private readonly blocksCollection: Collection<BlockRecord>;
  private readonly mutesCollection: Collection<MuteRecord>;
  private readonly connectionListMembersCollection: Collection<ConnectionListMemberRecord>;
  private readonly connectionMetadataCollection: Collection<ConnectionMetadataRecord>;
  private readonly hubMembersCollection: Collection<HubMemberRecord>;
  private readonly temporaryMutesCollection: Collection<TemporaryMuteRecord>;

  constructor(application: IApplicationWithCollections) {
    this.postsCollection = application.getModel<PostRecord>('brighthub_posts');
    this.followsCollection =
      application.getModel<FollowRecord>('brighthub_follows');
    this.blocksCollection =
      application.getModel<BlockRecord>('brighthub_blocks');
    this.mutesCollection = application.getModel<MuteRecord>('brighthub_mutes');
    this.connectionListMembersCollection =
      application.getModel<ConnectionListMemberRecord>(
        'brighthub_connection_list_members',
      );
    this.connectionMetadataCollection =
      application.getModel<ConnectionMetadataRecord>(
        'brighthub_connection_metadata',
      );
    this.hubMembersCollection = application.getModel<HubMemberRecord>(
      'brighthub_hub_members',
    );
    this.temporaryMutesCollection = application.getModel<TemporaryMuteRecord>(
      'brighthub_temporary_mutes',
    );
  }

  /**
   * Resolve the effective limit from options, clamped to MAX_TIMELINE_POSTS
   */
  private getLimit(options?: ITimelineOptions): number {
    const requested = options?.limit ?? DEFAULT_TIMELINE_LIMIT;
    return Math.min(Math.max(1, requested), MAX_TIMELINE_POSTS);
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
   * Get IDs of users blocked by or blocking the given user
   */
  private async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const blockedByMe = await this.blocksCollection
      .find({ blockerId: userId } as Partial<BlockRecord>)
      .exec();
    const blockedMe = await this.blocksCollection
      .find({ blockedId: userId } as Partial<BlockRecord>)
      .exec();

    const blockedIds = new Set<string>();
    for (const b of blockedByMe) {
      blockedIds.add(b.blockedId);
    }
    for (const b of blockedMe) {
      blockedIds.add(b.blockerId);
    }
    return blockedIds;
  }

  /**
   * Get IDs of users muted by the given user
   */
  private async getMutedUserIds(userId: string): Promise<Set<string>> {
    const mutes = await this.mutesCollection
      .find({ muterId: userId } as Partial<MuteRecord>)
      .exec();
    return new Set(mutes.map((m) => m.mutedId));
  }

  /**
   * Get IDs of users the given user follows
   */
  private async getFollowedUserIds(userId: string): Promise<string[]> {
    const follows = await this.followsCollection
      .find({ followerId: userId } as Partial<FollowRecord>)
      .exec();
    return follows.map((f) => f.followedId);
  }

  /**
   * Get IDs of users temporarily muted by the given user (active mutes only)
   * @see Requirements: 5.12
   */
  private async getTemporarilyMutedUserIds(
    userId: string,
  ): Promise<Set<string>> {
    const mutes = await this.temporaryMutesCollection
      .find({ userId } as Partial<TemporaryMuteRecord>)
      .exec();
    const now = new Date().getTime();
    return new Set(
      mutes
        .filter((m) => new Date(m.expiresAt).getTime() > now)
        .map((m) => m.connectionId),
    );
  }

  /**
   * Get IDs of priority connections for the given user
   * @see Requirements: 5.10
   */
  private async getPriorityConnectionIds(userId: string): Promise<Set<string>> {
    const metadata = await this.connectionMetadataCollection
      .find({ userId, isPriority: true } as Partial<ConnectionMetadataRecord>)
      .exec();
    return new Set(metadata.map((m) => m.connectionId));
  }

  /**
   * Get IDs of hubs the given user is a member of
   * @see Requirements: 5.11
   */
  private async getUserHubIds(userId: string): Promise<Set<string>> {
    const memberships = await this.hubMembersCollection
      .find({ userId } as Partial<HubMemberRecord>)
      .exec();
    return new Set(memberships.map((m) => m.hubId));
  }

  /**
   * Get connection IDs assigned to a specific category for the given user
   * @see Requirements: 5.9
   */
  private async getCategoryConnectionIds(
    userId: string,
    categoryId: string,
  ): Promise<Set<string>> {
    const metadata = await this.connectionMetadataCollection
      .find({ userId } as Partial<ConnectionMetadataRecord>)
      .exec();
    return new Set(
      metadata
        .filter((m) => m.categoryIds && m.categoryIds.includes(categoryId))
        .map((m) => m.connectionId),
    );
  }

  /**
   * Filter and sort posts, applying cursor pagination, blocked/muted exclusions,
   * hub-restricted post visibility, and priority connection ordering
   */
  private filterAndPaginate(
    posts: PostRecord[],
    options: {
      limit: number;
      cursor?: string;
      sort?: 'new' | 'hot' | 'top' | 'controversial';
      topWindow?: 'day' | 'week' | 'month' | 'all';
      blockedIds?: Set<string>;
      mutedIds?: Set<string>;
      allowedAuthorIds?: Set<string>;
      userHubIds?: Set<string>;
      priorityConnectionIds?: Set<string>;
    },
  ): ITimelineResult {
    let filtered = posts.filter((p) => !p.isDeleted);

    // Exclude blocked users
    if (options.blockedIds && options.blockedIds.size > 0) {
      filtered = filtered.filter((p) => !options.blockedIds!.has(p.authorId));
    }

    // Exclude muted users
    if (options.mutedIds && options.mutedIds.size > 0) {
      filtered = filtered.filter((p) => !options.mutedIds!.has(p.authorId));
    }

    // Filter to allowed authors if specified
    if (options.allowedAuthorIds) {
      filtered = filtered.filter((p) =>
        options.allowedAuthorIds!.has(p.authorId),
      );
    }

    // Filter hub-restricted posts: only include if user is a member of at least one hub
    // Posts without hubIds (or empty hubIds) are always visible
    // @see Requirements: 5.11
    if (options.userHubIds) {
      filtered = filtered.filter((p) => {
        if (!p.hubIds || p.hubIds.length === 0) {
          return true; // Public post, always visible
        }
        // Hub-restricted: user must be a member of at least one hub
        return p.hubIds.some((cid) => options.userHubIds!.has(cid));
      });
    }

    // For 'top' sort, filter by time window first
    if (options.sort === 'top' && options.topWindow !== 'all') {
      const now = Date.now();
      const windowMs =
        options.topWindow === 'day'
          ? 86400000
          : options.topWindow === 'month'
            ? 2592000000
            : 604800000; // default week
      filtered = filtered.filter(
        (p) => now - new Date(p.createdAt).getTime() < windowMs,
      );
    }

    // Sort based on requested sort order
    const sortMode = options.sort ?? 'new';

    if (sortMode === 'hot') {
      // Hot: Reddit-style score decay — (score + replies) / (age in hours + 2)^1.5
      // Uses post.score (upvotes - downvotes) when available, falls back to likes
      const now = Date.now();
      filtered.sort((a, b) => {
        const scoreA = (a.score ?? a.likeCount) + a.replyCount + a.repostCount;
        const scoreB = (b.score ?? b.likeCount) + b.replyCount + b.repostCount;
        const ageHoursA = (now - new Date(a.createdAt).getTime()) / 3600000 + 2;
        const ageHoursB = (now - new Date(b.createdAt).getTime()) / 3600000 + 2;
        const hotA = scoreA / Math.pow(ageHoursA, 1.5);
        const hotB = scoreB / Math.pow(ageHoursB, 1.5);
        return hotB - hotA;
      });
    } else if (sortMode === 'top') {
      // Top: most engagement (score + reposts + replies)
      filtered.sort((a, b) => {
        const scoreA = (a.score ?? a.likeCount) + a.repostCount + a.replyCount;
        const scoreB = (b.score ?? b.likeCount) + b.repostCount + b.replyCount;
        if (scoreA !== scoreB) return scoreB - scoreA;
        // Tie-break by recency
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    } else if (sortMode === 'controversial') {
      // Controversial: high total votes but score near zero
      // Formula: totalVotes / (1 + |score|) — rewards high engagement with balanced voting
      filtered.sort((a, b) => {
        const totalA =
          (a.upvoteCount ?? 0) + (a.downvoteCount ?? 0) + a.likeCount;
        const totalB =
          (b.upvoteCount ?? 0) + (b.downvoteCount ?? 0) + b.likeCount;
        const absScoreA = Math.abs(a.score ?? a.likeCount);
        const absScoreB = Math.abs(b.score ?? b.likeCount);
        const controversyA = totalA / (1 + absScoreA);
        const controversyB = totalB / (1 + absScoreB);
        if (controversyA !== controversyB) return controversyB - controversyA;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    } else {
      // 'new' — reverse chronological, with priority connections first if available
      if (
        options.priorityConnectionIds &&
        options.priorityConnectionIds.size > 0
      ) {
        filtered.sort((a, b) => {
          const aIsPriority = options.priorityConnectionIds!.has(a.authorId)
            ? 1
            : 0;
          const bIsPriority = options.priorityConnectionIds!.has(b.authorId)
            ? 1
            : 0;
          if (aIsPriority !== bIsPriority) {
            return bIsPriority - aIsPriority;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      } else {
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
    }

    // Apply cursor (return posts older than cursor)
    if (options.cursor) {
      const cursorTime = new Date(options.cursor).getTime();
      filtered = filtered.filter(
        (p) => new Date(p.createdAt).getTime() < cursorTime,
      );
    }

    // Take limit + 1 to determine hasMore
    const sliced = filtered.slice(0, options.limit + 1);
    const hasMore = sliced.length > options.limit;
    const resultPosts = sliced.slice(0, options.limit);

    const cursor =
      resultPosts.length > 0
        ? resultPosts[resultPosts.length - 1].createdAt
        : undefined;

    return {
      posts: resultPosts.map((r) => this.recordToPost(r)),
      cursor,
      hasMore,
    };
  }

  /**
   * Get the home timeline for a user
   * Returns posts from followed users and the user's own posts
   * in reverse chronological order, with priority connections first
   * @see Requirements: 5.1, 5.3, 5.4, 5.6, 5.7, 5.10, 5.11, 5.12
   */
  async getHomeTimeline(
    userId: string,
    options?: ITimelineOptions,
  ): Promise<ITimelineResult> {
    const limit = this.getLimit(options);

    const excludeMuted = options?.excludeMuted !== false;

    // Parallelize all independent lookups + the posts fetch
    const [
      followedIds,
      blockedIds,
      permanentMutedIds,
      temporaryMutedIds,
      priorityConnectionIds,
      userHubIds,
      allPosts,
    ] = await Promise.all([
      this.getFollowedUserIds(userId),
      this.getBlockedUserIds(userId),
      excludeMuted
        ? this.getMutedUserIds(userId)
        : Promise.resolve(new Set<string>()),
      excludeMuted
        ? this.getTemporarilyMutedUserIds(userId)
        : Promise.resolve(new Set<string>()),
      this.getPriorityConnectionIds(userId),
      this.getUserHubIds(userId),
      this.postsCollection.find({} as Partial<PostRecord>).exec(),
    ]);

    // Include the user's own posts
    const allowedAuthorIds = new Set([userId, ...followedIds]);

    // Combine permanent and temporary mutes
    const mutedIds = new Set([...permanentMutedIds, ...temporaryMutedIds]);

    return this.filterAndPaginate(allPosts, {
      limit,
      cursor: options?.cursor,
      sort: options?.sort,
      topWindow: options?.topWindow,
      blockedIds,
      mutedIds,
      allowedAuthorIds,
      userHubIds,
      priorityConnectionIds,
    });
  }

  /**
   * Get the public timeline (recent public posts from all users)
   * Excludes blocked users when a requesting user is provided
   * @see Requirements: 5.2, 5.3, 5.4, 5.6, 5.7
   */
  async getPublicTimeline(
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult> {
    const limit = this.getLimit(options);

    // Get blocked user IDs if a requesting user is provided
    const blockedIds = requestingUserId
      ? await this.getBlockedUserIds(requestingUserId)
      : undefined;

    // Fetch all posts
    const allPosts = await this.postsCollection
      .find({} as Partial<PostRecord>)
      .exec();

    return this.filterAndPaginate(allPosts, {
      limit,
      cursor: options?.cursor,
      blockedIds,
    });
  }

  /**
   * Get a specific user's feed (their posts and reposts)
   * Excludes blocked users when a requesting user is provided
   * @see Requirements: 5.4, 5.5, 5.6
   */
  async getUserFeed(
    targetUserId: string,
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult> {
    const limit = this.getLimit(options);

    // Get blocked user IDs if a requesting user is provided
    const blockedIds = requestingUserId
      ? await this.getBlockedUserIds(requestingUserId)
      : undefined;

    // Fetch posts by the target user
    const userPosts = await this.postsCollection
      .find({ authorId: targetUserId } as Partial<PostRecord>)
      .exec();

    return this.filterAndPaginate(userPosts, {
      limit,
      cursor: options?.cursor,
      blockedIds,
    });
  }

  /**
   * Get posts containing a specific hashtag
   * Excludes blocked users when a requesting user is provided
   * @see Requirements: 5.4, 5.6, 7.4
   */
  async getHashtagFeed(
    hashtag: string,
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult> {
    // Validate hashtag
    const normalizedHashtag = hashtag.replace(/^#/, '').trim().toLowerCase();
    if (!normalizedHashtag) {
      throw new FeedServiceError(
        FeedErrorCode.InvalidHashtag,
        'Hashtag cannot be empty',
      );
    }

    const limit = this.getLimit(options);

    // Get blocked user IDs if a requesting user is provided
    const blockedIds = requestingUserId
      ? await this.getBlockedUserIds(requestingUserId)
      : undefined;

    // Fetch all posts and filter by hashtag
    // (In a real system, this would use a DB index on hashtags)
    const allPosts = await this.postsCollection
      .find({} as Partial<PostRecord>)
      .exec();

    const hashtagPosts = allPosts.filter(
      (p) =>
        !p.isDeleted &&
        p.hashtags.some((h) => h.toLowerCase() === normalizedHashtag),
    );

    return this.filterAndPaginate(hashtagPosts, {
      limit,
      cursor: options?.cursor,
      blockedIds,
    });
  }

  /**
   * Get timeline filtered by connection list members
   * @see Requirements: 5.8, 5.11, 5.12
   */
  async getListTimeline(
    listId: string,
    userId: string,
    options?: ITimelineOptions,
  ): Promise<ITimelineResult> {
    const limit = this.getLimit(options);

    // Get list members
    const members = await this.connectionListMembersCollection
      .find({ listId } as Partial<ConnectionListMemberRecord>)
      .exec();

    if (members.length === 0) {
      return { posts: [], hasMore: false };
    }

    const memberIds = new Set(members.map((m) => m.userId));

    // Get blocked and muted user IDs (permanent + temporary)
    const blockedIds = await this.getBlockedUserIds(userId);
    const permanentMutedIds =
      options?.excludeMuted !== false
        ? await this.getMutedUserIds(userId)
        : new Set<string>();
    const temporaryMutedIds =
      options?.excludeMuted !== false
        ? await this.getTemporarilyMutedUserIds(userId)
        : new Set<string>();
    const mutedIds = new Set([...permanentMutedIds, ...temporaryMutedIds]);

    // Get user's hub memberships for hub-restricted post visibility
    const userHubIds = await this.getUserHubIds(userId);

    // Fetch all posts and filter to list members
    const allPosts = await this.postsCollection
      .find({} as Partial<PostRecord>)
      .exec();

    return this.filterAndPaginate(allPosts, {
      limit,
      cursor: options?.cursor,
      blockedIds,
      mutedIds,
      allowedAuthorIds: memberIds,
      userHubIds,
    });
  }

  /**
   * Get timeline filtered by connection category
   * Returns only posts from connections assigned to the given category
   * @see Requirements: 5.9, 5.11, 5.12
   */
  async getCategoryTimeline(
    categoryId: string,
    userId: string,
    options?: ITimelineOptions,
  ): Promise<ITimelineResult> {
    const limit = this.getLimit(options);

    // Get connection IDs assigned to this category
    const categoryConnectionIds = await this.getCategoryConnectionIds(
      userId,
      categoryId,
    );

    if (categoryConnectionIds.size === 0) {
      return { posts: [], hasMore: false };
    }

    // Get blocked and muted user IDs (permanent + temporary)
    const blockedIds = await this.getBlockedUserIds(userId);
    const permanentMutedIds =
      options?.excludeMuted !== false
        ? await this.getMutedUserIds(userId)
        : new Set<string>();
    const temporaryMutedIds =
      options?.excludeMuted !== false
        ? await this.getTemporarilyMutedUserIds(userId)
        : new Set<string>();
    const mutedIds = new Set([...permanentMutedIds, ...temporaryMutedIds]);

    // Get user's hub memberships for hub-restricted post visibility
    const userHubIds = await this.getUserHubIds(userId);

    // Fetch all posts and filter to category connections
    const allPosts = await this.postsCollection
      .find({} as Partial<PostRecord>)
      .exec();

    return this.filterAndPaginate(allPosts, {
      limit,
      cursor: options?.cursor,
      blockedIds,
      mutedIds,
      allowedAuthorIds: categoryConnectionIds,
      userHubIds,
    });
  }

  /**
   * Get posts within a specific hub, with sort support (hot/new/top)
   */
  async getHubFeed(
    hubId: string,
    options?: ITimelineOptions,
    requestingUserId?: string,
  ): Promise<ITimelineResult> {
    const limit = this.getLimit(options);

    // Get blocked user IDs if a requesting user is provided
    const blockedIds = requestingUserId
      ? await this.getBlockedUserIds(requestingUserId)
      : undefined;

    // Fetch all posts and filter to those in this hub
    const allPosts = await this.postsCollection
      .find({} as Partial<PostRecord>)
      .exec();

    const hubPosts = allPosts.filter(
      (p) => p.hubIds && p.hubIds.includes(hubId),
    );

    return this.filterAndPaginate(hubPosts, {
      limit,
      cursor: options?.cursor,
      sort: options?.sort,
      topWindow: options?.topWindow,
      blockedIds,
    });
  }
}

/**
 * Factory function to create a FeedService instance
 * @param application The application with database collections
 * @returns A new FeedService instance
 */
export function createFeedService(
  application: IApplicationWithCollections,
): FeedService {
  return new FeedService(application);
}
