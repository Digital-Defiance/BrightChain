import {
  ConnectionStrength,
  DiscoveryServiceError,
  DiscoveryServiceErrorCode,
  IBaseConnectionInsights,
  IBaseConnectionSuggestion,
  IBaseUserProfile,
  IDiscoveryService,
  InsightPeriod,
  IPaginatedResult,
  IPaginationOptions,
  ISuggestionOptions,
  SuggestionReason,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';

/**
 * Default suggestion limit
 */
const DEFAULT_SUGGESTION_LIMIT = 20;

/**
 * Maximum suggestion limit
 */
const MAX_SUGGESTION_LIMIT = 50;

/**
 * Default pagination limit
 */
const DEFAULT_PAGE_LIMIT = 20;

/**
 * Maximum pagination limit
 */
const MAX_PAGE_LIMIT = 100;

/**
 * Duration in milliseconds for dismissed suggestion exclusion (30 days)
 */
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Interaction thresholds for connection strength calculation
 */
const STRENGTH_THRESHOLDS = {
  strong: 20,
  moderate: 8,
  weak: 2,
} as const;

/**
 * Recency weight decay factor (interactions older than 30 days get half weight)
 */
const RECENCY_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════
// Database Record Types
// ═══════════════════════════════════════════════════════

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
  privacySettings: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

interface FollowRecord {
  _id: string;
  followerId: string;
  followedId: string;
  createdAt: string;
}

interface BlockRecord {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

interface MuteRecord {
  _id: string;
  muterId: string;
  mutedId: string;
  createdAt: string;
}

interface ConnectionInteractionRecord {
  _id: string;
  userId: string;
  connectionId: string;
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalReplies: number;
  totalMentions: number;
  lastInteractionAt?: string;
  strength: string;
  followedAt: string;
  updatedAt: string;
}

interface DismissedSuggestionRecord {
  _id: string;
  userId: string;
  suggestedUserId: string;
  dismissedAt: string;
  expiresAt: string;
}

interface PostRecord {
  _id: string;
  authorId: string;
  hashtags: string[];
  createdAt: string;
  isDeleted: boolean;
}

// ═══════════════════════════════════════════════════════
// Database Abstraction Interfaces
// ═══════════════════════════════════════════════════════

interface FindQuery<T> {
  sort?(field: Record<string, 1 | -1>): FindQuery<T>;
  skip?(count: number): FindQuery<T>;
  limit?(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

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

interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

/**
 * Discovery_Service implementation
 * Handles connection suggestions, strength calculations, and insights
 * @see Requirements: 26.1-26.8, 27.1-27.6, 29.1-29.6
 */
export class DiscoveryService implements IDiscoveryService {
  private readonly userProfilesCollection: Collection<UserProfileRecord>;
  private readonly followsCollection: Collection<FollowRecord>;
  private readonly blocksCollection: Collection<BlockRecord>;
  private readonly mutesCollection: Collection<MuteRecord>;
  private readonly interactionsCollection: Collection<ConnectionInteractionRecord>;
  private readonly dismissedSuggestionsCollection: Collection<DismissedSuggestionRecord>;
  private readonly postsCollection: Collection<PostRecord>;

  constructor(application: IApplicationWithCollections) {
    this.userProfilesCollection = application.getModel<UserProfileRecord>(
      'brighthub_user_profiles',
    );
    this.followsCollection =
      application.getModel<FollowRecord>('brighthub_follows');
    this.blocksCollection =
      application.getModel<BlockRecord>('brighthub_blocks');
    this.mutesCollection = application.getModel<MuteRecord>('brighthub_mutes');
    this.interactionsCollection =
      application.getModel<ConnectionInteractionRecord>(
        'brighthub_connection_interactions',
      );
    this.dismissedSuggestionsCollection =
      application.getModel<DismissedSuggestionRecord>(
        'brighthub_dismissed_suggestions',
      );
    this.postsCollection = application.getModel<PostRecord>('brighthub_posts');
  }

  // ═══════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════

  private getLimit(options?: IPaginationOptions): number {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    return Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
  }

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
      approveFollowersMode:
        record.approveFollowersMode as IBaseUserProfile<string>['approveFollowersMode'],
      privacySettings:
        record.privacySettings as unknown as IBaseUserProfile<string>['privacySettings'],
      createdAt: record.createdAt,
    };
  }

  private recordToInsights(
    record: ConnectionInteractionRecord,
  ): IBaseConnectionInsights<string> {
    return {
      connectionId: record.connectionId,
      followedAt: record.followedAt,
      totalLikesGiven: record.totalLikesGiven,
      totalLikesReceived: record.totalLikesReceived,
      totalReplies: record.totalReplies,
      totalMentions: record.totalMentions,
      lastInteractionAt: record.lastInteractionAt,
      strength: record.strength as ConnectionStrength,
    };
  }

  /**
   * Get the set of user IDs that should be excluded from suggestions:
   * already-followed, blocked, muted, and recently dismissed.
   */
  private async getExcludedUserIds(userId: string): Promise<Set<string>> {
    const excluded = new Set<string>();
    excluded.add(userId); // exclude self

    // Already followed
    const follows = await this.followsCollection
      .find({ followerId: userId } as Partial<FollowRecord>)
      .exec();
    for (const f of follows) {
      excluded.add(f.followedId);
    }

    // Blocked (both directions)
    const blockedByMe = await this.blocksCollection
      .find({ blockerId: userId } as Partial<BlockRecord>)
      .exec();
    for (const b of blockedByMe) {
      excluded.add(b.blockedId);
    }
    const blockedMe = await this.blocksCollection
      .find({ blockedId: userId } as Partial<BlockRecord>)
      .exec();
    for (const b of blockedMe) {
      excluded.add(b.blockerId);
    }

    // Muted
    const muted = await this.mutesCollection
      .find({ muterId: userId } as Partial<MuteRecord>)
      .exec();
    for (const m of muted) {
      excluded.add(m.mutedId);
    }

    // Dismissed (not expired)
    const now = new Date().toISOString();
    const dismissed = await this.dismissedSuggestionsCollection
      .find({ userId } as Partial<DismissedSuggestionRecord>)
      .exec();
    for (const d of dismissed) {
      if (d.expiresAt > now) {
        excluded.add(d.suggestedUserId);
      }
    }

    return excluded;
  }

  /**
   * Calculate mutual connection count between two users
   */
  private async getMutualCount(
    userId: string,
    candidateId: string,
  ): Promise<number> {
    const [userFollows, candidateFollows] = await Promise.all([
      this.followsCollection
        .find({ followerId: userId } as Partial<FollowRecord>)
        .exec(),
      this.followsCollection
        .find({ followerId: candidateId } as Partial<FollowRecord>)
        .exec(),
    ]);
    const userFollowedSet = new Set(userFollows.map((f) => f.followedId));
    let count = 0;
    for (const f of candidateFollows) {
      if (userFollowedSet.has(f.followedId)) {
        count++;
      }
    }
    return count;
  }

  // ═══════════════════════════════════════════════════════
  // Connection Suggestions (Requirements 26.1-26.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get connection suggestions based on mutual connections and optionally interests.
   * Scores are calculated from mutual connection count.
   * Excludes already-followed, blocked, muted, and dismissed users.
   * @see Requirements: 26.1-26.6
   */
  async getSuggestions(
    userId: string,
    options?: ISuggestionOptions,
  ): Promise<IPaginatedResult<IBaseConnectionSuggestion<string>>> {
    const limit = Math.min(
      Math.max(1, options?.limit ?? DEFAULT_SUGGESTION_LIMIT),
      MAX_SUGGESTION_LIMIT,
    );

    const excluded = await this.getExcludedUserIds(userId);

    // Get users followed by people I follow (friends-of-friends)
    const myFollows = await this.followsCollection
      .find({ followerId: userId } as Partial<FollowRecord>)
      .exec();
    const myFollowedIds = myFollows.map((f) => f.followedId);

    // Collect candidate user IDs from friends-of-friends
    const candidateScores = new Map<
      string,
      { mutualCount: number; reason: SuggestionReason }
    >();

    for (const followedId of myFollowedIds) {
      const theirFollows = await this.followsCollection
        .find({ followerId: followedId } as Partial<FollowRecord>)
        .exec();
      for (const f of theirFollows) {
        if (!excluded.has(f.followedId)) {
          const existing = candidateScores.get(f.followedId);
          if (existing) {
            existing.mutualCount++;
          } else {
            candidateScores.set(f.followedId, {
              mutualCount: 1,
              reason: SuggestionReason.MutualConnections,
            });
          }
        }
      }
    }

    // Sort candidates by mutual count descending
    const sorted = [...candidateScores.entries()].sort(
      (a, b) => b[1].mutualCount - a[1].mutualCount,
    );

    // Apply cursor-based pagination
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIdx = sorted.findIndex(([id]) => id === options.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = sorted.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const items = page.slice(0, limit);

    // Fetch profiles and build suggestions
    const suggestions: IBaseConnectionSuggestion<string>[] = [];
    for (const [candidateId, data] of items) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: candidateId } as Partial<UserProfileRecord>)
        .exec();
      if (profile) {
        suggestions.push({
          userId: candidateId,
          userProfile: this.recordToProfile(profile),
          mutualConnectionCount: data.mutualCount,
          score: data.mutualCount,
          reason: data.reason,
        });
      }
    }

    return {
      items: suggestions,
      cursor:
        hasMore && items.length > 0 ? items[items.length - 1][0] : undefined,
      hasMore,
    };
  }

  /**
   * Get "Similar to" suggestions based on a target user's network.
   * Returns users followed by the target that the requesting user doesn't follow.
   * @see Requirements: 26.4
   */
  async getSimilarUsers(
    userId: string,
    targetUserId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const excluded = await this.getExcludedUserIds(userId);

    // Get target user's following
    const targetFollows = await this.followsCollection
      .find({ followerId: targetUserId } as Partial<FollowRecord>)
      .exec();

    // Filter to users not excluded
    const candidates = targetFollows
      .filter((f) => !excluded.has(f.followedId))
      .map((f) => f.followedId);

    // Apply cursor
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIdx = candidates.indexOf(options.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = candidates.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const pageIds = page.slice(0, limit);

    const profiles: IBaseUserProfile<string>[] = [];
    for (const id of pageIds) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: id } as Partial<UserProfileRecord>)
        .exec();
      if (profile) {
        profiles.push(this.recordToProfile(profile));
      }
    }

    return {
      items: profiles,
      cursor:
        hasMore && pageIds.length > 0 ? pageIds[pageIds.length - 1] : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Suggestion Management (Requirements 26.7-26.8)
  // ═══════════════════════════════════════════════════════

  /**
   * Dismiss a suggestion, excluding the user for 30 days.
   * @see Requirements: 26.7
   */
  async dismissSuggestion(
    userId: string,
    suggestedUserId: string,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DISMISS_DURATION_MS);

    // Check if already dismissed (update expiry if so)
    const existing = await this.dismissedSuggestionsCollection
      .findOne({
        userId,
        suggestedUserId,
      } as Partial<DismissedSuggestionRecord>)
      .exec();

    if (existing) {
      await this.dismissedSuggestionsCollection
        .updateOne(
          { _id: existing._id } as Partial<DismissedSuggestionRecord>,
          {
            dismissedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
          } as Partial<DismissedSuggestionRecord>,
        )
        .exec();
    } else {
      await this.dismissedSuggestionsCollection.create({
        _id: randomUUID(),
        userId,
        suggestedUserId,
        dismissedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // Connection Strength (Requirements 27.1-27.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Calculate connection strength based on interaction frequency and recency.
   * Total interaction score = likes given + likes received + replies + mentions,
   * weighted by recency (interactions older than 30 days get half weight).
   * @see Requirements: 27.1, 27.2, 27.6
   */
  async calculateConnectionStrength(
    userId: string,
    connectionId: string,
  ): Promise<ConnectionStrength> {
    const record = await this.interactionsCollection
      .findOne({ userId, connectionId } as Partial<ConnectionInteractionRecord>)
      .exec();

    if (!record) {
      return ConnectionStrength.Dormant;
    }

    const totalInteractions =
      record.totalLikesGiven +
      record.totalLikesReceived +
      record.totalReplies +
      record.totalMentions;

    // Apply recency weighting
    let recencyMultiplier = 1.0;
    if (record.lastInteractionAt) {
      const elapsed = Date.now() - new Date(record.lastInteractionAt).getTime();
      recencyMultiplier = Math.pow(0.5, elapsed / RECENCY_HALF_LIFE_MS);
    } else {
      recencyMultiplier = 0.1; // No interactions at all
    }

    const weightedScore = totalInteractions * recencyMultiplier;

    let strength: ConnectionStrength;
    if (weightedScore >= STRENGTH_THRESHOLDS.strong) {
      strength = ConnectionStrength.Strong;
    } else if (weightedScore >= STRENGTH_THRESHOLDS.moderate) {
      strength = ConnectionStrength.Moderate;
    } else if (weightedScore >= STRENGTH_THRESHOLDS.weak) {
      strength = ConnectionStrength.Weak;
    } else {
      strength = ConnectionStrength.Dormant;
    }

    // Persist the calculated strength
    await this.interactionsCollection
      .updateOne(
        { _id: record._id } as Partial<ConnectionInteractionRecord>,
        {
          strength,
          updatedAt: new Date().toISOString(),
        } as Partial<ConnectionInteractionRecord>,
      )
      .exec();

    return strength;
  }

  /**
   * Batch update connection strength calculations for all of a user's connections.
   * Intended to be run weekly.
   * @see Requirements: 27.4
   */
  async updateConnectionStrengths(userId: string): Promise<number> {
    const interactions = await this.interactionsCollection
      .find({ userId } as Partial<ConnectionInteractionRecord>)
      .exec();

    let updated = 0;
    for (const record of interactions) {
      await this.calculateConnectionStrength(userId, record.connectionId);
      updated++;
    }

    return updated;
  }

  // ═══════════════════════════════════════════════════════
  // Connection Insights (Requirements 29.1-29.6)
  // ═══════════════════════════════════════════════════════

  /**
   * Get interaction insights for a specific connection.
   * If no interaction record exists, returns zeroed-out insights.
   * @see Requirements: 29.1, 29.2, 29.6
   */
  async getConnectionInsights(
    userId: string,
    connectionId: string,
    period?: InsightPeriod,
  ): Promise<IBaseConnectionInsights<string>> {
    // Verify follow relationship exists
    const follow = await this.followsCollection
      .findOne({
        followerId: userId,
        followedId: connectionId,
      } as Partial<FollowRecord>)
      .exec();

    if (!follow) {
      throw new DiscoveryServiceError(
        DiscoveryServiceErrorCode.ConnectionNotFound,
        `No follow relationship from ${userId} to ${connectionId}`,
      );
    }

    const record = await this.interactionsCollection
      .findOne({ userId, connectionId } as Partial<ConnectionInteractionRecord>)
      .exec();

    if (!record) {
      // Return zeroed insights for connections with no tracked interactions
      return {
        connectionId,
        followedAt: follow.createdAt,
        totalLikesGiven: 0,
        totalLikesReceived: 0,
        totalReplies: 0,
        totalMentions: 0,
        lastInteractionAt: undefined,
        strength: ConnectionStrength.Dormant,
      };
    }

    // For period-based filtering, we return the full record since
    // the interaction totals are cumulative. Period filtering would
    // require time-bucketed interaction logs which is a future enhancement.
    // For now, the period parameter is accepted for API compatibility.
    return this.recordToInsights(record);
  }

  /**
   * Get connections with no interactions in the last 30 days.
   * @see Requirements: 29.3
   */
  async getInactiveConnections(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseUserProfile<string>>> {
    const limit = this.getLimit(options);
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Get all follows
    const follows = await this.followsCollection
      .find({ followerId: userId } as Partial<FollowRecord>)
      .exec();

    // Get all interaction records
    const interactions = await this.interactionsCollection
      .find({ userId } as Partial<ConnectionInteractionRecord>)
      .exec();

    const interactionMap = new Map(
      interactions.map((i) => [i.connectionId, i]),
    );

    // Find inactive connections: no interaction record, or lastInteractionAt > 30 days ago
    const inactiveIds: string[] = [];
    for (const follow of follows) {
      const interaction = interactionMap.get(follow.followedId);
      if (
        !interaction ||
        !interaction.lastInteractionAt ||
        interaction.lastInteractionAt < thirtyDaysAgo
      ) {
        inactiveIds.push(follow.followedId);
      }
    }

    // Apply cursor
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIdx = inactiveIds.indexOf(options.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = inactiveIds.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const pageIds = page.slice(0, limit);

    const profiles: IBaseUserProfile<string>[] = [];
    for (const id of pageIds) {
      const profile = await this.userProfilesCollection
        .findOne({ _id: id } as Partial<UserProfileRecord>)
        .exec();
      if (profile) {
        profiles.push(this.recordToProfile(profile));
      }
    }

    return {
      items: profiles,
      cursor:
        hasMore && pageIds.length > 0 ? pageIds[pageIds.length - 1] : undefined,
      hasMore,
    };
  }

  /**
   * Get top interacted connections for a given period, sorted by total interactions descending.
   * @see Requirements: 29.5
   */
  async getTopConnections(
    userId: string,
    _period: InsightPeriod,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConnectionInsights<string>>> {
    const limit = this.getLimit(options);

    const interactions = await this.interactionsCollection
      .find({ userId } as Partial<ConnectionInteractionRecord>)
      .exec();

    // Sort by total interactions descending
    const sorted = interactions
      .map((r) => ({
        record: r,
        total:
          r.totalLikesGiven +
          r.totalLikesReceived +
          r.totalReplies +
          r.totalMentions,
      }))
      .sort((a, b) => b.total - a.total);

    // Apply cursor
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIdx = sorted.findIndex(
        (s) => s.record.connectionId === options.cursor,
      );
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const page = sorted.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const items = page.slice(0, limit);

    return {
      items: items.map((s) => this.recordToInsights(s.record)),
      cursor:
        hasMore && items.length > 0
          ? items[items.length - 1].record.connectionId
          : undefined,
      hasMore,
    };
  }
}

/**
 * Factory function for creating a DiscoveryService instance
 */
export function createDiscoveryService(
  application: IApplicationWithCollections,
): DiscoveryService {
  return new DiscoveryService(application);
}
