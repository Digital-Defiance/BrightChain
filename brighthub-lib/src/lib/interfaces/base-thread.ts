import { IBasePostData } from './base-post-data';

/**
 * Thread interface representing a hierarchical conversation
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseThread<TId> {
  /** The root post of the thread */
  rootPost: IBasePostData<TId>;
  /** All replies in the thread (hierarchical) */
  replies: IBasePostData<TId>[];
  /** Total number of replies in the thread */
  replyCount: number;
  /** Number of unique participants in the thread */
  participantCount: number;
}
