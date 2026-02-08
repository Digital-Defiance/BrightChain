import { IMessageMetadata } from '../messaging';

/**
 * Response interface for querying messages
 * GET /api/messages
 * @requirements 1.3
 */
export interface IQueryMessagesResponse {
  /** Array of message metadata matching the query */
  messages: IMessageMetadata[];
  /** Total count of matching messages */
  total: number;
  /** Current page number */
  page: number;
  /** Page size */
  pageSize: number;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any; // Add index signature for ApiResponse compatibility
}
