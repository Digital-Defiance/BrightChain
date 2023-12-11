/**
 * Public Key Directory Service for the BrightChain identity system.
 *
 * Provides an in-memory searchable directory of member public profiles.
 * Supports search by display name, social username, or member ID with
 * relevance ranking, pagination, and platform filtering. Members may
 * opt out of directory listing via privacy mode.
 *
 * Follows the same stateful-service pattern used by
 * {@link MemberPaperKeyService}, {@link ConversationService}, and other
 * BrightChain services that manage in-memory state with `Map`s.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.6, 5.9
 */

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { IPublicProfile } from '../../interfaces/identity/publicProfile';

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when a profile operation references a member that does not exist.
 */
export class ProfileNotFoundError extends Error {
  constructor(memberId: string) {
    super(`Profile not found for member: ${memberId}`);
    this.name = 'ProfileNotFoundError';
  }
}

/**
 * Error thrown when a profile update is missing required fields.
 */
export class InvalidProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProfileError';
  }
}

// ─── Search types ───────────────────────────────────────────────────────────

/**
 * Options for controlling directory search behaviour.
 *
 * Supports pagination (Requirement 5.5) and platform filtering
 * (Requirement 5.10).
 */
export interface ISearchOptions {
  /** Maximum number of results to return. Defaults to 20. */
  limit?: number;

  /** Zero-based offset for pagination. Defaults to 0. */
  offset?: number;

  /**
   * Filter results to only include profiles with a verified proof
   * on the specified platform (Requirement 5.10).
   */
  platformFilter?: ProofPlatform;
}

/**
 * A single search result with its relevance score.
 *
 * Requirement 5.3: Search results include relevance ranking.
 */
export interface ISearchResult {
  /** The matched public profile */
  profile: IPublicProfile;

  /** Relevance score (higher is more relevant). Used for ranking. */
  relevanceScore: number;
}

/**
 * Paginated search response.
 */
export interface ISearchResponse {
  /** The matched profiles, ordered by descending relevance score */
  results: ISearchResult[];

  /** Total number of matching profiles (before pagination) */
  totalCount: number;

  /** Whether there are more results beyond the current page */
  hasMore: boolean;
}

// ─── Relevance scoring constants ────────────────────────────────────────────

/** Score awarded for an exact member ID match */
const SCORE_EXACT_MEMBER_ID = 100;

/** Score awarded for an exact display name match (case-insensitive) */
const SCORE_EXACT_DISPLAY_NAME = 80;

/** Score awarded when the display name starts with the query */
const SCORE_DISPLAY_NAME_PREFIX = 60;

/** Score awarded when the display name contains the query */
const SCORE_DISPLAY_NAME_CONTAINS = 40;

/** Score awarded for an exact social username match */
const SCORE_EXACT_USERNAME = 70;

/** Score awarded when a social username starts with the query */
const SCORE_USERNAME_PREFIX = 50;

/** Score awarded when a social username contains the query */
const SCORE_USERNAME_CONTAINS = 30;

/** Bonus score per verified identity proof on the profile */
const SCORE_VERIFIED_PROOF_BONUS = 5;

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * In-memory public key directory for searching and managing member profiles.
 *
 * The directory stores {@link IPublicProfile} records keyed by member ID
 * and provides full-text search across display names, social usernames,
 * and member IDs with relevance-based ranking.
 *
 * Privacy mode (Requirement 5.6, 5.9): Profiles with `privacyMode: true`
 * are excluded from search results but can still be accessed directly
 * via {@link getProfile}.
 *
 * @example
 * ```typescript
 * const directory = new PublicKeyDirectoryService();
 *
 * // Add a profile
 * directory.updateProfile({
 *   memberId: 'member-xyz',
 *   displayName: 'Alice',
 *   publicKey: '04abcdef...',
 *   identityProofs: [],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   privacyMode: false,
 * });
 *
 * // Search for profiles
 * const results = directory.search('Alice');
 *
 * // Toggle privacy mode
 * directory.togglePrivacyMode('member-xyz');
 * ```
 */
