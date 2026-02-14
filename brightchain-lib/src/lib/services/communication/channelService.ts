/**
 * ChannelService — manages channel lifecycle, visibility, invites, and messaging.
 *
 * Maintains in-memory stores for channels, messages, and invite tokens.
 * Supports channel creation with visibility modes, join/leave, messaging,
 * search, invite token generation/redemption, mute/kick operations.
 *
 * Requirements: 10.3
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
  ICommunicationMessage,
  IInviteToken,
  IPaginatedResult,
} from '../../interfaces/communication';
import {
  ICommunicationEventEmitter,
  NullEventEmitter,
} from '../../interfaces/events';
import { paginateItems } from '../../utils/pagination';
import { MessageOperationsService } from './messageOperationsService';
import { PermissionService } from './permissionService';

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

  /** channelId → raw symmetric key (Uint8Array) */
  private readonly symmetricKeys = new Map<string, Uint8Array>();

  /** token string → IInviteToken */
  private readonly inviteTokens = new Map<string, IInviteToken>();

  /** channel name (lowercase) → channelId for uniqueness */
  private readonly nameIndex = new Map<string, string>();

  private readonly permissionService: PermissionService;
  private readonly encryptKey: ChannelKeyEncryptionHandler;
  private readonly messageOps: MessageOperationsService;
  private readonly eventEmitter: ICommunicationEventEmitter;
  private readonly randomBytesProvider: (length: number) => Uint8Array;

  constructor(
    permissionService: PermissionService,
    encryptKey: ChannelKeyEncryptionHandler = defaultKeyEncryption,
    messageOps?: MessageOperationsService,
    eventEmitter?: ICommunicationEventEmitter,
    randomBytesProvider?: (length: number) => Uint8Array,
  ) {
    this.permissionService = permissionService;
    this.encryptKey = encryptKey;
    this.messageOps =
      messageOps ?? new MessageOperationsService(permissionService);
    this.eventEmitter = eventEmitter ?? new NullEventEmitter();
    this.randomBytesProvider = randomBytesProvider ?? getRandomBytes;
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

  private encryptKeyForMembers(
    memberIds: string[],
    symmetricKey: Uint8Array,
  ): Map<string, string> {
    const encrypted = new Map<string, string>();
    for (const id of memberIds) {
      encrypted.set(id, this.encryptKey(id, symmetricKey));
    }
    return encrypted;
  }

  private rotateKey(channel: IChannel): void {
    const newKey = this.generateSymmetricKey();
    this.symmetricKeys.set(channel.id, newKey);
    channel.encryptedSharedKey = this.encryptKeyForMembers(
      channel.members.map((m) => m.memberId),
      newKey,
    );
  }

  private normalizeChannelName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  // ─── Channel lifecycle ──────────────────────────────────────────────────

  /**
   * Create a new channel.
   * Generates a shared symmetric key and encrypts it for the creator.
   * The creator is assigned the OWNER role.
   *
   * Requirement 10.3: channel creation with visibility.
   */
  async createChannel(
    name: string,
    creatorId: string,
    visibility: ChannelVisibility,
    topic: string = '',
  ): Promise<IChannel> {
    const normalized = this.normalizeChannelName(name);
    if (this.nameIndex.has(normalized)) {
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

    const encryptedSharedKey = this.encryptKeyForMembers(
      [creatorId],
      symmetricKey,
    );

    const channel: IChannel = {
      id: channelId,
      name: normalized,
      topic,
      creatorId,
      visibility,
      members,
      encryptedSharedKey,
      createdAt: now,
      lastMessageAt: now,
      pinnedMessageIds: [],
      historyVisibleToNewMembers: true,
    };

    this.channels.set(channelId, channel);
    this.messages.set(channelId, []);
    this.symmetricKeys.set(channelId, symmetricKey);
    this.nameIndex.set(normalized, channelId);

    this.permissionService.assignRole(creatorId, channelId, DefaultRole.OWNER);

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
      const existingId = this.nameIndex.get(normalized);
      if (existingId && existingId !== channelId) {
        throw new ChannelNameConflictError(updates.name);
      }
      this.nameIndex.delete(channel.name);
      channel.name = normalized;
      this.nameIndex.set(normalized, channelId);
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

    return channel;
  }

  /**
   * Delete a channel. Requires MANAGE_CHANNEL permission.
   */
  async deleteChannel(channelId: string, requesterId: string): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, requesterId);
    this.assertPermission(requesterId, channelId, Permission.MANAGE_CHANNEL);

    this.nameIndex.delete(channel.name);
    this.channels.delete(channelId);
    this.messages.delete(channelId);
    this.symmetricKeys.delete(channelId);
  }

  // ─── Join / Leave ─────────────────────────────────────────────────────

  /**
   * Join a public channel. Rejects invite-only channels.
   *
   * Requirement 10.3: add member, reject invite-only without invitation.
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

    const currentKey = this.symmetricKeys.get(channelId)!;
    channel.encryptedSharedKey.set(
      memberId,
      this.encryptKey(memberId, currentKey),
    );

    this.permissionService.assignRole(memberId, channelId, DefaultRole.MEMBER);

    this.eventEmitter.emitMemberJoined('channel', channelId, memberId);
  }

  /**
   * Leave a channel voluntarily. Rotates the shared key.
   */
  async leaveChannel(channelId: string, memberId: string): Promise<void> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, memberId);

    channel.members = channel.members.filter((m) => m.memberId !== memberId);
    channel.encryptedSharedKey.delete(memberId);

    if (channel.members.length > 0) {
      this.rotateKey(channel);
    }

    this.eventEmitter.emitMemberLeft('channel', channelId, memberId);
  }

  // ─── Messaging ────────────────────────────────────────────────────────

  /**
   * Send a message to a channel.
   * Requirement 10.3: messaging with permission and mute checks.
   */
  async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
  ): Promise<ICommunicationMessage> {
    const channel = this.assertChannelExists(channelId);
    this.assertIsMember(channel, senderId);
    this.assertPermission(senderId, channelId, Permission.SEND_MESSAGES);
    this.assertNotMuted(senderId, channelId);

    const now = new Date();
    const message: ICommunicationMessage = {
      id: uuidv4(),
      contextType: 'channel',
      contextId: channelId,
      senderId,
      encryptedContent: content,
      createdAt: now,
      editHistory: [],
      deleted: false,
      pinned: false,
      reactions: [],
    };

    this.messages.get(channelId)!.push(message);
    channel.lastMessageAt = now;

    this.eventEmitter.emitMessageSent(
      'channel',
      channelId,
      message.id,
      senderId,
    );

    return message;
  }

  /**
   * Get messages in a channel with cursor-based pagination.
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

    return paginateItems(msgs, cursor, limit);
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
    return token;
  }

  /**
   * Redeem an invite token to join a channel.
   *
   * Requirement 10.3: validate expiry and usage limits.
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

    const currentKey = this.symmetricKeys.get(channel.id)!;
    channel.encryptedSharedKey.set(
      memberId,
      this.encryptKey(memberId, currentKey),
    );

    this.permissionService.assignRole(memberId, channel.id, DefaultRole.MEMBER);

    invite.currentUses++;

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

    this.eventEmitter.emitMemberMuted(
      'channel',
      channelId,
      targetId,
      requesterId,
      durationMs,
    );
  }

  /**
   * Kick a member from a channel. Rotates encryption keys.
   * Requires KICK_MEMBERS permission.
   *
   * Requirement 10.3: remove member and rotate keys.
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
    channel.encryptedSharedKey.delete(targetId);

    if (channel.members.length > 0) {
      this.rotateKey(channel);
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
    const edited = this.messageOps.editMessage(
      msgs,
      messageId,
      memberId,
      newContent,
      (id) => new ChannelMessageNotFoundError(id),
      () => new NotMessageAuthorError(),
    );

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

  getSymmetricKey(channelId: string): Uint8Array | undefined {
    return this.symmetricKeys.get(channelId);
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
