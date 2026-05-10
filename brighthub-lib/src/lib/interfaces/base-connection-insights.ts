import { ConnectionStrength } from '../enumerations/connection-strength';

/**
 * Insights and statistics about a connection
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseConnectionInsights<TId> {
  /** ID of the connection this insight is about */
  connectionId: TId;
  /** Timestamp when the user started following this connection */
  followedAt: TId extends string ? string : Date;
  /** Total likes given to this connection's posts */
  totalLikesGiven: number;
  /** Total likes received from this connection */
  totalLikesReceived: number;
  /** Total replies exchanged with this connection */
  totalReplies: number;
  /** Total mentions of/by this connection */
  totalMentions: number;
  /** Timestamp of the last interaction with this connection */
  lastInteractionAt?: TId extends string ? string : Date;
  /** Calculated strength of the connection */
  strength: ConnectionStrength;
}
