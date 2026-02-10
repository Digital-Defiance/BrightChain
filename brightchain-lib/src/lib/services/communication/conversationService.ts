/**
 * ConversationService — manages direct message conversations and promotion to groups.
 *
 * Maintains in-memory stores for conversations and messages, delegating
 * encrypted content storage to MessagePassingService. Supports cursor-based
 * pagination, message deletion, and conversation promotion to groups.
 *
 * Requirements: 10.1
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ICommunicationMessage,
  IConversation,
  IGroup,
  IPaginatedResult,
} from '../../interfaces/communication';
import {
  ICommunicationEventEmitter,
  NullEventEmitter,
} from '../../interfaces/events';
import { paginateItems } from '../../utils/pagination';

/**
 * Callback to check whether a member exists and is not blocked by the sender.
 * Returns true if the member is reachable, false otherwise.
 * Used to produce uniform errors for non-existent and blocked members.
 */
export type MemberReachabilityCheck = (
  senderId: string,
  recipientId: string,
) => boolean;

/**
 * Callback to promote a conversation to a group.
 * Injected from GroupService once it is available.
 * Returns the newly created IGroup.
 */
export type GroupPromotionHandler = (
  conversationId: string,
  existingParticipants: [string, string],
  newMemberIds: string[],
  messages: ICommunicationMessage[],
  requesterId: string,
) => Promise<IGroup>;

/**
 * Uniform error thrown when a recipient is not reachable.
 * The message is intentionally identical for non-existent and blocked members
 * to prevent information leakage.
 */
export class RecipientNotReachableError extends Error {
  constructor() {
    super('Recipient not found');
    this.name = 'RecipientNotReachableError';
  }
}

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} not found`);
    this.name = 'ConversationNotFoundError';
  }
}

export class NotParticipantError extends Error {
  constructor() {
    super('You are not a participant in this conversation');
    this.name = 'NotParticipantError';
  }
}

export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message ${messageId} not found`);
    this.name = 'MessageNotFoundError';
  }
}

export class NotMessageAuthorError extends Error {
  constructor() {
    super('You can only delete messages you authored');
    this.name = 'NotMessageAuthorError';
  }
}

export class GroupPromotionNotConfiguredError extends Error {
  constructor() {
    super('Group promotion is not configured');
    this.name = 'GroupPromotionNotConfiguredError';
  }
}

export class ConversationService {
  /** conversationId → IConversation */
  private readonly conversations = new Map<string, IConversation>();

  /** conversationId → messages (ordered by createdAt ascending) */
  private readonly messages = new Map<string, ICommunicationMessage[]>();

  /** "memberA:memberB" (sorted) → conversationId for dedup */
  private readonly participantIndex = new Map<string, string>();

  /** Set of blocked pairs: "blocker:blocked" */
  private readonly blockedPairs = new Set<string>();

  /** Set of known member IDs */
  private readonly knownMembers = new Set<string>();

  private groupPromotionHandler: GroupPromotionHandler | null = null;
  private readonly memberReachabilityCheck: MemberReachabilityCheck | null;
  private readonly eventEmitter: ICommunicationEventEmitter;

