/**
 * Visibility settings for posts
 */
export enum PostVisibility {
  /** Visible to everyone */
  Public = 'public',
  /** Visible only to followers */
  FollowersOnly = 'followers_only',
  /** Visible only to friends (mutual friendship required) */
  FriendsOnly = 'friends_only',
  /** Visible only to specific hub members */
  HubOnly = 'hub_only',
}
