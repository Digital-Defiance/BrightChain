/**
 * ChannelController — REST API for channel management.
 *
 * Routes:
 *   POST   /                                         — Create a channel
 *   GET    /                                         — List discoverable channels
 *   GET    /:channelId                               — Get channel metadata
 *   PUT    /:channelId                               — Update channel settings
 *   DELETE /:channelId                               — Delete channel
 *   POST   /:channelId/join                          — Join a channel
 *   POST   /:channelId/leave                         — Leave a channel
 *   POST   /:channelId/messages                      — Send message
 *   GET    /:channelId/messages                      — Get message history
 *   GET    /:channelId/messages/search               — Search messages
 *   POST   /:channelId/invites                       — Generate invite token
 *   POST   /:channelId/invites/:token/redeem         — Redeem invite token
 *   PUT    /:channelId/roles/:memberId               — Assign role
 *   POST   /:channelId/messages/:messageId/reactions  — Add reaction
 *   DELETE /:channelId/messages/:messageId/reactions/:reactionId — Remove reaction
 *   PUT    /:channelId/messages/:messageId            — Edit message
 *   POST   /:channelId/messages/:messageId/pin        — Pin message
 *   DELETE /:channelId/messages/:messageId/pin        — Unpin message
 *   POST   /:channelId/mute/:memberId                — Mute a member
 *   POST   /:channelId/kick/:memberId                — Kick a member
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  ChannelVisibility,
  DefaultRole,
  IAddReactionResponse,
  IAssignRoleResponse,
  ICreateChannelResponse,
  ICreateInviteResponse,
  IDeleteChannelResponse,
  IEditMessageResponse,
  IGetChannelMessagesResponse,
  IGetChannelResponse,
  IJoinChannelResponse,
  IKickChannelMemberResponse,
  ILeaveChannelResponse,
  IListChannelsResponse,
  IMuteChannelMemberResponse,
  IPinMessageResponse,
  IRedeemInviteResponse,
  IRemoveReactionResponse,
  ISearchMessagesResponse,
  ISendChannelMessageResponse,
  IUnpinMessageResponse,
  IUpdateChannelResponse,
} from '@brightchain/brightchain-lib';
import {
  ChannelJoinDeniedError,
  ChannelMemberMutedError,
  ChannelMessageNotFoundError,
  ChannelNameConflictError,
  ChannelNotFoundError,
  ChannelPermissionError,
  ChannelReactionNotFoundError,
  ChannelService,
  InviteTokenExpiredError,
  InviteTokenNotFoundError,
  MemberAlreadyInChannelError,
  NotChannelMemberError,
  NotMessageAuthorError,
} from '@brightchain/brightchain-lib/lib/services/communication/channelService';
import { PermissionService } from '@brightchain/brightchain-lib/lib/services/communication/permissionService';
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
  addChannelReactionValidation,
  assignChannelRoleValidation,
  channelIdParamValidation,
  createChannelValidation,
  createInviteValidation,
  editChannelMessageValidation,
  getChannelMessagesValidation,
  joinChannelValidation,
  kickChannelMemberValidation,
  leaveChannelValidation,
  listChannelsValidation,
  muteChannelMemberValidation,
  pinChannelMessageValidation,
  redeemInviteValidation,
  removeChannelReactionValidation,
  searchChannelMessagesValidation,
  sendChannelMessageValidation,
  updateChannelValidation,
} from '../../utils/communicationValidation';
import {
  forbiddenError,
  handleError,
  internalError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type ChannelApiResponse =
  | ICreateChannelResponse
  | IListChannelsResponse
  | IGetChannelResponse
  | IUpdateChannelResponse
  | IDeleteChannelResponse
  | IJoinChannelResponse
  | ILeaveChannelResponse
  | ISendChannelMessageResponse
  | IGetChannelMessagesResponse
  | ISearchMessagesResponse
  | ICreateInviteResponse
  | IRedeemInviteResponse
  | IAssignRoleResponse
  | IAddReactionResponse
  | IRemoveReactionResponse
  | IEditMessageResponse
  | IPinMessageResponse
  | IUnpinMessageResponse
  | IMuteChannelMemberResponse
  | IKickChannelMemberResponse
  | ApiErrorResponse;

interface ChannelHandlers extends TypedHandlers {
  createChannel: ApiRequestHandler<ICreateChannelResponse | ApiErrorResponse>;
  listChannels: ApiRequestHandler<IListChannelsResponse | ApiErrorResponse>;
  getChannel: ApiRequestHandler<IGetChannelResponse | ApiErrorResponse>;
  updateChannel: ApiRequestHandler<IUpdateChannelResponse | ApiErrorResponse>;
  deleteChannel: ApiRequestHandler<IDeleteChannelResponse | ApiErrorResponse>;
  joinChannel: ApiRequestHandler<IJoinChannelResponse | ApiErrorResponse>;
  leaveChannel: ApiRequestHandler<ILeaveChannelResponse | ApiErrorResponse>;
  sendMessage: ApiRequestHandler<
    ISendChannelMessageResponse | ApiErrorResponse
  >;
  getMessages: ApiRequestHandler<
    IGetChannelMessagesResponse | ApiErrorResponse
  >;
  searchMessages: ApiRequestHandler<ISearchMessagesResponse | ApiErrorResponse>;
  createInvite: ApiRequestHandler<ICreateInviteResponse | ApiErrorResponse>;
  redeemInvite: ApiRequestHandler<IRedeemInviteResponse | ApiErrorResponse>;
  assignRole: ApiRequestHandler<IAssignRoleResponse | ApiErrorResponse>;
  addReaction: ApiRequestHandler<IAddReactionResponse | ApiErrorResponse>;
  removeReaction: ApiRequestHandler<IRemoveReactionResponse | ApiErrorResponse>;
  editMessage: ApiRequestHandler<IEditMessageResponse | ApiErrorResponse>;
  pinMessage: ApiRequestHandler<IPinMessageResponse | ApiErrorResponse>;
  unpinMessage: ApiRequestHandler<IUnpinMessageResponse | ApiErrorResponse>;
  muteMember: ApiRequestHandler<IMuteChannelMemberResponse | ApiErrorResponse>;
  kickMember: ApiRequestHandler<IKickChannelMemberResponse | ApiErrorResponse>;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface CreateChannelBody {
  body: {
    name?: string;
    topic?: string;
    visibility?: ChannelVisibility;
    memberId?: string;
  };
}

interface ChannelIdParams {
  params: { channelId: string };
  query: { memberId?: string };
}

interface UpdateChannelBody {
  params: { channelId: string };
  body: {
    name?: string;
    topic?: string;
    visibility?: ChannelVisibility;
    historyVisibleToNewMembers?: boolean;
    memberId?: string;
  };
  query: { memberId?: string };
}

interface SendMessageBody {
  params: { channelId: string };
  body: { content?: string; memberId?: string };
  query: { memberId?: string };
}

interface GetMessagesQuery {
  params: { channelId: string };
  query: { cursor?: string; limit?: string; memberId?: string };
}

interface SearchMessagesQuery {
  params: { channelId: string };
  query: { query?: string; cursor?: string; limit?: string; memberId?: string };
}

interface CreateInviteBody {
  params: { channelId: string };
  body: { maxUses?: number; expiresInMs?: number; memberId?: string };
  query: { memberId?: string };
}

interface RedeemInviteParams {
  params: { channelId: string; token: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

interface AssignRoleBody {
  params: { channelId: string; memberId: string };
  body: { role?: DefaultRole; requesterId?: string };
  query: { memberId?: string };
}

interface ReactionBody {
  params: { channelId: string; messageId: string };
  body: { emoji?: string; memberId?: string };
  query: { memberId?: string };
}

interface RemoveReactionParams {
  params: { channelId: string; messageId: string; reactionId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

interface EditMessageBody {
  params: { channelId: string; messageId: string };
  body: { content?: string; memberId?: string };
  query: { memberId?: string };
}

interface PinParams {
  params: { channelId: string; messageId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

interface MuteBody {
  params: { channelId: string; memberId: string };
  body: { durationMs?: number; requesterId?: string };
  query: { memberId?: string };
}

interface KickParams {
  params: { channelId: string; memberId: string };
  body: { requesterId?: string };
  query: { memberId?: string };
}

interface ListChannelsQuery {
  query: { cursor?: string; limit?: string; memberId?: string };
}

interface JoinLeaveBody {
  params: { channelId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

/**
 * Controller for channel operations.
 *
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class ChannelController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  ChannelApiResponse,
  ChannelHandlers,
  CoreLanguageCode
> {
  private channelService: ChannelService | null = null;
  private permissionService: PermissionService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setChannelService(service: ChannelService): void {
    this.channelService = service;
  }

  public setPermissionService(service: PermissionService): void {
    this.permissionService = service;
  }

  private getChannelService(): ChannelService {
    if (!this.channelService) {
      throw new Error('ChannelService not initialized');
    }
    return this.channelService;
  }

  private getPermissionService(): PermissionService {
    if (!this.permissionService) {
      throw new Error('PermissionService not initialized');
    }
    return this.permissionService;
  }

  /**
   * Extract the authenticated member ID from the request.
   * Falls back to body/query memberId for testing.
   */
  private getMemberId(req: unknown): string {
    const body = (req as CreateChannelBody).body;
    if (body && typeof body === 'object') {
      const bodyRecord = body as Record<string, unknown>;
      if (typeof bodyRecord['memberId'] === 'string')
        return bodyRecord['memberId'];
      if (typeof bodyRecord['requesterId'] === 'string')
        return bodyRecord['requesterId'];
    }
    const query = (req as ChannelIdParams).query;
    if (query && typeof query.memberId === 'string') return query.memberId;

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
        handlerKey: 'createChannel',
        validation: () => createChannelValidation,
      }),
      routeConfig('get', '/', {
        ...noAuth,
        handlerKey: 'listChannels',
        validation: () => listChannelsValidation,
      }),
      routeConfig('get', '/:channelId', {
        ...noAuth,
        handlerKey: 'getChannel',
        validation: () => channelIdParamValidation,
      }),
      routeConfig('put', '/:channelId', {
        ...noAuth,
        handlerKey: 'updateChannel',
        validation: () => updateChannelValidation,
      }),
      routeConfig('delete', '/:channelId', {
        ...noAuth,
        handlerKey: 'deleteChannel',
        validation: () => channelIdParamValidation,
      }),
      routeConfig('post', '/:channelId/join', {
        ...noAuth,
        handlerKey: 'joinChannel',
        validation: () => joinChannelValidation,
      }),
      routeConfig('post', '/:channelId/leave', {
        ...noAuth,
        handlerKey: 'leaveChannel',
        validation: () => leaveChannelValidation,
      }),
      routeConfig('post', '/:channelId/messages', {
        ...noAuth,
        handlerKey: 'sendMessage',
        validation: () => sendChannelMessageValidation,
      }),
      routeConfig('get', '/:channelId/messages', {
        ...noAuth,
        handlerKey: 'getMessages',
        validation: () => getChannelMessagesValidation,
      }),
      routeConfig('get', '/:channelId/messages/search', {
        ...noAuth,
        handlerKey: 'searchMessages',
        validation: () => searchChannelMessagesValidation,
      }),
      routeConfig('post', '/:channelId/invites', {
        ...noAuth,
        handlerKey: 'createInvite',
        validation: () => createInviteValidation,
      }),
      routeConfig('post', '/:channelId/invites/:token/redeem', {
        ...noAuth,
        handlerKey: 'redeemInvite',
        validation: () => redeemInviteValidation,
      }),
      routeConfig('put', '/:channelId/roles/:memberId', {
        ...noAuth,
        handlerKey: 'assignRole',
        validation: () => assignChannelRoleValidation,
      }),
      routeConfig('post', '/:channelId/messages/:messageId/reactions', {
        ...noAuth,
        handlerKey: 'addReaction',
        validation: () => addChannelReactionValidation,
      }),
      routeConfig(
        'delete',
        '/:channelId/messages/:messageId/reactions/:reactionId',
        {
          ...noAuth,
          handlerKey: 'removeReaction',
          validation: () => removeChannelReactionValidation,
        },
      ),
      routeConfig('put', '/:channelId/messages/:messageId', {
        ...noAuth,
        handlerKey: 'editMessage',
        validation: () => editChannelMessageValidation,
      }),
      routeConfig('post', '/:channelId/messages/:messageId/pin', {
        ...noAuth,
        handlerKey: 'pinMessage',
        validation: () => pinChannelMessageValidation,
      }),
      routeConfig('delete', '/:channelId/messages/:messageId/pin', {
        ...noAuth,
        handlerKey: 'unpinMessage',
        validation: () => pinChannelMessageValidation,
      }),
      routeConfig('post', '/:channelId/mute/:memberId', {
        ...noAuth,
        handlerKey: 'muteMember',
        validation: () => muteChannelMemberValidation,
      }),
      routeConfig('post', '/:channelId/kick/:memberId', {
        ...noAuth,
        handlerKey: 'kickMember',
        validation: () => kickChannelMemberValidation,
      }),
    ];

    this.handlers = {
      createChannel: this.handleCreateChannel.bind(this),
      listChannels: this.handleListChannels.bind(this),
      getChannel: this.handleGetChannel.bind(this),
      updateChannel: this.handleUpdateChannel.bind(this),
      deleteChannel: this.handleDeleteChannel.bind(this),
      joinChannel: this.handleJoinChannel.bind(this),
      leaveChannel: this.handleLeaveChannel.bind(this),
      sendMessage: this.handleSendMessage.bind(this),
      getMessages: this.handleGetMessages.bind(this),
      searchMessages: this.handleSearchMessages.bind(this),
      createInvite: this.handleCreateInvite.bind(this),
      redeemInvite: this.handleRedeemInvite.bind(this),
      assignRole: this.handleAssignRole.bind(this),
      addReaction: this.handleAddReaction.bind(this),
      removeReaction: this.handleRemoveReaction.bind(this),
      editMessage: this.handleEditMessage.bind(this),
      pinMessage: this.handlePinMessage.bind(this),
      unpinMessage: this.handleUnpinMessage.bind(this),
      muteMember: this.handleMuteMember.bind(this),
      kickMember: this.handleKickMember.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /** POST / — Create a channel. @requirements 4.1 */
  private async handleCreateChannel(req: unknown): Promise<{
    statusCode: number;
    response: ICreateChannelResponse | ApiErrorResponse;
  }> {
    try {
      const { name, topic, visibility } = (req as CreateChannelBody).body;
      if (!name || !visibility) {
        return validationError('Missing required fields: name, visibility');
      }
      const memberId = this.getMemberId(req);
      const channel = await this.getChannelService().createChannel(
        name,
        memberId,
        visibility,
        topic,
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: channel,
          message: 'Channel created',
        } satisfies ICreateChannelResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET / — List discoverable channels. @requirements 4.3, 5.1 */
  private async handleListChannels(req: unknown): Promise<{
    statusCode: number;
    response: IListChannelsResponse | ApiErrorResponse;
  }> {
    try {
      const { cursor, limit } = (req as ListChannelsQuery).query;
      const memberId = this.getMemberId(req);
      const result = await this.getChannelService().listChannels(
        memberId,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: result,
          message: 'Channels listed',
        } satisfies IListChannelsResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:channelId — Get channel metadata. */
  private async handleGetChannel(req: unknown): Promise<{
    statusCode: number;
    response: IGetChannelResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as ChannelIdParams).params;
      const memberId = this.getMemberId(req);
      const channel = await this.getChannelService().getChannel(
        channelId,
        memberId,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: channel,
          message: 'Channel retrieved',
        } satisfies IGetChannelResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** PUT /:channelId — Update channel settings. @requirements 5.2 */
  private async handleUpdateChannel(req: unknown): Promise<{
    statusCode: number;
    response: IUpdateChannelResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as UpdateChannelBody).params;
      const { name, topic, visibility, historyVisibleToNewMembers } = (
        req as UpdateChannelBody
      ).body;
      const memberId = this.getMemberId(req);
      const channel = await this.getChannelService().updateChannel(
        channelId,
        memberId,
        { name, topic, visibility, historyVisibleToNewMembers },
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: channel,
          message: 'Channel updated',
        } satisfies IUpdateChannelResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:channelId — Delete channel. */
  private async handleDeleteChannel(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteChannelResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as ChannelIdParams).params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().deleteChannel(channelId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { deleted: true },
          message: 'Channel deleted',
        } satisfies IDeleteChannelResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/join — Join a channel. @requirements 4.4, 4.5 */
  private async handleJoinChannel(req: unknown): Promise<{
    statusCode: number;
    response: IJoinChannelResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as JoinLeaveBody).params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().joinChannel(channelId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { joined: true },
          message: 'Joined channel',
        } satisfies IJoinChannelResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/leave — Leave a channel. */
  private async handleLeaveChannel(req: unknown): Promise<{
    statusCode: number;
    response: ILeaveChannelResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as JoinLeaveBody).params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().leaveChannel(channelId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { left: true },
          message: 'Left channel',
        } satisfies ILeaveChannelResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/messages — Send message. @requirements 4.2 */
  private async handleSendMessage(req: unknown): Promise<{
    statusCode: number;
    response: ISendChannelMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as SendMessageBody).params;
      const { content } = (req as SendMessageBody).body;
      if (!content) {
        return validationError('Missing required field: content');
      }
      const memberId = this.getMemberId(req);
      const message = await this.getChannelService().sendMessage(
        channelId,
        memberId,
        content,
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: message,
          message: 'Message sent',
        } satisfies ISendChannelMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:channelId/messages — Get message history. */
  private async handleGetMessages(req: unknown): Promise<{
    statusCode: number;
    response: IGetChannelMessagesResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as GetMessagesQuery).params;
      const { cursor, limit } = (req as GetMessagesQuery).query;
      const memberId = this.getMemberId(req);
      const result = await this.getChannelService().getMessages(
        channelId,
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
        } satisfies IGetChannelMessagesResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:channelId/messages/search — Search messages. */
  private async handleSearchMessages(req: unknown): Promise<{
    statusCode: number;
    response: ISearchMessagesResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as SearchMessagesQuery).params;
      const { query, cursor, limit } = (req as SearchMessagesQuery).query;
      if (!query) {
        return validationError('Missing required query parameter: query');
      }
      const memberId = this.getMemberId(req);
      const result = await this.getChannelService().searchMessages(
        channelId,
        memberId,
        query,
        cursor,
        limit ? parseInt(limit, 10) : undefined,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: result,
          message: 'Search results',
        } satisfies ISearchMessagesResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/invites — Generate invite token. @requirements 5.3 */
  private async handleCreateInvite(req: unknown): Promise<{
    statusCode: number;
    response: ICreateInviteResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId } = (req as CreateInviteBody).params;
      const { maxUses, expiresInMs } = (req as CreateInviteBody).body;
      const memberId = this.getMemberId(req);
      const invite = await this.getChannelService().createInvite(
        channelId,
        memberId,
        maxUses,
        expiresInMs,
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: invite,
          message: 'Invite created',
        } satisfies ICreateInviteResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/invites/:token/redeem — Redeem invite. @requirements 5.4, 5.5 */
  private async handleRedeemInvite(req: unknown): Promise<{
    statusCode: number;
    response: IRedeemInviteResponse | ApiErrorResponse;
  }> {
    try {
      const { token } = (req as RedeemInviteParams).params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().redeemInvite(token, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { redeemed: true },
          message: 'Invite redeemed',
        } satisfies IRedeemInviteResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** PUT /:channelId/roles/:memberId — Assign role. */
  private async handleAssignRole(req: unknown): Promise<{
    statusCode: number;
    response: IAssignRoleResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, memberId: targetId } = (req as AssignRoleBody).params;
      const { role } = (req as AssignRoleBody).body;
      if (!role) {
        return validationError('Missing required field: role');
      }
      const requesterId = this.getMemberId(req);
      const permService = this.getPermissionService();
      if (
        !permService.hasPermission(
          requesterId,
          channelId,
          'manage_roles' as never,
        )
      ) {
        return forbiddenError('Missing permission: manage_roles');
      }
      permService.assignRole(targetId, channelId, role);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { memberId: targetId, role },
          message: 'Role assigned',
        } satisfies IAssignRoleResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/messages/:messageId/reactions — Add reaction. */
  private async handleAddReaction(req: unknown): Promise<{
    statusCode: number;
    response: IAddReactionResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, messageId } = (req as ReactionBody).params;
      const { emoji } = (req as ReactionBody).body;
      if (!emoji) {
        return validationError('Missing required field: emoji');
      }
      const memberId = this.getMemberId(req);
      const reactionId = await this.getChannelService().addReaction(
        channelId,
        messageId,
        memberId,
        emoji,
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: { reactionId, emoji },
          message: 'Reaction added',
        } satisfies IAddReactionResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:channelId/messages/:messageId/reactions/:reactionId — Remove reaction. */
  private async handleRemoveReaction(req: unknown): Promise<{
    statusCode: number;
    response: IRemoveReactionResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, messageId, reactionId } = (req as RemoveReactionParams)
        .params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().removeReaction(
        channelId,
        messageId,
        memberId,
        reactionId,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { removed: true },
          message: 'Reaction removed',
        } satisfies IRemoveReactionResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** PUT /:channelId/messages/:messageId — Edit message. */
  private async handleEditMessage(req: unknown): Promise<{
    statusCode: number;
    response: IEditMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, messageId } = (req as EditMessageBody).params;
      const { content } = (req as EditMessageBody).body;
      if (!content) {
        return validationError('Missing required field: content');
      }
      const memberId = this.getMemberId(req);
      const message = await this.getChannelService().editMessage(
        channelId,
        messageId,
        memberId,
        content,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: message,
          message: 'Message edited',
        } satisfies IEditMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/messages/:messageId/pin — Pin message. */
  private async handlePinMessage(req: unknown): Promise<{
    statusCode: number;
    response: IPinMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, messageId } = (req as PinParams).params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().pinMessage(channelId, messageId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { pinned: true },
          message: 'Message pinned',
        } satisfies IPinMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:channelId/messages/:messageId/pin — Unpin message. */
  private async handleUnpinMessage(req: unknown): Promise<{
    statusCode: number;
    response: IUnpinMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, messageId } = (req as PinParams).params;
      const memberId = this.getMemberId(req);
      await this.getChannelService().unpinMessage(
        channelId,
        messageId,
        memberId,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { unpinned: true },
          message: 'Message unpinned',
        } satisfies IUnpinMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/mute/:memberId — Mute a member. */
  private async handleMuteMember(req: unknown): Promise<{
    statusCode: number;
    response: IMuteChannelMemberResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, memberId: targetId } = (req as MuteBody).params;
      const { durationMs } = (req as MuteBody).body;
      if (!durationMs || durationMs <= 0) {
        return validationError('Missing or invalid field: durationMs');
      }
      const requesterId = this.getMemberId(req);
      await this.getChannelService().muteMember(
        channelId,
        requesterId,
        targetId,
        durationMs,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            muted: true,
            until: new Date(Date.now() + durationMs).toISOString(),
          },
          message: 'Member muted',
        } satisfies IMuteChannelMemberResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:channelId/kick/:memberId — Kick a member. */
  private async handleKickMember(req: unknown): Promise<{
    statusCode: number;
    response: IKickChannelMemberResponse | ApiErrorResponse;
  }> {
    try {
      const { channelId, memberId: targetId } = (req as KickParams).params;
      const requesterId = this.getMemberId(req);
      await this.getChannelService().kickMember(
        channelId,
        requesterId,
        targetId,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { kicked: true },
          message: 'Member kicked',
        } satisfies IKickChannelMemberResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  // ─── Error mapping ────────────────────────────────────────────────────

  private mapServiceError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof ChannelNotFoundError) {
      return notFoundError('Channel', 'unknown');
    }
    if (error instanceof NotChannelMemberError) {
      return forbiddenError(error.message);
    }
    if (error instanceof ChannelPermissionError) {
      return forbiddenError(`Missing permission: ${error.missingPermission}`);
    }
    if (error instanceof ChannelMemberMutedError) {
      return forbiddenError(error.message);
    }
    if (error instanceof ChannelMessageNotFoundError) {
      return notFoundError('Message', 'unknown');
    }
    if (error instanceof NotMessageAuthorError) {
      return forbiddenError(error.message);
    }
    if (error instanceof ChannelReactionNotFoundError) {
      return notFoundError('Reaction', 'unknown');
    }
    if (error instanceof MemberAlreadyInChannelError) {
      return {
        statusCode: 409,
        response: {
          error: {
            code: 'ALREADY_EXISTS',
            message: error.message,
          },
        } as ApiErrorResponse,
      };
    }
    if (error instanceof ChannelNameConflictError) {
      return {
        statusCode: 409,
        response: {
          error: {
            code: 'ALREADY_EXISTS',
            message: error.message,
          },
        } as ApiErrorResponse,
      };
    }
    if (error instanceof ChannelJoinDeniedError) {
      return forbiddenError(error.message);
    }
    if (error instanceof InviteTokenExpiredError) {
      return {
        statusCode: 410,
        response: {
          error: {
            code: 'GONE',
            message: error.message,
          },
        } as ApiErrorResponse,
      };
    }
    if (error instanceof InviteTokenNotFoundError) {
      return notFoundError('InviteToken', 'unknown');
    }
    if (error instanceof Error) {
      return internalError(error);
    }
    return handleError(error);
  }
}
