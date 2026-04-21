/**
 * GroupService — manages group lifecycle, key management, and messaging.
 *
 * Maintains in-memory stores for groups and messages, with epoch-aware
 * symmetric key management via IKeyEpochState. Each key rotation creates
 * a new epoch. Messages record which epoch they were encrypted under.
 * On member removal, all epoch keys are re-wrapped for remaining members only.
 *
 * When an IChatStorageProvider is injected, groups and group messages are
 * also persisted to the provider's collections (write-through). Sync helper
 * methods continue to read from the in-memory Maps so their signatures
 * remain unchanged.
 *
 * Requirements: 10.2, 5.1, 5.2, 5.3, 5.4, 9.3
 */

import { v4 as uuidv4 } from 'uuid';
import { getRandomBytes } from '../../crypto/platformCrypto';
import {
  CommunicationEventType,
  DefaultRole,
  Permission,
} from '../../enumerations/communication';
import {
  IChatAttachmentInput,
  ICommunicationMessage,
  IGroup,
  IGroupMember,
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

  /** groupId → epoch-aware key state (raw keys + wrapped keys per epoch) */
  private readonly keyEpochStates = new Map<string, IKeyEpochState<string>>();

  private readonly permissionService: PermissionService;
  private readonly encryptKey: KeyEncryptionHandler;
  private readonly messageOps: MessageOperationsService;
  private readonly eventEmitter: ICommunicationEventEmitter;
  private readonly randomBytesProvider: (length: number) => Uint8Array;

  /** Optional persistent collection for groups (write-through). */
  private readonly groupCollection: IChatCollection<IGroup> | undefined;

  /** Optional persistent collection for group messages (write-through). */
  private readonly groupMessageCollection:
    | IChatCollection<ICommunicationMessage>
    | undefined;

  /** Optional block content store for storing message content as blocks. */
  private readonly blockContentStore: IBlockContentStore | undefined;

  constructor(
    permissionService: PermissionService,
    encryptKey: KeyEncryptionHandler = defaultKeyEncryption,
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
      this.groupCollection = storageProvider.groups;
      this.groupMessageCollection = storageProvider.groupMessages;
    }
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

  /**
   * Create initial epoch state (epoch 0) for a new group.
   * Uses KeyEpochManager pattern: creates epoch 0 with wrapped keys for all members.
   *
   * Requirements: 5.1
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
   * Requirements: 5.2
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
   * Requirements: 5.3
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
   * Rotate the group's symmetric key using epoch-aware key management.
   * Generates a new key, increments epoch, re-wraps all epoch keys for remaining members,
   * and removes the departed member from all epochs.
   *
   * Requirements: 5.3
   */
  private rotateKey(group: IGroup, removedMemberId: string): void {
    const newKey = this.generateSymmetricKey();
    const state = this.keyEpochStates.get(group.id);

    if (state) {
      const remainingMemberIds = group.members.map((m) => m.memberId);
      const newState = this.rotateEpochState(
        state,
        newKey,
        remainingMemberIds,
        removedMemberId,
      );
      this.keyEpochStates.set(group.id, newState);
      group.encryptedSharedKey = newState.encryptedEpochKeys;
    }
  }

  // ─── Group lifecycle ──────────────────────────────────────────────────

  /**
   * Create a new group with the given members.
   * Generates a shared symmetric key and encrypts it for each member.
   * The creator is assigned the OWNER role; others get MEMBER.
   * Uses KeyEpochManager pattern to create initial epoch 0.
   *
   * Requirements: 10.2, 5.1, 9.3
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

    // Create initial epoch state (epoch 0) with wrapped keys for all members
    const epochState = this.createInitialEpochState(symmetricKey, allMemberIds);

    const group: IGroup = {
      id: groupId,
      name,
      creatorId,
      members,
      encryptedSharedKey: epochState.encryptedEpochKeys,
      createdAt: now,
      lastMessageAt: now,
      pinnedMessageIds: [],
    };

    this.groups.set(groupId, group);
    this.messages.set(groupId, []);
    this.keyEpochStates.set(groupId, epochState);

    // Register roles in PermissionService
    for (const member of members) {
      this.permissionService.assignRole(member.memberId, groupId, member.role);
    }

    // Persist to storage provider if available
    if (this.groupCollection) {
      await this.groupCollection.create(group);
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
   * Generates a FRESH CEK (not reusing the DM key) per Requirement 5.4.
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

    // createGroup generates a FRESH CEK — does not reuse the DM key
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

      // Persist migrated message to storage provider if available
      if (this.groupMessageCollection) {
        await this.groupMessageCollection.create(migratedMsg);
      }
    }

    // Persist group update (promotedFromConversation) to storage provider if available
    if (this.groupCollection) {
      await this.groupCollection.update(group.id, group);
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
   * Encrypts content with the current epoch's CEK and records the keyEpoch.
   * Optionally accepts attachments which are validated against platform limits.
   *
   * Requirements: 10.2, 9.3, 11.1, 11.2, 11.4, 11.5
   */
  async sendMessage(
    groupId: string,
    senderId: string,
    content: string,
    attachments?: IChatAttachmentInput[],
  ): Promise<ICommunicationMessage> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, senderId);
    this.assertPermission(senderId, groupId, Permission.SEND_MESSAGES);
    this.assertNotMuted(senderId, groupId);

    // Validate and prepare attachment metadata before creating the message
    const attachmentMetadata = attachments?.length
      ? validateAndPrepareAttachments(attachments)
      : [];

    const state = this.keyEpochStates.get(groupId);
    const currentEpoch = state?.currentEpoch ?? 0;

    // Store content via block content store if available; otherwise use raw content
    let messageContent = content;
    if (this.blockContentStore) {
      const memberIds = group.members.map((m) => m.memberId);
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
      contextType: 'group',
      contextId: groupId,
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

    this.messages.get(groupId)!.push(message);
    group.lastMessageAt = now;

    // Persist to storage provider if available
    if (this.groupMessageCollection) {
      await this.groupMessageCollection.create(message);
    }
    if (this.groupCollection) {
      await this.groupCollection.update(groupId, group);
    }

    // Emit message sent event
    this.eventEmitter.emitMessageSent('group', groupId, message.id, senderId);

    return message;
  }

  /**
   * Get messages in a group with cursor-based pagination.
   * Messages are returned with their keyEpoch so clients can decrypt
   * using the appropriate epoch's CEK.
   * Validates that each message's keyEpoch exists in the epoch state;
   * throws KeyEpochNotFoundError if a message references a non-existent epoch.
   *
   * Requirements: 5.1, 12.3
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

    // Validate that each message's keyEpoch exists in the epoch state
    for (const msg of msgs) {
      this.assertEpochExists(groupId, msg.keyEpoch);
    }

    return paginateItems(msgs, cursor, limit);
  }

  // ─── Member management ────────────────────────────────────────────────

  /**
   * Add members to a group. Wraps ALL epoch keys for new members.
   * Requirements: 10.2, 5.2
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
    const state = this.keyEpochStates.get(groupId);

    for (const memberId of memberIds) {
      if (group.members.some((m) => m.memberId === memberId)) {
        throw new MemberAlreadyInGroupError(memberId);
      }

      group.members.push({
        memberId,
        role: DefaultRole.MEMBER,
        joinedAt: now,
      });

      // Add member to epoch state: wrap ALL epoch keys for the new member
      if (state) {
        this.addMemberToEpochState(state, memberId);
        group.encryptedSharedKey = state.encryptedEpochKeys;
      }

      this.permissionService.assignRole(memberId, groupId, DefaultRole.MEMBER);

      // Emit member joined event
      this.eventEmitter.emitMemberJoined('group', groupId, memberId);
    }

    // Persist group update to storage provider if available
    if (this.groupCollection) {
      await this.groupCollection.update(groupId, group);
    }
  }

  /**
   * Remove a member from a group. Rotates the shared key using epoch-aware rotation.
   * Requirements: 10.2, 5.3
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

    if (group.members.length > 0) {
      this.rotateKey(group, targetId);
    } else {
      // No members left — clean up epoch state
      const state = this.keyEpochStates.get(groupId);
      if (state) {
        for (const [, epochMap] of state.encryptedEpochKeys) {
          epochMap.delete(targetId);
        }
        group.encryptedSharedKey = state.encryptedEpochKeys;
      }
    }

    // Persist group update to storage provider if available
    if (this.groupCollection) {
      await this.groupCollection.update(groupId, group);
    }

    // Emit member kicked event
    this.eventEmitter.emitMemberKicked('group', groupId, targetId, requesterId);
  }

  /**
   * Leave a group voluntarily. Rotates the shared key using epoch-aware rotation.
   * Requirements: 10.2, 5.3
   */
  async leaveGroup(groupId: string, memberId: string): Promise<void> {
    const group = this.assertGroupExists(groupId);
    this.assertIsMember(group, memberId);

    group.members = group.members.filter((m) => m.memberId !== memberId);

    if (group.members.length > 0) {
      this.rotateKey(group, memberId);
    } else {
      // No members left — clean up epoch state
      const state = this.keyEpochStates.get(groupId);
      if (state) {
        for (const [, epochMap] of state.encryptedEpochKeys) {
          epochMap.delete(memberId);
        }
        group.encryptedSharedKey = state.encryptedEpochKeys;
      }
    }

    // Persist group update to storage provider if available
    if (this.groupCollection) {
      await this.groupCollection.update(groupId, group);
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

    if (this.blockContentStore) {
      // Find the message manually to handle block storage
      const message = msgs.find((m) => m.id === messageId);
      if (!message) throw new GroupMessageNotFoundError(messageId);
      if (message.senderId !== memberId) throw new NotMessageAuthorError();

      // Store new content as a new block
      const memberIds = group.members.map((m) => m.memberId);
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
      if (this.groupMessageCollection) {
        await this.groupMessageCollection.update(messageId, message);
      }

      // Emit message edited event
      this.eventEmitter.emitMessageEdited(
        'group',
        groupId,
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
      (id) => new GroupMessageNotFoundError(id),
      () => new NotMessageAuthorError(),
    );

    // Persist edited message to storage provider if available
    if (this.groupMessageCollection) {
      await this.groupMessageCollection.update(messageId, edited);
    }

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

    // Persist deleted message to storage provider if available
    if (this.groupMessageCollection) {
      const deletedMsg = msgs.find((m) => m.id === messageId);
      if (deletedMsg) {
        await this.groupMessageCollection.update(messageId, deletedMsg);
      }
    }

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

    // Persist pin changes to storage provider if available
    if (this.groupMessageCollection) {
      const pinnedMsg = msgs.find((m) => m.id === messageId);
      if (pinnedMsg) {
        await this.groupMessageCollection.update(messageId, pinnedMsg);
      }
    }
    if (this.groupCollection) {
      await this.groupCollection.update(groupId, group);
    }

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

    // Persist unpin changes to storage provider if available
    if (this.groupMessageCollection) {
      const unpinnedMsg = msgs.find((m) => m.id === messageId);
      if (unpinnedMsg) {
        await this.groupMessageCollection.update(messageId, unpinnedMsg);
      }
    }
    if (this.groupCollection) {
      await this.groupCollection.update(groupId, group);
    }

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

    // Persist reaction change to storage provider if available
    if (this.groupMessageCollection) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) {
        await this.groupMessageCollection.update(messageId, msg);
      }
    }

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

    // Persist reaction removal to storage provider if available
    if (this.groupMessageCollection) {
      const msg = msgs.find((m) => m.id === messageId);
      if (msg) {
        await this.groupMessageCollection.update(messageId, msg);
      }
    }

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
   * Get the current epoch's raw symmetric key for a group.
   * Returns the key for the latest epoch (backward-compatible accessor).
   */
  getSymmetricKey(groupId: string): Uint8Array | undefined {
    const state = this.keyEpochStates.get(groupId);
    if (!state) return undefined;
    return state.epochKeys.get(state.currentEpoch);
  }

  /**
   * Get the full epoch state for a group (testing / internal use).
   */
  getKeyEpochState(groupId: string): IKeyEpochState<string> | undefined {
    return this.keyEpochStates.get(groupId);
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
