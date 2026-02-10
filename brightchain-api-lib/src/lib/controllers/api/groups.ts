/**
 * GroupController — REST API for group chat management.
 *
 * Routes:
 *   POST   /                                        — Create a group
 *   GET    /:groupId                                — Get group metadata
 *   POST   /:groupId/messages                       — Send a message
 *   GET    /:groupId/messages                       — Get message history
 *   POST   /:groupId/members                        — Add member(s)
 *   DELETE /:groupId/members/:memberId              — Remove member
 *   POST   /:groupId/leave                          — Leave group
 *   PUT    /:groupId/roles/:memberId                — Assign role
 *   POST   /:groupId/messages/:messageId/reactions   — Add reaction
 *   DELETE /:groupId/messages/:messageId/reactions/:reactionId — Remove reaction
 *   PUT    /:groupId/messages/:messageId             — Edit message
 *   POST   /:groupId/messages/:messageId/pin         — Pin message
 *   DELETE /:groupId/messages/:messageId/pin         — Unpin message
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import {
  DefaultRole,
  IAddGroupMembersResponse,
  IAddReactionResponse,
  IAssignRoleResponse,
  ICreateGroupResponse,
  IEditMessageResponse,
  IGetGroupMessagesResponse,
  IGetGroupResponse,
  ILeaveGroupResponse,
  IPinMessageResponse,
  IRemoveGroupMemberResponse,
  IRemoveReactionResponse,
  ISendGroupMessageResponse,
  IUnpinMessageResponse,
} from '@brightchain/brightchain-lib';
import {
  GroupMessageNotFoundError,
  GroupNotFoundError,
  GroupPermissionError,
  GroupService,
  MemberAlreadyInGroupError,
  MemberMutedError,
  NotGroupMemberError,
  NotMessageAuthorError,
  ReactionNotFoundError,
} from '@brightchain/brightchain-lib/lib/services/communication/groupService';
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
  addGroupMembersValidation,
  addGroupReactionValidation,
  assignGroupRoleValidation,
  createGroupValidation,
  editGroupMessageValidation,
  getGroupMessagesValidation,
  groupIdParamValidation,
  leaveGroupValidation,
  pinGroupMessageValidation,
  removeGroupMemberValidation,
  removeGroupReactionValidation,
  sendGroupMessageValidation,
} from '../../utils/communicationValidation';
import {
  forbiddenError,
  handleError,
  internalError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type GroupApiResponse =
  | ICreateGroupResponse
  | IGetGroupResponse
  | ISendGroupMessageResponse
  | IGetGroupMessagesResponse
  | IAddGroupMembersResponse
  | IRemoveGroupMemberResponse
  | ILeaveGroupResponse
  | IAssignRoleResponse
  | IAddReactionResponse
  | IRemoveReactionResponse
  | IEditMessageResponse
  | IPinMessageResponse
  | IUnpinMessageResponse
  | ApiErrorResponse;

interface GroupHandlers extends TypedHandlers {
  createGroup: ApiRequestHandler<ICreateGroupResponse | ApiErrorResponse>;
  getGroup: ApiRequestHandler<IGetGroupResponse | ApiErrorResponse>;
  sendMessage: ApiRequestHandler<ISendGroupMessageResponse | ApiErrorResponse>;
  getMessages: ApiRequestHandler<IGetGroupMessagesResponse | ApiErrorResponse>;
  addMembers: ApiRequestHandler<IAddGroupMembersResponse | ApiErrorResponse>;
  removeMember: ApiRequestHandler<
    IRemoveGroupMemberResponse | ApiErrorResponse
  >;
  leaveGroup: ApiRequestHandler<ILeaveGroupResponse | ApiErrorResponse>;
  assignRole: ApiRequestHandler<IAssignRoleResponse | ApiErrorResponse>;
  addReaction: ApiRequestHandler<IAddReactionResponse | ApiErrorResponse>;
  removeReaction: ApiRequestHandler<IRemoveReactionResponse | ApiErrorResponse>;
  editMessage: ApiRequestHandler<IEditMessageResponse | ApiErrorResponse>;
  pinMessage: ApiRequestHandler<IPinMessageResponse | ApiErrorResponse>;
  unpinMessage: ApiRequestHandler<IUnpinMessageResponse | ApiErrorResponse>;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface CreateGroupBody {
  body: { name?: string; memberIds?: string[]; memberId?: string };
}

interface GroupIdParams {
  params: { groupId: string };
  query: { memberId?: string };
}

interface SendMessageBody {
  params: { groupId: string };
  body: { content?: string; memberId?: string };
  query: { memberId?: string };
}

interface GetMessagesQuery {
  params: { groupId: string };
  query: { cursor?: string; limit?: string; memberId?: string };
}

interface AddMembersBody {
  params: { groupId: string };
  body: { memberIds?: string[]; memberId?: string };
  query: { memberId?: string };
}

interface RemoveMemberParams {
  params: { groupId: string; memberId: string };
  body: { requesterId?: string };
  query: { memberId?: string };
}

interface LeaveGroupParams {
  params: { groupId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

interface AssignRoleBody {
  params: { groupId: string; memberId: string };
  body: { role?: DefaultRole; requesterId?: string };
  query: { memberId?: string };
}

interface ReactionBody {
  params: { groupId: string; messageId: string };
  body: { emoji?: string; memberId?: string };
  query: { memberId?: string };
}

interface RemoveReactionParams {
  params: { groupId: string; messageId: string; reactionId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

interface EditMessageBody {
  params: { groupId: string; messageId: string };
  body: { content?: string; memberId?: string };
  query: { memberId?: string };
}

interface PinParams {
  params: { groupId: string; messageId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

/**
 * Controller for group chat operations.
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export class GroupController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  GroupApiResponse,
  GroupHandlers,
  CoreLanguageCode
> {
  private groupService: GroupService | null = null;
  private permissionService: PermissionService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setGroupService(service: GroupService): void {
    this.groupService = service;
  }

  public setPermissionService(service: PermissionService): void {
    this.permissionService = service;
  }

  private getGroupService(): GroupService {
    if (!this.groupService) {
      throw new Error('GroupService not initialized');
    }
    return this.groupService;
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
    const body = (req as CreateGroupBody).body;
    if (body && typeof body === 'object') {
      const bodyRecord = body as Record<string, unknown>;
      if (typeof bodyRecord['memberId'] === 'string')
        return bodyRecord['memberId'];
      if (typeof bodyRecord['requesterId'] === 'string')
        return bodyRecord['requesterId'];
    }
    const query = (req as GroupIdParams).query;
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
        handlerKey: 'createGroup',
        validation: () => createGroupValidation,
      }),
      routeConfig('get', '/:groupId', {
        ...noAuth,
        handlerKey: 'getGroup',
        validation: () => groupIdParamValidation,
      }),
      routeConfig('post', '/:groupId/messages', {
        ...noAuth,
        handlerKey: 'sendMessage',
        validation: () => sendGroupMessageValidation,
      }),
      routeConfig('get', '/:groupId/messages', {
        ...noAuth,
        handlerKey: 'getMessages',
        validation: () => getGroupMessagesValidation,
      }),
      routeConfig('post', '/:groupId/members', {
        ...noAuth,
        handlerKey: 'addMembers',
        validation: () => addGroupMembersValidation,
      }),
      routeConfig('delete', '/:groupId/members/:memberId', {
        ...noAuth,
        handlerKey: 'removeMember',
        validation: () => removeGroupMemberValidation,
      }),
      routeConfig('post', '/:groupId/leave', {
        ...noAuth,
        handlerKey: 'leaveGroup',
        validation: () => leaveGroupValidation,
      }),
      routeConfig('put', '/:groupId/roles/:memberId', {
        ...noAuth,
        handlerKey: 'assignRole',
        validation: () => assignGroupRoleValidation,
      }),
      routeConfig('post', '/:groupId/messages/:messageId/reactions', {
        ...noAuth,
        handlerKey: 'addReaction',
        validation: () => addGroupReactionValidation,
      }),
      routeConfig(
        'delete',
        '/:groupId/messages/:messageId/reactions/:reactionId',
        {
          ...noAuth,
          handlerKey: 'removeReaction',
          validation: () => removeGroupReactionValidation,
        },
      ),
      routeConfig('put', '/:groupId/messages/:messageId', {
        ...noAuth,
        handlerKey: 'editMessage',
        validation: () => editGroupMessageValidation,
      }),
      routeConfig('post', '/:groupId/messages/:messageId/pin', {
        ...noAuth,
        handlerKey: 'pinMessage',
        validation: () => pinGroupMessageValidation,
      }),
      routeConfig('delete', '/:groupId/messages/:messageId/pin', {
        ...noAuth,
        handlerKey: 'unpinMessage',
        validation: () => pinGroupMessageValidation,
      }),
    ];

    this.handlers = {
      createGroup: this.handleCreateGroup.bind(this),
      getGroup: this.handleGetGroup.bind(this),
      sendMessage: this.handleSendMessage.bind(this),
      getMessages: this.handleGetMessages.bind(this),
      addMembers: this.handleAddMembers.bind(this),
      removeMember: this.handleRemoveMember.bind(this),
      leaveGroup: this.handleLeaveGroup.bind(this),
      assignRole: this.handleAssignRole.bind(this),
      addReaction: this.handleAddReaction.bind(this),
      removeReaction: this.handleRemoveReaction.bind(this),
      editMessage: this.handleEditMessage.bind(this),
      pinMessage: this.handlePinMessage.bind(this),
      unpinMessage: this.handleUnpinMessage.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /** POST / — Create a group. @requirements 3.1 */
  private async handleCreateGroup(req: unknown): Promise<{
    statusCode: number;
    response: ICreateGroupResponse | ApiErrorResponse;
  }> {
    try {
      const { name, memberIds } = (req as CreateGroupBody).body;
      if (!name || !memberIds || !Array.isArray(memberIds)) {
        return validationError('Missing required fields: name, memberIds');
      }
      const memberId = this.getMemberId(req);
      const group = await this.getGroupService().createGroup(
        name,
        memberId,
        memberIds,
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: group,
          message: 'Group created',
        } satisfies ICreateGroupResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:groupId — Get group metadata. @requirements 3.6 */
  private async handleGetGroup(req: unknown): Promise<{
    statusCode: number;
    response: IGetGroupResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId } = (req as GroupIdParams).params;
      const memberId = this.getMemberId(req);
      const group = await this.getGroupService().getGroup(groupId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: group,
          message: 'Group retrieved',
        } satisfies IGetGroupResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:groupId/messages — Send a message. @requirements 3.2 */
  private async handleSendMessage(req: unknown): Promise<{
    statusCode: number;
    response: ISendGroupMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId } = (req as SendMessageBody).params;
      const { content } = (req as SendMessageBody).body;
      if (!content) {
        return validationError('Missing required field: content');
      }
      const memberId = this.getMemberId(req);
      const message = await this.getGroupService().sendMessage(
        groupId,
        memberId,
        content,
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: message,
          message: 'Message sent',
        } satisfies ISendGroupMessageResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:groupId/messages — Get message history. */
  private async handleGetMessages(req: unknown): Promise<{
    statusCode: number;
    response: IGetGroupMessagesResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId } = (req as GetMessagesQuery).params;
      const { cursor, limit } = (req as GetMessagesQuery).query;
      const memberId = this.getMemberId(req);
      const result = await this.getGroupService().getMessages(
        groupId,
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
        } satisfies IGetGroupMessagesResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:groupId/members — Add member(s). @requirements 3.3 */
  private async handleAddMembers(req: unknown): Promise<{
    statusCode: number;
    response: IAddGroupMembersResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId } = (req as AddMembersBody).params;
      const { memberIds } = (req as AddMembersBody).body;
      if (!memberIds || !Array.isArray(memberIds)) {
        return validationError('Missing required field: memberIds');
      }
      const memberId = this.getMemberId(req);
      await this.getGroupService().addMembers(groupId, memberId, memberIds);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { added: memberIds },
          message: 'Members added',
        } satisfies IAddGroupMembersResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:groupId/members/:memberId — Remove member. @requirements 3.4 */
  private async handleRemoveMember(req: unknown): Promise<{
    statusCode: number;
    response: IRemoveGroupMemberResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, memberId: targetId } = (req as RemoveMemberParams)
        .params;
      const requesterId = this.getMemberId(req);
      await this.getGroupService().removeMember(groupId, requesterId, targetId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { removed: targetId },
          message: 'Member removed',
        } satisfies IRemoveGroupMemberResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:groupId/leave — Leave group. @requirements 3.5 */
  private async handleLeaveGroup(req: unknown): Promise<{
    statusCode: number;
    response: ILeaveGroupResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId } = (req as LeaveGroupParams).params;
      const memberId = this.getMemberId(req);
      await this.getGroupService().leaveGroup(groupId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { left: true },
          message: 'Left group',
        } satisfies ILeaveGroupResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** PUT /:groupId/roles/:memberId — Assign role. @requirements 6.2 */
  private async handleAssignRole(req: unknown): Promise<{
    statusCode: number;
    response: IAssignRoleResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, memberId: targetId } = (req as AssignRoleBody).params;
      const { role } = (req as AssignRoleBody).body;
      if (!role) {
        return validationError('Missing required field: role');
      }
      const requesterId = this.getMemberId(req);
      // Only owners/admins can assign roles
      const permService = this.getPermissionService();
      if (
        !permService.hasPermission(
          requesterId,
          groupId,
          'manage_roles' as never,
        )
      ) {
        return forbiddenError('Missing permission: manage_roles');
      }
      permService.assignRole(targetId, groupId, role);
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

  /** POST /:groupId/messages/:messageId/reactions — Add reaction. @requirements 9.5 */
  private async handleAddReaction(req: unknown): Promise<{
    statusCode: number;
    response: IAddReactionResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, messageId } = (req as ReactionBody).params;
      const { emoji } = (req as ReactionBody).body;
      if (!emoji) {
        return validationError('Missing required field: emoji');
      }
      const memberId = this.getMemberId(req);
      const reactionId = await this.getGroupService().addReaction(
        groupId,
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

  /** DELETE /:groupId/messages/:messageId/reactions/:reactionId — Remove reaction. */
  private async handleRemoveReaction(req: unknown): Promise<{
    statusCode: number;
    response: IRemoveReactionResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, messageId, reactionId } = (req as RemoveReactionParams)
        .params;
      const memberId = this.getMemberId(req);
      await this.getGroupService().removeReaction(
        groupId,
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

  /** PUT /:groupId/messages/:messageId — Edit message. @requirements 9.1 */
  private async handleEditMessage(req: unknown): Promise<{
    statusCode: number;
    response: IEditMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, messageId } = (req as EditMessageBody).params;
      const { content } = (req as EditMessageBody).body;
      if (!content) {
        return validationError('Missing required field: content');
      }
      const memberId = this.getMemberId(req);
      const message = await this.getGroupService().editMessage(
        groupId,
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

  /** POST /:groupId/messages/:messageId/pin — Pin message. @requirements 9.4 */
  private async handlePinMessage(req: unknown): Promise<{
    statusCode: number;
    response: IPinMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, messageId } = (req as PinParams).params;
      const memberId = this.getMemberId(req);
      await this.getGroupService().pinMessage(groupId, messageId, memberId);
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

  /** DELETE /:groupId/messages/:messageId/pin — Unpin message. @requirements 9.4 */
  private async handleUnpinMessage(req: unknown): Promise<{
    statusCode: number;
    response: IUnpinMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { groupId, messageId } = (req as PinParams).params;
      const memberId = this.getMemberId(req);
      await this.getGroupService().unpinMessage(groupId, messageId, memberId);
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

  // ─── Error mapping ────────────────────────────────────────────────────

  private mapServiceError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof GroupNotFoundError) {
      return notFoundError('Group', 'unknown');
    }
    if (error instanceof NotGroupMemberError) {
      return forbiddenError(error.message);
    }
    if (error instanceof GroupPermissionError) {
      return forbiddenError(`Missing permission: ${error.missingPermission}`);
    }
    if (error instanceof MemberMutedError) {
      return forbiddenError(error.message);
    }
    if (error instanceof GroupMessageNotFoundError) {
      return notFoundError('Message', 'unknown');
    }
    if (error instanceof NotMessageAuthorError) {
      return forbiddenError(error.message);
    }
    if (error instanceof ReactionNotFoundError) {
      return notFoundError('Reaction', 'unknown');
    }
    if (error instanceof MemberAlreadyInGroupError) {
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
    if (error instanceof Error) {
      return internalError(error);
    }
    return handleError(error);
  }
}
