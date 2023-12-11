/**
 * ChannelService — manages channel lifecycle, visibility, invites, and messaging.
 *
 * Maintains in-memory stores for channels, messages, and invite tokens.
 * Supports channel creation with visibility modes, join/leave, messaging,
 * search, invite token generation/redemption, mute/kick operations.
 *
 * Uses epoch-aware key management via IKeyEpochState for forward secrecy.
 * Each key rotation creates a new epoch. Messages record which epoch they
 * were encrypted under. On member removal, all epoch keys are re-wrapped
 * for remaining members only.
 *
 * When an IChatStorageProvider is injected, channels, channel messages, and
 * invite tokens are also persisted to the provider's collections (write-through).
 * Sync helper methods continue to read from the in-memory Maps so their
 * signatures remain unchanged.
 *
 * Requirements: 10.3, 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1
 */

import { v4 as uuidv4 } from 'uuid';
import { getRandomBytes } from '../../crypto/platformCrypto';
import {
  ChannelVisibility,
  CommunicationEventType,
  DefaultRole,
  Permission,
} from '../../enumerations/communication';
import {
  IChannel,
  IChannelMember,
  IChannelUpdate,
  IChatAttachmentInput,
  ICommunicationMessage,
  IInviteToken,
  IPaginatedResult,
} from '../../interfaces/communication';
import { validateAndPrepareAttachments } from './attachmentUtils';
import {
  IChatCollection,
  IChatStorageProvider,
} from '../../interfaces/communication/chatStorageProvider';
import { IBlockContentStore } from '../../interfaces/communication/blockContentStore';
import {
  ICommunicationEventEmitter,
  NullEventEmitter,
} from '../../interfaces/events';
import { paginateItems } from '../../utils/pagination';
import { IKeyEpochState } from './keyEpochManager';
import { KeyEpochNotFoundError, KeyUnwrapError } from '../../errors/encryptionErrors';
import { MessageOperationsService } from './messageOperationsService';
import { PermissionService } from './permissionService';
import {
  reconstructKeyEpochState,
  groupAndSortMessages,
} from './rehydrationHelpers';

// ─── Error classes ──────────────────────────────────────────────────────────

export class ChannelNotFoundError extends Error {
  constructor(channelId: string) {
    super(`Channel ${channelId} not found`);
    this.name = 'ChannelNotFoundError';
  }
}

export class NotChannelMemberError extends Error {
  constructor() {
    super('You are not a member of this channel');
    this.name = 'NotChannelMemberError';
  }
}

