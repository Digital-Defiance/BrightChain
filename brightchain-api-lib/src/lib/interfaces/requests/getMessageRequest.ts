import { MessageRequest } from './messageRequest';

/**
 * Request interface for getting a message by ID
 * GET /api/messages/:id
 * @requirements 1.2
 */
export interface GetMessageRequest extends MessageRequest {
  params: {
    id: string;
  };
}
