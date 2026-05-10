import { FollowRequestStatus } from '../enumerations/follow-request-status';

/**
 * Follow request for protected accounts
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseFollowRequest<TId> {
  /** Unique identifier for the request */
  _id: TId;
  /** ID of the user requesting to follow */
  requesterId: TId;
  /** ID of the user being requested to follow */
  targetId: TId;
  /** Optional custom message with the request */
  message?: string;
  /** Current status of the request */
  status: FollowRequestStatus;
  /** Timestamp when the request was created */
  createdAt: TId extends string ? string : Date;
}