export class ChannelMessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message ${messageId} not found`);
    this.name = 'ChannelMessageNotFoundError';
  }
}

export class ChannelPermissionError extends Error {
  public readonly missingPermission: Permission;
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = 'ChannelPermissionError';
    this.missingPermission = permission;
  }
}

export class ChannelMemberMutedError extends Error {
  constructor() {
    super('You are muted in this channel');
    this.name = 'ChannelMemberMutedError';
  }
}

export class NotMessageAuthorError extends Error {
  constructor() {
    super('You can only edit messages you authored');
    this.name = 'NotMessageAuthorError';
  }
}

export class ChannelReactionNotFoundError extends Error {
  constructor(reactionId: string) {
    super(`Reaction ${reactionId} not found`);
    this.name = 'ChannelReactionNotFoundError';
  }
}

export class MemberAlreadyInChannelError extends Error {
  constructor(memberId: string) {
    super(`Member ${memberId} is already in this channel`);
    this.name = 'MemberAlreadyInChannelError';
  }
}

export class ChannelNameConflictError extends Error {
  constructor(name: string) {
    super(`Channel name "${name}" is already taken`);
    this.name = 'ChannelNameConflictError';
  }
}

export class ChannelJoinDeniedError extends Error {
  constructor() {
    super('This channel requires an invitation to join');
    this.name = 'ChannelJoinDeniedError';
  }
}

export class InviteTokenExpiredError extends Error {
  constructor() {
    super('Invite token has expired or has been fully used');
    this.name = 'InviteTokenExpiredError';
  }
}

export class InviteTokenNotFoundError extends Error {
  constructor(token: string) {
    super(`Invite token ${token} not found`);
    this.name = 'InviteTokenNotFoundError';
  }
}

/**
 * Callback for encrypting a symmetric key for a specific member.
 * Returns the encrypted key as a string (e.g. base64).
 */
export type ChannelKeyEncryptionHandler = (
  memberId: string,
  symmetricKey: Uint8Array,
) => string;

/**
 * Default key encryption: base64-encodes the key prefixed with memberId.
 * Placeholder; real implementations use ECIES.
 */
function defaultKeyEncryption(
  memberId: string,
  symmetricKey: Uint8Array,
): string {
  const binary = Array.from(symmetricKey)
    .map((b) => String.fromCharCode(b))
    .join('');
  const base64 = btoa(binary);
  return `enc:${memberId}:${base64}`;
}

/**
 * Extract the symmetric key from a default-encrypted key string.
 * Only works with the default placeholder encryption.
 */
export function extractChannelKeyFromDefault(encrypted: string): Uint8Array {
  const parts = encrypted.split(':');
  const base64 = parts[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class ChannelService {
  /** channelId → IChannel */
  private readonly channels = new Map<string, IChannel>();

  /** channelId → messages (ordered by createdAt ascending) */
  private readonly messages = new Map<string, ICommunicationMessage[]>();

  /** channelId → epoch-aware key state (raw keys + wrapped keys per epoch) */
  private readonly keyEpochStates = new Map<string, IKeyEpochState<string>>();

  /** token string → IInviteToken */
  private readonly inviteTokens = new Map<string, IInviteToken>();

  /**
   * Per-server channel name uniqueness index.
   * Outer key = serverId (or '__standalone__' for channels without a server).
   * Inner key = normalized channel name → channelId.
   */
  private readonly nameIndex = new Map<string, Map<string, string>>();

  /** Sentinel key for channels that don't belong to any server. */
  private static readonly STANDALONE_KEY = '__standalone__';

  /** Whether init() has already been called (idempotency guard). */
  private initialized = false;

  private readonly permissionService: PermissionService;
  private readonly encryptKey: ChannelKeyEncryptionHandler;
  private readonly messageOps: MessageOperationsService;
  private readonly eventEmitter: ICommunicationEventEmitter;
  private readonly randomBytesProvider: (length: number) => Uint8Array;

  /** Optional persistent collection for channels (write-through). */
  private readonly channelCollection: IChatCollection<IChannel> | undefined;

  /** Optional persistent collection for channel messages (write-through). */
  private readonly channelMessageCollection:
    | IChatCollection<ICommunicationMessage>
    | undefined;

  /** Optional persistent collection for invite tokens (write-through). */
  private readonly inviteTokenCollection:
    | IChatCollection<IInviteToken>
    | undefined;

  /** Optional block content store for storing message content as blocks. */
  private readonly blockContentStore: IBlockContentStore | undefined;

  constructor(
    permissionService: PermissionService,
    encryptKey: ChannelKeyEncryptionHandler = defaultKeyEncryption,
    messageOps?: MessageOperationsService,
    eventEmitter?: ICommunicationEventEmitter,
    randomBytesProvider?: (length: number) => Uint8Array,
    storageProvider?: IChatStorageProvider,
    blockContentStore?: IBlockContentStore,
  ) {
    this.permissionService = permissionService;
    this.encryptKey = encryptKey;
    this.messageOps =
      messageOps ?? new MessageOperationsService(permissionService);
    this.eventEmitter = eventEmitter ?? new NullEventEmitter();
    this.randomBytesProvider = randomBytesProvider ?? getRandomBytes;
    this.blockContentStore = blockContentStore;
    if (storageProvider) {
      this.channelCollection = storageProvider.channels;
      this.channelMessageCollection = storageProvider.channelMessages;
      this.inviteTokenCollection = storageProvider.inviteTokens;
    }
  }

  // ─── Rehydration ──────────────────────────────────────────────────────

  /**
   * Load persisted channels, channel messages, and invite tokens back into
   * in-memory Maps, rebuilding derived indexes, key epoch states, and
   * permission registrations.
   *
   * Idempotent: only the first call performs rehydration. No-op when no
   * storage provider was supplied at construction time.
   *
   * Requirements: 1.3, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 8.2, 8.3, 9.1, 9.3, 9.4
   */
  public async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.channelCollection) return;

    this.initialized = true;

    // ── Load channels ─────────────────────────────────────────────────
    let loadedChannels: IChannel[];
    try {
      loadedChannels = await this.channelCollection.findMany();
    } catch (error) {
      console.error(
        '[ChannelService] Failed to load from channels collection:',
        error,
      );
      throw error;
    }

    for (const channel of loadedChannels) {
      this.channels.set(channel.id, channel);

      // Rebuild name index (scoped by serverId)
      this.registerName(
        this.nameScope(channel.serverId),
        channel.name.toLowerCase(),
        channel.id,
      );

      // Reconstruct key epoch state
      const epochState = reconstructKeyEpochState(channel.encryptedSharedKey);
      if (epochState) {
        this.keyEpochStates.set(channel.id, epochState);
      } else {
        console.warn(
          `[ChannelService] Skipping key epoch reconstruction for channel ${channel.id}: malformed encryptedSharedKey`,
        );
      }

      // Register permissions for each member
      for (const member of channel.members) {
        this.permissionService.assignRole(
          member.memberId,
          channel.id,
          member.role,
        );
      }
    }

    // ── Load channel messages ───────────────────────────────────────────
    let loadedMessages: ICommunicationMessage[];
    try {
      loadedMessages = await this.channelMessageCollection!.findMany();
    } catch (error) {
      console.error(
        '[ChannelService] Failed to load from channelMessages collection:',
        error,
      );
      throw error;
    }

    const grouped = groupAndSortMessages(loadedMessages);
    for (const [contextId, msgs] of grouped) {
      this.messages.set(contextId, msgs);
    }

    // ── Load invite tokens ──────────────────────────────────────────────
    let loadedTokens: IInviteToken[];
    try {
      loadedTokens = await this.inviteTokenCollection!.findMany();
    } catch (error) {
      console.error(
        '[ChannelService] Failed to load from inviteTokens collection:',
        error,
      );
      throw error;
    }

    for (const token of loadedTokens) {
      this.inviteTokens.set(token.token, token);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private assertChannelExists(channelId: string): IChannel {
    const channel = this.channels.get(channelId);
    if (!channel) throw new ChannelNotFoundError(channelId);
    return channel;
  }

  private assertIsMember(channel: IChannel, memberId: string): IChannelMember {
    const member = channel.members.find((m) => m.memberId === memberId);
    if (!member) throw new NotChannelMemberError();
    return member;
  }

  private assertPermission(
    memberId: string,
    channelId: string,
    permission: Permission,
  ): void {
    if (
      !this.permissionService.hasPermission(memberId, channelId, permission)
    ) {
      throw new ChannelPermissionError(permission);
    }
  }

  private assertNotMuted(memberId: string, channelId: string): void {
    if (this.permissionService.isMuted(memberId, channelId)) {
      throw new ChannelMemberMutedError();
    }
  }

  private generateSymmetricKey(): Uint8Array {
    return this.randomBytesProvider(32);
  }

  /**
   * Encrypt a symmetric key for multiple members, returning a Map<memberId, wrappedKey>.
   * Wraps key wrapping failures as KeyUnwrapError with context information.
   *
   * Requirements: 12.3
   */
  private encryptKeyForMembers(
    memberIds: string[],
    symmetricKey: Uint8Array,
    contextId?: string,
    epoch?: number,
  ): Map<string, string> {
    const encrypted = new Map<string, string>();
    for (const id of memberIds) {
      try {
        encrypted.set(id, this.encryptKey(id, symmetricKey));
      } catch (error) {
        if (contextId !== undefined && epoch !== undefined) {
          throw new KeyUnwrapError(contextId, id, epoch);
        }
        throw error;
      }
    }
    return encrypted;
  }

  /**
   * Create initial epoch state (epoch 0) for a new channel.
   * Uses KeyEpochManager pattern: creates epoch 0 with wrapped keys for all members.
   *
   * Requirements: 1.3, 2.1
   */
  private createInitialEpochState(
    symmetricKey: Uint8Array,
    memberIds: string[],
  ): IKeyEpochState<string> {
    const epochKeys = new Map<number, Uint8Array>();
    epochKeys.set(0, symmetricKey);

    const wrappedKeys = this.encryptKeyForMembers(memberIds, symmetricKey);
    const encryptedEpochKeys = new Map<number, Map<string, string>>();
    encryptedEpochKeys.set(0, wrappedKeys);

    return { currentEpoch: 0, epochKeys, encryptedEpochKeys };
  }

  /**
   * Add a member to an existing epoch state: wrap ALL epoch keys for the new member.
   * This gives the new member access to full message history.
   *
   * Requirements: 2.2, 6.1, 6.3
   */
  private addMemberToEpochState(
    state: IKeyEpochState<string>,
    newMemberId: string,
  ): void {
    for (const [epoch, rawKey] of state.epochKeys) {
      const epochMap =
        state.encryptedEpochKeys.get(epoch) ?? new Map<string, string>();
      epochMap.set(newMemberId, this.encryptKey(newMemberId, rawKey));
      state.encryptedEpochKeys.set(epoch, epochMap);
    }
  }

  /**
   * Rotate key: increment epoch, add new key, delete removed member from ALL epochs,
   * re-wrap ALL epoch keys for remaining members.
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  private rotateEpochState(
    state: IKeyEpochState<string>,
    newKey: Uint8Array,
    remainingMemberIds: string[],
    removedMemberId: string,
  ): IKeyEpochState<string> {
    const newEpoch = state.currentEpoch + 1;

    // Add new epoch key
    state.epochKeys.set(newEpoch, newKey);

    // Delete removed member from ALL epochs
    for (const [, memberMap] of state.encryptedEpochKeys) {
      memberMap.delete(removedMemberId);
    }

    // Re-wrap ALL epoch keys for remaining members
    for (const [epoch, rawKey] of state.epochKeys) {
      state.encryptedEpochKeys.set(
        epoch,
        this.encryptKeyForMembers(remainingMemberIds, rawKey),
      );
    }

    return { ...state, currentEpoch: newEpoch };
  }

  /**
   * Rotate the channel's symmetric key using epoch-aware key management.
   * Generates a new key, increments epoch, re-wraps all epoch keys for remaining members,
   * and removes the departed member from all epochs.
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  private rotateKey(channel: IChannel, removedMemberId: string): void {
    const newKey = this.generateSymmetricKey();
    const state = this.keyEpochStates.get(channel.id);

    if (state) {
      const remainingMemberIds = channel.members.map((m) => m.memberId);
      const newState = this.rotateEpochState(
        state,
        newKey,
        remainingMemberIds,
        removedMemberId,
      );
      this.keyEpochStates.set(channel.id, newState);
      channel.encryptedSharedKey = newState.encryptedEpochKeys;
    }
  }

  /**
   * Assert that a key epoch exists in the epoch state for a given context.
   * Throws KeyEpochNotFoundError if the epoch is not found.
   *
   * Requirements: 12.3
   */
  private assertEpochExists(contextId: string, keyEpoch: number): void {
    const state = this.keyEpochStates.get(contextId);
    if (!state || !state.epochKeys.has(keyEpoch)) {
      throw new KeyEpochNotFoundError(contextId, keyEpoch);
    }
  }

  private normalizeChannelName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  /** Get the nameIndex scope key for a channel's server (or standalone). */
  private nameScope(serverId?: string): string {
    return serverId ?? ChannelService.STANDALONE_KEY;
  }

  /** Check if a channel name is taken within a given server scope. */
  private isNameTaken(scope: string, normalized: string, excludeChannelId?: string): boolean {
    const scopeMap = this.nameIndex.get(scope);
    if (!scopeMap) return false;
    const existingId = scopeMap.get(normalized);
    return !!existingId && existingId !== excludeChannelId;
  }

  /** Register a channel name in the scoped index. */
  private registerName(scope: string, normalized: string, channelId: string): void {
    let scopeMap = this.nameIndex.get(scope);
    if (!scopeMap) {
      scopeMap = new Map<string, string>();
      this.nameIndex.set(scope, scopeMap);
    }
    scopeMap.set(normalized, channelId);
  }

  /** Remove a channel name from the scoped index. */
  private unregisterName(scope: string, normalized: string): void {
    const scopeMap = this.nameIndex.get(scope);
    if (scopeMap) {
      scopeMap.delete(normalized);
      if (scopeMap.size === 0) {
        this.nameIndex.delete(scope);
      }
    }
  }

  // ─── Channel lifecycle ──────────────────────────────────────────────────

  /**
   * Create a new channel.
   * Generates a shared symmetric key and encrypts it for the creator.
   * The creator is assigned the OWNER role.
   * Uses KeyEpochManager pattern to create initial epoch 0.
   *
   * Requirements: 10.3, 1.3, 2.1, 9.1
   */
  async createChannel(
    name: string,
    creatorId: string,
    visibility: ChannelVisibility,
    topic: string = '',
    serverId?: string,
  ): Promise<IChannel> {
    const normalized = this.normalizeChannelName(name);
    const scope = this.nameScope(serverId);
    if (this.isNameTaken(scope, normalized)) {
      throw new ChannelNameConflictError(name);
    }

    const now = new Date();
    const symmetricKey = this.generateSymmetricKey();
    const channelId = uuidv4();

    const members: IChannelMember[] = [
      {
        memberId: creatorId,
        role: DefaultRole.OWNER,
        joinedAt: now,
      },
    ];

    // Create initial epoch state (epoch 0) with wrapped key for creator
    const epochState = this.createInitialEpochState(symmetricKey, [creatorId]);

    const channel: IChannel = {
      id: channelId,
      name: normalized,
      topic,
      creatorId,
      visibility,
      members,
      encryptedSharedKey: epochState.encryptedEpochKeys,
      createdAt: now,
      lastMessageAt: now,
      pinnedMessageIds: [],
      historyVisibleToNewMembers: true,
      serverId,
    };

    this.channels.set(channelId, channel);
    this.messages.set(channelId, []);
    this.keyEpochStates.set(channelId, epochState);
    this.registerName(scope, normalized, channelId);

    this.permissionService.assignRole(creatorId, channelId, DefaultRole.OWNER);

    // Persist to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.create(channel);
    }

    return channel;
  }

  /**
   * List channels visible to a member.
   * Returns public channels, plus private/secret/invisible channels
   * where the member is already a member.
   *
   * Requirement 10.3: visibility filtering.
   */
  async listChannels(
    memberId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<IPaginatedResult<IChannel>> {
    const visible = Array.from(this.channels.values()).filter((ch) => {
      if (ch.visibility === ChannelVisibility.PUBLIC) return true;
      return ch.members.some((m) => m.memberId === memberId);
    });

    visible.sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
    );

    return paginateItems(visible, cursor, limit);
  }

  /**
   * Get channel metadata. Requires membership.
   */
  async getChannel(channelId: string, requesterId: string): Promise<IChannel> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, requesterId);
    return channel;
  }

  /**
   * Update channel settings (visibility, topic, name).
   * Requires MANAGE_CHANNEL permission.
   *
   * Requirement 10.3: immediately enforce new visibility rules.
   */
  async updateChannel(
    channelId: string,
    requesterId: string,
    updates: Partial<IChannelUpdate>,
  ): Promise<IChannel> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, requesterId);
    this.assertPermission(requesterId, channelId, Permission.MANAGE_CHANNEL);

    if (updates.name !== undefined) {
      const normalized = this.normalizeChannelName(updates.name);
      const scope = this.nameScope(channel.serverId);
      if (this.isNameTaken(scope, normalized, channelId)) {
        throw new ChannelNameConflictError(updates.name);
      }
      this.unregisterName(scope, channel.name);
      channel.name = normalized;
      this.registerName(scope, normalized, channelId);
    }

    if (updates.topic !== undefined) {
      channel.topic = updates.topic;
    }

    if (updates.visibility !== undefined) {
      channel.visibility = updates.visibility;
    }

    if (updates.historyVisibleToNewMembers !== undefined) {
      channel.historyVisibleToNewMembers = updates.historyVisibleToNewMembers;
    }

    this.eventEmitter.emitChannelUpdated(channelId, channelId, requesterId);

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    return channel;
  }

  /**
   * Delete a channel. Requires MANAGE_CHANNEL permission.
   */
  async deleteChannel(channelId: string, requesterId: string): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, requesterId);
    this.assertPermission(requesterId, channelId, Permission.MANAGE_CHANNEL);

    this.unregisterName(this.nameScope(channel.serverId), channel.name);
    this.channels.delete(channelId);
    this.messages.delete(channelId);
    this.keyEpochStates.delete(channelId);

    // Persist deletion to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.delete(channelId);
    }
  }

  // ─── Join / Leave ─────────────────────────────────────────────────────

  /**
   * Join a public channel. Rejects invite-only channels.
   * Wraps ALL epoch keys for the new member so they can read history.
   *
   * Requirements: 10.3, 2.2
   */
  async joinChannel(channelId: string, memberId: string): Promise<void> {
    const channel = this.assertChannelExists(channelId);

    if (channel.members.some((m) => m.memberId === memberId)) {
      throw new MemberAlreadyInChannelError(memberId);
    }

    if (channel.visibility !== ChannelVisibility.PUBLIC) {
      throw new ChannelJoinDeniedError();
    }

    const now = new Date();
    channel.members.push({
      memberId,
      role: DefaultRole.MEMBER,
      joinedAt: now,
    });

    // Add member to epoch state: wrap ALL epoch keys for the new member
    const state = this.keyEpochStates.get(channelId);
    if (state) {
      this.addMemberToEpochState(state, memberId);
      channel.encryptedSharedKey = state.encryptedEpochKeys;
    }

    this.permissionService.assignRole(memberId, channelId, DefaultRole.MEMBER);

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMemberJoined('channel', channelId, memberId);
  }

  /**
   * Remove a member from a channel (server-level operation).
   * Bypasses permission checks — used by ServerService when a member is removed
   * from a server so that key rotation is performed for each affected channel.
   * Silently skips if the member is not in the channel.
   *
   * Requirements: 7.1, 7.2, 7.3
   */
  async removeMemberFromChannel(
    channelId: string,
    memberId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);

    // Skip if not a member
    if (!channel.members.some((m) => m.memberId === memberId)) {
      return;
    }

    channel.members = channel.members.filter((m) => m.memberId !== memberId);

    if (channel.members.length > 0) {
      this.rotateKey(channel, memberId);
    } else {
      // No members left — clean up epoch state
      const state = this.keyEpochStates.get(channelId);
      if (state) {
        for (const [, epochMap] of state.encryptedEpochKeys) {
          epochMap.delete(memberId);
        }
        channel.encryptedSharedKey = state.encryptedEpochKeys;
      }
    }

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMemberLeft('channel', channelId, memberId);
  }

  /**
   * Add a member to a channel (server-level operation).
   * Bypasses visibility checks — used by ServerService when a member joins a server
   * so that all epoch keys are wrapped for the new member across all server channels.
   * Silently skips if the member is already in the channel.
   *
   * Requirements: 6.1, 6.2, 6.3
   */
  async addMemberToChannel(
    channelId: string,
    memberId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);

    // Skip if already a member
    if (channel.members.some((m) => m.memberId === memberId)) {
      return;
    }

    const now = new Date();
    channel.members.push({
      memberId,
      role: DefaultRole.MEMBER,
      joinedAt: now,
    });

    // Add member to epoch state: wrap ALL epoch keys for the new member
    const state = this.keyEpochStates.get(channelId);
    if (state) {
      this.addMemberToEpochState(state, memberId);
      channel.encryptedSharedKey = state.encryptedEpochKeys;
    }

    this.permissionService.assignRole(memberId, channelId, DefaultRole.MEMBER);

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMemberJoined('channel', channelId, memberId);
  }

  /**
   * Leave a channel voluntarily. Rotates the shared key.
   *
   * Requirements: 3.5
   */
  async leaveChannel(channelId: string, memberId: string): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    channel.members = channel.members.filter((m) => m.memberId !== memberId);

    if (channel.members.length > 0) {
      this.rotateKey(channel, memberId);
    } else {
      // No members left — clean up epoch state
      const state = this.keyEpochStates.get(channelId);
      if (state) {
        for (const [, epochMap] of state.encryptedEpochKeys) {
          epochMap.delete(memberId);
        }
        channel.encryptedSharedKey = state.encryptedEpochKeys;
      }
    }

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMemberLeft('channel', channelId, memberId);
  }

  // ─── Messaging ────────────────────────────────────────────────────────

  /**
   * Send a message to a channel.
   * Encrypts content with the current epoch's CEK and records the keyEpoch.
   * Optionally accepts attachments which are validated against platform limits.
   *
   * Requirements: 10.3, 1.1, 1.4, 9.1, 11.1, 11.2, 11.4, 11.5
   */
  async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
    attachments?: IChatAttachmentInput[],
  ): Promise<ICommunicationMessage> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, senderId);
    this.assertPermission(senderId, channelId, Permission.SEND_MESSAGES);
    this.assertNotMuted(senderId, channelId);

    // Validate and prepare attachment metadata before creating the message
    const attachmentMetadata = attachments?.length
      ? validateAndPrepareAttachments(attachments)
      : [];

    const state = this.keyEpochStates.get(channelId);
    const currentEpoch = state?.currentEpoch ?? 0;

    // Store content via block content store if available; otherwise use raw content
    let messageContent = content;
    if (this.blockContentStore) {
      const memberIds = channel.members.map((m) => m.memberId);
      const { blockReference } = await this.blockContentStore.storeContent(
        content,
        senderId,
        memberIds,
      );
      messageContent = blockReference;
    }

    const now = new Date();
    const message: ICommunicationMessage = {
      id: uuidv4(),
      contextType: 'channel',
      contextId: channelId,
      senderId,
      encryptedContent: messageContent,
      createdAt: now,
      editHistory: [],
      deleted: false,
      pinned: false,
      reactions: [],
      keyEpoch: currentEpoch,
      attachments: attachmentMetadata,
    };

    this.messages.get(channelId)!.push(message);
    channel.lastMessageAt = now;

    // Persist to storage provider if available
    if (this.channelMessageCollection) {
      await this.channelMessageCollection.create(message);
    }
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMessageSent(
      'channel',
      channelId,
      message.id,
      senderId,
    );

    // Return the message with the original readable content for display,
    // while the stored version retains the block reference (magnet URL)
    return this.blockContentStore
      ? { ...message, encryptedContent: content }
      : message;
  }

  /**
   * Get messages in a channel with cursor-based pagination.
   * Messages are returned with their keyEpoch so clients can decrypt
   * using the appropriate epoch's CEK.
   * Validates that each message's keyEpoch exists in the epoch state;
   * throws KeyEpochNotFoundError if a message references a non-existent epoch.
   *
   * Requirements: 1.2, 12.3
   */
  async getMessages(
    channelId: string,
    memberId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<IPaginatedResult<ICommunicationMessage>> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];

    // Validate that each message's keyEpoch exists in the epoch state
    for (const msg of msgs) {
      this.assertEpochExists(channelId, msg.keyEpoch);
    }

    const result = paginateItems(msgs, cursor, limit);

    // Resolve block references (magnet URLs) back to readable content
    if (this.blockContentStore) {
      const resolved = await Promise.all(
        result.items.map(async (msg) => {
          if (msg.deleted) return msg;
          try {
            const contentBytes = await this.blockContentStore!.retrieveContent(
              msg.encryptedContent as string,
            );
            if (contentBytes) {
              return {
                ...msg,
                encryptedContent: new TextDecoder().decode(contentBytes),
              };
            }
          } catch {
            // Fall back to stored value if retrieval fails
          }
          return msg;
        }),
      );
      return { ...result, items: resolved };
    }

    return result;
  }

  /**
   * Search messages in a channel by keyword.
   */
  async searchMessages(
    channelId: string,
    memberId: string,
    query: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<IPaginatedResult<ICommunicationMessage>> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];
    const lowerQuery = query.toLowerCase();

    if (this.blockContentStore) {
      // Retrieve content from block store for each non-deleted message before searching
      const matching: ICommunicationMessage[] = [];
      for (const m of msgs) {
        if (m.deleted) continue;
        const contentBytes = await this.blockContentStore.retrieveContent(
          m.encryptedContent as string,
        );
        if (contentBytes) {
          const contentText = new TextDecoder().decode(contentBytes);
          if (contentText.toLowerCase().includes(lowerQuery)) {
            matching.push(m);
          }
        }
      }
      return paginateItems(matching, cursor, limit);
    }

    // Fall back to current direct string search when block store is absent
    const matching = msgs.filter(
      (m) =>
        !m.deleted &&
        typeof m.encryptedContent === 'string' &&
        m.encryptedContent.toLowerCase().includes(lowerQuery),
    );

    return paginateItems(matching, cursor, limit);
  }

  // ─── Invite tokens ────────────────────────────────────────────────────

  /**
   * Generate an invite token for a channel.
   * Requires CREATE_INVITES permission.
   *
   * Requirement 10.3: time-limited, single-use or multi-use invite token.
   */
  async createInvite(
    channelId: string,
    creatorId: string,
    maxUses: number = 1,
    expiresInMs: number = 24 * 60 * 60 * 1000,
  ): Promise<IInviteToken> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, creatorId);
    this.assertPermission(creatorId, channelId, Permission.CREATE_INVITES);

    const now = new Date();
    const token: IInviteToken = {
      token: uuidv4(),
      channelId,
      createdBy: creatorId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresInMs),
      maxUses,
      currentUses: 0,
    };

    this.inviteTokens.set(token.token, token);

    // Persist invite token to storage provider if available
    if (this.inviteTokenCollection) {
      await this.inviteTokenCollection.create(token);
    }

    return token;
  }

  /**
   * Redeem an invite token to join a channel.
   * Wraps ALL epoch keys for the joining member.
   *
   * Requirements: 10.3, 2.2
   */
  async redeemInvite(token: string, memberId: string): Promise<void> {
    const invite = this.inviteTokens.get(token);
    if (!invite) {
      throw new InviteTokenNotFoundError(token);
    }

    if (new Date() >= invite.expiresAt) {
      throw new InviteTokenExpiredError();
    }

    if (invite.currentUses >= invite.maxUses) {
      throw new InviteTokenExpiredError();
    }

    const channel = this.assertChannelExists(invite.channelId);

    if (channel.members.some((m) => m.memberId === memberId)) {
      throw new MemberAlreadyInChannelError(memberId);
    }

    const now = new Date();
    channel.members.push({
      memberId,
      role: DefaultRole.MEMBER,
      joinedAt: now,
    });

    // Add member to epoch state: wrap ALL epoch keys for the new member
    const state = this.keyEpochStates.get(channel.id);
    if (state) {
      this.addMemberToEpochState(state, memberId);
      channel.encryptedSharedKey = state.encryptedEpochKeys;
    }

    this.permissionService.assignRole(memberId, channel.id, DefaultRole.MEMBER);

    invite.currentUses++;

    // Persist changes to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channel.id, channel);
    }
    if (this.inviteTokenCollection) {
      await this.inviteTokenCollection.update(invite.token, invite);
    }

    this.eventEmitter.emitMemberJoined('channel', channel.id, memberId);
  }

  // ─── Moderation ───────────────────────────────────────────────────────

  /**
   * Mute a member in a channel.
   * Requires MUTE_MEMBERS permission.
   *
   * Requirement 10.3: prevent muted member from sending messages.
   */
  async muteMember(
    channelId: string,
    requesterId: string,
    targetId: string,
    durationMs: number,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, requesterId);
    this.assertIsMember(channel, targetId);
    this.assertPermission(requesterId, channelId, Permission.MUTE_MEMBERS);

    this.permissionService.muteMember(targetId, channelId, durationMs);

    const member = channel.members.find((m) => m.memberId === targetId);
    if (member) {
      member.mutedUntil = new Date(Date.now() + durationMs);
    }

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMemberMuted(
      'channel',
      channelId,
      targetId,
      requesterId,
      durationMs,
    );
  }

  /**
   * Kick a member from a channel. Rotates encryption keys using epoch-aware rotation.
   * Requires KICK_MEMBERS permission.
   *
   * Requirements: 10.3, 3.1, 3.2, 3.3, 3.4
   */
  async kickMember(
    channelId: string,
    requesterId: string,
    targetId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, requesterId);
    this.assertIsMember(channel, targetId);
    this.assertPermission(requesterId, channelId, Permission.KICK_MEMBERS);

    channel.members = channel.members.filter((m) => m.memberId !== targetId);

    if (channel.members.length > 0) {
      this.rotateKey(channel, targetId);
    } else {
      // No members left — clean up epoch state
      const state = this.keyEpochStates.get(channelId);
      if (state) {
        for (const [, epochMap] of state.encryptedEpochKeys) {
          epochMap.delete(targetId);
        }
        channel.encryptedSharedKey = state.encryptedEpochKeys;
      }
    }

    // Persist channel update to storage provider if available
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMemberKicked(
      'channel',
      channelId,
      targetId,
      requesterId,
    );
  }

  // ─── Message operations ───────────────────────────────────────────────

  /**
   * Edit a message authored by the requesting member.
   * Delegates to MessageOperationsService.
   */
  async editMessage(
    channelId: string,
    messageId: string,
    memberId: string,
    newContent: string,
  ): Promise<ICommunicationMessage> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];

    if (this.blockContentStore) {
      // Find the message manually to handle block storage
      const message = msgs.find((m) => m.id === messageId);
      if (!message) throw new ChannelMessageNotFoundError(messageId);
      if (message.senderId !== memberId) throw new NotMessageAuthorError();

      // Store new content as a new block
      const memberIds = channel.members.map((m) => m.memberId);
      const { blockReference } = await this.blockContentStore.storeContent(
        newContent,
        memberId,
        memberIds,
      );

      // Push old block reference to edit history
      message.editHistory.push({
        content: message.encryptedContent,
        editedAt: new Date(),
      });

      // Update encryptedContent to new block reference
      message.encryptedContent = blockReference;
      message.editedAt = new Date();

      // Persist edited message to storage provider if available
      if (this.channelMessageCollection) {
        await this.channelMessageCollection.update(messageId, message);
      }

      this.eventEmitter.emitMessageEdited(
        'channel',
        channelId,
        messageId,
        memberId,
      );

      return message;
    }

    const edited = this.messageOps.editMessage(
      msgs,
      messageId,
      memberId,
      newContent,
      (id) => new ChannelMessageNotFoundError(id),
      () => new NotMessageAuthorError(),
    );

    // Persist edited message to storage provider if available
    if (this.channelMessageCollection) {
      await this.channelMessageCollection.update(messageId, edited);
    }

    this.eventEmitter.emitMessageEdited(
      'channel',
      channelId,
      messageId,
      memberId,
    );

    return edited;
  }

  /**
   * Delete a message. Authors can delete their own; moderators/admins can delete any.
   * Delegates to MessageOperationsService.
   */
  async deleteMessage(
    channelId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];
    this.messageOps.deleteMessage(
      msgs,
      channelId,
      messageId,
      memberId,
      (id) => new ChannelMessageNotFoundError(id),
      (p) => new ChannelPermissionError(p),
    );

    // Persist deleted message to storage provider if available
    if (this.channelMessageCollection) {
      const deletedMsg = msgs.find((m) => m.id === messageId);
      if (deletedMsg) {
        await this.channelMessageCollection.update(messageId, deletedMsg);
      }
    }

    this.eventEmitter.emitMessageDeleted(
      'channel',
      channelId,
      messageId,
      memberId,
    );
  }

  /**
   * Pin a message in a channel.
   * Delegates to MessageOperationsService.
   */
  async pinMessage(
    channelId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];
    this.messageOps.pinMessage(
      msgs,
      channelId,
      messageId,
      memberId,
      channel,
      (id) => new ChannelMessageNotFoundError(id),
      (p) => new ChannelPermissionError(p),
    );

    // Persist pin changes to storage provider if available
    if (this.channelMessageCollection) {
      const pinnedMsg = msgs.find((m) => m.id === messageId);
      if (pinnedMsg) {
        await this.channelMessageCollection.update(messageId, pinnedMsg);
      }
    }
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMessagePinEvent(
      CommunicationEventType.MESSAGE_PINNED,
      'channel',
      channelId,
      messageId,
      memberId,
    );
  }

  /**
   * Unpin a message in a channel.
   * Delegates to MessageOperationsService.
   */
  async unpinMessage(
    channelId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];
    this.messageOps.unpinMessage(
      msgs,
      channelId,
      messageId,
      memberId,
      channel,
      (id) => new ChannelMessageNotFoundError(id),
      (p) => new ChannelPermissionError(p),
    );

    // Persist unpin changes to storage provider if available
    if (this.channelMessageCollection) {
      const unpinnedMsg = msgs.find((m) => m.id === messageId);
      if (unpinnedMsg) {
        await this.channelMessageCollection.update(messageId, unpinnedMsg);
      }
    }
    if (this.channelCollection) {
      await this.channelCollection.update(channelId, channel);
    }

    this.eventEmitter.emitMessagePinEvent(
      CommunicationEventType.MESSAGE_UNPINNED,
      'channel',
      channelId,
      messageId,
      memberId,
    );
  }

  /**
   * Add a reaction to a message.
   * Delegates to MessageOperationsService.
   */
  async addReaction(
    channelId: string,
    messageId: string,
    memberId: string,
    emoji: string,
  ): Promise<string> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];
    const reactionId = this.messageOps.addReaction(
      msgs,
      messageId,
      memberId,
      emoji,
      (id) => new ChannelMessageNotFoundError(id),
    );

    // Persist reaction change to storage provider if available
    if (this.channelMessageCollection) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) {
        await this.channelMessageCollection.update(messageId, msg);
      }
    }

    this.eventEmitter.emitReactionEvent(
      CommunicationEventType.REACTION_ADDED,
      'channel',
      channelId,
      messageId,
      memberId,
      emoji,
      reactionId,
    );

    return reactionId;
  }

  /**
   * Remove a reaction from a message.
   * Delegates to MessageOperationsService.
   */
  async removeReaction(
    channelId: string,
    messageId: string,
    memberId: string,
    reactionId: string,
  ): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    const msgs = this.messages.get(channelId) ?? [];
    this.messageOps.removeReaction(
      msgs,
      messageId,
      reactionId,
      (id) => new ChannelMessageNotFoundError(id),
      (id) => new ChannelReactionNotFoundError(id),
    );

    // Persist reaction removal to storage provider if available
    if (this.channelMessageCollection) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) {
        await this.channelMessageCollection.update(messageId, msg);
      }
    }

    this.eventEmitter.emitReactionEvent(
      CommunicationEventType.REACTION_REMOVED,
      'channel',
      channelId,
      messageId,
      memberId,
      '',
      reactionId,
    );
  }

  // ─── Accessors (for testing / internal use) ───────────────────────────

  getChannelById(channelId: string): IChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get the current epoch's raw symmetric key for a channel.
   * Returns the key for the latest epoch (backward-compatible accessor).
   */
  getSymmetricKey(channelId: string): Uint8Array | undefined {
    const state = this.keyEpochStates.get(channelId);
    if (!state) return undefined;
    return state.epochKeys.get(state.currentEpoch);
  }

  /**
   * Get the full epoch state for a channel (testing / internal use).
   */
  getKeyEpochState(channelId: string): IKeyEpochState<string> | undefined {
    return this.keyEpochStates.get(channelId);
  }

  getAllMessages(channelId: string): ICommunicationMessage[] {
    return this.messages.get(channelId) ?? [];
  }

  getInviteToken(token: string): IInviteToken | undefined {
    return this.inviteTokens.get(token);
  }

  /**
   * Return all channels the given member belongs to (no pagination).
   * Used by SearchService for cross-context keyword search.
   */
  listChannelsForMember(memberId: string): IChannel[] {
    return Array.from(this.channels.values()).filter((ch) =>
      ch.members.some((m) => m.memberId === memberId),
    );
  }
}
