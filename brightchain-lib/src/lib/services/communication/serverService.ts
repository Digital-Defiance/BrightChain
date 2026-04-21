/**
 * ServerService — manages server lifecycle, membership, and channel organization.
 *
 * Maintains in-memory stores for servers. When an IChatStorageProvider is
 * injected, servers are also persisted to the provider's collections (write-through).
 * Without a provider (e.g. in unit tests), services fall back to in-memory Maps.
 *
 * Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CommunicationEventType,
  DefaultRole,
  ChannelVisibility,
} from '../../enumerations/communication';
import {
  IChannel,
  IPaginatedResult,
} from '../../interfaces/communication';
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

/**
 * Parameters for creating a channel within a server.
 * Mirrors the shape of CreateChannelParams from brightchat-lib
 * but defined locally to avoid cross-package dependency.
 */
export interface CreateChannelInServerParams {
  name: string;
  topic?: string;
  visibility: ChannelVisibility;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class ServerService {
  /** serverId → IServer */
  private readonly servers = new Map<string, IServer>();

  /** token → IServerInviteToken */
  private readonly serverInviteTokens = new Map<string, IServerInviteToken>();

  private readonly channelService: ChannelService;
  private readonly eventEmitter: ICommunicationEventEmitter;

  /** Optional persistent collection for servers (write-through). */
  private readonly serverCollection: IChatCollection<IServer> | undefined;

  /** Optional persistent collection for server invite tokens (write-through). */
  private readonly serverInviteCollection: IChatCollection<IServerInviteToken> | undefined;

  constructor(options: {
    channelService: ChannelService;
    storageProvider?: IChatStorageProvider;
    eventEmitter?: ICommunicationEventEmitter;
  }) {
    this.channelService = options.channelService;
    this.eventEmitter = options.eventEmitter ?? new NullEventEmitter();
    if (options.storageProvider) {
      this.serverCollection = options.storageProvider.servers;
      this.serverInviteCollection = options.storageProvider.serverInvites;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private validateServerName(name: string): void {
    if (!name || name.length === 0 || name.length > 100) {
      throw new ServerNameValidationError();
    }
  }

  private assertServerExists(serverId: string): IServer {
    const server = this.servers.get(serverId);
    if (!server) throw new ServerNotFoundError(serverId);
    return server;
  }

  /**
   * Returns the role of a member within a server.
   * The server owner always has OWNER role; all other members have MEMBER role.
   * Returns null if the user is not a member.
   */
  getMemberRole(serverId: string, memberId: string): DefaultRole | null {
    const server = this.servers.get(serverId);
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

  /**
   * Create a new server with a default "General" category and "general" channel.
   * The owner is added as the first member.
   *
   * Requirements: 1.1, 1.3, 2.1
   */
  async createServer(
    ownerId: string,
    params: CreateServerParams,
  ): Promise<IServer> {
    this.validateServerName(params.name);

    const now = new Date();
    const serverId = uuidv4();
    const categoryId = uuidv4();

    // Create the default "general" channel via ChannelService
    const generalChannel: IChannel = await this.channelService.createChannel(
      'general',
      ownerId,
      ChannelVisibility.PUBLIC,
      '',
    );

    // Link the channel to this server
    generalChannel.serverId = serverId;

    // Build the default "General" category
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

    this.servers.set(serverId, server);

    // Persist to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.create(server);
    }

    return server;
  }

  /**
   * Get a server by ID.
   * Throws ServerNotFoundError if the server does not exist.
   *
   * Requirement: 2.3
   */
  async getServer(serverId: string): Promise<IServer> {
    return this.assertServerExists(serverId);
  }

  /**
   * Update server settings (name, iconUrl, categories).
   * Only the owner or admin can update.
   *
   * Requirements: 2.4, 2.5
   */
  async updateServer(
    serverId: string,
    userId: string,
    update: IServerUpdate,
  ): Promise<IServer> {
    const server = this.assertServerExists(serverId);
    this.assertCanUpdate(server, userId);

    if (update.name !== undefined) {
      this.validateServerName(update.name);
      server.name = update.name;
    }
    if (update.iconUrl !== undefined) {
      server.iconUrl = update.iconUrl;
    }
    if (update.categories !== undefined) {
      server.categories = update.categories;
    }

    server.updatedAt = new Date();

    // Persist to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.update(serverId, server);
    }

    return server;
  }

  /**
   * Delete a server and cascade-delete all its channels.
   * Only the owner can delete.
   *
   * Requirements: 2.5, 2.6
   */
  async deleteServer(serverId: string, userId: string): Promise<void> {
    const server = this.assertServerExists(serverId);
    this.assertCanDelete(server, userId);

    // Cascade delete all channels belonging to this server
    for (const channelId of server.channelIds) {
      try {
        await this.channelService.deleteChannel(channelId, server.ownerId);
      } catch {
        // Channel may already be deleted; continue cleanup
      }
    }

    this.servers.delete(serverId);

    // Persist deletion to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.delete(serverId);
    }
  }

  /**
   * List all servers where the given member is a member.
   * Supports cursor-based pagination.
   *
   * Requirement: 2.2
   */
  async listServersForMember(
    memberId: string,
    pagination?: { cursor?: string; limit?: number },
  ): Promise<IPaginatedResult<IServer>> {
    const memberServers = Array.from(this.servers.values()).filter((s) =>
      s.memberIds.includes(memberId),
    );

    // Sort by creation date descending (newest first)
    memberServers.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return paginateItems(
      memberServers,
      pagination?.cursor,
      pagination?.limit ?? 50,
    );
  }

  // ─── Membership ────────────────────────────────────────────────────────

  /**
   * Add members to a server. Only owner or admin can add members.
   * Skips members who are already in the server. Returns the list of
   * actually added member IDs.
   *
   * After adding, distributes channel keys for all server channels
   * to each new member via ChannelService.addMemberToChannel().
   *
   * Requirements: 2.7, 6.1, 6.2, 6.3
   */
  async addMembers(
    serverId: string,
    userId: string,
    memberIds: string[],
  ): Promise<string[]> {
    const server = this.assertServerExists(serverId);
    this.assertCanUpdate(server, userId);

    const added: string[] = [];
    for (const memberId of memberIds) {
      if (!server.memberIds.includes(memberId)) {
        server.memberIds.push(memberId);
        added.push(memberId);
      }
    }

    if (added.length > 0) {
      // Distribute channel keys for all server channels to each new member
      for (const memberId of added) {
        for (const channelId of server.channelIds) {
          await this.channelService.addMemberToChannel(channelId, memberId);
        }
      }

      server.updatedAt = new Date();

      // Persist to storage provider if available
      if (this.serverCollection) {
        await this.serverCollection.update(serverId, server);
      }
    }

    return added;
  }

  /**
   * Remove a member from a server and all of its channels.
   * Only owner or admin can remove members. Emits SERVER_MEMBER_REMOVED event.
   *
   * Delegates to ChannelService.removeMemberFromChannel() for each channel,
   * which performs epoch-aware key rotation and removes the member's wrapped
   * key entries from all epochs.
   *
   * Requirements: 2.8, 7.1, 7.2, 7.3
   */
  async removeMember(
    serverId: string,
    userId: string,
    memberId: string,
  ): Promise<void> {
    const server = this.assertServerExists(serverId);
    this.assertCanUpdate(server, userId);

    // Remove from server memberIds
    server.memberIds = server.memberIds.filter((id) => id !== memberId);

    // Remove from all server channels via ChannelService (triggers key rotation)
    for (const channelId of server.channelIds) {
      await this.channelService.removeMemberFromChannel(channelId, memberId);
    }

    server.updatedAt = new Date();

    // Persist to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.update(serverId, server);
    }

    this.eventEmitter.emitServerMemberRemoved(serverId, memberId);
  }

