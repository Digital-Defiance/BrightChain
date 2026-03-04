/**
 * Privacy settings for user profiles
 */
export interface IBasePrivacySettings {
  /** Hide follower count from profile */
  hideFollowerCount: boolean;
  /** Hide following count from profile */
  hideFollowingCount: boolean;
  /** Hide followers list from non-followers */
  hideFollowersFromNonFollowers: boolean;
  /** Hide following list from non-followers */
  hideFollowingFromNonFollowers: boolean;
  /** Allow direct messages from non-followers */
  allowDmsFromNonFollowers: boolean;
  /** Show online status */
  showOnlineStatus: boolean;
  /** Show read receipts in messages */
  showReadReceipts: boolean;
}
