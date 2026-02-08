/**
 * Response interface for sending a message
 * POST /api/messages
 * @requirements 1.1
 */
export interface ISendMessageResponse {
  /** Unique message identifier */
  messageId: string;
  /** Magnet URL for message retrieval */
  magnetUrl: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