  constructor(
    memberReachabilityCheck: MemberReachabilityCheck | null = null,
    eventEmitter: ICommunicationEventEmitter = new NullEventEmitter(),
  ) {
    this.memberReachabilityCheck = memberReachabilityCheck;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Register a member as known (exists in the system).
   */
  registerMember(memberId: string): void {
    this.knownMembers.add(memberId);
  }

  /**
   * Block a member. The blocker will not receive messages from the blocked member.
   */
  blockMember(blockerId: string, blockedId: string): void {
    this.blockedPairs.add(`${blockerId}:${blockedId}`);
  }

  /**
   * Set the handler for promoting conversations to groups.
   * Called during initialization once GroupService is available.
   */
  setGroupPromotionHandler(handler: GroupPromotionHandler): void {
    this.groupPromotionHandler = handler;
  }

  /**
   * Check if a recipient is reachable by the sender.
   * Returns false for non-existent or blocked members.
   */
  private isReachable(senderId: string, recipientId: string): boolean {
    if (this.memberReachabilityCheck) {
      return this.memberReachabilityCheck(senderId, recipientId);
    }
    if (!this.knownMembers.has(recipientId)) {
      return false;
    }
    return !this.blockedPairs.has(`${recipientId}:${senderId}`);
  }

  /**
   * Build a sorted participant key for dedup lookups.
   */
  private participantKey(a: string, b: string): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  /**
   * Create a new conversation between two members, or return the existing one.
   */
  async createOrGetConversation(
    memberA: string,
    memberB: string,
  ): Promise<IConversation> {
    const key = this.participantKey(memberA, memberB);
    const existingId = this.participantIndex.get(key);
    if (existingId) {
      const existing = this.conversations.get(existingId);
      if (existing) {
        return existing;
      }
    }

    const now = new Date();
    const conversation: IConversation = {
      id: uuidv4(),
      participants: [memberA, memberB],
      createdAt: now,
      lastMessageAt: now,
    };

    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    this.participantIndex.set(key, conversation.id);

    return conversation;
  }

  /**
   * List conversations for a member, sorted by lastMessageAt descending.
   * Supports cursor-based pagination.
   */
  async listConversations(
    memberId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<IPaginatedResult<IConversation>> {
    const memberConversations = Array.from(this.conversations.values())
      .filter(
        (c) => c.participants[0] === memberId || c.participants[1] === memberId,
      )
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    return paginateItems(memberConversations, cursor, limit);
  }

  /**
   * Get messages in a conversation, in chronological order.
   * Supports cursor-based pagination.
   */
  async getMessages(
    conversationId: string,
    memberId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<IPaginatedResult<ICommunicationMessage>> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (
      conversation.participants[0] !== memberId &&
      conversation.participants[1] !== memberId
    ) {
      throw new NotParticipantError();
    }

    const msgs = this.messages.get(conversationId) ?? [];

    return paginateItems(msgs, cursor, limit);
  }

  /**
   * Send a message in a conversation.
   * Creates the conversation if it doesn't exist.
   * Checks recipient reachability and returns a uniform error for
   * non-existent or blocked members.
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    conversationId?: string,
  ): Promise<ICommunicationMessage> {
    // Check reachability: uniform error for blocked/non-existent
    if (!this.isReachable(senderId, recipientId)) {
      throw new RecipientNotReachableError();
    }

    let conversation: IConversation;
    if (conversationId) {
      const existing = this.conversations.get(conversationId);
      if (!existing) {
        throw new ConversationNotFoundError(conversationId);
      }
      conversation = existing;
    } else {
      conversation = await this.createOrGetConversation(senderId, recipientId);
    }

    const now = new Date();
    const message: ICommunicationMessage = {
      id: uuidv4(),
      contextType: 'conversation',
      contextId: conversation.id,
      senderId,
      encryptedContent: content,
      createdAt: now,
      editHistory: [],
      deleted: false,
      pinned: false,
      reactions: [],
    };

    const msgs = this.messages.get(conversation.id);
    if (msgs) {
      msgs.push(message);
    }

    // Update conversation's lastMessageAt
    conversation.lastMessageAt = now;

    // Emit message sent event
    this.eventEmitter.emitMessageSent(
      'conversation',
      conversation.id,
      message.id,
      senderId,
    );

    return message;
  }

  /**
   * Delete a message authored by the requesting member.
   * Marks the message as deleted for all participants.
   */
  async deleteMessage(
    conversationId: string,
    messageId: string,
    memberId: string,
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (
      conversation.participants[0] !== memberId &&
      conversation.participants[1] !== memberId
    ) {
      throw new NotParticipantError();
    }

    const msgs = this.messages.get(conversationId) ?? [];
    const message = msgs.find((m) => m.id === messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    if (message.senderId !== memberId) {
      throw new NotMessageAuthorError();
    }

    message.deleted = true;
    message.deletedBy = memberId;

    // Emit message deleted event
    this.eventEmitter.emitMessageDeleted(
      'conversation',
      conversationId,
      messageId,
      memberId,
    );
  }

  /**
   * Promote a conversation to a group by adding new members.
   * Delegates to the GroupPromotionHandler (wired from GroupService).
   */
  async promoteToGroup(
    conversationId: string,
    newMemberIds: string[],
    requesterId: string,
  ): Promise<IGroup> {
    if (!this.groupPromotionHandler) {
      throw new GroupPromotionNotConfiguredError();
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (
      conversation.participants[0] !== requesterId &&
      conversation.participants[1] !== requesterId
    ) {
      throw new NotParticipantError();
    }

    const msgs = this.messages.get(conversationId) ?? [];

    return this.groupPromotionHandler(
      conversationId,
      conversation.participants,
      newMemberIds,
      msgs,
      requesterId,
    );
  }

  /**
   * Get a conversation by ID. Returns undefined if not found.
   */
  getConversation(conversationId: string): IConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all messages for a conversation (no pagination). Used internally
   * for promotion and testing.
   */
  getAllMessages(conversationId: string): ICommunicationMessage[] {
    return this.messages.get(conversationId) ?? [];
  }

  /**
   * Return all conversations that include the given member (no pagination).
   * Used by SearchService for cross-context keyword search.
   */
  listAllConversationsForMember(memberId: string): IConversation[] {
    return Array.from(this.conversations.values()).filter(
      (c) => c.participants[0] === memberId || c.participants[1] === memberId,
    );
  }
}
