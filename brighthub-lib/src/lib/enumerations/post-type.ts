/**
 * Types of posts in the BrightHub social network
 */
export enum PostType {
  /** Original post created by the user */
  Original = 'original',
  /** Reply to another post */
  Reply = 'reply',
  /** Repost of another user's post */
  Repost = 'repost',
  /** Quote post with additional commentary */
  Quote = 'quote',
}
