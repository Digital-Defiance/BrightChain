import { ApproveFollowersMode } from '../enumerations/approve-followers-mode';
import { IBaseFollowRequest } from './base-follow-request';
import { IBasePrivacySettings } from './base-privacy-settings';
import { IBaseUserProfile } from './base-user-profile';

/**
 * Paginated result for list queries
 */
export interface IPaginatedResult<T> {
  /** Array of items */
  items: T[];
  /** Cursor for next page */
  cursor?: string;
  /** Whether there are more items */
  hasMore: boolean;
  /** Total count (if available) */
  totalCount?: number;
}

/**
 * Options for pagination
 */
export interface IPaginationOptions {
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of items to return */
  limit?: number;
}

/**
 * Options for creating a follow request
 */
export interface IFollowRequestOptions {
  /** Optional custom message with the request */
  message?: string;
}

/**
 * Result of a follow operation
 */
export interface IFollowResult {
  /** Whether the follow was successful */
  success: boolean;
  /** Whether a follow request was created (for protected accounts) */
  requestCreated?: boolean;
  /** The follow request if one was created */
  followRequest?: IBaseFollowRequest<string>;
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Options for updating profile
 */
export interface IUpdateProfileOptions {
  /** New display name */
  displayName?: string;
  /** New bio */
  bio?: string;
  /** New profile picture URL */
  profilePictureUrl?: string;
  /** New header image URL */
  headerImageUrl?: string;
  /** New location */
  location?: string;
  /** New website URL */
  websiteUrl?: string;
}

/**
 * Error codes for user profile operations
 */
export enum UserProfileErrorCode {
  /** User not found */
  UserNotFound = 'USER_NOT_FOUND',
  /** Cannot follow yourself */
  SelfFollowNotAllowed = 'SELF_FOLLOW_NOT_ALLOWED',
  /** Already following this user */
  AlreadyFollowing = 'ALREADY_FOLLOWING',
  /** Not following this user */
  NotFollowing = 'NOT_FOLLOWING',
  /** Follow request not found */
  FollowRequestNotFound = 'FOLLOW_REQUEST_NOT_FOUND',
  /** Follow request already exists */
  FollowRequestExists = 'FOLLOW_REQUEST_EXISTS',
  /** User is blocked */
  UserBlocked = 'USER_BLOCKED',
  /** Cannot block yourself */
  SelfBlockNotAllowed = 'SELF_BLOCK_NOT_ALLOWED',
  /** Already blocked */
  AlreadyBlocked = 'ALREADY_BLOCKED',
  /** Not blocked */
  NotBlocked = 'NOT_BLOCKED',
  /** Cannot mute yourself */
  SelfMuteNotAllowed = 'SELF_MUTE_NOT_ALLOWED',
  /** Already muted */
  AlreadyMuted = 'ALREADY_MUTED',
  /** Not muted */
  NotMuted = 'NOT_MUTED',
  /** Bio exceeds maximum length */
  BioTooLong = 'BIO_TOO_LONG',
  /** Display name is invalid */
  InvalidDisplayName = 'INVALID_DISPLAY_NAME',
  /** Invalid image format */
  InvalidImageFormat = 'INVALID_IMAGE_FORMAT',
  /** Unauthorized action */
  Unauthorized = 'UNAUTHORIZED',
  /** Access denied due to privacy settings */
  PrivacyRestricted = 'PRIVACY_RESTRICTED',
}

/**
 * User profile service error with code and message
 */
export class UserProfileServiceError extends Error {
  constructor(
    public readonly code: UserProfileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UserProfileServiceError';
  }
}

/**
 * Maximum bio length in characters
 */
export const MAX_BIO_LENGTH = 160;

/**
 * Allowed image MIME types for profile pictures and headers
 */
export const ALLOWED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Interface for the User_Profile_Service
 * Handles user profiles, following, blocking, and muting
 * @see Requirements: 4.1-4.11, 8.1-8.6, 18.1-18.6, 31.1-31.7
 */
export interface IUserProfileService {
  // ═══════════════════════════════════════════════════════
  // Profile Provisioning
  // ═══════════════════════════════════════════════════════

  /**
   * Create a BrightHub user profile for a newly registered user.
   * Idempotent — does nothing if the profile already exists.
   * @param userId ID of the user
   * @param username Username for the profile
   */
  createProfileForUser(userId: string, username: string): Promise<void>;

  // ═══════════════════════════════════════════════════════
  // Follow Operations (Requirements 4.1-4.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Follow a user
   * @param followerId ID of the user who wants to follow
   * @param followedId ID of the user to follow
   * @param options Optional settings for the follow request
   * @returns Result of the follow operation
   * @throws UserProfileServiceError if operation fails
   * @see Requirements: 4.1, 4.3
   */
  follow(
    followerId: string,
    followedId: string,
    options?: IFollowRequestOptions,
  ): Promise<IFollowResult>;

  /**
   * Unfollow a user
   * @param followerId ID of the user who wants to unfollow
   * @param followedId ID of the user to unfollow
   * @throws UserProfileServiceError if not following
   * @see Requirements: 4.2
   */
  unfollow(followerId: string, followedId: string): Promise<void>;

  /**
   * Check if a user is following another user
   * @param followerId ID of the potential follower
   * @param followedId ID of the potentially followed user
   * @returns True if following, false otherwise
   */
  isFollowing(followerId: string, followedId: string): Promise<boolean>;

