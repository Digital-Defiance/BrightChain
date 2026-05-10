/**
 * Follow relationship between users
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseFollow<TId> {
  /** Unique identifier for the follow relationship */
  _id: TId;
  /** ID of the user who is following */
  followerId: TId;
  /** ID of the user being followed */
  followedId: TId;
  /** Timestamp when the follow was created */
  createdAt: TId extends string ? string : Date;
}
