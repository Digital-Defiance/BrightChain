/**
 * GroupService — manages group lifecycle, key management, and messaging.
 *
 * Maintains in-memory stores for groups and messages, with symmetric key
 * generation per group and ECIES-style per-member key encryption.
 * Supports member management with key rotation on departure,
 * message edit/delete/pin/reaction operations.
 *
 * Requirements: 10.2
 */

import { v4 as uuidv4 } from 'uuid';
import { getRandomBytes } from '../../crypto/platformCrypto';
import {
  CommunicationEventType,
  DefaultRole,
  Permission,
} from '../../enumerations/communication';
import {
  ICommunicationMessage,
  IGroup,
  IGroupMember,
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

export class GroupNotFoundError extends Error {
  constructor(groupId: string) {
    super(`Group ${groupId} not found`);
    this.name = 'GroupNotFoundError';
  }
}

export class NotGroupMemberError extends Error {
  constructor() {
    super('You are not a member of this group');
    this.name = 'NotGroupMemberError';
  }
}

export class GroupMessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message ${messageId} not found`);
    this.name = 'GroupMessageNotFoundError';
  }
}

export class GroupPermissionError extends Error {
  public readonly missingPermission: Permission;
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = 'GroupPermissionError';
    this.missingPermission = permission;
  }
}

export class MemberMutedError extends Error {
  constructor() {
    super('You are muted in this group');
    this.name = 'MemberMutedError';
  }
}

export class NotMessageAuthorError extends Error {
  constructor() {
    super('You can only edit messages you authored');
    this.name = 'NotMessageAuthorError';
  }
}

export class ReactionNotFoundError extends Error {
  constructor(reactionId: string) {
    super(`Reaction ${reactionId} not found`);
    this.name = 'ReactionNotFoundError';
  }
}

export class MemberAlreadyInGroupError extends Error {
  constructor(memberId: string) {
    super(`Member ${memberId} is already in this group`);
    this.name = 'MemberAlreadyInGroupError';
  }
}

/**
 * Callback for encrypting a symmetric key for a specific member.
 * In production this would use ECIES with the member's public key.
 * Returns the encrypted key as a string (e.g. base64).
 */
export type KeyEncryptionHandler = (
  memberId: string,
  symmetricKey: Uint8Array,
) => string;

/**
 * Default key encryption: base64-encodes the key prefixed with memberId.
 * This is a placeholder; real implementations use ECIES.
 */
function defaultKeyEncryption(
  memberId: string,
  symmetricKey: Uint8Array,
): string {
  // Convert Uint8Array to base64 (browser-compatible)
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
export function extractKeyFromDefault(encrypted: string): Uint8Array {
  const parts = encrypted.split(':');
  const base64 = parts[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class GroupService {
  /** groupId → IGroup */
  private readonly groups = new Map<string, IGroup>();

  /** groupId → messages (ordered by createdAt ascending) */
  private readonly messages = new Map<string, ICommunicationMessage[]>();

  /** groupId → raw symmetric key (Uint8Array) */
  private readonly symmetricKeys = new Map<string, Uint8Array>();

  private readonly permissionService: PermissionService;
  private readonly encryptKey: KeyEncryptionHandler;
  private readonly messageOps: MessageOperationsService;
  private readonly eventEmitter: ICommunicationEventEmitter;
  private readonly randomBytesProvider: (length: number) => Uint8Array;

  constructor(
    permissionService: PermissionService,
    encryptKey: KeyEncryptionHandler = defaultKeyEncryption,
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

  private assertGroupExists(groupId: string): IGroup {
    const group = this.groups.get(groupId);
    if (!group) throw new GroupNotFoundError(groupId);
    return group;
  }

  private assertIsMember(group: IGroup, memberId: string): IGroupMember {
    const member = group.members.find((m) => m.memberId === memberId);
    if (!member) throw new NotGroupMemberError();
    return member;
  }

  private assertPermission(
    memberId: string,
    groupId: string,
    permission: Permission,
  ): void {
    if (!this.permissionService.hasPermission(memberId, groupId, permission)) {
      throw new GroupPermissionError(permission);
    }
  }

  private assertNotMuted(memberId: string, groupId: string): void {
    if (this.permissionService.isMuted(memberId, groupId)) {
      throw new MemberMutedError();
    }
  }

  private generateSymmetricKey(): Uint8Array {
    return this.randomBytesProvider(32); // AES-256
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

  /**
   * Rotate the group's symmetric key and re-encrypt for remaining members.
   * Requirement 10.2: key rotation on member departure.
   */
  private rotateKey(group: IGroup): void {
    const newKey = this.generateSymmetricKey();
    this.symmetricKeys.set(group.id, newKey);
    group.encryptedSharedKey = this.encryptKeyForMembers(
      group.members.map((m) => m.memberId),
      newKey,
    );
  }

  // ─── Group lifecycle ──────────────────────────────────────────────────

  /**
   * Create a new group with the given members.
   * Generates a shared symmetric key and encrypts it for each member.
   * The creator is assigned the OWNER role; others get MEMBER.
   *
   * Requirement 10.2: group creation with symmetric key management.
   */
  async createGroup(
    name: string,
    creatorId: string,
    memberIds: string[],
  ): Promise<IGroup> {
    const now = new Date();
    const allMemberIds = [
      creatorId,
      ...memberIds.filter((id) => id !== creatorId),
    ];
    const symmetricKey = this.generateSymmetricKey();
    const groupId = uuidv4();

    const members: IGroupMember[] = allMemberIds.map((id) => ({
      memberId: id,
      role: id === creatorId ? DefaultRole.OWNER : DefaultRole.MEMBER,
      joinedAt: now,
    }));

    const encryptedSharedKey = this.encryptKeyForMembers(
      allMemberIds,
      symmetricKey,
    );

    const group: IGroup = {
      id: groupId,
      name,
      creatorId,
      members,
      encryptedSharedKey,
      createdAt: now,
      lastMessageAt: now,
      pinnedMessageIds: [],
    };

    this.groups.set(groupId, group);
    this.messages.set(groupId, []);
    this.symmetricKeys.set(groupId, symmetricKey);

    // Register roles in PermissionService
    for (const member of members) {
      this.permissionService.assignRole(member.memberId, groupId, member.role);
    }

    // Emit group created event
    this.eventEmitter.emitGroupCreated(
      groupId,
      groupId,
      creatorId,
      allMemberIds,
    );

    return group;
  }

  /**
   * Create a group from a promoted conversation, preserving message history.
   * Used by ConversationService.promoteToGroup.
   */
  async createGroupFromConversation(
    conversationId: string,
    existingParticipants: [string, string],
    newMemberIds: string[],
    existingMessages: ICommunicationMessage[],
    requesterId: string,
  ): Promise<IGroup> {
    const allMemberIds = [
      ...existingParticipants,
      ...newMemberIds.filter((id) => !existingParticipants.includes(id)),
    ];

    const group = await this.createGroup(
      `Group from conversation`,
      requesterId,
      allMemberIds.filter((id) => id !== requesterId),
    );

    group.promotedFromConversation = conversationId;

    // Migrate existing messages into the group
    const groupMessages = this.messages.get(group.id)!;
    for (const msg of existingMessages) {
      const migratedMsg: ICommunicationMessage = {
        ...msg,
        contextType: 'group',
        contextId: group.id,
      };
      groupMessages.push(migratedMsg);
    }

    return group;
  }

  /**
   * Get group metadata.
   */
  async getGroup(groupId: string, requesterId: string): Promise<IGroup> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, requesterId);
    return group;
  }

  // ─── Messaging ────────────────────────────────────────────────────────

  /**
   * Send a message to a group.
   * Requirement 10.2: group messaging with permission and mute checks.
   */
  async sendMessage(
    groupId: string,
    senderId: string,
    content: string,
  ): Promise<ICommunicationMessage> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, senderId);
    this.assertPermission(senderId, groupId, Permission.SEND_MESSAGES);
    this.assertNotMuted(senderId, groupId);

    const now = new Date();
    const message: ICommunicationMessage = {
      id: uuidv4(),
      contextType: 'group',
      contextId: groupId,
      senderId,
      encryptedContent: content,
      createdAt: now,
      editHistory: [],
      deleted: false,
      pinned: false,
      reactions: [],
    };

    this.messages.get(groupId)!.push(message);
    group.lastMessageAt = now;

    // Emit message sent event
    this.eventEmitter.emitMessageSent('group', groupId, message.id, senderId);

    return message;
  }

  /**
   * Get messages in a group with cursor-based pagination.
   */
  async getMessages(
    groupId: string,
    memberId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<IPaginatedResult<ICommunicationMessage>> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];

    return paginateItems(msgs, cursor, limit);
  }

  // ─── Member management ────────────────────────────────────────────────

  /**
   * Add members to a group. Re-encrypts the shared key for new members.
   * Requirement 10.2: membership management.
   */
  async addMembers(
    groupId: string,
    requesterId: string,
    memberIds: string[],
  ): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, requesterId);
    this.assertPermission(requesterId, groupId, Permission.MANAGE_MEMBERS);

    const now = new Date();
    const currentKey = this.symmetricKeys.get(groupId)!;

    for (const memberId of memberIds) {
      if (group.members.some((m) => m.memberId === memberId)) {
        throw new MemberAlreadyInGroupError(memberId);
      }

      group.members.push({
        memberId,
        role: DefaultRole.MEMBER,
        joinedAt: now,
      });

      // Encrypt existing key for new member
      group.encryptedSharedKey.set(
        memberId,
        this.encryptKey(memberId, currentKey),
      );

      this.permissionService.assignRole(memberId, groupId, DefaultRole.MEMBER);

      // Emit member joined event
      this.eventEmitter.emitMemberJoined('group', groupId, memberId);
    }
  }

  /**
   * Remove a member from a group. Rotates the shared key.
   * Requirement 10.2: key rotation on member removal.
   */
  async removeMember(
    groupId: string,
    requesterId: string,
    targetId: string,
  ): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, requesterId);
    this.assertIsMember(group, targetId);
    this.assertPermission(requesterId, groupId, Permission.MANAGE_MEMBERS);

    group.members = group.members.filter((m) => m.memberId !== targetId);
    group.encryptedSharedKey.delete(targetId);

    // Rotate key for remaining members
    this.rotateKey(group);

    // Emit member kicked event
    this.eventEmitter.emitMemberKicked('group', groupId, targetId, requesterId);
  }

  /**
   * Leave a group voluntarily. Rotates the shared key.
   * Requirement 10.2: key rotation on member departure.
   */
  async leaveGroup(groupId: string, memberId: string): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    group.members = group.members.filter((m) => m.memberId !== memberId);
    group.encryptedSharedKey.delete(memberId);

    // Rotate key for remaining members
    if (group.members.length > 0) {
      this.rotateKey(group);
    }

    // Emit member left event
    this.eventEmitter.emitMemberLeft('group', groupId, memberId);
  }

  // ─── Message operations ───────────────────────────────────────────────

  /**
   * Edit a message authored by the requesting member.
   * Delegates to MessageOperationsService.
   */
  async editMessage(
    groupId: string,
    messageId: string,
    memberId: string,
    newContent: string,
  ): Promise<ICommunicationMessage> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];
    const edited = this.messageOps.editMessage(
      msgs,
      messageId,
      memberId,
      newContent,
      (id) => new GroupMessageNotFoundError(id),
      () => new NotMessageAuthorError(),
    );

    // Emit message edited event
    this.eventEmitter.emitMessageEdited('group', groupId, messageId, memberId);

    return edited;
  }

  /**
   * Delete a message. Authors can delete their own; moderators/admins can delete any.
   * Delegates to MessageOperationsService.
   */
  async deleteMessage(
    groupId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];
    this.messageOps.deleteMessage(
      msgs,
      groupId,
      messageId,
      memberId,
      (id) => new GroupMessageNotFoundError(id),
      (p) => new GroupPermissionError(p),
    );

    // Emit message deleted event
    this.eventEmitter.emitMessageDeleted('group', groupId, messageId, memberId);
  }

  /**
   * Pin a message in a group.
   * Delegates to MessageOperationsService.
   */
  async pinMessage(
    groupId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];
    this.messageOps.pinMessage(
      msgs,
      groupId,
      messageId,
      memberId,
      group,
      (id) => new GroupMessageNotFoundError(id),
      (p) => new GroupPermissionError(p),
    );

    // Emit message pinned event
    this.eventEmitter.emitMessagePinEvent(
      CommunicationEventType.MESSAGE_PINNED,
      'group',
      groupId,
      messageId,
      memberId,
    );
  }

  /**
   * Unpin a message in a group.
   * Delegates to MessageOperationsService.
   */
  async unpinMessage(
    groupId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];
    this.messageOps.unpinMessage(
      msgs,
      groupId,
      messageId,
      memberId,
      group,
      (id) => new GroupMessageNotFoundError(id),
      (p) => new GroupPermissionError(p),
    );

    // Emit message unpinned event
    this.eventEmitter.emitMessagePinEvent(
      CommunicationEventType.MESSAGE_UNPINNED,
      'group',
      groupId,
      messageId,
      memberId,
    );
  }

  /**
   * Add a reaction to a message.
   * Delegates to MessageOperationsService.
   */
  async addReaction(
    groupId: string,
    messageId: string,
    memberId: string,
    emoji: string,
  ): Promise<string> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];
    const reactionId = this.messageOps.addReaction(
      msgs,
      messageId,
      memberId,
      emoji,
      (id) => new GroupMessageNotFoundError(id),
    );

    // Emit reaction added event
    this.eventEmitter.emitReactionEvent(
      CommunicationEventType.REACTION_ADDED,
      'group',
      groupId,
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
    groupId: string,
    messageId: string,
    memberId: string,
    reactionId: string,
  ): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    const msgs = this.messages.get(groupId) ?? [];
    this.messageOps.removeReaction(
      msgs,
      messageId,
      reactionId,
      (id) => new GroupMessageNotFoundError(id),
      (id) => new ReactionNotFoundError(id),
    );

    // Emit reaction removed event
    this.eventEmitter.emitReactionEvent(
      CommunicationEventType.REACTION_REMOVED,
      'group',
      groupId,
      messageId,
      memberId,
      '', // emoji not needed for removal
      reactionId,
    );
  }

  // ─── Accessors (for testing / internal use) ───────────────────────────

  /**
   * Get a group by ID without membership check. Returns undefined if not found.
   */
  getGroupById(groupId: string): IGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get the raw symmetric key for a group (testing only).
   */
  getSymmetricKey(groupId: string): Uint8Array | undefined {
    return this.symmetricKeys.get(groupId);
  }

  /**
   * Get all messages for a group without pagination (testing/internal).
   */
  getAllMessages(groupId: string): ICommunicationMessage[] {
    return this.messages.get(groupId) ?? [];
  }

  /**
   * Return all groups the given member belongs to (no pagination).
   * Used by SearchService for cross-context keyword search.
   */
  listGroupsForMember(memberId: string): IGroup[] {
    return Array.from(this.groups.values()).filter((g) =>
      g.members.some((m) => m.memberId === memberId),
    );
  }
}
