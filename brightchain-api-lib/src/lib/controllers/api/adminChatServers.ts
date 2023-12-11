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

type AdminChatServersApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminChatServersHandlers extends TypedHandlers {
  listServers: ApiRequestHandler<AdminChatServersApiResponse>;
  updateServer: ApiRequestHandler<AdminChatServersApiResponse>;
  deleteServer: ApiRequestHandler<AdminChatServersApiResponse>;
  listChannels: ApiRequestHandler<AdminChatServersApiResponse>;
  deleteChannel: ApiRequestHandler<AdminChatServersApiResponse>;
  listMembers: ApiRequestHandler<AdminChatServersApiResponse>;
  removeMember: ApiRequestHandler<AdminChatServersApiResponse>;
  changeMemberRole: ApiRequestHandler<AdminChatServersApiResponse>;
}

/**
 * Admin-only BrightChat server/channel/member management controller.
 *
 * Platform admins can manage organizational structure (servers, channels,
 * members, roles) without access to encrypted message content.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/chat/servers
 * Paginated server list with member/channel counts.
 *
 * ### PUT /api/admin/chat/servers/:serverId
 * Update server name/icon.
 *
 * ### DELETE /api/admin/chat/servers/:serverId
 * Delete a server and all its channels.
 *
 * ### GET /api/admin/chat/servers/channels
 * Paginated channel list, optionally filtered by serverId.
 *
 * ### DELETE /api/admin/chat/servers/channels/:channelId
 * Delete a channel.
 *
 * ### GET /api/admin/chat/servers/members
 * Paginated member list, optionally filtered by serverId.
 *
 * ### DELETE /api/admin/chat/servers/:serverId/members/:memberId
 * Remove a member from a server.
 *
 * ### PUT /api/admin/chat/servers/:serverId/members/:memberId/role
 * Change a member's role.
 */
