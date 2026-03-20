import type { BrightDb } from '@brightchain/db';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminChatApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminChatHandlers extends TypedHandlers {
  listConversations: ApiRequestHandler<AdminChatApiResponse>;
  listMessages: ApiRequestHandler<AdminChatApiResponse>;
  deleteMessage: ApiRequestHandler<AdminChatApiResponse>;
}

/**
 * Admin-only BrightChat conversation/message management controller.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/chat/conversations
 * Paginated conversation list.
 *
 * ### GET /api/admin/chat/conversations/:conversationId/messages
 * Paginated message list for a conversation.
 *
 * ### DELETE /api/admin/chat/messages/:messageId
 * Soft-delete a message.
 *
 * @requirements 15.2, 15.3, 15.4
 */
export class AdminChatController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminChatApiResponse,
  AdminChatHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/conversations', {
        handlerKey: 'listConversations',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/conversations/:conversationId/messages', {
        handlerKey: 'listMessages',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/messages/:messageId', {
        handlerKey: 'deleteMessage',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listConversations: this.handleListConversations.bind(this),
      listMessages: this.handleListMessages.bind(this),
      deleteMessage: this.handleDeleteMessage.bind(this),
    };
  }

  /**
   * GET /api/admin/chat/conversations?page=1&limit=20
   */
  private async handleListConversations(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatApiResponse }> {
    try {
      const request = req as {
        query?: { page?: string; limit?: string };
      };
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );

      // Admin bypass: go directly to DB for admin-level operations
      // (domain services require memberId for user-scoped access)
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('conversations');
        const total = await collection.countDocuments();
        const skip = (page - 1) * limit;
        const docs = await collection.find().skip(skip).limit(limit).toArray();

        const conversations = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          participantCount: Array.isArray(doc['participants'])
            ? (doc['participants'] as unknown[]).length
            : 0,
          messageCount: doc['messageCount'] ?? 0,
          createdAt: doc['createdAt'] ?? null,
          lastActivityAt: doc['lastActivityAt'] ?? null,
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            conversations,
            total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          conversations: [],
          total: 0,
          page,
          limit,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/admin/chat/conversations/:conversationId/messages?page=1&limit=20
   */
  private async handleListMessages(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatApiResponse }> {
    try {
      const request = req as {
        params?: { conversationId?: string };
        query?: { page?: string; limit?: string };
      };
      const conversationId = request.params?.conversationId;
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );

      if (!conversationId) {
        return validationError('conversationId is required');
      }

      // Admin bypass: go directly to DB for admin-level operations
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('messages');
        const filter = { conversationId };
        const total = await collection.countDocuments(filter);
        const skip = (page - 1) * limit;
        const docs = await collection
          .find(filter)
          .skip(skip)
          .limit(limit)
          .toArray();

        const messages = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          senderId: doc['senderId'] ?? '',
          contentPreview: String(doc['content'] ?? '').slice(0, 200),
          createdAt: doc['createdAt'] ?? null,
          isDeleted: doc['isDeleted'] ?? false,
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            messages,
            total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          messages: [],
          total: 0,
          page,
          limit,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /api/admin/chat/messages/:messageId
   * Soft-delete a message.
   */
  private async handleDeleteMessage(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatApiResponse }> {
    try {
      const request = req as { params?: { messageId?: string } };
      const messageId = request.params?.messageId;

      if (!messageId) {
        return validationError('messageId is required');
      }

      // Admin bypass: go directly to DB for admin-level operations
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('messages');
        const result = await collection.updateOne(
          { _id: messageId },
          { $set: { isDeleted: true } },
        );
        if (result.matchedCount === 0) {
          return notFoundError('Message', messageId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Message deleted successfully',
          } as IApiMessageResponse,
        };
      }

      return notFoundError('Message', messageId);
    } catch (error) {
      return handleError(error);
    }
  }
}
