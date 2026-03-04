import { SuggestionReason } from '../enumerations/suggestion-reason';
import { IBaseUserProfile } from './base-user-profile';

/**
 * Suggested connection for a user
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseConnectionSuggestion<TId> {
  /** ID of the suggested user */
  userId: TId;
  /** Profile of the suggested user */
  userProfile: IBaseUserProfile<TId>;
  /** Number of mutual connections */
  mutualConnectionCount: number;
  /** Suggestion score (higher = more relevant) */
  score: number;
  /** Reason for the suggestion */
  reason: SuggestionReason;
}