  /**
   * Get a user's followers
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of follower profiles
   * @see Requirements: 4.4, 4.6
   */
  getFollowers(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Get users that a user is following
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of followed user profiles
   * @see Requirements: 4.5, 4.6
   */
  getFollowing(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  // ═══════════════════════════════════════════════════════
  // Protected Account Features (Requirements 4.7-4.11)
  // ═══════════════════════════════════════════════════════

  /**
   * Get pending follow requests for a user
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of follow requests
   * @see Requirements: 4.7, 4.8
   */
  getFollowRequests(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFollowRequest<string>>>;

  /**
   * Approve a follow request
   * @param userId ID of the user approving the request
   * @param requestId ID of the follow request
   * @throws UserProfileServiceError if request not found
   * @see Requirements: 4.9
   */
  approveFollowRequest(userId: string, requestId: string): Promise<void>;

  /**
   * Reject a follow request
   * @param userId ID of the user rejecting the request
   * @param requestId ID of the follow request
   * @throws UserProfileServiceError if request not found
   * @see Requirements: 4.10
   */
  rejectFollowRequest(userId: string, requestId: string): Promise<void>;

  /**
   * Set the approve followers mode for a user
   * @param userId ID of the user
   * @param mode The approval mode to set
   * @see Requirements: 4.11
   */
  setApproveFollowersMode(
    userId: string,
    mode: ApproveFollowersMode,
  ): Promise<void>;

  // ═══════════════════════════════════════════════════════
  // Profile Management (Requirements 8.1-8.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get a user's profile
   * @param userId ID of the user to get
   * @param requesterId Optional ID of the user requesting (for privacy checks)
   * @returns The user profile
   * @throws UserProfileServiceError if user not found
   * @see Requirements: 8.6
   */
  getProfile(
    userId: string,
    requesterId?: string,
  ): Promise<IBaseUserProfile<string>>;

  /**
   * Update a user's display name
   * @param userId ID of the user
   * @param displayName New display name
   * @throws UserProfileServiceError if validation fails
   * @see Requirements: 8.1
   */
  updateDisplayName(userId: string, displayName: string): Promise<void>;

  /**
   * Update a user's bio
   * @param userId ID of the user
   * @param bio New bio (max 160 characters)
   * @throws UserProfileServiceError if bio too long
   * @see Requirements: 8.2
   */
  updateBio(userId: string, bio: string): Promise<void>;

  /**
   * Update a user's profile picture
   * @param userId ID of the user
   * @param url URL of the new profile picture
   * @param mimeType MIME type of the image
   * @throws UserProfileServiceError if invalid format
   * @see Requirements: 8.3
   */
  updateProfilePicture(
    userId: string,
    url: string,
    mimeType: string,
  ): Promise<void>;

  /**
   * Update a user's header image
   * @param userId ID of the user
   * @param url URL of the new header image
   * @param mimeType MIME type of the image
   * @throws UserProfileServiceError if invalid format
   * @see Requirements: 8.4
   */
  updateHeaderImage(
    userId: string,
    url: string,
    mimeType: string,
  ): Promise<void>;

  /**
   * Update multiple profile fields at once
   * @param userId ID of the user
   * @param updates Fields to update
   * @returns Updated profile
   * @see Requirements: 8.1-8.5
   */
  updateProfile(
    userId: string,
    updates: IUpdateProfileOptions,
  ): Promise<IBaseUserProfile<string>>;

  // ═══════════════════════════════════════════════════════
  // Block and Mute (Requirements 18.1-18.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Block a user
   * @param blockerId ID of the user blocking
   * @param blockedId ID of the user to block
   * @throws UserProfileServiceError if operation fails
   * @see Requirements: 18.1, 18.2
   */
  blockUser(blockerId: string, blockedId: string): Promise<void>;

  /**
   * Unblock a user
   * @param blockerId ID of the user unblocking
   * @param blockedId ID of the user to unblock
   * @throws UserProfileServiceError if not blocked
   * @see Requirements: 18.6
   */
  unblockUser(blockerId: string, blockedId: string): Promise<void>;

  /**
   * Check if a user has blocked another user
   * @param blockerId ID of the potential blocker
   * @param blockedId ID of the potentially blocked user
   * @returns True if blocked, false otherwise
   */
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;

  /**
   * Get list of blocked users
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of blocked user profiles
   * @see Requirements: 18.5
   */
  getBlockedUsers(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Mute a user
   * @param muterId ID of the user muting
   * @param mutedId ID of the user to mute
   * @throws UserProfileServiceError if operation fails
   * @see Requirements: 18.3
   */
  muteUser(muterId: string, mutedId: string): Promise<void>;

  /**
   * Unmute a user
   * @param muterId ID of the user unmuting
   * @param mutedId ID of the user to unmute
   * @throws UserProfileServiceError if not muted
   * @see Requirements: 18.4
   */
  unmuteUser(muterId: string, mutedId: string): Promise<void>;

  /**
   * Check if a user has muted another user
   * @param muterId ID of the potential muter
   * @param mutedId ID of the potentially muted user
   * @returns True if muted, false otherwise
   */
  isMuted(muterId: string, mutedId: string): Promise<boolean>;

  /**
   * Get list of muted users
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of muted user profiles
   * @see Requirements: 18.5
   */
  getMutedUsers(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  // ═══════════════════════════════════════════════════════
  // Privacy Settings (Requirements 31.1-31.7)
  // ═══════════════════════════════════════════════════════

  /**
   * Get a user's privacy settings
   * @param userId ID of the user
   * @returns The privacy settings
   */
  getPrivacySettings(userId: string): Promise<IBasePrivacySettings>;

  /**
   * Update a user's privacy settings
   * @param userId ID of the user
   * @param settings Partial privacy settings to update
   * @returns Updated privacy settings
   * @see Requirements: 31.1-31.7
   */
  updatePrivacySettings(
    userId: string,
    settings: Partial<IBasePrivacySettings>,
  ): Promise<IBasePrivacySettings>;
}
