/**
 * DirectMessageController — REST API for direct message conversations.
 *
 * Routes:
 *   POST   /                              — Send a direct message
 *   GET    /                              — List conversations (paginated)
 *   GET    /:conversationId/messages      — Get messages (paginated, cursor-based)
 *   DELETE /:conversationId/messages/:messageId — Delete a message
 *   POST   /:conversationId/promote       — Promote conversation to group
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import {
  IDeleteMessageResponse,
  IGetMessagesResponse,
  IListConversationsResponse,
  IPromoteToGroupResponse,
  ISendDirectMessageResponse,
} from '@brightchain/brightchain-lib';
import {
  ConversationNotFoundError,
  ConversationService,
  GroupPromotionNotConfiguredError,
  MessageNotFoundError,
  NotMessageAuthorError,
  NotParticipantError,
  RecipientNotReachableError,
} from '@brightchain/brightchain-lib/lib/services/communication/conversationService';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  deleteConversationMessageValidation,
  getConversationMessagesValidation,
  listConversationsValidation,
  promoteConversationValidation,
  sendDirectMessageValidation,
} from '../../utils/communicationValidation';
import {
  forbiddenError,
  handleError,
  internalError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type ConversationApiResponse =
  | ISendDirectMessageResponse
  | IListConversationsResponse
  | IGetMessagesResponse
  | IDeleteMessageResponse
  | IPromoteToGroupResponse
  | ApiErrorResponse;

interface DirectMessageHandlers extends TypedHandlers {
  sendDirectMessage: ApiRequestHandler<
    ISendDirectMessageResponse | ApiErrorResponse
  >;
  listConversations: ApiRequestHandler<
    IListConversationsResponse | ApiErrorResponse
  >;
  getConversationMessages: ApiRequestHandler<
    IGetMessagesResponse | ApiErrorResponse
  >;
  deleteMessage: ApiRequestHandler<IDeleteMessageResponse | ApiErrorResponse>;
  promoteToGroup: ApiRequestHandler<IPromoteToGroupResponse | ApiErrorResponse>;
}

interface SendDMRequestBody {
  body: { recipientId?: string; content?: string; senderId?: string };
}

interface ListConversationsQuery {
  query: { cursor?: string; limit?: string; memberId?: string };
}

interface GetMessagesParams {
  params: { conversationId: string };
  query: { cursor?: string; limit?: string; memberId?: string };
}

interface DeleteMessageParams {
  params: { conversationId: string; messageId: string };
  query: { memberId?: string };
}

interface PromoteParams {
  params: { conversationId: string };
  body: { newMemberIds?: string[]; memberId?: string };
  query: { memberId?: string };
}

/**
 * Controller for direct message conversations.
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class DirectMessageController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  ConversationApiResponse,
  DirectMessageHandlers,
  CoreLanguageCode
> {
  private conversationService: ConversationService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the ConversationService dependency.
   */
  public setConversationService(service: ConversationService): void {
    this.conversationService = service;
  }

  private getConversationService(): ConversationService {
    if (!this.conversationService) {
      throw new Error('ConversationService not initialized');
    }
    return this.conversationService;
  }

  /**
   * Extract the authenticated member ID from the request.
   * Falls back to body/query senderId/memberId for testing when auth is disabled.
   */
  private getMemberId(req: unknown): string {
    // Try body.senderId
    const body = (req as SendDMRequestBody).body;
    if (body && typeof body === 'object') {
      if (body.senderId) return body.senderId;
      const bodyRecord = body as Record<string, string>;
      if (bodyRecord['memberId']) return bodyRecord['memberId'];
    }
    // Try query.memberId
    const query = (req as ListConversationsQuery).query;
    if (query && query.memberId) return query.memberId;

    throw new Error('No authenticated user');
  }

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('post', '/', {
        ...noAuth,
        handlerKey: 'sendDirectMessage',
        validation: () => sendDirectMessageValidation,
      }),
      routeConfig('get', '/', {
        ...noAuth,
        handlerKey: 'listConversations',
        validation: () => listConversationsValidation,
      }),
      routeConfig('get', '/:conversationId/messages', {
        ...noAuth,
        handlerKey: 'getConversationMessages',
        validation: () => getConversationMessagesValidation,
      }),
      routeConfig('delete', '/:conversationId/messages/:messageId', {
        ...noAuth,
        handlerKey: 'deleteMessage',
        validation: () => deleteConversationMessageValidation,
      }),
      routeConfig('post', '/:conversationId/promote', {
        ...noAuth,
        handlerKey: 'promoteToGroup',
        validation: () => promoteConversationValidation,
      }),
    ];

    this.handlers = {
      sendDirectMessage: this.handleSendDirectMessage.bind(this),
      listConversations: this.handleListConversations.bind(this),
      getConversationMessages: this.handleGetConversationMessages.bind(this),
      deleteMessage: this.handleDeleteMessage.bind(this),
      promoteToGroup: this.handlePromoteToGroup.bind(this),
    };
  }

  /**
   * POST /
   * Send a direct message. Creates conversation if needed.
   * @requirements 1.1, 1.5
   */
  private async handleSendDirectMessage(req: unknown): Promise<{
    statusCode: number;
    response: ISendDirectMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { recipientId, content } = (req as SendDMRequestBody).body;

      if (!recipientId || !content) {
        return validationError('Missing required fields: recipientId, content');
      }

      const senderId = this.getMemberId(req);
      const service = this.getConversationService();
      const message = await service.sendMessage(senderId, recipientId, content);

      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: message,
          message: 'Message sent',
        } satisfies ISendDirectMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /
   * List conversations for the authenticated member.
   * @requirements 1.2
   */
  private async handleListConversations(req: unknown): Promise<{
    statusCode: number;
    response: IListConversationsResponse | ApiErrorResponse;
  }> {
    try {
      const { cursor, limit } = (req as ListConversationsQuery).query;
      const memberId = this.getMemberId(req);
      const service = this.getConversationService();

      const result = await service.listConversations(
        memberId,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: result,
          message: 'Conversations listed',
        } satisfies IListConversationsResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /:conversationId/messages
   * Get messages in a conversation (cursor-based pagination).
   * @requirements 1.3
   */
  private async handleGetConversationMessages(req: unknown): Promise<{
    statusCode: number;
    response: IGetMessagesResponse | ApiErrorResponse;
  }> {
    try {
      const { conversationId } = (req as GetMessagesParams).params;
      const { cursor, limit } = (req as GetMessagesParams).query;
      const memberId = this.getMemberId(req);
      const service = this.getConversationService();

      const result = await service.getMessages(
        conversationId,
        memberId,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: result,
          message: 'Messages retrieved',
        } satisfies IGetMessagesResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * DELETE /:conversationId/messages/:messageId
   * Delete a message authored by the requesting member.
   * @requirements 1.4
   */
  private async handleDeleteMessage(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { conversationId, messageId } = (req as DeleteMessageParams).params;
      const memberId = this.getMemberId(req);
      const service = this.getConversationService();

      await service.deleteMessage(conversationId, messageId, memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { deleted: true },
          message: 'Message deleted',
        } satisfies IDeleteMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * POST /:conversationId/promote
   * Promote a conversation to a group.
   * @requirements 2.1, 2.2, 2.3
   */
  private async handlePromoteToGroup(req: unknown): Promise<{
    statusCode: number;
    response: IPromoteToGroupResponse | ApiErrorResponse;
  }> {
    try {
      const { conversationId } = (req as PromoteParams).params;
      const { newMemberIds } = (req as PromoteParams).body;
      const memberId = this.getMemberId(req);
      const service = this.getConversationService();

      if (!newMemberIds || !Array.isArray(newMemberIds)) {
        return validationError('Missing required field: newMemberIds');
      }

      const group = await service.promoteToGroup(
        conversationId,
        newMemberIds,
        memberId,
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: group,
          message: 'Conversation promoted to group',
        } satisfies IPromoteToGroupResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * Map service-layer errors to appropriate HTTP responses.
   * Ensures uniform error format for blocked/non-existent members (Req 1.5).
   */
  private mapServiceError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof RecipientNotReachableError) {
      return notFoundError('Recipient', 'unknown');
    }
    if (error instanceof ConversationNotFoundError) {
      return notFoundError('Conversation', 'unknown');
    }
    if (error instanceof NotParticipantError) {
      return forbiddenError(error.message);
    }
    if (error instanceof MessageNotFoundError) {
      return notFoundError('Message', 'unknown');
    }
    if (error instanceof NotMessageAuthorError) {
      return forbiddenError(error.message);
    }
    if (error instanceof GroupPromotionNotConfiguredError) {
      return internalError(error);
    }
    return handleError(error);
  }
}

/**
 * Alias for DirectMessageController used by ApiRouter.
 * The router mounts this at /api/conversations.
 */
export { DirectMessageController as ConversationController };