export class PublicKeyDirectoryService {
  /**
   * Profile storage keyed by member ID.
   */
  private readonly profiles = new Map<string, IPublicProfile>();

  /**
   * Search the directory for profiles matching the given query.
   *
   * Searches across display names, social usernames from identity proofs,
   * and member IDs. Results are ranked by relevance score (Requirement 5.3).
   *
   * Profiles in privacy mode are excluded from results (Requirement 5.9).
   * Only verified identity proofs are considered for username matching
   * (Requirement 5.4).
   *
   * **Validates: Requirements 5.2, 5.3, 5.5, 5.9, 5.10**
   *
   * @param query   - The search query string (case-insensitive)
   * @param options - Optional search parameters (pagination, filtering)
   * @returns Paginated search results ordered by descending relevance
   */
  search(query: string, options?: ISearchOptions): ISearchResponse {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const platformFilter = options?.platformFilter;

    if (!query || query.trim().length === 0) {
      return { results: [], totalCount: 0, hasMore: false };
    }

    const normalizedQuery = query.trim().toLowerCase();
    const scoredResults: ISearchResult[] = [];

    for (const profile of this.profiles.values()) {
      // Requirement 5.9: Skip profiles in privacy mode
      if (profile.privacyMode) {
        continue;
      }

      // Requirement 5.10: Apply platform filter
      if (platformFilter) {
        const hasVerifiedProofOnPlatform = profile.identityProofs.some(
          (proof) =>
            proof.platform === platformFilter &&
            proof.verificationStatus === VerificationStatus.VERIFIED,
        );
        if (!hasVerifiedProofOnPlatform) {
          continue;
        }
      }

      const score = this.calculateRelevanceScore(profile, normalizedQuery);
      if (score > 0) {
        scoredResults.push({ profile, relevanceScore: score });
      }
    }

    // Requirement 5.3: Sort by relevance score descending
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const totalCount = scoredResults.length;
    const paginatedResults = scoredResults.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    return {
      results: paginatedResults,
      totalCount,
      hasMore,
    };
  }

  /**
   * Get a profile by member ID.
   *
   * Unlike {@link search}, this method returns profiles regardless of
   * privacy mode. This allows existing contacts to look up a member
   * directly even when the member has opted out of directory listing.
   *
   * **Validates: Requirements 5.1, 5.9**
   *
   * @param memberId - The member ID to look up
   * @returns The public profile
   * @throws {ProfileNotFoundError} If no profile exists for the member ID
   */
  getProfile(memberId: string): IPublicProfile {
    const profile = this.profiles.get(memberId);
    if (!profile) {
      throw new ProfileNotFoundError(memberId);
    }
    return profile;
  }

  /**
   * Add or update a profile in the directory.
   *
   * If a profile already exists for the member ID, it is replaced.
   * The `updatedAt` timestamp is set to the current time on update.
   *
   * **Validates: Requirements 5.1, 5.8**
   *
   * @param profile - The public profile to store
   * @throws {InvalidProfileError} If required fields are missing
   */
  updateProfile(profile: IPublicProfile): void {
    this.validateProfile(profile);

    const existing = this.profiles.get(profile.memberId);
    if (existing) {
      // Preserve createdAt from the original profile
      const updated: IPublicProfile = {
        ...profile,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      };
      this.profiles.set(profile.memberId, updated);
    } else {
      this.profiles.set(profile.memberId, { ...profile });
    }
  }

  /**
   * Toggle privacy mode for a member's profile.
   *
   * When privacy mode is enabled, the profile is excluded from search
   * results (Requirement 5.9) but can still be accessed directly via
   * {@link getProfile}.
   *
   * **Validates: Requirements 5.6, 5.9**
   *
   * @param memberId - The member whose privacy mode to toggle
   * @returns The new privacy mode state (`true` = private, `false` = public)
   * @throws {ProfileNotFoundError} If no profile exists for the member ID
   */
  togglePrivacyMode(memberId: string): boolean {
    const profile = this.profiles.get(memberId);
    if (!profile) {
      throw new ProfileNotFoundError(memberId);
    }

    profile.privacyMode = !profile.privacyMode;
    profile.updatedAt = new Date();

    return profile.privacyMode;
  }

