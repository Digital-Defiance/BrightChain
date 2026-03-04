import { ConnectionStrength } from '../enumerations/connection-strength';
import { IBaseConnectionInsights } from './base-connection-insights';
import { IBaseConnectionSuggestion } from './base-connection-suggestion';
import { IBaseUserProfile } from './base-user-profile';
import { IPaginatedResult, IPaginationOptions } from './user-profile-service';

/**
 * Options for fetching connection suggestions
 */
export interface ISuggestionOptions {
  /** Maximum number of suggestions to return (default 20) */
  limit?: number;
  /** Include interest/hashtag-based suggestions */
  includeInterestBased?: boolean;
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Insight period for connection statistics
 */
export type InsightPeriod = '7d' | '30d' | '90d' | 'all';

/**
 * Error codes for discovery service operations
 */
export enum DiscoveryServiceErrorCode {
  /** User not found */
  UserNotFound = 'USER_NOT_FOUND',
  /** Connection not found (no follow relationship) */
  ConnectionNotFound = 'CONNECTION_NOT_FOUND',
  /** Invalid insight period */
  InvalidInsightPeriod = 'INVALID_INSIGHT_PERIOD',
}

/**
 * Discovery service error with code and message
 */
export class DiscoveryServiceError extends Error {
  constructor(
    public readonly code: DiscoveryServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DiscoveryServiceError';
  }
}

/**
 * Interface for the Discovery_Service
 * Handles connection suggestions, strength calculations, and insights
 * @see Requirements: 26.1-26.8, 27.1-27.6, 29.1-29.6
 */
export interface IDiscoveryService {
  // ═══════════════════════════════════════════════════════
  // Connection Suggestions (Requirements 26.1-26.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get connection suggestions for a user based on mutual connections,
   * interests, and network similarity.
   * Excludes already-followed, blocked, and muted users.
   * @param userId ID of the user requesting suggestions
   * @param options Suggestion options (limit, interest-based, cursor)
   * @returns Paginated list of connection suggestions
   * @see Requirements: 26.1-26.6
   */
  getSuggestions(
    userId: string,
    options?: ISuggestionOptions,
  ): Promise<IPaginatedResult<IBaseConnectionSuggestion<string>>>;

  /**
   * Get "Similar to" suggestions based on a specified user's network.
   * Returns users followed by the target user that the requesting user doesn't follow.
   * @param userId ID of the requesting user
   * @param targetUserId ID of the user whose network to base suggestions on
   * @param options Pagination options
   * @returns Paginated list of similar user profiles
   * @see Requirements: 26.4
   */
  getSimilarUsers(
    userId: string,
    targetUserId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  // ═══════════════════════════════════════════════════════
  // Suggestion Management (Requirements 26.7-26.8)
  // ═══════════════════════════════════════════════════════

  /**
   * Dismiss a suggestion, excluding the user for 30 days.
   * @param userId ID of the user dismissing the suggestion
   * @param suggestedUserId ID of the suggested user to dismiss
   * @see Requirements: 26.7
   */
  dismissSuggestion(userId: string, suggestedUserId: string): Promise<void>;

  // ═══════════════════════════════════════════════════════
  // Connection Strength (Requirements 27.1-27.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Calculate connection strength based on interaction frequency.
   * Factors in likes, replies, mentions, and recency of interactions.
   * @param userId ID of the user
   * @param connectionId ID of the connection
   * @returns Calculated connection strength
   * @see Requirements: 27.1, 27.2, 27.6
   */
  calculateConnectionStrength(
    userId: string,
    connectionId: string,
  ): Promise<ConnectionStrength>;

  /**
   * Batch update connection strength calculations for a user.
   * Intended to be run weekly.
   * @param userId ID of the user whose connections to recalculate
   * @returns Number of connections updated
   * @see Requirements: 27.4
   */
  updateConnectionStrengths(userId: string): Promise<number>;

  // ═══════════════════════════════════════════════════════
  // Connection Insights (Requirements 29.1-29.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get interaction insights for a specific connection.
   * @param userId ID of the requesting user
   * @param connectionId ID of the connection
   * @param period Insight period (7d, 30d, 90d, all)
   * @returns Connection insights with interaction statistics
   * @see Requirements: 29.1, 29.2, 29.6
   */
  getConnectionInsights(
    userId: string,
    connectionId: string,
    period?: InsightPeriod,
  ): Promise<IBaseConnectionInsights<string>>;

  /**
   * Get connections with no interactions in the last 30 days.
   * @param userId ID of the user
   * @param options Pagination options
   * @returns Paginated list of inactive connection profiles
   * @see Requirements: 29.3
   */
  getInactiveConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>>;

  /**
   * Get top interacted connections for a given period.
   * @param userId ID of the user
   * @param period Insight period (7d, 30d, 90d, all)
   * @param options Pagination options
   * @returns Paginated list of top connection insights
   * @see Requirements: 29.5
   */
  getTopConnections(
    userId: string,
    period: InsightPeriod,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionInsights<string>>>;
}
