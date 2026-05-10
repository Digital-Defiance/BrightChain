/**
 * Read receipt for a conversation
 * @template TId - The type of ID (string for frontend, GuidV4Buffer for backend)
 */
export interface IBaseReadReceipt<TId> {
  /** ID of the conversation */
  conversationId: TId;
  /** ID of the user who read the messages */
  userId: TId;
  /** Timestamp when the user last read messages */
  lastReadAt: TId extends string ? string : Date;
  /** ID of the last message that was read */
  lastReadMessageId: TId;
}