  /**
   * Get the total number of profiles in the directory.
   */
  get size(): number {
    return this.profiles.size;
  }

  /**
   * Check whether a profile exists for the given member ID.
   */
  hasProfile(memberId: string): boolean {
    return this.profiles.has(memberId);
  }

  /**
   * Remove a profile from the directory.
   *
   * @param memberId - The member whose profile to remove
   * @returns `true` if a profile was removed, `false` if none existed
   */
  removeProfile(memberId: string): boolean {
    return this.profiles.delete(memberId);
  }

  /**
   * Remove all profiles from the directory.
   * Useful for testing.
   */
  clear(): void {
    this.profiles.clear();
  }

  /**
   * Calculate the relevance score for a profile against a search query.
   *
   * Scoring strategy (Requirement 5.3):
   * - Exact member ID match: highest score
   * - Exact display name match: high score
   * - Display name prefix match: medium-high score
   * - Exact social username match: high score
   * - Social username prefix match: medium score
   * - Substring matches: lower scores
   * - Bonus for each verified identity proof
   *
   * Only verified proofs are considered for username matching
   * (Requirement 5.4).
   *
   * @param profile         - The profile to score
   * @param normalizedQuery - The lowercase, trimmed search query
   * @returns The relevance score (0 means no match)
   */
  private calculateRelevanceScore(
    profile: IPublicProfile,
    normalizedQuery: string,
  ): number {
    let score = 0;

    // Check member ID match
    const normalizedMemberId = profile.memberId.toLowerCase();
    if (normalizedMemberId === normalizedQuery) {
      score = Math.max(score, SCORE_EXACT_MEMBER_ID);
    } else if (normalizedMemberId.includes(normalizedQuery)) {
      // Partial member ID match gets a moderate score
      score = Math.max(score, SCORE_DISPLAY_NAME_CONTAINS);
    }

    // Check display name match
    const normalizedDisplayName = profile.displayName.toLowerCase();
    if (normalizedDisplayName === normalizedQuery) {
      score = Math.max(score, SCORE_EXACT_DISPLAY_NAME);
    } else if (normalizedDisplayName.startsWith(normalizedQuery)) {
      score = Math.max(score, SCORE_DISPLAY_NAME_PREFIX);
    } else if (normalizedDisplayName.includes(normalizedQuery)) {
      score = Math.max(score, SCORE_DISPLAY_NAME_CONTAINS);
    }

    // Check social usernames from verified proofs (Requirement 5.4)
    const verifiedProofs = profile.identityProofs.filter(
      (proof) => proof.verificationStatus === VerificationStatus.VERIFIED,
    );

    for (const proof of verifiedProofs) {
      const normalizedUsername = proof.username.toLowerCase();
      if (normalizedUsername === normalizedQuery) {
        score = Math.max(score, SCORE_EXACT_USERNAME);
      } else if (normalizedUsername.startsWith(normalizedQuery)) {
        score = Math.max(score, SCORE_USERNAME_PREFIX);
      } else if (normalizedUsername.includes(normalizedQuery)) {
        score = Math.max(score, SCORE_USERNAME_CONTAINS);
      }
    }

    // Bonus for verified proofs (more verified = more trustworthy)
    if (score > 0) {
      score += verifiedProofs.length * SCORE_VERIFIED_PROOF_BONUS;
    }

    return score;
  }

  /**
   * Validate that a profile has all required fields.
   *
   * @throws {InvalidProfileError} If validation fails
   */
  private validateProfile(profile: IPublicProfile): void {
    if (!profile.memberId || profile.memberId.trim().length === 0) {
      throw new InvalidProfileError('Profile must have a non-empty memberId');
    }
    if (!profile.displayName || profile.displayName.trim().length === 0) {
      throw new InvalidProfileError(
        'Profile must have a non-empty displayName',
      );
    }
    if (!profile.publicKey || profile.publicKey.trim().length === 0) {
      throw new InvalidProfileError('Profile must have a non-empty publicKey');
    }
  }
}
