/**
 * Visibility settings for connection lists
 */
export enum ConnectionVisibility {
  /** Only visible to the owner */
  Private = 'private',
  /** Visible to followers only */
  FollowersOnly = 'followers_only',
  /** Visible to everyone */
  Public = 'public',
}
