import { MessageRequestStatus } from '../enumerations/message-request-status';

/**
 * Message request from a non-follower
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseMessageRequest<TId> {
  /** Unique identifier for the request */
  _id: TId;
  /** ID of the user sending the request */
  senderId: TId;
  /** ID of the user receiving the request */
  recipientId: TId;
  /** Preview of the message content */
  messagePreview: string;
  /** Current status of the request */
  status: MessageRequestStatus;
  /** Timestamp when the request was created */
  createdAt: TId extends string ? string : Date;
}
