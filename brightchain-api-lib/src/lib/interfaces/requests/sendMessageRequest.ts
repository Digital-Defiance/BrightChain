import { MessagePriority } from '@brightchain/brightchain-lib';
import { MessageRequest } from './messageRequest';

/**
 * Request interface for sending a message
 * POST /api/messages
 * @requirements 1.1
 */
export interface SendMessageRequest extends MessageRequest {
  body: {
    /** Base64 encoded message content */
    content: string;
    /** Sender member ID */
    senderId: string;
    /** Optional recipient IDs (broadcast if empty) */
    recipients?: string[];
    /** Message type identifier */
    messageType: string;
    /** Message priority level */
    priority?: MessagePriority;
    /** Encryption scheme identifier */
    encryptionScheme?: number;
  };
}
