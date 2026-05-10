/**
 * Trust tier for a hub — determines who can post and who can view.
 */
export enum HubTrustTier {
  /** Anyone can view and post */
  Open = 'open',
  /** Only BrightChain-verified identities can post */
  Verified = 'verified',
  /** Content encrypted and visible only to members */
  Encrypted = 'encrypted',
}

/**
 * Hub for community discussions — a topic-scoped space where users
 * can post long-form content, discuss, and build reputation.
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseHub<TId> {
  /** Unique identifier for the hub */
  _id: TId;
  /** ID of the user who owns the hub */
  ownerId: TId;
  /** URL-friendly slug (e.g. "programming", "rust") */
  slug?: string;
  /** Display name of the hub */
  name: string;
  /** Short description shown in listings and sidebar */
  description?: string;
  /** Community rules (markdown) */
  rules?: string;
  /** Number of members / subscribers */
  memberCount: number;
  /** Number of posts in this hub */
  postCount?: number;
  /** Whether this is the default "Close Friends" hub */
  isDefault: boolean;
  /** Trust tier controlling visibility and posting rules */
  trustTier?: HubTrustTier;
  /** Optional parent hub ID for sub-hub nesting (one level deep) */
  parentHubId?: TId;
  /** Hub icon URL or emoji shortcode */
  icon?: string;
  /** IDs of moderator users */
  moderatorIds?: TId[];
  /** Timestamp when the hub was created */
  createdAt: TId extends string ? string : Date;
}

/**
 * Hub-scoped reputation for a user within a specific hub.
 * Reputation is earned independently per hub to prevent karma farming.
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseHubReputation<TId> {
  /** User ID */
  userId: TId;
  /** Hub ID */
  hubId: TId;
  /** Total reputation score in this hub */
  score: number;
  /** Number of posts in this hub */
  postCount: number;
  /** Number of upvotes received in this hub */
  upvotesReceived: number;
  /** Timestamp of last activity in this hub */
  lastActiveAt: TId extends string ? string : Date;
}
