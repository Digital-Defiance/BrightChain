import type {
  IBaseConversation,
  IBaseDirectMessage,
} from '@brightchain/brighthub-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for a single conversation
 * @see Requirements: 46.12
 */
export interface IConversationApiResponse extends IApiMessageResponse {
  data: IBaseConversation<string>;
}

/**
 * API response for a list of conversations with pagination
 * @see Requirements: 46.12
 */
export interface IConversationsApiResponse extends IApiMessageResponse {
  data: {
    conversations: IBaseConversation<string>[];
    cursor?: string;
    hasMore: boolean;
  };
}

/**
 * API response for a single direct message
 * @see Requirements: 46.12
 */
export interface IMessageApiResponse extends IApiMessageResponse {
  data: IBaseDirectMessage<string>;
}

/**
 * API response for a list of messages with pagination
 * @see Requirements: 46.12
 */
export interface IMessagesApiResponse extends IApiMessageResponse {
  data: {
    messages: IBaseDirectMessage<string>[];
    cursor?: string;
    hasMore: boolean;
  };
}