  // ─── Invites ──────────────────────────────────────────────────────────

  /**
   * Create an invite token for a server.
   * Only members of the server can create invites.
   * Generates a unique token with optional expiration and max-use limits.
   *
   * Requirements: 3.1
   */
  async createInvite(
    serverId: string,
    userId: string,
    params: CreateServerInviteParams,
  ): Promise<IServerInviteToken> {
    const server = this.assertServerExists(serverId);

    // Caller must be a member of the server
    if (!server.memberIds.includes(userId)) {
      throw new NotServerMemberError();
    }

    const now = new Date();
    const invite: IServerInviteToken = {
      token: uuidv4(),
      serverId,
      createdBy: userId,
      createdAt: now,
      expiresAt: params.expiresInMs
        ? new Date(now.getTime() + params.expiresInMs)
        : undefined,
      maxUses: params.maxUses,
      currentUses: 0,
    };

    this.serverInviteTokens.set(invite.token, invite);

    // Persist to storage provider if available
    if (this.serverInviteCollection) {
      await this.serverInviteCollection.create(invite);
    }

    return invite;
  }

  /**
   * Redeem an invite token to join a server.
   * Validates the token belongs to the specified server, checks expiration
   * and max-use limits, increments currentUses, and adds the user to the server.
   *
   * After joining, distributes channel keys for all server channels
   * to the new member via ChannelService.addMemberToChannel().
   *
   * Requirements: 3.2, 3.3, 3.4, 6.1, 6.2, 6.3
   */
  async redeemInvite(
    serverId: string,
    token: string,
    userId: string,
  ): Promise<void> {
    const invite = this.serverInviteTokens.get(token);
    if (!invite) {
      throw new ServerInviteNotFoundError(token);
    }

    // Validate the token belongs to the specified server
    if (invite.serverId !== serverId) {
      throw new ServerInviteNotFoundError(token);
    }

    // Check expiration
    if (invite.expiresAt && new Date() >= invite.expiresAt) {
      throw new ServerInviteExpiredError();
    }

    // Check max uses
    if (invite.maxUses !== undefined && invite.currentUses >= invite.maxUses) {
      throw new ServerInviteExpiredError();
    }

    const server = this.assertServerExists(serverId);

    // Skip if already a member
    if (server.memberIds.includes(userId)) {
      throw new MemberAlreadyInServerError(userId);
    }

    // Add user to server
    server.memberIds.push(userId);
    server.updatedAt = new Date();

    // Distribute channel keys for all server channels to the new member
    for (const channelId of server.channelIds) {
      await this.channelService.addMemberToChannel(channelId, userId);
    }

    // Increment usage
    invite.currentUses++;

    // Persist changes to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.update(serverId, server);
    }
    if (this.serverInviteCollection) {
      await this.serverInviteCollection.update(invite.token, invite);
    }
  }

  // ─── Channel management within server ────────────────────────────────

  /**
   * Create a channel within a server.
   * Validates caller has owner/admin role, creates the channel via ChannelService,
   * sets serverId on the channel, adds channelId to server.channelIds,
   * adds to specified category (or first category if not specified),
   * and emits SERVER_CHANNEL_CREATED event.
   *
   * Requirements: 1.3, 1.4, 7.2
   */
  async createChannelInServer(
    serverId: string,
    userId: string,
    params: CreateChannelInServerParams,
    categoryId?: string,
  ): Promise<IChannel> {
    const server = this.assertServerExists(serverId);
    this.assertCanUpdate(server, userId);

    // Create the channel via ChannelService
    const channel = await this.channelService.createChannel(
      params.name,
      userId,
      params.visibility,
      params.topic ?? '',
    );

    // Link the channel to this server
    channel.serverId = serverId;

    // Add channelId to server's channelIds
    server.channelIds.push(channel.id);

    // Determine target category
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

    server.updatedAt = new Date();

    // Persist to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.update(serverId, server);
    }

    this.eventEmitter.emitServerChannelCreated(
      serverId,
      channel.id,
      channel.name,
      resolvedCategoryId,
    );

    return channel;
  }

  /**
   * Remove a channel from a server.
   * Validates caller has owner/admin role, deletes the channel via ChannelService,
   * removes channelId from server.channelIds and from category.channelIds,
   * and emits SERVER_CHANNEL_DELETED event.
   *
   * Requirements: 1.3, 1.4, 7.2
   */
  async removeChannelFromServer(
    serverId: string,
    channelId: string,
    userId: string,
  ): Promise<void> {
    const server = this.assertServerExists(serverId);
    this.assertCanUpdate(server, userId);

    // Delete the channel via ChannelService
    await this.channelService.deleteChannel(channelId, userId);

    // Remove channelId from server's channelIds
    server.channelIds = server.channelIds.filter((id) => id !== channelId);

    // Remove from any category that contains it
    for (const category of server.categories) {
      category.channelIds = category.channelIds.filter(
        (id) => id !== channelId,
      );
    }

    server.updatedAt = new Date();

    // Persist to storage provider if available
    if (this.serverCollection) {
      await this.serverCollection.update(serverId, server);
    }

    this.eventEmitter.emitServerChannelDeleted(serverId, channelId);
  }

  // ─── Accessors (for testing / internal use) ───────────────────────────

  getServerById(serverId: string): IServer | undefined {
    return this.servers.get(serverId);
  }

  getInviteToken(token: string): IServerInviteToken | undefined {
    return this.serverInviteTokens.get(token);
  }
}
