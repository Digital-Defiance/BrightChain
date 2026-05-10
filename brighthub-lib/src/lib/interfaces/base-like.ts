/**
 * Like interaction on a post
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseLike<TId> {
  /** Unique identifier for the like */
  _id: TId;
  /** ID of the user who liked the post */
  userId: TId;
  /** ID of the post that was liked */
  postId: TId;
  /** Timestamp when the like was created */
  createdAt: TId extends string ? string : Date;
}
