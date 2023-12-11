import { MessageRequest } from './messageRequest';

/**
 * Request interface for deleting a message
 * DELETE /api/messages/:id
 * @requirements 1.4
 */
export interface DeleteMessageRequest extends MessageRequest {
  params: {
    id: string;
  };
}
