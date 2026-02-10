import {
  IDeleteMessageResponse,
  IGetMessageResponse,
  IQueryMessagesResponse,
  ISendMessageResponse,
  MessageEncryptionScheme,
  MessagePriority,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import {
  GetMessageRequest,
  QueryMessagesRequest,
  SendMessageRequest,
} from '../../interfaces';
import { IBrightChainApplication } from '../../interfaces/application';
import { DeleteMessageRequest } from '../../interfaces/requests/deleteMessagesRequest';
import { MessagePassingService } from '../../services/messagePassingService';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type MessageApiResponse =
  | ISendMessageResponse
  | IGetMessageResponse
  | IQueryMessagesResponse
  | IDeleteMessageResponse
  | ApiErrorResponse;

interface MessagesHandlers extends TypedHandlers {
  sendMessage: ApiRequestHandler<ISendMessageResponse | ApiErrorResponse>;
  getMessage: ApiRequestHandler<IGetMessageResponse | ApiErrorResponse>;
  queryMessages: ApiRequestHandler<IQueryMessagesResponse | ApiErrorResponse>;
  deleteMessage: ApiRequestHandler<IDeleteMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for message passing operations.
 *
 * Provides REST API endpoints for sending, retrieving, querying, and deleting
 * messages in the BrightChain distributed messaging system.
 *
 * ## Endpoints
 *
 * ### POST /api/messages
 * Send a new message with optional recipients.
 *
 * **Request Body:**
 * - `content` (string, required): Base64-encoded message content
 * - `senderId` (string, required): Sender member ID
 * - `recipients` (string[], optional): Recipient IDs (broadcast if empty)
 * - `messageType` (string, required): Message type identifier
 * - `priority` (number, optional): Message priority level
 * - `encryptionScheme` (number, optional): Encryption scheme identifier
 *
 * **Response:** Message ID and magnet URL
 *
 * ### GET /api/messages/:id
 * Retrieve a message by its ID.
 *
 * **Parameters:**
 * - `id` (string, required): Message ID
 *
 * **Response:** Base64-encoded message content
 *
 * ### GET /api/messages
 * Query messages with optional filters.
 *
 * **Query Parameters:**
 * - `recipientId` (string, optional): Filter by recipient ID
 * - `senderId` (string, optional): Filter by sender ID
 * - `messageType` (string, optional): Filter by message type
 * - `page` (number, optional): Page number (default: 1)
 * - `pageSize` (number, optional): Page size (default: 50)
 *
 * **Response:** Array of message metadata
 *
 * ### DELETE /api/messages/:id
 * Delete a message by its ID.
 *
 * **Parameters:**
 * - `id` (string, required): Message ID
 *
 * **Response:** 204 No Content on success
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export class MessagesController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  MessageApiResponse,
  MessagesHandlers,
  CoreLanguageCode
> {
  private messageService: MessagePassingService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Set the MessagePassingService instance.
   * This allows for dependency injection and testing.
   */
  public setMessageService(service: MessagePassingService): void {
    this.messageService = service;
  }

  /**
   * Get the MessagePassingService instance.
   * Throws if the service has not been set.
   */
  private getMessageService(): MessagePassingService {
    if (!this.messageService) {
      throw new Error('MessagePassingService not initialized');
    }
    return this.messageService;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        useAuthentication: false,
        useCryptoAuthentication: false,
        handlerKey: 'sendMessage',
      }),
      routeConfig('get', '/:id', {
        handlerKey: 'getMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/', {
        handlerKey: 'queryMessages',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:id', {
        handlerKey: 'deleteMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      sendMessage: this.handleSendMessage.bind(this),
      getMessage: this.handleGetMessage.bind(this),
      queryMessages: this.handleQueryMessages.bind(this),
      deleteMessage: this.handleDeleteMessage.bind(this),
    };
  }

  /**
   * POST /api/messages
   * Send a new message.
   *
   * @param req - Request containing message content and metadata
   * @returns Message ID and magnet URL on success, or error response
   * @requirements 1.1
   */
  private async handleSendMessage(req: unknown): Promise<{
    statusCode: number;
    response: ISendMessageResponse | ApiErrorResponse;
  }> {
    try {
      const {
        content,
        senderId,
        recipients,
        messageType,
        priority,
        encryptionScheme,
      } = (req as unknown as SendMessageRequest).body;

      // Validate required fields
      if (!content) {
        return validationError('Missing required field: content');
      }
      if (!senderId) {
        return validationError('Missing required field: senderId');
      }
      if (!messageType) {
        return validationError('Missing required field: messageType');
      }

      // Validate field types
      if (typeof content !== 'string') {
        return validationError('Invalid field type: content must be a string');
      }
      if (typeof senderId !== 'string') {
        return validationError('Invalid field type: senderId must be a string');
      }
      if (typeof messageType !== 'string') {
        return validationError(
          'Invalid field type: messageType must be a string',
        );
      }

      const contentBuffer = Buffer.from(content, 'base64');
      const service = this.getMessageService();

      // Map numeric encryption scheme to enum value
      const encryptionSchemeValue =
        encryptionScheme === 1
          ? MessageEncryptionScheme.SHARED_KEY
          : encryptionScheme === 2
            ? MessageEncryptionScheme.RECIPIENT_KEYS
            : MessageEncryptionScheme.NONE;

      const result = await service.sendMessage(contentBuffer, senderId, {
        recipients: recipients || [],
        messageType,
        priority: priority ?? MessagePriority.NORMAL,
        senderId,
        encryptionScheme: encryptionSchemeValue,
      });

      return {
        statusCode: 201,
        response: {
          messageId: result.messageId,
          magnetUrl: result.magnetUrl,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * GET /api/messages/:id
   * Retrieve a message by its ID.
   *
   * @param req - Request containing the message ID parameter
   * @returns Base64-encoded message content on success, or 404 if not found
   * @requirements 1.2, 1.5
   */
  private async handleGetMessage(req: unknown): Promise<{
    statusCode: number;
    response: IGetMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as unknown as GetMessageRequest).params;

      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const service = this.getMessageService();
      const content = await service.getMessage(id);

      if (!content) {
        return notFoundError('Message', id);
      }

      return {
        statusCode: 200,
        response: {
          content: content.toString('base64'),
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * GET /api/messages
   * Query messages with optional filters.
   *
   * @param req - Request containing query parameters
   * @returns Array of message metadata matching the query
   * @requirements 1.3
   */
  private async handleQueryMessages(req: unknown): Promise<{
    statusCode: number;
    response: IQueryMessagesResponse | ApiErrorResponse;
  }> {
    try {
      const { recipientId, senderId, messageType, page, pageSize } = (
        req as unknown as QueryMessagesRequest
      ).query;

      const query: Record<string, unknown> = {};

      if (recipientId) {
        query['recipientId'] = recipientId;
      }
      if (senderId) {
        query['senderId'] = senderId;
      }
      if (messageType) {
        query['messageType'] = messageType;
      }

      const pageNum = parseInt(page || '1', 10);
      const pageSizeNum = parseInt(pageSize || '50', 10);

      query['page'] = pageNum;
      query['pageSize'] = pageSizeNum;

      const service = this.getMessageService();
      const results = await service.queryMessages(query);

      return {
        statusCode: 200,
        response: {
          messages: results,
          total: results.length,
          page: pageNum,
          pageSize: pageSizeNum,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * DELETE /api/messages/:id
   * Delete a message by its ID.
   *
   * @param req - Request containing the message ID parameter
   * @returns 204 No Content on success, or 404 if not found
   * @requirements 1.4
   */
  private async handleDeleteMessage(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as unknown as DeleteMessageRequest).params;

      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const service = this.getMessageService();
      await service.deleteMessage(id);

      return {
        statusCode: 204,
        response: {
          status: 'success' as const,
          data: { deleted: true },
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }
}
