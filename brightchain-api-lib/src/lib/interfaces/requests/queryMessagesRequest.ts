import { MessageRequest } from './messageRequest';

/**
 * Request interface for querying messages
 * GET /api/messages
 * @requirements 1.3
 */
export interface QueryMessagesRequest extends MessageRequest {
  query: {
    recipientId?: string;
    senderId?: string;
    messageType?: string;
    page?: string;
    pageSize?: string;
  };
}
