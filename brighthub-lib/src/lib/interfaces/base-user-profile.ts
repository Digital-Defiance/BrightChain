import { ApproveFollowersMode } from '../enumerations/approve-followers-mode';
import { IBasePrivacySettings } from './base-privacy-settings';

/**
 * Base user profile interface for the BrightHub social network
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseUserProfile<TId> {
  /** Unique identifier for the user */
  _id: TId;
  /** Unique username (handle) */
  username: string;
  /** Display name shown on profile */
  displayName: string;
  /** User bio (max 160 characters) */
  bio: string;
  /** URL to profile picture */
  profilePictureUrl?: string;
  /** URL to header/banner image */
  headerImageUrl?: string;
  /** User's location */
  location?: string;
  /** User's website URL */
  websiteUrl?: string;
  /** Number of followers */
  followerCount: number;
  /** Number of users being followed */
  followingCount: number;
  /** Number of posts created */
  postCount: number;
  /** Whether the user is verified */
  isVerified: boolean;
  /** Whether the account is protected (requires follow approval) */
  isProtected: boolean;
  /** Mode for approving follow requests */
  approveFollowersMode: ApproveFollowersMode;
  /** User's privacy settings */
  privacySettings: IBasePrivacySettings;
  /** Timestamp when the account was created */
  createdAt: TId extends string ? string : Date;
}
