import { PostType } from '../enumerations/post-type';
import { IBaseMediaAttachment } from './base-media-attachment';

/**
 * Base post data interface for the BrightHub social network
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBasePostData<TId> {
  /** Unique identifier for the post */
  _id: TId;
  /** ID of the post author */
  authorId: TId;
  /** Raw content of the post */
  content: string;
  /** Formatted HTML content for display */
  formattedContent: string;
  /** Type of post (original, reply, repost, quote) */
  postType: PostType;
  /** ID of the parent post (for replies) */
  parentPostId?: TId;
  /** ID of the quoted post (for quote posts) */
  quotedPostId?: TId;
  /** Media attachments (max 4) */
  mediaAttachments: IBaseMediaAttachment<TId>[];
  /** Usernames mentioned in the post */
  mentions: string[];
  /** Hashtags used in the post */
  hashtags: string[];
  /** Number of likes on the post */
  likeCount: number;
  /** Number of reposts */
  repostCount: number;
  /** Number of replies */
  replyCount: number;
  /** Number of quote posts */
  quoteCount: number;
  /** Whether the post has been edited */
  isEdited: boolean;
  /** Timestamp when the post was edited */
  editedAt?: TId extends string ? string : Date;
  /** Hub IDs for restricted visibility */
  hubIds?: TId[];
  /** Whether this post uses blog-style markdown rendering */
  isBlogPost: boolean;
  /** Whether the post has been soft-deleted */
  isDeleted: boolean;
  /** Timestamp when the post was created */
  createdAt: TId extends string ? string : Date;
  /** Timestamp when the post was last updated */
  updatedAt: TId extends string ? string : Date;
  /** ID of the user who created the post */
  createdBy: TId;
  /** ID of the user who last updated the post */
  updatedBy: TId;
}
