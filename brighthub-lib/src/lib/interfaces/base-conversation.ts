import { ConversationType } from '../enumerations/conversation-type';

/**
 * Base conversation interface for direct messaging
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseConversation<TId> {
  /** Unique identifier for the conversation */
  _id: TId;
  /** Type of conversation (direct or group) */
  type: ConversationType;
  /** IDs of all participants in the conversation */
  participantIds: TId[];
  /** Name of the conversation (for group conversations) */
  name?: string;
  /** Avatar URL for the conversation (for group conversations) */
  avatarUrl?: string;
  /** Timestamp of the last message */
  lastMessageAt?: TId extends string ? string : Date;
  /** Preview of the last message */
  lastMessagePreview?: string;
  /** Timestamp when the conversation was created */
  createdAt: TId extends string ? string : Date;
  /** Timestamp when the conversation was last updated */
  updatedAt: TId extends string ? string : Date;
}
