/**
 * ServerController — REST API for server management.
 *
 * Routes:
 *   POST   /                                         — Create a server
 *   GET    /                                         — List user's servers
 *   GET    /:serverId                                — Get server details
 *   PUT    /:serverId                                — Update server
 *   DELETE /:serverId                                — Delete server
 *   POST   /:serverId/members                        — Add members
 *   DELETE /:serverId/members/:memberId              — Remove member
 *   POST   /:serverId/invites                        — Create invite
 *   POST   /:serverId/invites/:token/redeem          — Redeem invite
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4
 */

import {
  IAddServerMembersResponse,
  ICreateServerInviteResponse,
  ICreateServerResponse,
  IDeleteServerResponse,
  IGetServerResponse,
  IListServersResponse,
  IRedeemServerInviteResponse,
  IRemoveServerMemberResponse,
  IUpdateServerResponse,
  MemberAlreadyInServerError,
  NotServerMemberError,
  ServerInviteExpiredError,
  ServerInviteNotFoundError,
  ServerNameValidationError,
  ServerNotFoundError,
  ServerPermissionError,
  ServerService,
} from '@brightchain/brightchain-lib';
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
  addServerMembersValidation,
  createServerInviteValidation,
  createServerValidation,
  listServersValidation,
  redeemServerInviteValidation,
  removeServerMemberValidation,
  serverIdParamValidation,
  updateServerValidation,
} from '../../utils/communicationValidation';
import {
  forbiddenError,
  handleError,
  internalError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type ServerApiResponse =
  | ICreateServerResponse
  | IListServersResponse
  | IGetServerResponse
  | IUpdateServerResponse
  | IDeleteServerResponse
  | IAddServerMembersResponse
  | IRemoveServerMemberResponse
  | ICreateServerInviteResponse
  | IRedeemServerInviteResponse
  | ApiErrorResponse;

interface ServerHandlers extends TypedHandlers {
  createServer: ApiRequestHandler<ICreateServerResponse | ApiErrorResponse>;
  listServers: ApiRequestHandler<IListServersResponse | ApiErrorResponse>;
  getServer: ApiRequestHandler<IGetServerResponse | ApiErrorResponse>;
  updateServer: ApiRequestHandler<IUpdateServerResponse | ApiErrorResponse>;
  deleteServer: ApiRequestHandler<IDeleteServerResponse | ApiErrorResponse>;
  addMembers: ApiRequestHandler<IAddServerMembersResponse | ApiErrorResponse>;
  removeMember: ApiRequestHandler<
    IRemoveServerMemberResponse | ApiErrorResponse
  >;
  createInvite: ApiRequestHandler<
    ICreateServerInviteResponse | ApiErrorResponse
  >;
  redeemInvite: ApiRequestHandler<
    IRedeemServerInviteResponse | ApiErrorResponse
  >;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface CreateServerBody {
  body: { name?: string; iconUrl?: string };
}

interface ServerIdParams {
  params: { serverId: string };
}

interface UpdateServerBody {
  params: { serverId: string };
  body: { name?: string; iconUrl?: string; categories?: unknown[] };
}

interface ListServersQuery {
  query: { cursor?: string; limit?: string };
}

interface AddMembersBody {
  params: { serverId: string };
  body: { memberIds?: string[] };
}

interface RemoveMemberParams {
  params: { serverId: string; memberId: string };
}

interface CreateInviteBody {
  params: { serverId: string };
  body: { maxUses?: number; expiresInMs?: number };
}

interface RedeemInviteParams {
  params: { serverId: string; token: string };
}

/**
 * Controller for server operations.
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4
 */
export class ServerController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  ServerApiResponse,
  ServerHandlers,
  CoreLanguageCode
> {
  private serverService: ServerService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setServerService(service: ServerService): void {
    this.serverService = service;
  }

  private getServerService(): ServerService {
    if (!this.serverService) {
      throw new Error('ServerService not initialized');
    }
    return this.serverService;
  }

  /**
   * Extract the authenticated member ID from the request.
   */
  private getMemberId(req: unknown): string {
    const user = (req as { user?: { id?: string } }).user;
    if (user && typeof user.id === 'string') return user.id;
    throw new Error('No authenticated user');
  }

  protected initRouteDefinitions(): void {
    const auth = {
      useAuthentication: true,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('post', '/', {
        ...auth,
        handlerKey: 'createServer',
        validation: () => createServerValidation,
      }),
      routeConfig('get', '/', {
        ...auth,
        handlerKey: 'listServers',
        validation: () => listServersValidation,
      }),
      routeConfig('get', '/:serverId', {
        ...auth,
        handlerKey: 'getServer',
        validation: () => serverIdParamValidation,
      }),
      routeConfig('put', '/:serverId', {
        ...auth,
        handlerKey: 'updateServer',
        validation: () => updateServerValidation,
      }),
      routeConfig('delete', '/:serverId', {
        ...auth,
        handlerKey: 'deleteServer',
        validation: () => serverIdParamValidation,
      }),
      routeConfig('post', '/:serverId/members', {
        ...auth,
        handlerKey: 'addMembers',
        validation: () => addServerMembersValidation,
      }),
      routeConfig('delete', '/:serverId/members/:memberId', {
        ...auth,
        handlerKey: 'removeMember',
        validation: () => removeServerMemberValidation,
      }),
      routeConfig('post', '/:serverId/invites', {
        ...auth,
        handlerKey: 'createInvite',
        validation: () => createServerInviteValidation,
      }),
      routeConfig('post', '/:serverId/invites/:token/redeem', {
        ...auth,
        handlerKey: 'redeemInvite',
        validation: () => redeemServerInviteValidation,
      }),
    ];

    this.handlers = {
      createServer: this.handleCreateServer.bind(this),
      listServers: this.handleListServers.bind(this),
      getServer: this.handleGetServer.bind(this),
      updateServer: this.handleUpdateServer.bind(this),
      deleteServer: this.handleDeleteServer.bind(this),
      addMembers: this.handleAddMembers.bind(this),
      removeMember: this.handleRemoveMember.bind(this),
      createInvite: this.handleCreateInvite.bind(this),
      redeemInvite: this.handleRedeemInvite.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /** POST / — Create a server. @requirements 2.1 */
  private async handleCreateServer(req: unknown): Promise<{
    statusCode: number;
    response: ICreateServerResponse | ApiErrorResponse;
  }> {
    try {
      const { name, iconUrl } = (req as CreateServerBody).body;
      if (!name) {
        return validationError('Missing required field: name');
      }
      const memberId = this.getMemberId(req);
      const server = await this.getServerService().createServer(memberId, {
        name,
        iconUrl,
      });
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: server,
          message: 'Server created',
        } satisfies ICreateServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET / — List user's servers. @requirements 2.2 */
  private async handleListServers(req: unknown): Promise<{
    statusCode: number;
    response: IListServersResponse | ApiErrorResponse;
  }> {
    try {
      const { cursor, limit } = (req as ListServersQuery).query;
      const memberId = this.getMemberId(req);
      const result = await this.getServerService().listServersForMember(
        memberId,
        {
          cursor,
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: result,
          message: 'Servers listed',
        } satisfies IListServersResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:serverId — Get server details. @requirements 2.3 */
  private async handleGetServer(req: unknown): Promise<{
    statusCode: number;
    response: IGetServerResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as ServerIdParams).params;
      const server = await this.getServerService().getServer(serverId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: server,
          message: 'Server retrieved',
        } satisfies IGetServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** PUT /:serverId — Update server. @requirements 2.4 */
  private async handleUpdateServer(req: unknown): Promise<{
    statusCode: number;
    response: IUpdateServerResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as UpdateServerBody).params;
      const { name, iconUrl, categories } = (req as UpdateServerBody).body;
      const memberId = this.getMemberId(req);
      const server = await this.getServerService().updateServer(
        serverId,
        memberId,
        { name, iconUrl, categories: categories as never },
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: server,
          message: 'Server updated',
        } satisfies IUpdateServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:serverId — Delete server. @requirements 2.5, 2.6 */
  private async handleDeleteServer(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteServerResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as ServerIdParams).params;
      const memberId = this.getMemberId(req);
      await this.getServerService().deleteServer(serverId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { deleted: true },
          message: 'Server deleted',
        } satisfies IDeleteServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:serverId/members — Add members. @requirements 2.7 */
  private async handleAddMembers(req: unknown): Promise<{
    statusCode: number;
    response: IAddServerMembersResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as AddMembersBody).params;
      const { memberIds } = (req as AddMembersBody).body;
      if (!memberIds || !Array.isArray(memberIds)) {
        return validationError('Missing required field: memberIds');
      }
      const memberId = this.getMemberId(req);
      const added = await this.getServerService().addMembers(
        serverId,
        memberId,
        memberIds,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { added },
          message: 'Members added',
        } satisfies IAddServerMembersResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:serverId/members/:memberId — Remove member. @requirements 2.8 */
  private async handleRemoveMember(req: unknown): Promise<{
    statusCode: number;
    response: IRemoveServerMemberResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId, memberId: targetId } = (req as RemoveMemberParams)
        .params;
      const requesterId = this.getMemberId(req);
      await this.getServerService().removeMember(
        serverId,
        requesterId,
        targetId,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { removed: targetId },
          message: 'Member removed',
        } satisfies IRemoveServerMemberResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:serverId/invites — Create invite. @requirements 3.1 */
  private async handleCreateInvite(req: unknown): Promise<{
    statusCode: number;
    response: ICreateServerInviteResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as CreateInviteBody).params;
      const { maxUses, expiresInMs } = (req as CreateInviteBody).body;
      const memberId = this.getMemberId(req);
      const invite = await this.getServerService().createInvite(
        serverId,
        memberId,
        { maxUses, expiresInMs },
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: invite,
          message: 'Invite created',
        } satisfies ICreateServerInviteResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:serverId/invites/:token/redeem — Redeem invite. @requirements 3.2, 3.3, 3.4 */
  private async handleRedeemInvite(req: unknown): Promise<{
    statusCode: number;
    response: IRedeemServerInviteResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId, token } = (req as RedeemInviteParams).params;
      const memberId = this.getMemberId(req);
      await this.getServerService().redeemInvite(serverId, token, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { redeemed: true },
          message: 'Invite redeemed',
        } satisfies IRedeemServerInviteResponse,
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
    if (error instanceof ServerNotFoundError) {
      return notFoundError('Server', 'unknown');
    }
    if (error instanceof ServerPermissionError) {
      return forbiddenError(error.message);
    }
    if (error instanceof NotServerMemberError) {
      return forbiddenError(error.message);
    }
    if (error instanceof ServerInviteExpiredError) {
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
    if (error instanceof ServerInviteNotFoundError) {
      return notFoundError('ServerInvite', 'unknown');
    }
    if (error instanceof MemberAlreadyInServerError) {
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
    if (error instanceof ServerNameValidationError) {
      return validationError(error.message);
    }
    if (error instanceof Error) {
      return internalError(error);
    }
    return handleError(error);
  }
}
