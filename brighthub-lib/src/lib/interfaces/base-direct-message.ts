import { IBaseMediaAttachment } from './base-media-attachment';

/**
 * Direct message within a conversation
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseDirectMessage<TId> {
  /** Unique identifier for the message */
  _id: TId;
  /** ID of the conversation this message belongs to */
  conversationId: TId;
  /** ID of the user who sent the message */
  senderId: TId;
  /** Raw content of the message */
  content: string;
  /** Formatted HTML content for display */
  formattedContent: string;
  /** Media attachments (max 10) */
  attachments: IBaseMediaAttachment<TId>[];
  /** ID of the message being replied to (for threaded replies) */
  replyToMessageId?: TId;
  /** ID of the original message if forwarded */
  forwardedFromId?: TId;
  /** Whether the message has been edited */
  isEdited: boolean;
  /** Timestamp when the message was edited */
  editedAt?: TId extends string ? string : Date;
  /** Whether the message has been soft-deleted */
  isDeleted: boolean;
  /** Timestamp when the message was created */
  createdAt: TId extends string ? string : Date;
}
