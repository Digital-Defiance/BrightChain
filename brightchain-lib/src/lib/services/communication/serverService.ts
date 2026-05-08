/**
 * ServerService — manages server lifecycle, membership, and channel organization.
 *
 * Uses the IChatStorageProvider collections as the primary data store.
 * An in-memory cache is maintained for fast synchronous lookups (e.g.
 * getMemberRole) and is kept in sync with the collection on every write.
 *
 * Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ChannelVisibility,
  DefaultRole,
} from '../../enumerations/communication';
import { IChannel, IPaginatedResult } from '../../interfaces/communication';
import {
  IChatCollection,
  IChatStorageProvider,
} from '../../interfaces/communication/chatStorageProvider';
import {
  IServer,
  IServerCategory,
  IServerInviteToken,
  IServerUpdate,
} from '../../interfaces/communication/server';
import {
  ICommunicationEventEmitter,
  NullEventEmitter,
} from '../../interfaces/events';
import { paginateItems } from '../../utils/pagination';
import { brightDateNow } from '../../utils/brightDateConversions';
import { ChannelService } from './channelService';

// ─── Error classes ──────────────────────────────────────────────────────────

export class ServerNotFoundError extends Error {
  constructor(serverId: string) {
    super(`Server ${serverId} not found`);
    this.name = 'ServerNotFoundError';
  }
}

export class ServerPermissionError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'ServerPermissionError';
  }
}

export class NotServerMemberError extends Error {
  constructor() {
    super('You are not a member of this server');
    this.name = 'NotServerMemberError';
  }
}

export class ServerNameValidationError extends Error {
  constructor(message = 'Server name must be between 1 and 100 characters') {
    super(message);
    this.name = 'ServerNameValidationError';
  }
}

export class MemberAlreadyInServerError extends Error {
  constructor(memberId: string) {
    super(`Member ${memberId} is already in this server`);
    this.name = 'MemberAlreadyInServerError';
  }
}

export class ServerInviteNotFoundError extends Error {
  constructor(token: string) {
    super(`Server invite token ${token} not found`);
    this.name = 'ServerInviteNotFoundError';
  }
}

export class ServerInviteExpiredError extends Error {
  constructor() {
    super('Server invite token has expired or exceeded max uses');
    this.name = 'ServerInviteExpiredError';
  }
}

// ─── Request params ─────────────────────────────────────────────────────────

export interface CreateServerParams {
  name: string;
  iconUrl?: string;
}

export interface CreateServerInviteParams {
  maxUses?: number;
  expiresInMs?: number;
}

export interface CreateChannelInServerParams {
  name: string;
  topic?: string;
  visibility: ChannelVisibility;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class ServerService {
  /** In-memory cache for fast synchronous lookups (getMemberRole). */
  private readonly cache = new Map<string, IServer>();
  private readonly inviteCache = new Map<string, IServerInviteToken>();

  private readonly channelService: ChannelService;
  private readonly eventEmitter: ICommunicationEventEmitter;

  /** Persistent collection — source of truth. */
  private readonly serverCollection: IChatCollection<IServer>;
  private readonly serverInviteCollection: IChatCollection<IServerInviteToken>;

  private initialized = false;

  constructor(options: {
    channelService: ChannelService;
    storageProvider: IChatStorageProvider;
    eventEmitter?: ICommunicationEventEmitter;
  }) {
    this.channelService = options.channelService;
    this.eventEmitter = options.eventEmitter ?? new NullEventEmitter();
    this.serverCollection = options.storageProvider.servers;
    this.serverInviteCollection = options.storageProvider.serverInvites;
  }

  // ─── Initialization ───────────────────────────────────────────────────

  /** Load persisted data into the cache. Must be called before use. */
  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const servers = await this.serverCollection.findMany();
    for (const server of servers) {
      this.cache.set(server.id, server);
    }

    const invites = await this.serverInviteCollection.findMany();
    for (const invite of invites) {
      this.inviteCache.set(invite.token, invite);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  private validateServerName(name: string): void {
    if (!name || name.length === 0 || name.length > 100) {
      throw new ServerNameValidationError();
    }
  }

  private async resolveServer(serverId: string): Promise<IServer> {
    const fromDb = await this.serverCollection.findById(serverId);
    if (fromDb) {
      this.cache.set(serverId, fromDb);
      return fromDb;
    }
    throw new ServerNotFoundError(serverId);
  }

  private async persistServer(server: IServer): Promise<void> {
    this.cache.set(server.id, server);
    await this.serverCollection.update(server.id, server);
  }

  private async resolveInvite(
    token: string,
  ): Promise<IServerInviteToken | null> {
    const fromDb = await this.serverInviteCollection.findById(token);
    if (fromDb) {
      this.inviteCache.set(token, fromDb);
      return fromDb;
    }
    return null;
  }

  getMemberRole(serverId: string, memberId: string): DefaultRole | null {
    const server = this.cache.get(serverId);
    if (!server) return null;
    if (!server.memberIds.includes(memberId)) return null;
    if (server.ownerId === memberId) return DefaultRole.OWNER;
    return DefaultRole.MEMBER;
  }

  private assertCanUpdate(server: IServer, userId: string): void {
    const role = this.getMemberRole(server.id, userId);
    if (role !== DefaultRole.OWNER && role !== DefaultRole.ADMIN) {
      throw new ServerPermissionError(
        'Only the server owner or admin can update this server',
      );
    }
  }

  private assertCanDelete(server: IServer, userId: string): void {
    if (server.ownerId !== userId) {
      throw new ServerPermissionError(
        'Only the server owner can delete this server',
      );
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────

  async createServer(
    ownerId: string,
    params: CreateServerParams,
  ): Promise<IServer> {
    this.validateServerName(params.name);

    const now = brightDateNow();
    const serverId = uuidv4();
    const categoryId = uuidv4();

    const generalChannel: IChannel = await this.channelService.createChannel(
      'general',
      ownerId,
      ChannelVisibility.PUBLIC,
      '',
      serverId,
    );

    const defaultCategory: IServerCategory = {
      id: categoryId,
      name: 'General',
      position: 0,
      channelIds: [generalChannel.id],
    };

    const server: IServer = {
      id: serverId,
      name: params.name,
      iconUrl: params.iconUrl,
      ownerId,
      memberIds: [ownerId],
      channelIds: [generalChannel.id],
      categories: [defaultCategory],
      createdAt: now,
      updatedAt: now,
    };

    this.cache.set(serverId, server);
    await this.serverCollection.create(server);
    return server;
  }

  async getServer(serverId: string): Promise<IServer> {
    return this.resolveServer(serverId);
  }

  async updateServer(
    serverId: string,
    userId: string,
    update: IServerUpdate,
  ): Promise<IServer> {
    const server = await this.resolveServer(serverId);
    this.assertCanUpdate(server, userId);

    if (update.name !== undefined) {
      this.validateServerName(update.name);
      server.name = update.name;
    }
    if ('iconUrl' in update) server.iconUrl = update.iconUrl;
    if ('iconFaClass' in update) server.iconFaClass = update.iconFaClass;
    if ('iconAssetId' in update) server.iconAssetId = update.iconAssetId;
    if ('iconVaultContainerId' in update)
      server.iconVaultContainerId = update.iconVaultContainerId;
    if (update.categories !== undefined) server.categories = update.categories;

    server.updatedAt = brightDateNow();
    await this.persistServer(server);
    return server;
  }

  async deleteServer(serverId: string, userId: string): Promise<void> {
    const server = await this.resolveServer(serverId);
    this.assertCanDelete(server, userId);

    for (const channelId of server.channelIds) {
      try {
        await this.channelService.deleteChannel(channelId, server.ownerId);
      } catch {
        // Channel may already be deleted
      }
    }

    this.cache.delete(serverId);
    await this.serverCollection.delete(serverId);
  }

  async listServersForMember(
    memberId: string,
    pagination?: { cursor?: string; limit?: number },
  ): Promise<IPaginatedResult<IServer>> {
    const allServers = await this.serverCollection.findMany();
    // Refresh cache
    for (const s of allServers) this.cache.set(s.id, s);

    const memberServers = allServers.filter((s) =>
      s.memberIds.includes(memberId),
    );
    memberServers.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });

    return paginateItems(
      memberServers,
      pagination?.cursor,
      pagination?.limit ?? 50,
    );
  }

  // ─── Membership ────────────────────────────────────────────────────────

  async addMembers(
    serverId: string,
    userId: string,
    memberIds: string[],
  ): Promise<string[]> {
    const server = await this.resolveServer(serverId);
    this.assertCanUpdate(server, userId);

    const added: string[] = [];
    for (const memberId of memberIds) {
      if (!server.memberIds.includes(memberId)) {
        server.memberIds.push(memberId);
        added.push(memberId);
      }
    }

    if (added.length > 0) {
      for (const memberId of added) {
        for (const channelId of server.channelIds) {
          await this.channelService.addMemberToChannel(channelId, memberId);
        }
      }
      server.updatedAt = brightDateNow();
      await this.persistServer(server);
    }

    return added;
  }

  async removeMember(
    serverId: string,
    userId: string,
    memberId: string,
  ): Promise<void> {
    const server = await this.resolveServer(serverId);
    this.assertCanUpdate(server, userId);

    server.memberIds = server.memberIds.filter((id) => id !== memberId);

    for (const channelId of server.channelIds) {
      await this.channelService.removeMemberFromChannel(channelId, memberId);
    }

    server.updatedAt = brightDateNow();
    await this.persistServer(server);
    this.eventEmitter.emitServerMemberRemoved(serverId, memberId);
  }

  // ─── Invites ──────────────────────────────────────────────────────────

  async createInvite(
    serverId: string,
    userId: string,
    params: CreateServerInviteParams,
  ): Promise<IServerInviteToken> {
    const server = await this.resolveServer(serverId);

    if (!server.memberIds.includes(userId)) {
      throw new NotServerMemberError();
    }

    const now = brightDateNow();
    const invite: IServerInviteToken = {
      token: uuidv4(),
      serverId,
      createdBy: userId,
      createdAt: now,
      expiresAt: params.expiresInMs
        ? now + params.expiresInMs / 86400000 // convert ms to days for BrightDate
        : undefined,
      maxUses: params.maxUses,
      currentUses: 0,
    };

    this.inviteCache.set(invite.token, invite);
    await this.serverInviteCollection.create(invite);
    return invite;
  }

  async redeemInvite(
    serverId: string,
    token: string,
    userId: string,
  ): Promise<void> {
    const invite = await this.resolveInvite(token);
    if (!invite) throw new ServerInviteNotFoundError(token);
    if (invite.serverId !== serverId)
      throw new ServerInviteNotFoundError(token);
    if (invite.expiresAt && brightDateNow() >= invite.expiresAt)
      throw new ServerInviteExpiredError();
    if (invite.maxUses !== undefined && invite.currentUses >= invite.maxUses)
      throw new ServerInviteExpiredError();

    const server = await this.resolveServer(serverId);

    if (server.memberIds.includes(userId)) {
      throw new MemberAlreadyInServerError(userId);
    }

    server.memberIds.push(userId);
    server.updatedAt = brightDateNow();

    for (const channelId of server.channelIds) {
      await this.channelService.addMemberToChannel(channelId, userId);
    }

    invite.currentUses++;

    await this.persistServer(server);
    this.inviteCache.set(invite.token, invite);
    await this.serverInviteCollection.update(invite.token, invite);
  }

  // ─── Channel management within server ────────────────────────────────

  async createChannelInServer(
    serverId: string,
    userId: string,
    params: CreateChannelInServerParams,
    categoryId?: string,
  ): Promise<IChannel> {
    const server = await this.resolveServer(serverId);
    this.assertCanUpdate(server, userId);

    const channel = await this.channelService.createChannel(
      params.name,
      userId,
      params.visibility,
      params.topic ?? '',
      serverId,
    );

    server.channelIds.push(channel.id);

    let targetCategory: IServerCategory | undefined;
    if (categoryId) {
      targetCategory = server.categories.find((c) => c.id === categoryId);
    }
    if (!targetCategory && server.categories.length > 0) {
      targetCategory = server.categories[0];
    }

    const resolvedCategoryId = targetCategory?.id ?? '';
    if (targetCategory) {
      targetCategory.channelIds.push(channel.id);
    }

    server.updatedAt = brightDateNow();
    await this.persistServer(server);

    this.eventEmitter.emitServerChannelCreated(
      serverId,
      channel.id,
      channel.name,
      resolvedCategoryId,
    );

    return channel;
  }

  async removeChannelFromServer(
    serverId: string,
    channelId: string,
    userId: string,
  ): Promise<void> {
    const server = await this.resolveServer(serverId);
    this.assertCanUpdate(server, userId);

    await this.channelService.deleteChannel(channelId, userId);

    server.channelIds = server.channelIds.filter((id) => id !== channelId);
    for (const category of server.categories) {
      category.channelIds = category.channelIds.filter(
        (id) => id !== channelId,
      );
    }

    server.updatedAt = brightDateNow();
    await this.persistServer(server);
    this.eventEmitter.emitServerChannelDeleted(serverId, channelId);
  }

  // ─── Accessors (for testing / internal use) ───────────────────────────

  getServerById(serverId: string): IServer | undefined {
    return this.cache.get(serverId);
  }

  getInviteToken(token: string): IServerInviteToken | undefined {
    return this.inviteCache.get(token);
  }
}
