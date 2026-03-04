import {
  IMessagingService,
  IPaginationOptions,
  ISendMessageOptions,
  MessagingErrorCode,
  MessagingServiceError,
} from '@brightchain/brighthub-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IApiMessageResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../../interfaces/application';
import { IStatusCodeResponse } from '../../../interfaces/responses';
import {
  IConversationApiResponse,
  IConversationsApiResponse,
  IMessageApiResponse,
  IMessagesApiResponse,
} from '../../../interfaces/responses/brighthub';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type MessagingApiResponseType =
  | IConversationApiResponse
  | IConversationsApiResponse
  | IMessageApiResponse
  | IMessagesApiResponse
  | IApiMessageResponse
  | ApiErrorResponse;

interface IMessagingHandlers extends TypedHandlers {
  // Core (21.5)
  getConversations: ApiRequestHandler<
    IConversationsApiResponse | ApiErrorResponse
  >;
  createConversation: ApiRequestHandler<
    IConversationApiResponse | ApiErrorResponse
  >;
  getConversation: ApiRequestHandler<
    IConversationApiResponse | ApiErrorResponse
  >;
  deleteConversation: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  sendMessage: ApiRequestHandler<IMessageApiResponse | ApiErrorResponse>;
  editMessage: ApiRequestHandler<IMessageApiResponse | ApiErrorResponse>;
  deleteMessage: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  addReaction: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  removeReaction: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  markAsRead: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  sendTypingIndicator: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  // Additional (21.6)
  getMessageRequests: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  acceptMessageRequest: ApiRequestHandler<
    IConversationApiResponse | ApiErrorResponse
  >;
  declineMessageRequest: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  pinConversation: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  unpinConversation: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  archiveConversation: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  unarchiveConversation: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  muteConversation: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  unmuteConversation: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  reportMessage: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  searchInConversation: ApiRequestHandler<
    IMessagesApiResponse | ApiErrorResponse
  >;
  searchAllMessages: ApiRequestHandler<IMessagesApiResponse | ApiErrorResponse>;
  addParticipants: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  removeParticipant: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  updateGroupSettings: ApiRequestHandler<
    IConversationApiResponse | ApiErrorResponse
  >;
  forwardMessage: ApiRequestHandler<IMessageApiResponse | ApiErrorResponse>;
}

/**
 * Controller for BrightHub messaging operations.
 *
 * Provides REST API endpoints for conversations, messages, reactions,
 * read receipts, message requests, and group management.
 *
 * @requirements 45.1-45.28
 */
export class BrightHubMessagingController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  MessagingApiResponseType,
  IMessagingHandlers,
  CoreLanguageCode
