import {
  ALLOWED_PROFILE_IMAGE_TYPES,
  ApproveFollowersMode,
  FollowRequestStatus,
  IBaseFollowRequest,
  IBasePrivacySettings,
  IBaseUserProfile,
  IFollowRequestOptions,
  IFollowResult,
  IPaginatedResult,
  IPaginationOptions,
  IUpdateProfileOptions,
  IUserProfileService,
  MAX_BIO_LENGTH,
  UserProfileErrorCode,
  UserProfileServiceError,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';

/**
 * Default pagination limit
 */
const DEFAULT_PAGE_LIMIT = 20;

/**
 * Maximum pagination limit
 */
const MAX_PAGE_LIMIT = 100;

/**
 * Database record type for user profiles
 */
interface UserProfileRecord {
  _id: string;
  username: string;
  displayName: string;
  bio: string;
  profilePictureUrl?: string;
  headerImageUrl?: string;
  location?: string;
  websiteUrl?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  isProtected: boolean;
  approveFollowersMode: string;
  privacySettings: IBasePrivacySettings;
  createdAt: string;
  updatedAt: string;
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
 * Database record type for follow requests
 */
interface FollowRequestRecord {
  _id: string;
  requesterId: string;
  targetId: string;
  message?: string;
  status: string;
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
  countDocuments?(filter: Partial<T>): { exec(): Promise<number> };
}

/**
 * Application interface for accessing database collections
 */
interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

/**
 * User_Profile_Service implementation
 * Handles user profiles, following, blocking, and muting
 * @see Requirements: 4.1-4.11, 8.1-8.6, 18.1-18.6, 31.1-31.7
 */
export class UserProfileService implements IUserProfileService {
  private readonly userProfilesCollection: Collection<UserProfileRecord>;
  private readonly followsCollection: Collection<FollowRecord>;
  private readonly followRequestsCollection: Collection<FollowRequestRecord>;
  private readonly blocksCollection: Collection<BlockRecord>;
  private readonly mutesCollection: Collection<MuteRecord>;

  constructor(application: IApplicationWithCollections) {
    this.userProfilesCollection = application.getModel<UserProfileRecord>(
      'brighthub_user_profiles',
    );
    this.followsCollection =
      application.getModel<FollowRecord>('brighthub_follows');
    this.followRequestsCollection = application.getModel<FollowRequestRecord>(
      'brighthub_follow_requests',
    );
    this.blocksCollection =
      application.getModel<BlockRecord>('brighthub_blocks');
    this.mutesCollection = application.getModel<MuteRecord>('brighthub_mutes');
  }

  /**
   * Create a BrightHub user profile for a newly registered user.
   * Should be called during user registration to ensure the profile exists
   * before any BrightHub social operations are attempted.
   */
  public async createProfileForUser(
    userId: string,
    username: string,
  ): Promise<void> {
    // Check if profile already exists (idempotent)
    const existing = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();
    if (existing) return;

    const now = new Date().toISOString();
    await this.userProfilesCollection.create({
      _id: userId,
      username,
      displayName: username,
      bio: '',
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isVerified: false,
      isProtected: false,
      approveFollowersMode: ApproveFollowersMode.ApproveNone,
      privacySettings: {
        hideFollowerCount: false,
        hideFollowingCount: false,
        hideFollowersFromNonFollowers: false,
        hideFollowingFromNonFollowers: false,
        allowDmsFromNonFollowers: true,
        showOnlineStatus: true,
        showReadReceipts: true,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Convert a database record to the API response format
   */
  private recordToProfile(record: UserProfileRecord): IBaseUserProfile<string> {
    return {
      _id: record._id,
      username: record.username,
      displayName: record.displayName,
      bio: record.bio,
      profilePictureUrl: record.profilePictureUrl,
      headerImageUrl: record.headerImageUrl,
      location: record.location,
      websiteUrl: record.websiteUrl,
      followerCount: record.followerCount,
      followingCount: record.followingCount,
      postCount: record.postCount,
      isVerified: record.isVerified,
      isProtected: record.isProtected,
      approveFollowersMode: record.approveFollowersMode as ApproveFollowersMode,
      privacySettings: record.privacySettings,
      createdAt: record.createdAt,
    };
  }

  /**
   * Convert a follow request record to the API response format
   */
  private recordToFollowRequest(
    record: FollowRequestRecord,
  ): IBaseFollowRequest<string> {
    return {
      _id: record._id,
      requesterId: record.requesterId,
      targetId: record.targetId,
      message: record.message,
      status: record.status as FollowRequestStatus,
      createdAt: record.createdAt,
    };
  }

  /**
   * Get effective pagination limit
   */
  private getLimit(options?: IPaginationOptions): number {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    return Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
  }

  /**
   * Check if a user requires follow approval for a given requester
   */
  private async requiresApproval(
    targetProfile: UserProfileRecord,
    requesterId: string,
  ): Promise<boolean> {
    if (!targetProfile.isProtected) {
      return false;
    }

    switch (targetProfile.approveFollowersMode) {
      case ApproveFollowersMode.ApproveNone:
        return false;
      case ApproveFollowersMode.ApproveAll:
        return true;
      case ApproveFollowersMode.ApproveNonMutuals: {
        // Check if target follows requester (mutual)
        const isMutual = await this.isFollowing(targetProfile._id, requesterId);
        return !isMutual;
      }
      default:
        return true;
    }
  }

  // ═══════════════════════════════════════════════════════
  // Follow Operations (Requirements 4.1-4.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Follow a user
   * @see Requirements: 4.1, 4.3
   */
  async follow(
    followerId: string,
    followedId: string,
    options?: IFollowRequestOptions,
  ): Promise<IFollowResult> {
    // Prevent self-follow
    if (followerId === followedId) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.SelfFollowNotAllowed,
        'You cannot follow yourself',
      );
    }

    // Check if already following
    const existingFollow = await this.followsCollection
      .findOne({ followerId, followedId })
      .exec();
    if (existingFollow) {
      return { success: true }; // Idempotent
    }

    // Check if blocked
    const isBlocked = await this.isBlocked(followedId, followerId);
    if (isBlocked) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserBlocked,
        'You cannot follow this user',
      );
    }

    // Get target user profile
    const targetProfile = await this.userProfilesCollection
      .findOne({ _id: followedId })
      .exec();
    if (!targetProfile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    // Check if approval is required
    const needsApproval = await this.requiresApproval(
      targetProfile,
      followerId,
    );

    if (needsApproval) {
      // Check for existing pending request
      const existingRequest = await this.followRequestsCollection
        .findOne({
          requesterId: followerId,
          targetId: followedId,
          status: FollowRequestStatus.Pending,
        })
        .exec();

      if (existingRequest) {
        return {
          success: true,
          requestCreated: false,
          followRequest: this.recordToFollowRequest(existingRequest),
        };
      }

      // Create follow request
      const now = new Date().toISOString();
      const requestRecord: FollowRequestRecord = {
        _id: randomUUID(),
        requesterId: followerId,
        targetId: followedId,
        message: options?.message,
        status: FollowRequestStatus.Pending,
        createdAt: now,
      };

      const created = await this.followRequestsCollection.create(requestRecord);

      return {
        success: true,
        requestCreated: true,
        followRequest: this.recordToFollowRequest(created),
      };
    }

    // Create follow relationship directly
    await this.createFollowRelationship(followerId, followedId);

    return { success: true };
  }

  /**
   * Create a follow relationship and update counts
   */
  private async createFollowRelationship(
    followerId: string,
    followedId: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    // Create follow record
    await this.followsCollection.create({
      _id: randomUUID(),
      followerId,
      followedId,
      createdAt: now,
    });

    // Update follower's following count
    const followerProfile = await this.userProfilesCollection
      .findOne({ _id: followerId })
      .exec();
    if (followerProfile) {
      await this.userProfilesCollection
        .updateOne(
          { _id: followerId },
          {
            followingCount: followerProfile.followingCount + 1,
            updatedAt: now,
          },
        )
        .exec();
    }

    // Update followed user's follower count
    const followedProfile = await this.userProfilesCollection
      .findOne({ _id: followedId })
      .exec();
    if (followedProfile) {
      await this.userProfilesCollection
        .updateOne(
          { _id: followedId },
          {
            followerCount: followedProfile.followerCount + 1,
            updatedAt: now,
          },
        )
        .exec();
    }
  }

  /**
   * Unfollow a user
   * @see Requirements: 4.2
   */
  async unfollow(followerId: string, followedId: string): Promise<void> {
    // Check if following
    const existingFollow = await this.followsCollection
      .findOne({ followerId, followedId })
      .exec();

    if (!existingFollow) {
      // Idempotent: not following, just return
      return;
    }

    const now = new Date().toISOString();

    // Delete follow record
    await this.followsCollection.deleteOne({ _id: existingFollow._id }).exec();

    // Update follower's following count
    const followerProfile = await this.userProfilesCollection
      .findOne({ _id: followerId })
      .exec();
    if (followerProfile && followerProfile.followingCount > 0) {
      await this.userProfilesCollection
        .updateOne(
          { _id: followerId },
          {
            followingCount: followerProfile.followingCount - 1,
            updatedAt: now,
          },
        )
        .exec();
    }

    // Update followed user's follower count
    const followedProfile = await this.userProfilesCollection
      .findOne({ _id: followedId })
      .exec();
    if (followedProfile && followedProfile.followerCount > 0) {
      await this.userProfilesCollection
        .updateOne(
          { _id: followedId },
          {
            followerCount: followedProfile.followerCount - 1,
            updatedAt: now,
          },
        )
        .exec();
    }
  }

  /**
   * Check if a user is following another user
   */
  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.followsCollection
      .findOne({ followerId, followedId })
      .exec();
    return !!follow;
  }

  /**
   * Get a user's followers
   * @see Requirements: 4.4, 4.6
   */
  async getFollowers(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const cursor = options?.cursor;

    // Build query
    const query: Partial<FollowRecord> = { followedId: userId };

    // Get follows with pagination
    let followsQuery = this.followsCollection.find(query);
    if (followsQuery.sort) {
      followsQuery = followsQuery.sort({ createdAt: -1 });
    }
    if (cursor && followsQuery.skip) {
      followsQuery = followsQuery.skip(parseInt(cursor, 10));
    }
    if (followsQuery.limit) {
      followsQuery = followsQuery.limit(limit + 1);
    }

    const follows = await followsQuery.exec();
    const hasMore = follows.length > limit;
    const items = follows.slice(0, limit);

    // Get user profiles for followers
    const profiles: IBaseUserProfile<string>[] = [];
    for (const follow of items) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: follow.followerId })
        .exec();
      if (profile) {
        profiles.push(this.recordToProfile(profile));
      }
    }

    const nextCursor = hasMore
      ? String((cursor ? parseInt(cursor, 10) : 0) + limit)
      : undefined;

    return {
      items: profiles,
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Get users that a user is following
   * @see Requirements: 4.5, 4.6
   */
  async getFollowing(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const cursor = options?.cursor;

    // Build query
    const query: Partial<FollowRecord> = { followerId: userId };

    // Get follows with pagination
    let followsQuery = this.followsCollection.find(query);
    if (followsQuery.sort) {
      followsQuery = followsQuery.sort({ createdAt: -1 });
    }
    if (cursor && followsQuery.skip) {
      followsQuery = followsQuery.skip(parseInt(cursor, 10));
    }
    if (followsQuery.limit) {
      followsQuery = followsQuery.limit(limit + 1);
    }

    const follows = await followsQuery.exec();
    const hasMore = follows.length > limit;
    const items = follows.slice(0, limit);

    // Get user profiles for followed users
    const profiles: IBaseUserProfile<string>[] = [];
    for (const follow of items) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: follow.followedId })
        .exec();
      if (profile) {
        profiles.push(this.recordToProfile(profile));
      }
    }

    const nextCursor = hasMore
      ? String((cursor ? parseInt(cursor, 10) : 0) + limit)
      : undefined;

    return {
      items: profiles,
      cursor: nextCursor,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Protected Account Features (Requirements 4.7-4.11)
  // ═══════════════════════════════════════════════════════

  /**
   * Get pending follow requests for a user
   * @see Requirements: 4.7, 4.8
   */
  async getFollowRequests(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFollowRequest<string>>> {
    const limit = this.getLimit(options);
    const cursor = options?.cursor;

    // Build query for pending requests
    const query: Partial<FollowRequestRecord> = {
      targetId: userId,
      status: FollowRequestStatus.Pending,
    };

    // Get requests with pagination
    let requestsQuery = this.followRequestsCollection.find(query);
    if (requestsQuery.sort) {
      requestsQuery = requestsQuery.sort({ createdAt: -1 });
    }
    if (cursor && requestsQuery.skip) {
      requestsQuery = requestsQuery.skip(parseInt(cursor, 10));
    }
    if (requestsQuery.limit) {
      requestsQuery = requestsQuery.limit(limit + 1);
    }

    const requests = await requestsQuery.exec();
    const hasMore = requests.length > limit;
    const items = requests.slice(0, limit);

    const nextCursor = hasMore
      ? String((cursor ? parseInt(cursor, 10) : 0) + limit)
      : undefined;

    return {
      items: items.map((r) => this.recordToFollowRequest(r)),
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Approve a follow request
   * @see Requirements: 4.9
   */
  async approveFollowRequest(userId: string, requestId: string): Promise<void> {
    // Find the request
    const request = await this.followRequestsCollection
      .findOne({ _id: requestId })
      .exec();

    if (!request) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.FollowRequestNotFound,
        'Follow request not found',
      );
    }

    // Verify the request is for this user
    if (request.targetId !== userId) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.Unauthorized,
        'You can only approve requests sent to you',
      );
    }

    // Verify the request is pending
    if (request.status !== FollowRequestStatus.Pending) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.FollowRequestNotFound,
        'Follow request is no longer pending',
      );
    }

    // Update request status
    await this.followRequestsCollection
      .updateOne({ _id: requestId }, { status: FollowRequestStatus.Approved })
      .exec();

    // Create the follow relationship
    await this.createFollowRelationship(request.requesterId, request.targetId);
  }

  /**
   * Reject a follow request
   * @see Requirements: 4.10
   */
  async rejectFollowRequest(userId: string, requestId: string): Promise<void> {
    // Find the request
    const request = await this.followRequestsCollection
      .findOne({ _id: requestId })
      .exec();

    if (!request) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.FollowRequestNotFound,
        'Follow request not found',
      );
    }

    // Verify the request is for this user
    if (request.targetId !== userId) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.Unauthorized,
        'You can only reject requests sent to you',
      );
    }

    // Update request status
    await this.followRequestsCollection
      .updateOne({ _id: requestId }, { status: FollowRequestStatus.Rejected })
      .exec();
  }

  /**
   * Set the approve followers mode for a user
   * @see Requirements: 4.11
   */
  async setApproveFollowersMode(
    userId: string,
    mode: ApproveFollowersMode,
  ): Promise<void> {
    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const now = new Date().toISOString();
    const isProtected = mode !== ApproveFollowersMode.ApproveNone;

    await this.userProfilesCollection
      .updateOne(
        { _id: userId },
        {
          approveFollowersMode: mode,
          isProtected,
          updatedAt: now,
        },
      )
      .exec();
  }

  // ═══════════════════════════════════════════════════════
  // Profile Management (Requirements 8.1-8.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get a user's profile
   * @see Requirements: 8.6
   */
  async getProfile(
    userId: string,
    requesterId?: string,
  ): Promise<IBaseUserProfile<string>> {
    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const result = this.recordToProfile(profile);

    // Apply privacy settings if requester is different from profile owner
    if (requesterId && requesterId !== userId) {
      const isFollower = await this.isFollowing(requesterId, userId);

      // Hide counts if privacy settings require it
      if (profile.privacySettings.hideFollowerCount) {
        result.followerCount = -1; // Indicate hidden
      }
      if (profile.privacySettings.hideFollowingCount) {
        result.followingCount = -1; // Indicate hidden
      }

      // Hide follower/following lists from non-followers
      if (
        !isFollower &&
        profile.privacySettings.hideFollowersFromNonFollowers
      ) {
        // The caller should check this flag when fetching followers list
      }
    }

    return result;
  }

  /**
   * Update a user's display name
   * @see Requirements: 8.1
   */
  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    if (!displayName || displayName.trim().length === 0) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.InvalidDisplayName,
        'Display name cannot be empty',
      );
    }

    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const now = new Date().toISOString();
    await this.userProfilesCollection
      .updateOne(
        { _id: userId },
        { displayName: displayName.trim(), updatedAt: now },
      )
      .exec();
  }

  /**
   * Update a user's bio
   * @see Requirements: 8.2
   */
  async updateBio(userId: string, bio: string): Promise<void> {
    if (bio.length > MAX_BIO_LENGTH) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.BioTooLong,
        `Bio cannot exceed ${MAX_BIO_LENGTH} characters`,
      );
    }

    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const now = new Date().toISOString();
    await this.userProfilesCollection
      .updateOne({ _id: userId }, { bio, updatedAt: now })
      .exec();
  }

  /**
   * Validate image MIME type
   */
  private validateImageFormat(mimeType: string): void {
    if (
      !ALLOWED_PROFILE_IMAGE_TYPES.includes(
        mimeType as (typeof ALLOWED_PROFILE_IMAGE_TYPES)[number],
      )
    ) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.InvalidImageFormat,
        `Invalid image format: ${mimeType}. Allowed: ${ALLOWED_PROFILE_IMAGE_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Update a user's profile picture
   * @see Requirements: 8.3
   */
  async updateProfilePicture(
    userId: string,
    url: string,
    mimeType: string,
  ): Promise<void> {
    this.validateImageFormat(mimeType);

    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const now = new Date().toISOString();
    await this.userProfilesCollection
      .updateOne({ _id: userId }, { profilePictureUrl: url, updatedAt: now })
      .exec();
  }

  /**
   * Update a user's header image
   * @see Requirements: 8.4
   */
  async updateHeaderImage(
    userId: string,
    url: string,
    mimeType: string,
  ): Promise<void> {
    this.validateImageFormat(mimeType);

    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const now = new Date().toISOString();
    await this.userProfilesCollection
      .updateOne({ _id: userId }, { headerImageUrl: url, updatedAt: now })
      .exec();
  }

  /**
   * Update multiple profile fields at once
   * @see Requirements: 8.1-8.5
   */
  async updateProfile(
    userId: string,
    updates: IUpdateProfileOptions,
  ): Promise<IBaseUserProfile<string>> {
    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    // Validate updates
    if (updates.displayName !== undefined) {
      if (!updates.displayName || updates.displayName.trim().length === 0) {
        throw new UserProfileServiceError(
          UserProfileErrorCode.InvalidDisplayName,
          'Display name cannot be empty',
        );
      }
    }

    if (updates.bio !== undefined && updates.bio.length > MAX_BIO_LENGTH) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.BioTooLong,
        `Bio cannot exceed ${MAX_BIO_LENGTH} characters`,
      );
    }

    const now = new Date().toISOString();
    const updateFields: Partial<UserProfileRecord> = { updatedAt: now };

    if (updates.displayName !== undefined) {
      updateFields.displayName = updates.displayName.trim();
    }
    if (updates.bio !== undefined) {
      updateFields.bio = updates.bio;
    }
    if (updates.profilePictureUrl !== undefined) {
      updateFields.profilePictureUrl = updates.profilePictureUrl;
    }
    if (updates.headerImageUrl !== undefined) {
      updateFields.headerImageUrl = updates.headerImageUrl;
    }
    if (updates.location !== undefined) {
      updateFields.location = updates.location;
    }
    if (updates.websiteUrl !== undefined) {
      updateFields.websiteUrl = updates.websiteUrl;
    }

    await this.userProfilesCollection
      .updateOne({ _id: userId }, updateFields)
      .exec();

    const updated = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!updated) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    return this.recordToProfile(updated);
  }

  // ═══════════════════════════════════════════════════════
  // Block and Mute (Requirements 18.1-18.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Block a user
   * @see Requirements: 18.1, 18.2
   */
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    // Prevent self-block
    if (blockerId === blockedId) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.SelfBlockNotAllowed,
        'You cannot block yourself',
      );
    }

    // Check if already blocked (idempotent)
    const existingBlock = await this.blocksCollection
      .findOne({ blockerId, blockedId })
      .exec();
    if (existingBlock) {
      return; // Already blocked
    }

    const now = new Date().toISOString();

    // Create block record
    await this.blocksCollection.create({
      _id: randomUUID(),
      blockerId,
      blockedId,
      createdAt: now,
    });

    // Remove any existing follow relationships (both directions)
    // Blocker unfollows blocked
    const blockerFollowsBlocked = await this.followsCollection
      .findOne({ followerId: blockerId, followedId: blockedId })
      .exec();
    if (blockerFollowsBlocked) {
      await this.unfollow(blockerId, blockedId);
    }

    // Blocked unfollows blocker
    const blockedFollowsBlocker = await this.followsCollection
      .findOne({ followerId: blockedId, followedId: blockerId })
      .exec();
    if (blockedFollowsBlocker) {
      await this.unfollow(blockedId, blockerId);
    }

    // Cancel any pending follow requests (both directions)
    await this.followRequestsCollection
      .deleteOne({
        requesterId: blockerId,
        targetId: blockedId,
        status: FollowRequestStatus.Pending,
      })
      .exec();
    await this.followRequestsCollection
      .deleteOne({
        requesterId: blockedId,
        targetId: blockerId,
        status: FollowRequestStatus.Pending,
      })
      .exec();
  }

  /**
   * Unblock a user
   * @see Requirements: 18.6
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const existingBlock = await this.blocksCollection
      .findOne({ blockerId, blockedId })
      .exec();

    if (!existingBlock) {
      // Idempotent: not blocked, just return
      return;
    }

    await this.blocksCollection.deleteOne({ _id: existingBlock._id }).exec();
  }

  /**
   * Check if a user has blocked another user
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.blocksCollection
      .findOne({ blockerId, blockedId })
      .exec();
    return !!block;
  }

  /**
   * Get list of blocked users
   * @see Requirements: 18.5
   */
  async getBlockedUsers(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const cursor = options?.cursor;

    // Build query
    const query: Partial<BlockRecord> = { blockerId: userId };

    // Get blocks with pagination
    let blocksQuery = this.blocksCollection.find(query);
    if (blocksQuery.sort) {
      blocksQuery = blocksQuery.sort({ createdAt: -1 });
    }
    if (cursor && blocksQuery.skip) {
      blocksQuery = blocksQuery.skip(parseInt(cursor, 10));
    }
    if (blocksQuery.limit) {
      blocksQuery = blocksQuery.limit(limit + 1);
    }

    const blocks = await blocksQuery.exec();
    const hasMore = blocks.length > limit;
    const items = blocks.slice(0, limit);

    // Get user profiles for blocked users
    const profiles: IBaseUserProfile<string>[] = [];
    for (const block of items) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: block.blockedId })
        .exec();
      if (profile) {
        profiles.push(this.recordToProfile(profile));
      }
    }

    const nextCursor = hasMore
      ? String((cursor ? parseInt(cursor, 10) : 0) + limit)
      : undefined;

    return {
      items: profiles,
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Mute a user
   * @see Requirements: 18.3
   */
  async muteUser(muterId: string, mutedId: string): Promise<void> {
    // Prevent self-mute
    if (muterId === mutedId) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.SelfMuteNotAllowed,
        'You cannot mute yourself',
      );
    }

    // Check if already muted (idempotent)
    const existingMute = await this.mutesCollection
      .findOne({ muterId, mutedId })
      .exec();
    if (existingMute) {
      return; // Already muted
    }

    const now = new Date().toISOString();

    // Create mute record
    await this.mutesCollection.create({
      _id: randomUUID(),
      muterId,
      mutedId,
      createdAt: now,
    });
  }

  /**
   * Unmute a user
   * @see Requirements: 18.4
   */
  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    const existingMute = await this.mutesCollection
      .findOne({ muterId, mutedId })
      .exec();

    if (!existingMute) {
      // Idempotent: not muted, just return
      return;
    }

    await this.mutesCollection.deleteOne({ _id: existingMute._id }).exec();
  }

  /**
   * Check if a user has muted another user
   */
  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    const mute = await this.mutesCollection
      .findOne({ muterId, mutedId })
      .exec();
    return !!mute;
  }

  /**
   * Get list of muted users
   * @see Requirements: 18.5
   */
  async getMutedUsers(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const cursor = options?.cursor;

    // Build query
    const query: Partial<MuteRecord> = { muterId: userId };

    // Get mutes with pagination
    let mutesQuery = this.mutesCollection.find(query);
    if (mutesQuery.sort) {
      mutesQuery = mutesQuery.sort({ createdAt: -1 });
    }
    if (cursor && mutesQuery.skip) {
      mutesQuery = mutesQuery.skip(parseInt(cursor, 10));
    }
    if (mutesQuery.limit) {
      mutesQuery = mutesQuery.limit(limit + 1);
    }

    const mutes = await mutesQuery.exec();
    const hasMore = mutes.length > limit;
    const items = mutes.slice(0, limit);

    // Get user profiles for muted users
    const profiles: IBaseUserProfile<string>[] = [];
    for (const mute of items) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: mute.mutedId })
        .exec();
      if (profile) {
        profiles.push(this.recordToProfile(profile));
      }
    }

    const nextCursor = hasMore
      ? String((cursor ? parseInt(cursor, 10) : 0) + limit)
      : undefined;

    return {
      items: profiles,
      cursor: nextCursor,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Privacy Settings (Requirements 31.1-31.7)
  // ═══════════════════════════════════════════════════════

  /**
   * Get a user's privacy settings
   */
  async getPrivacySettings(userId: string): Promise<IBasePrivacySettings> {
    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    return profile.privacySettings;
  }

  /**
   * Update a user's privacy settings
   * @see Requirements: 31.1-31.7
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<IBasePrivacySettings>,
  ): Promise<IBasePrivacySettings> {
    const profile = await this.userProfilesCollection
      .findOne({ _id: userId })
      .exec();

    if (!profile) {
      throw new UserProfileServiceError(
        UserProfileErrorCode.UserNotFound,
        'User not found',
      );
    }

    const updatedSettings: IBasePrivacySettings = {
      ...profile.privacySettings,
      ...settings,
    };

    const now = new Date().toISOString();
    await this.userProfilesCollection
      .updateOne(
        { _id: userId },
        { privacySettings: updatedSettings, updatedAt: now },
      )
      .exec();

    return updatedSettings;
  }
}

/**
 * Create a new UserProfileService instance
 */
export function createUserProfileService(
  application: IApplicationWithCollections,
): UserProfileService {
  return new UserProfileService(application);
}
