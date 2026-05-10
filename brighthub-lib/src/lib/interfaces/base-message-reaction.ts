/**
 * Emoji reaction on a message
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseMessageReaction<TId> {
  /** Unique identifier for the reaction */
  _id: TId;
  /** ID of the message being reacted to */
  messageId: TId;
  /** ID of the user who reacted */
  userId: TId;
  /** Emoji used for the reaction */
  emoji: string;
  /** Timestamp when the reaction was created */
  createdAt: TId extends string ? string : Date;
}