> {
  private messagingService: IMessagingService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setMessagingService(service: IMessagingService): void {
    this.messagingService = service;
  }

  private getMessagingService(): IMessagingService {
    if (!this.messagingService)
      throw new Error('MessagingService not initialized');
    return this.messagingService;
  }

  private mapMessagingError(
    error: MessagingServiceError,
  ): IStatusCodeResponse<ApiErrorResponse> {
    switch (error.code) {
      case MessagingErrorCode.ConversationNotFound:
      case MessagingErrorCode.MessageNotFound:
      case MessagingErrorCode.MessageRequestNotFound:
      case MessagingErrorCode.ReactionNotFound:
        return notFoundError('Resource', 'unknown');
      case MessagingErrorCode.NotParticipant:
      case MessagingErrorCode.Unauthorized:
      case MessagingErrorCode.NotAdmin:
      case MessagingErrorCode.UserBlocked:
        return forbiddenError(error.message);
      case MessagingErrorCode.EmptyContent:
      case MessagingErrorCode.ContentTooLong:
      case MessagingErrorCode.TooManyAttachments:
      case MessagingErrorCode.AttachmentSizeTooLarge:
      case MessagingErrorCode.InvalidMediaFormat:
      case MessagingErrorCode.ReactionLimitExceeded:
      case MessagingErrorCode.ReactionAlreadyExists:
      case MessagingErrorCode.PinLimitExceeded:
      case MessagingErrorCode.AlreadyPinned:
      case MessagingErrorCode.NotPinned:
      case MessagingErrorCode.AlreadyArchived:
      case MessagingErrorCode.NotArchived:
      case MessagingErrorCode.AlreadyMuted:
      case MessagingErrorCode.NotMuted:
      case MessagingErrorCode.GroupParticipantLimitExceeded:
      case MessagingErrorCode.AlreadyParticipant:
      case MessagingErrorCode.InvalidGroupName:
      case MessagingErrorCode.ConversationAlreadyExists:
      case MessagingErrorCode.MessageRequestAlreadyExists:
      case MessagingErrorCode.MessageAlreadyDeleted:
      case MessagingErrorCode.EditWindowExpired:
      case MessagingErrorCode.LastAdminCannotLeave:
        return validationError(error.message);
      default:
        return handleError(error);
    }
  }

  private parsePaginationOptions(
    query: Record<string, string | undefined>,
  ): IPaginationOptions {
    const options: IPaginationOptions = {};
    if (query['cursor']) options.cursor = query['cursor'];
    if (query['limit']) options.limit = parseInt(query['limit'], 10);
    return options;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      // ── Core Messaging (21.5) ──
      routeConfig('get', '/conversations', {
        handlerKey: 'getConversations',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get conversations',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'ConversationsResponse',
              description: 'Conversations retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/conversations', {
        handlerKey: 'createConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Create a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            201: {
              schema: 'ConversationResponse',
              description: 'Conversation created',
            },
          },
        },
      }),
      routeConfig('get', '/conversations/:id', {
        handlerKey: 'getConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get a conversation with messages',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'ConversationResponse',
              description: 'Conversation retrieved',
            },
          },
        },
      }),
      routeConfig('delete', '/conversations/:id', {
        handlerKey: 'deleteConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            204: {
              schema: 'EmptyResponse',
              description: 'Conversation deleted',
            },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/messages', {
        handlerKey: 'sendMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Send a message',
          tags: ['BrightHub Messaging'],
          responses: {
            201: { schema: 'MessageResponse', description: 'Message sent' },
          },
        },
      }),
      routeConfig('put', '/:messageId', {
        handlerKey: 'editMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Edit a message',
          tags: ['BrightHub Messaging'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Message edited' },
          },
        },
      }),
      routeConfig('delete', '/:messageId', {
        handlerKey: 'deleteMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete a message',
          tags: ['BrightHub Messaging'],
          responses: {
            204: { schema: 'EmptyResponse', description: 'Message deleted' },
          },
        },
      }),
      routeConfig('post', '/:messageId/reactions', {
        handlerKey: 'addReaction',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Add a reaction to a message',
          tags: ['BrightHub Messaging'],
          responses: {
            201: { schema: 'ReactionResponse', description: 'Reaction added' },
          },
        },
      }),
      routeConfig('delete', '/:messageId/reactions/:emoji', {
        handlerKey: 'removeReaction',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Remove a reaction from a message',
          tags: ['BrightHub Messaging'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Reaction removed' },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/read', {
        handlerKey: 'markAsRead',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Mark messages as read',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'ReadReceiptResponse',
              description: 'Marked as read',
            },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/typing', {
        handlerKey: 'sendTypingIndicator',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Send typing indicator',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'TypingResponse',
              description: 'Typing indicator sent',
            },
          },
        },
      }),
      // ── Additional Messaging (21.6) ──
      routeConfig('get', '/requests', {
        handlerKey: 'getMessageRequests',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get message requests',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageRequestsResponse',
              description: 'Requests retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/requests/:id/accept', {
        handlerKey: 'acceptMessageRequest',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Accept a message request',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'ConversationResponse',
              description: 'Request accepted',
            },
          },
        },
      }),
      routeConfig('post', '/requests/:id/decline', {
        handlerKey: 'declineMessageRequest',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Decline a message request',
          tags: ['BrightHub Messaging'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Request declined' },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/pin', {
        handlerKey: 'pinConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Pin a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Conversation pinned',
            },
          },
        },
      }),
      routeConfig('delete', '/conversations/:id/pin', {
        handlerKey: 'unpinConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unpin a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Conversation unpinned',
            },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/archive', {
        handlerKey: 'archiveConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Archive a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Conversation archived',
            },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/unarchive', {
        handlerKey: 'unarchiveConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unarchive a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Conversation unarchived',
            },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/mute', {
        handlerKey: 'muteConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Mute a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Conversation muted',
            },
          },
        },
      }),
      routeConfig('delete', '/conversations/:id/mute', {
        handlerKey: 'unmuteConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unmute a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Conversation unmuted',
            },
          },
        },
      }),
      routeConfig('post', '/:messageId/report', {
        handlerKey: 'reportMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Report a message',
          tags: ['BrightHub Messaging'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Message reported' },
          },
        },
      }),
      routeConfig('get', '/conversations/:id/search', {
        handlerKey: 'searchInConversation',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Search within a conversation',
          tags: ['BrightHub Messaging'],
          responses: {
            200: { schema: 'MessagesResponse', description: 'Search results' },
          },
        },
      }),
      routeConfig('get', '/search', {
        handlerKey: 'searchAllMessages',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Search all conversations',
          tags: ['BrightHub Messaging'],
          responses: {
            200: { schema: 'MessagesResponse', description: 'Search results' },
          },
        },
      }),
      routeConfig('post', '/conversations/:id/participants', {
        handlerKey: 'addParticipants',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Add participants to group',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Participants added',
            },
          },
        },
      }),
      routeConfig('delete', '/conversations/:id/participants/:userId', {
        handlerKey: 'removeParticipant',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Remove a participant from group',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Participant removed',
            },
          },
        },
      }),
      routeConfig('put', '/conversations/:id/settings', {
        handlerKey: 'updateGroupSettings',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Update group settings',
          tags: ['BrightHub Messaging'],
          responses: {
            200: {
              schema: 'ConversationResponse',
              description: 'Settings updated',
            },
          },
        },
      }),
      routeConfig('post', '/:messageId/forward', {
        handlerKey: 'forwardMessage',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Forward a message',
          tags: ['BrightHub Messaging'],
          responses: {
            201: {
              schema: 'MessageResponse',
              description: 'Message forwarded',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brighthub/messages',
      'BrightHubMessagingController',
      this.routeDefinitions,
    );

    this.handlers = {
      getConversations: this.handleGetConversations.bind(this),
      createConversation: this.handleCreateConversation.bind(this),
      getConversation: this.handleGetConversation.bind(this),
      deleteConversation: this.handleDeleteConversation.bind(this),
      sendMessage: this.handleSendMessage.bind(this),
      editMessage: this.handleEditMessage.bind(this),
      deleteMessage: this.handleDeleteMessage.bind(this),
      addReaction: this.handleAddReaction.bind(this),
      removeReaction: this.handleRemoveReaction.bind(this),
      markAsRead: this.handleMarkAsRead.bind(this),
      sendTypingIndicator: this.handleSendTypingIndicator.bind(this),
      getMessageRequests: this.handleGetMessageRequests.bind(this),
      acceptMessageRequest: this.handleAcceptMessageRequest.bind(this),
      declineMessageRequest: this.handleDeclineMessageRequest.bind(this),
      pinConversation: this.handlePinConversation.bind(this),
      unpinConversation: this.handleUnpinConversation.bind(this),
      archiveConversation: this.handleArchiveConversation.bind(this),
      unarchiveConversation: this.handleUnarchiveConversation.bind(this),
      muteConversation: this.handleMuteConversation.bind(this),
      unmuteConversation: this.handleUnmuteConversation.bind(this),
      reportMessage: this.handleReportMessage.bind(this),
      searchInConversation: this.handleSearchInConversation.bind(this),
      searchAllMessages: this.handleSearchAllMessages.bind(this),
      addParticipants: this.handleAddParticipants.bind(this),
      removeParticipant: this.handleRemoveParticipant.bind(this),
      updateGroupSettings: this.handleUpdateGroupSettings.bind(this),
      forwardMessage: this.handleForwardMessage.bind(this),
    };
  }

  // ═══════════════════════════════════════════════════════
  // Core Messaging Handlers (21.5)
  // ═══════════════════════════════════════════════════════

  private async handleGetConversations(
    req: unknown,
  ): Promise<
    IStatusCodeResponse<IConversationsApiResponse | ApiErrorResponse>
  > {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getMessagingService().getConversations(
        userId,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            conversations: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleCreateConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IConversationApiResponse | ApiErrorResponse>> {
    try {
      const { userId, otherUserId, participantIds, type, name, avatarUrl } = (
        req as {
          body: {
            userId: string;
            otherUserId?: string;
            participantIds?: string[];
            type?: string;
            name?: string;
            avatarUrl?: string;
          };
        }
      ).body;
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getMessagingService();
      if (type === 'group') {
        if (!participantIds || !Array.isArray(participantIds))
          return validationError('Missing required field: participantIds');
        if (!name)
          return validationError(
            'Missing required field: name for group conversation',
          );
        const conversation = await service.createGroupConversation(
          userId,
          participantIds,
          { name, avatarUrl },
        );
        return {
          statusCode: 201,
          response: {
            message: 'Group conversation created',
            data: conversation,
          },
        };
      } else {
        if (!otherUserId)
          return validationError('Missing required field: otherUserId');
        const conversation = await service.createDirectConversation(
          userId,
          otherUserId,
        );
        return {
          statusCode: 201,
          response: { message: 'Conversation created', data: conversation },
        };
      }
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleGetConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IConversationApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const userId = typedReq.query['userId'];
      if (!id) return validationError('Missing required parameter: id');
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const conversation = await this.getMessagingService().getConversation(
        id,
        userId,
      );
      return {
        statusCode: 200,
        response: { message: 'OK', data: conversation },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleDeleteConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().deleteConversation(id, userId);
      return { statusCode: 204, response: { message: 'Conversation deleted' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleSendMessage(
    req: unknown,
  ): Promise<IStatusCodeResponse<IMessageApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const {
        senderId,
        content,
        attachments,
        replyToMessageId,
        forwardedFromId,
      } = (
        req as {
          body: {
            senderId: string;
            content: string;
            attachments?: unknown[];
            replyToMessageId?: string;
            forwardedFromId?: string;
          };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!senderId) return validationError('Missing required field: senderId');
      if (content === undefined || content === null)
        return validationError('Missing required field: content');

      const options: ISendMessageOptions = {};
      if (attachments) options.attachments = attachments as never;
      if (replyToMessageId) options.replyToMessageId = replyToMessageId;
      if (forwardedFromId) options.forwardedFromId = forwardedFromId;

      const message = await this.getMessagingService().sendMessage(
        id,
        senderId,
        content,
        options,
      );
      return {
        statusCode: 201,
        response: { message: 'Message sent', data: message },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleEditMessage(
    req: unknown,
  ): Promise<IStatusCodeResponse<IMessageApiResponse | ApiErrorResponse>> {
    try {
      const { messageId } = (req as { params: { messageId: string } }).params;
      const { userId, content } = (
        req as {
          body: { userId: string; content: string };
          params: { messageId: string };
        }
      ).body;
      if (!messageId)
        return validationError('Missing required parameter: messageId');
      if (!userId) return validationError('Missing required field: userId');
      if (content === undefined || content === null)
        return validationError('Missing required field: content');

      const message = await this.getMessagingService().editMessage(
        messageId,
        userId,
        content,
      );
      return {
        statusCode: 200,
        response: { message: 'Message edited', data: message },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleDeleteMessage(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { messageId } = (req as { params: { messageId: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { messageId: string } }
      ).body;
      if (!messageId)
        return validationError('Missing required parameter: messageId');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().deleteMessage(messageId, userId);
      return { statusCode: 204, response: { message: 'Message deleted' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleAddReaction(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { messageId } = (req as { params: { messageId: string } }).params;
      const { userId, emoji } = (
        req as {
          body: { userId: string; emoji: string };
          params: { messageId: string };
        }
      ).body;
      if (!messageId)
        return validationError('Missing required parameter: messageId');
      if (!userId) return validationError('Missing required field: userId');
      if (!emoji) return validationError('Missing required field: emoji');

      const reaction = await this.getMessagingService().addReaction(
        messageId,
        userId,
        emoji,
      );
      return {
        statusCode: 201,
        response: {
          message: 'Reaction added',
          data: reaction,
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleRemoveReaction(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { messageId, emoji } = (
        req as { params: { messageId: string; emoji: string } }
      ).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { messageId: string; emoji: string };
      };
      const userId = typedReq.query['userId'];
      if (!messageId)
        return validationError('Missing required parameter: messageId');
      if (!emoji) return validationError('Missing required parameter: emoji');
      if (!userId)
        return validationError('Missing required query parameter: userId');

      await this.getMessagingService().removeReaction(
        messageId,
        userId,
        decodeURIComponent(emoji),
      );
      return { statusCode: 200, response: { message: 'Reaction removed' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleMarkAsRead(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, messageId } = (
        req as {
          body: { userId: string; messageId: string };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (!messageId)
        return validationError('Missing required field: messageId');

      const receipt = await this.getMessagingService().markAsRead(
        id,
        userId,
        messageId,
      );
      return {
        statusCode: 200,
        response: {
          message: 'Marked as read',
          data: receipt,
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleSendTypingIndicator(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const result = await this.getMessagingService().sendTypingIndicator(
        id,
        userId,
      );
      return {
        statusCode: 200,
        response: {
          message: 'Typing indicator sent',
          data: result,
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  // ═══════════════════════════════════════════════════════
  // Additional Messaging Handlers (21.6)
  // ═══════════════════════════════════════════════════════

  private async handleGetMessageRequests(
    _req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    // Message requests are created via createMessageRequest on the service.
    // Listing them requires a dedicated query method not yet on the interface.
    // Return a placeholder until the service method is available.
    return {
      statusCode: 200,
      response: {
        message: 'OK',
        data: { items: [], hasMore: false },
      } as IApiMessageResponse,
    };
  }

  private async handleAcceptMessageRequest(
    req: unknown,
  ): Promise<IStatusCodeResponse<IConversationApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const conversation =
        await this.getMessagingService().acceptMessageRequest(id, userId);
      return {
        statusCode: 200,
        response: { message: 'Message request accepted', data: conversation },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleDeclineMessageRequest(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().declineMessageRequest(id, userId);
      return {
        statusCode: 200,
        response: { message: 'Message request declined' },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handlePinConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().pinConversation(id, userId);
      return { statusCode: 200, response: { message: 'Conversation pinned' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleUnpinConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const userId = typedReq.query['userId'];
      if (!id) return validationError('Missing required parameter: id');
      if (!userId)
        return validationError('Missing required query parameter: userId');

      await this.getMessagingService().unpinConversation(id, userId);
      return {
        statusCode: 200,
        response: { message: 'Conversation unpinned' },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleArchiveConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().archiveConversation(id, userId);
      return {
        statusCode: 200,
        response: { message: 'Conversation archived' },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleUnarchiveConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().unarchiveConversation(id, userId);
      return {
        statusCode: 200,
        response: { message: 'Conversation unarchived' },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleMuteConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, expiresAt } = (
        req as {
          body: { userId: string; expiresAt?: string };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getMessagingService().muteConversation(id, userId, expiresAt);
      return { statusCode: 200, response: { message: 'Conversation muted' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleUnmuteConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const userId = typedReq.query['userId'];
      if (!id) return validationError('Missing required parameter: id');
      if (!userId)
        return validationError('Missing required query parameter: userId');

      await this.getMessagingService().unmuteConversation(id, userId);
      return { statusCode: 200, response: { message: 'Conversation unmuted' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleReportMessage(
    _req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    // Message reporting requires a dedicated service method not yet on the interface.
    // Return acknowledgment for now.
    return { statusCode: 200, response: { message: 'Message reported' } };
  }

  private async handleSearchInConversation(
    req: unknown,
  ): Promise<IStatusCodeResponse<IMessagesApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const userId = typedReq.query['userId'];
      const query = typedReq.query['q'];
      if (!id) return validationError('Missing required parameter: id');
      if (!userId)
        return validationError('Missing required query parameter: userId');
      if (!query) return validationError('Missing required query parameter: q');

      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getMessagingService().searchInConversation(
        id,
        userId,
        query,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            messages: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleSearchAllMessages(
    req: unknown,
  ): Promise<IStatusCodeResponse<IMessagesApiResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      const query = typedReq.query['q'];
      if (!userId)
        return validationError('Missing required query parameter: userId');
      if (!query) return validationError('Missing required query parameter: q');

      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getMessagingService().searchMessages(
        userId,
        query,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            messages: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleAddParticipants(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { adminId, userIds } = (
        req as {
          body: { adminId: string; userIds: string[] };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!adminId) return validationError('Missing required field: adminId');
      if (!userIds || !Array.isArray(userIds))
        return validationError('Missing required field: userIds (array)');

      await this.getMessagingService().addParticipants(id, adminId, userIds);
      return { statusCode: 200, response: { message: 'Participants added' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleRemoveParticipant(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id, userId: targetUserId } = (
        req as { params: { id: string; userId: string } }
      ).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string; userId: string };
      };
      const adminId = typedReq.query['adminId'];
      if (!id) return validationError('Missing required parameter: id');
      if (!targetUserId)
        return validationError('Missing required parameter: userId');
      if (!adminId)
        return validationError('Missing required query parameter: adminId');

      await this.getMessagingService().removeParticipant(
        id,
        adminId,
        targetUserId,
      );
      return { statusCode: 200, response: { message: 'Participant removed' } };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleUpdateGroupSettings(
    req: unknown,
  ): Promise<IStatusCodeResponse<IConversationApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { adminId, name, avatarUrl } = (
        req as {
          body: { adminId: string; name?: string; avatarUrl?: string };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!adminId) return validationError('Missing required field: adminId');

      const updates: { name?: string; avatarUrl?: string } = {};
      if (name !== undefined) updates.name = name;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

      const conversation = await this.getMessagingService().updateGroupSettings(
        id,
        adminId,
        updates,
      );
      return {
        statusCode: 200,
        response: { message: 'Group settings updated', data: conversation },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }

  private async handleForwardMessage(
    req: unknown,
  ): Promise<IStatusCodeResponse<IMessageApiResponse | ApiErrorResponse>> {
    try {
      const { messageId } = (req as { params: { messageId: string } }).params;
      const { userId, targetConversationId } = (
        req as {
          body: { userId: string; targetConversationId: string };
          params: { messageId: string };
        }
      ).body;
      if (!messageId)
        return validationError('Missing required parameter: messageId');
      if (!userId) return validationError('Missing required field: userId');
      if (!targetConversationId)
        return validationError('Missing required field: targetConversationId');

      // Forward by sending a new message with forwardedFromId
      const message = await this.getMessagingService().sendMessage(
        targetConversationId,
        userId,
        '',
        { forwardedFromId: messageId },
      );
      return {
        statusCode: 201,
        response: { message: 'Message forwarded', data: message },
      };
    } catch (error) {
      if (error instanceof MessagingServiceError)
        return this.mapMessagingError(error);
      return handleError(error);
    }
  }
}
