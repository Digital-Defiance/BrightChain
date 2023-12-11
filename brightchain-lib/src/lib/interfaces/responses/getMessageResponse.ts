/**
 * Response interface for getting a message
 * GET /api/messages/:id
 * @requirements 1.2
 */
export interface IGetMessageResponse {
  /** Base64 encoded message content */
  content: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
