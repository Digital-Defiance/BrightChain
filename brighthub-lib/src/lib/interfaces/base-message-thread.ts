import { IBaseDirectMessage } from './base-direct-message';

/**
 * Thread of replies to a specific message
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseMessageThread<TId> {
  /** The original message being replied to */
  rootMessage: IBaseDirectMessage<TId>;
  /** All replies in the thread */
  replies: IBaseDirectMessage<TId>[];
  /** Total number of replies */
  replyCount: number;
  /** Number of unique participants in the thread */
  participantCount: number;
}
