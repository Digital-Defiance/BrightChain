/**
 * Repost interaction on a post
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseRepost<TId> {
  /** Unique identifier for the repost */
  _id: TId;
  /** ID of the user who reposted */
  userId: TId;
  /** ID of the post that was reposted */
  postId: TId;
  /** Timestamp when the repost was created */
  createdAt: TId extends string ? string : Date;
}
