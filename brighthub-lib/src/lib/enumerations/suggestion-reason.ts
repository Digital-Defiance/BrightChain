/**
 * Reasons for suggesting a connection
 */
export enum SuggestionReason {
  /** Suggested based on mutual connections */
  MutualConnections = 'mutual_connections',
  /** Suggested based on similar interests/hashtags */
  SimilarInterests = 'similar_interests',
  /** Suggested based on similarity to a specific user's network */
  SimilarToUser = 'similar_to_user',
}