export class AdminChatServersController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminChatServersApiResponse,
  AdminChatServersHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/servers', {
        handlerKey: 'listServers',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('put', '/servers/:serverId', {
        handlerKey: 'updateServer',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/servers/:serverId', {
        handlerKey: 'deleteServer',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/servers/channels', {
        handlerKey: 'listChannels',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/servers/channels/:channelId', {
        handlerKey: 'deleteChannel',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/servers/members', {
        handlerKey: 'listMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/servers/:serverId/members/:memberId', {
        handlerKey: 'removeMember',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('put', '/servers/:serverId/members/:memberId/role', {
        handlerKey: 'changeMemberRole',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listServers: this.handleListServers.bind(this),
      updateServer: this.handleUpdateServer.bind(this),
      deleteServer: this.handleDeleteServer.bind(this),
      listChannels: this.handleListChannels.bind(this),
      deleteChannel: this.handleDeleteChannel.bind(this),
      listMembers: this.handleListMembers.bind(this),
      removeMember: this.handleRemoveMember.bind(this),
      changeMemberRole: this.handleChangeMemberRole.bind(this),
    };
  }

  private getDb(): BrightDb | undefined {
    return this.application.services.has('db')
      ? (this.application.services.get('db') as BrightDb)
      : undefined;
  }

  private parsePagination(query?: { page?: string; limit?: string }) {
    const page = Math.max(1, parseInt(query?.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit ?? '20', 10) || 20));
    return { page, limit, skip: (page - 1) * limit };
  }

  /** GET /api/admin/chat/servers */
  private async handleListServers(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { query?: { page?: string; limit?: string } };
      const { page, limit, skip } = this.parsePagination(request.query);
      const brightDb = this.getDb();

      if (brightDb) {
        const collection = brightDb.collection('brightchat_servers');
        const total = await collection.countDocuments();
        const docs = await collection.find().skip(skip).limit(limit).toArray();

        const servers = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          name: doc['name'] ?? '',
          iconUrl: doc['iconUrl'] ?? undefined,
          ownerId: doc['ownerId'] ?? '',
          memberCount: Array.isArray(doc['memberIds']) ? (doc['memberIds'] as unknown[]).length : 0,
          channelCount: Array.isArray(doc['channelIds']) ? (doc['channelIds'] as unknown[]).length : 0,
          createdAt: doc['createdAt'] ?? null,
        }));

        return {
          statusCode: 200,
          response: { message: 'OK', servers, total, page, limit } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: { message: 'OK', servers: [], total: 0, page, limit } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /** PUT /api/admin/chat/servers/:serverId */
  private async handleUpdateServer(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { params?: { serverId?: string }; body?: { name?: string; iconUrl?: string } };
      const serverId = request.params?.serverId;
      if (!serverId) return validationError('serverId is required');

      const brightDb = this.getDb();
      if (brightDb) {
        const update: Record<string, unknown> = { updatedAt: new Date() };
        if (request.body?.name) update['name'] = request.body.name;
        if (request.body?.iconUrl !== undefined) update['iconUrl'] = request.body.iconUrl;

        const result = await brightDb.collection('brightchat_servers').updateOne(
          { _id: serverId },
          { $set: update },
        );
        if (result.matchedCount === 0) return notFoundError('Server', serverId);

        return { statusCode: 200, response: { message: 'Server updated successfully' } as IApiMessageResponse };
      }
      return notFoundError('Server', serverId);
    } catch (error) {
      return handleError(error);
    }
  }

  /** DELETE /api/admin/chat/servers/:serverId */
  private async handleDeleteServer(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { params?: { serverId?: string } };
      const serverId = request.params?.serverId;
      if (!serverId) return validationError('serverId is required');

      const brightDb = this.getDb();
      if (brightDb) {
        // Delete all channels belonging to this server
        await brightDb.collection('brightchat_channels').deleteMany({ serverId });
        // Delete the server
        const result = await brightDb.collection('brightchat_servers').deleteOne({ _id: serverId });
        if (result.deletedCount === 0) return notFoundError('Server', serverId);

        return { statusCode: 200, response: { message: 'Server deleted successfully' } as IApiMessageResponse };
      }
      return notFoundError('Server', serverId);
    } catch (error) {
      return handleError(error);
    }
  }

  /** GET /api/admin/chat/servers/channels */
  private async handleListChannels(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { query?: { page?: string; limit?: string; serverId?: string } };
      const { page, limit, skip } = this.parsePagination(request.query);
      const brightDb = this.getDb();

      if (brightDb) {
        const filter: Record<string, unknown> = {};
        if (request.query?.serverId) filter['serverId'] = request.query.serverId;

        const collection = brightDb.collection('brightchat_channels');
        const total = await collection.countDocuments(filter);
        const docs = await collection.find(filter).skip(skip).limit(limit).toArray();

        const channels = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          name: doc['name'] ?? '',
          topic: doc['topic'] ?? '',
          visibility: doc['visibility'] ?? 'public',
          memberCount: Array.isArray(doc['members']) ? (doc['members'] as unknown[]).length : 0,
          serverId: doc['serverId'] ?? '',
          createdAt: doc['createdAt'] ?? null,
        }));

        return {
          statusCode: 200,
          response: { message: 'OK', channels, total, page, limit } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: { message: 'OK', channels: [], total: 0, page, limit } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /** DELETE /api/admin/chat/servers/channels/:channelId */
  private async handleDeleteChannel(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { params?: { channelId?: string } };
      const channelId = request.params?.channelId;
      if (!channelId) return validationError('channelId is required');

      const brightDb = this.getDb();
      if (brightDb) {
        const result = await brightDb.collection('brightchat_channels').deleteOne({ _id: channelId });
        if (result.deletedCount === 0) return notFoundError('Channel', channelId);
        return { statusCode: 200, response: { message: 'Channel deleted successfully' } as IApiMessageResponse };
      }
      return notFoundError('Channel', channelId);
    } catch (error) {
      return handleError(error);
    }
  }

  /** GET /api/admin/chat/servers/members */
  private async handleListMembers(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { query?: { page?: string; limit?: string; serverId?: string } };
      const { page, limit, skip } = this.parsePagination(request.query);
      const brightDb = this.getDb();

      if (brightDb) {
        const filter: Record<string, unknown> = {};
        if (request.query?.serverId) filter['_id'] = request.query.serverId;

        const serverCollection = brightDb.collection('brightchat_servers');
        const serverDocs = await serverCollection.find(filter).toArray();

        // Flatten all members across servers
        const allMembers: Array<{
          memberId: string;
          displayName: string;
          role: string;
          joinedAt: string;
          serverId: string;
          serverName: string;
        }> = [];

        for (const doc of serverDocs) {
          const serverId = String(doc['_id'] ?? doc['id'] ?? '');
          const serverName = String(doc['name'] ?? '');
          const memberIds = Array.isArray(doc['memberIds']) ? (doc['memberIds'] as string[]) : [];
          const ownerId = String(doc['ownerId'] ?? '');

          for (const mid of memberIds) {
            allMembers.push({
              memberId: String(mid),
              displayName: String(mid),
              role: String(mid) === ownerId ? 'owner' : 'member',
              joinedAt: String(doc['createdAt'] ?? new Date().toISOString()),
              serverId,
              serverName,
            });
          }
        }

        const total = allMembers.length;
        const members = allMembers.slice(skip, skip + limit);

        return {
          statusCode: 200,
          response: { message: 'OK', members, total, page, limit } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: { message: 'OK', members: [], total: 0, page, limit } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /** DELETE /api/admin/chat/servers/:serverId/members/:memberId */
  private async handleRemoveMember(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { params?: { serverId?: string; memberId?: string } };
      const { serverId, memberId } = request.params ?? {};
      if (!serverId) return validationError('serverId is required');
      if (!memberId) return validationError('memberId is required');

      const brightDb = this.getDb();
      if (brightDb) {
        const result = await brightDb.collection('brightchat_servers').updateOne(
          { _id: serverId },
          { $pull: { memberIds: memberId } as Record<string, unknown> },
        );
        if (result.matchedCount === 0) return notFoundError('Server', serverId);
        return { statusCode: 200, response: { message: 'Member removed successfully' } as IApiMessageResponse };
      }
      return notFoundError('Server', serverId);
    } catch (error) {
      return handleError(error);
    }
  }

  /** PUT /api/admin/chat/servers/:serverId/members/:memberId/role */
  private async handleChangeMemberRole(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminChatServersApiResponse }> {
    try {
      const request = req as { params?: { serverId?: string; memberId?: string }; body?: { role?: string } };
      const { serverId, memberId } = request.params ?? {};
      const role = request.body?.role;
      if (!serverId) return validationError('serverId is required');
      if (!memberId) return validationError('memberId is required');
      if (!role) return validationError('role is required');

      const validRoles = ['owner', 'admin', 'moderator', 'member'];
      if (!validRoles.includes(role)) {
        return validationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // For servers, role management is handled at the channel level
      // since IServer doesn't have per-member roles directly.
      // This updates the role in all channels the member belongs to in this server.
      const brightDb = this.getDb();
      if (brightDb) {
        await brightDb.collection('brightchat_channels').updateMany(
          { serverId, 'members.memberId': memberId },
          { $set: { 'members.$.role': role } },
        );
        return { statusCode: 200, response: { message: 'Role updated successfully' } as IApiMessageResponse };
      }
      return notFoundError('Server', serverId);
    } catch (error) {
      return handleError(error);
    }
  }
}
