import {
  ALLOWED_MESSAGE_MEDIA_TYPES,
  ConversationType,
  GroupParticipantRole,
  IBaseConversation,
  IBaseDirectMessage,
  IBaseGroupConversation,
  IBaseMediaAttachment,
  IBaseMessageReaction,
  IBaseMessageRequest,
  IBaseReadReceipt,
  ICreateGroupOptions,
  IMessagingService,
  IPaginatedResult,
  IPaginationOptions,
  ISendMessageOptions,
  MAX_GROUP_PARTICIPANTS,
  MAX_MESSAGE_ATTACHMENT_SIZE,
  MAX_MESSAGE_ATTACHMENTS,
  MAX_MESSAGE_LENGTH,
  MAX_PINNED_CONVERSATIONS,
  MAX_REACTIONS_PER_MESSAGE,
  MESSAGE_EDIT_WINDOW_MS,
  MessageRequestStatus,
  MessagingErrorCode,
  MessagingServiceError,
  TYPING_INDICATOR_TIMEOUT_MS,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';
import { getTextFormatter } from './textFormatter';

/** Default pagination limit */
const DEFAULT_PAGE_LIMIT = 20;
/** Maximum pagination limit */
const MAX_PAGE_LIMIT = 100;

// ═══════════════════════════════════════════════════════
// Database record types
// ═══════════════════════════════════════════════════════

interface ConversationRecord {
  _id: string;
  type: string;
  participantIds: string[];
  name?: string;
  avatarUrl?: string;
  adminIds?: string[];
  creatorId?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageRecord {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  formattedContent: string;
  attachments: Array<{
    _id: string;
    url: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    altText?: string;
  }>;
  replyToMessageId?: string;
  forwardedFromId?: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

interface MessageRequestRecord {
  _id: string;
  senderId: string;
  recipientId: string;
  messagePreview: string;
  status: string;
  createdAt: string;
}

interface MessageReactionRecord {
  _id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

interface ReadReceiptRecord {
  _id: string;
  conversationId: string;
  userId: string;
  lastReadAt: string;
  lastReadMessageId: string;
}

interface PinnedConversationRecord {
  _id: string;
  userId: string;
  conversationId: string;
  pinnedAt: string;
}

interface ArchivedConversationRecord {
  _id: string;
  userId: string;
  conversationId: string;
  archivedAt: string;
}

interface MutedConversationRecord {
  _id: string;
  userId: string;
  conversationId: string;
  expiresAt?: string;
  mutedAt: string;
}

interface ConversationParticipantRecord {
  _id: string;
  conversationId: string;
  userId: string;
  role: string;
  notificationsEnabled: boolean;
  joinedAt: string;
}

interface FollowRecord {
  _id: string;
  followerId: string;
  followedId: string;
  createdAt: string;
}

interface BlockRecord {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

interface DeletedConversationRecord {
  _id: string;
  userId: string;
  conversationId: string;
  deletedAt: string;
}

// ═══════════════════════════════════════════════════════
// Collection & Application interfaces
// ═══════════════════════════════════════════════════════

interface FindQuery<T> {
  sort?(field: Record<string, 1 | -1>): FindQuery<T>;
  skip?(count: number): FindQuery<T>;
  limit?(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

interface Collection<T> {
  create(record: T): Promise<T>;
  findOne(filter: Partial<T>): { exec(): Promise<T | null> };
  find(filter: Partial<T>): FindQuery<T>;
  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> };
  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> };
  deleteMany?(filter: Partial<T>): {
    exec(): Promise<{ deletedCount: number }>;
  };
  countDocuments?(filter: Partial<T>): { exec(): Promise<number> };
}

interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

// ═══════════════════════════════════════════════════════
// MessagingService Implementation
// ═══════════════════════════════════════════════════════

/**
 * Messaging_Service implementation
 * Handles conversations, messages, reactions, read receipts, and message requests
 * @see Requirements: 39-43
 */
export class MessagingService implements IMessagingService {
  private readonly conversationsCollection: Collection<ConversationRecord>;
  private readonly messagesCollection: Collection<MessageRecord>;
  private readonly messageRequestsCollection: Collection<MessageRequestRecord>;
  private readonly messageReactionsCollection: Collection<MessageReactionRecord>;
  private readonly readReceiptsCollection: Collection<ReadReceiptRecord>;
  private readonly pinnedConversationsCollection: Collection<PinnedConversationRecord>;
  private readonly archivedConversationsCollection: Collection<ArchivedConversationRecord>;
  private readonly mutedConversationsCollection: Collection<MutedConversationRecord>;
  private readonly participantsCollection: Collection<ConversationParticipantRecord>;
  private readonly followsCollection: Collection<FollowRecord>;
  private readonly blocksCollection: Collection<BlockRecord>;
  private readonly deletedConversationsCollection: Collection<DeletedConversationRecord>;
  private readonly textFormatter = getTextFormatter();

  constructor(application: IApplicationWithCollections) {
    this.conversationsCollection = application.getModel<ConversationRecord>(
      'brighthub_conversations',
    );
    this.messagesCollection =
      application.getModel<MessageRecord>('brighthub_messages');
    this.messageRequestsCollection = application.getModel<MessageRequestRecord>(
      'brighthub_message_requests',
    );
    this.messageReactionsCollection =
      application.getModel<MessageReactionRecord>(
        'brighthub_message_reactions',
      );
    this.readReceiptsCollection = application.getModel<ReadReceiptRecord>(
      'brighthub_read_receipts',
    );
    this.pinnedConversationsCollection =
      application.getModel<PinnedConversationRecord>(
        'brighthub_pinned_conversations',
      );
    this.archivedConversationsCollection =
      application.getModel<ArchivedConversationRecord>(
        'brighthub_archived_conversations',
      );
    this.mutedConversationsCollection =
      application.getModel<MutedConversationRecord>(
        'brighthub_muted_conversations',
      );
    this.participantsCollection =
      application.getModel<ConversationParticipantRecord>(
        'brighthub_conversation_participants',
      );
    this.followsCollection =
      application.getModel<FollowRecord>('brighthub_follows');
    this.blocksCollection =
      application.getModel<BlockRecord>('brighthub_blocks');
    this.deletedConversationsCollection =
      application.getModel<DeletedConversationRecord>(
        'brighthub_deleted_conversations',
      );
  }

  // ═══════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════

  private clampLimit(limit?: number): number {
    const l = limit ?? DEFAULT_PAGE_LIMIT;
    return Math.min(Math.max(1, l), MAX_PAGE_LIMIT);
  }

  private validateMessageContent(
    content: string,
    options?: { allowEmpty?: boolean },
  ): void {
    if (!options?.allowEmpty && (!content || content.trim().length === 0)) {
      throw new MessagingServiceError(
        MessagingErrorCode.EmptyContent,
        'Message content cannot be empty',
      );
    }
    if (
      content &&
      this.textFormatter.getCharacterCount(content) > MAX_MESSAGE_LENGTH
    ) {
      throw new MessagingServiceError(
        MessagingErrorCode.ContentTooLong,
        `Message content exceeds maximum of ${MAX_MESSAGE_LENGTH} characters`,
      );
    }
  }

  private validateAttachments(
    attachments?: IBaseMediaAttachment<string>[],
  ): void {
    if (!attachments || attachments.length === 0) return;
    if (attachments.length > MAX_MESSAGE_ATTACHMENTS) {
      throw new MessagingServiceError(
        MessagingErrorCode.TooManyAttachments,
        `Maximum ${MAX_MESSAGE_ATTACHMENTS} attachments allowed per message`,
      );
    }
    const totalSize = attachments.reduce((sum, a) => sum + (a.size ?? 0), 0);
    if (totalSize > MAX_MESSAGE_ATTACHMENT_SIZE) {
      throw new MessagingServiceError(
        MessagingErrorCode.AttachmentSizeTooLarge,
        `Total attachment size exceeds ${MAX_MESSAGE_ATTACHMENT_SIZE / (1024 * 1024)}MB limit`,
      );
    }
    for (const att of attachments) {
      if (
        !(ALLOWED_MESSAGE_MEDIA_TYPES as readonly string[]).includes(
          att.mimeType,
        )
      ) {
        throw new MessagingServiceError(
          MessagingErrorCode.InvalidMediaFormat,
          `Invalid media format: ${att.mimeType}. Allowed: ${ALLOWED_MESSAGE_MEDIA_TYPES.join(', ')}`,
        );
      }
    }
  }

  private recordToConversation(
    record: ConversationRecord,
  ): IBaseConversation<string> {
    return {
      _id: record._id,
      type: record.type as ConversationType,
      participantIds: record.participantIds,
      name: record.name,
      avatarUrl: record.avatarUrl,
      lastMessageAt: record.lastMessageAt,
      lastMessagePreview: record.lastMessagePreview,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private recordToGroupConversation(
    record: ConversationRecord,
  ): IBaseGroupConversation<string> {
    return {
      ...this.recordToConversation(record),
      type: ConversationType.Group,
      adminIds: record.adminIds ?? [],
      creatorId: record.creatorId ?? '',
    };
  }

  private recordToMessage(record: MessageRecord): IBaseDirectMessage<string> {
    return {
      _id: record._id,
      conversationId: record.conversationId,
      senderId: record.senderId,
      content: record.content,
      formattedContent: record.formattedContent,
      attachments: record.attachments,
      replyToMessageId: record.replyToMessageId,
      forwardedFromId: record.forwardedFromId,
      isEdited: record.isEdited,
      editedAt: record.editedAt,
      isDeleted: record.isDeleted,
      createdAt: record.createdAt,
    };
  }

  private async assertParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationRecord> {
    const conv = await this.conversationsCollection
      .findOne({ _id: conversationId })
      .exec();
    if (!conv) {
      throw new MessagingServiceError(
        MessagingErrorCode.ConversationNotFound,
        'Conversation not found',
      );
    }
    // Check if user deleted this conversation from their view
    const deleted = await this.deletedConversationsCollection
      .findOne({
        userId,
        conversationId,
      } as Partial<DeletedConversationRecord>)
      .exec();
    if (deleted) {
      throw new MessagingServiceError(
        MessagingErrorCode.ConversationNotFound,
        'Conversation not found',
      );
    }
    if (!conv.participantIds.includes(userId)) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotParticipant,
        'User is not a participant in this conversation',
      );
    }
    return conv;
  }

  private async assertGroupAdmin(
    conv: ConversationRecord,
    userId: string,
  ): Promise<void> {
    if (conv.type !== ConversationType.Group) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotAdmin,
        'Not a group conversation',
      );
    }
    if (!conv.adminIds?.includes(userId)) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotAdmin,
        'User is not an admin of this group',
      );
    }
  }

  private async isBlocked(
    userId: string,
    otherUserId: string,
  ): Promise<boolean> {
    const block1 = await this.blocksCollection
      .findOne({
        blockerId: userId,
        blockedId: otherUserId,
      } as Partial<BlockRecord>)
      .exec();
    if (block1) return true;
    const block2 = await this.blocksCollection
      .findOne({
        blockerId: otherUserId,
        blockedId: userId,
      } as Partial<BlockRecord>)
      .exec();
    return !!block2;
  }

  // ═══════════════════════════════════════════════════════
  // Conversation Management (Req 39.1, 39.2, 43.1-43.11)
  // ═══════════════════════════════════════════════════════

  async createDirectConversation(
    userId: string,
    otherUserId: string,
  ): Promise<IBaseConversation<string>> {
    if (await this.isBlocked(userId, otherUserId)) {
      throw new MessagingServiceError(
        MessagingErrorCode.UserBlocked,
        'Cannot create conversation with blocked user',
      );
    }

    // Check for existing direct conversation between these two users
    const allConvs = await this.conversationsCollection
      .find({ type: ConversationType.Direct } as Partial<ConversationRecord>)
      .exec();
    const existing = allConvs.find(
      (c) =>
        c.participantIds.length === 2 &&
        c.participantIds.includes(userId) &&
        c.participantIds.includes(otherUserId),
    );
    if (existing) {
      // If user previously deleted it, remove the deletion record
      if (this.deletedConversationsCollection.deleteOne) {
        await this.deletedConversationsCollection
          .deleteOne({
            userId,
            conversationId: existing._id,
          } as Partial<DeletedConversationRecord>)
          .exec();
      }
      return this.recordToConversation(existing);
    }

    const now = new Date().toISOString();
    const record: ConversationRecord = {
      _id: randomUUID(),
      type: ConversationType.Direct,
      participantIds: [userId, otherUserId],
      createdAt: now,
      updatedAt: now,
    };
    await this.conversationsCollection.create(record);
    return this.recordToConversation(record);
  }

  async createGroupConversation(
    creatorId: string,
    participantIds: string[],
    options: ICreateGroupOptions,
  ): Promise<IBaseGroupConversation<string>> {
    if (!options.name || options.name.trim().length === 0) {
      throw new MessagingServiceError(
        MessagingErrorCode.InvalidGroupName,
        'Group name cannot be empty',
      );
    }

    const allParticipants = [...new Set([creatorId, ...participantIds])];
    if (allParticipants.length > MAX_GROUP_PARTICIPANTS) {
      throw new MessagingServiceError(
        MessagingErrorCode.GroupParticipantLimitExceeded,
        `Group cannot exceed ${MAX_GROUP_PARTICIPANTS} participants`,
      );
    }

    const now = new Date().toISOString();
    const record: ConversationRecord = {
      _id: randomUUID(),
      type: ConversationType.Group,
      participantIds: allParticipants,
      name: options.name.trim(),
      avatarUrl: options.avatarUrl,
      adminIds: [creatorId],
      creatorId,
      createdAt: now,
      updatedAt: now,
    };
    await this.conversationsCollection.create(record);

    // Create participant records
    for (const pid of allParticipants) {
      await this.participantsCollection.create({
        _id: randomUUID(),
        conversationId: record._id,
        userId: pid,
        role:
          pid === creatorId
            ? GroupParticipantRole.Admin
            : GroupParticipantRole.Participant,
        notificationsEnabled: true,
        joinedAt: now,
      });
    }

    return this.recordToGroupConversation(record);
  }

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<IBaseConversation<string>> {
    const conv = await this.assertParticipant(conversationId, userId);
    if (conv.type === ConversationType.Group) {
      return this.recordToGroupConversation(conv);
    }
    return this.recordToConversation(conv);
  }

  async getConversations(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConversation<string>>> {
    const limit = this.clampLimit(options?.limit);

    // Get all conversations where user is a participant
    const allConvs = await this.conversationsCollection
      .find({} as Partial<ConversationRecord>)
      .exec();

    // Get deleted conversation IDs for this user
    const deletedRecords = await this.deletedConversationsCollection
      .find({ userId } as Partial<DeletedConversationRecord>)
      .exec();
    const deletedIds = new Set(deletedRecords.map((d) => d.conversationId));

    let filtered = allConvs.filter(
      (c) => c.participantIds.includes(userId) && !deletedIds.has(c._id),
    );

    // Apply cursor (ISO timestamp)
    if (options?.cursor) {
      filtered = filtered.filter(
        (c) => (c.lastMessageAt ?? c.createdAt) < options.cursor!,
      );
    }

    // Sort by most recent activity
    filtered.sort((a, b) => {
      const aTime = a.lastMessageAt ?? a.createdAt;
      const bTime = b.lastMessageAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });

    const items = filtered
      .slice(0, limit)
      .map((c) =>
        c.type === ConversationType.Group
          ? this.recordToGroupConversation(c)
          : this.recordToConversation(c),
      );

    const hasMore = filtered.length > limit;
    const lastItem = items[items.length - 1];
    const cursor =
      hasMore && lastItem
        ? (lastItem.lastMessageAt ?? lastItem.createdAt)
        : undefined;

    return { items, cursor, hasMore };
  }

  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.assertParticipant(conversationId, userId);

    // Soft-delete: record that this user deleted the conversation
    const existing = await this.deletedConversationsCollection
      .findOne({ userId, conversationId } as Partial<DeletedConversationRecord>)
      .exec();
    if (!existing) {
      await this.deletedConversationsCollection.create({
        _id: randomUUID(),
        userId,
        conversationId,
        deletedAt: new Date().toISOString(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // Message CRUD (Req 39.1-39.4, 41.1-41.9)
  // ═══════════════════════════════════════════════════════

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    options?: ISendMessageOptions,
  ): Promise<IBaseDirectMessage<string>> {
    this.validateMessageContent(content, {
      allowEmpty: !!options?.forwardedFromId,
    });
    this.validateAttachments(options?.attachments);

    await this.assertParticipant(conversationId, senderId);

    const formatted = this.textFormatter.format(content);
    const now = new Date().toISOString();

    // Validate replyToMessageId if provided
    if (options?.replyToMessageId) {
      const replyTarget = await this.messagesCollection
        .findOne({ _id: options.replyToMessageId })
        .exec();
      if (!replyTarget || replyTarget.conversationId !== conversationId) {
        throw new MessagingServiceError(
          MessagingErrorCode.MessageNotFound,
          'Reply target message not found in this conversation',
        );
      }
    }

    // Validate forwardedFromId if provided
    if (options?.forwardedFromId) {
      const forwardSource = await this.messagesCollection
        .findOne({ _id: options.forwardedFromId })
        .exec();
      if (!forwardSource) {
        throw new MessagingServiceError(
          MessagingErrorCode.MessageNotFound,
          'Forwarded message not found',
        );
      }
    }

    const record: MessageRecord = {
      _id: randomUUID(),
      conversationId,
      senderId,
      content,
      formattedContent: formatted.formatted,
      attachments: (options?.attachments ?? []) as MessageRecord['attachments'],
      replyToMessageId: options?.replyToMessageId,
      forwardedFromId: options?.forwardedFromId,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
    };
    await this.messagesCollection.create(record);

    // Update conversation's last message info
    const preview =
      content.length > 100 ? content.substring(0, 97) + '...' : content;
    await this.conversationsCollection
      .updateOne({ _id: conversationId }, {
        lastMessageAt: now,
        lastMessagePreview: preview,
        updatedAt: now,
      } as Partial<ConversationRecord>)
      .exec();

    return this.recordToMessage(record);
  }

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<IBaseDirectMessage<string>> {
    this.validateMessageContent(newContent);

    const message = await this.messagesCollection
      .findOne({ _id: messageId })
      .exec();
    if (!message) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageNotFound,
        'Message not found',
      );
    }
    if (message.senderId !== userId) {
      throw new MessagingServiceError(
        MessagingErrorCode.Unauthorized,
        'Only the sender can edit a message',
      );
    }
    if (message.isDeleted) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageAlreadyDeleted,
        'Cannot edit a deleted message',
      );
    }

    const createdAt = new Date(message.createdAt).getTime();
    if (Date.now() - createdAt > MESSAGE_EDIT_WINDOW_MS) {
      throw new MessagingServiceError(
        MessagingErrorCode.EditWindowExpired,
        'Edit window has expired (15 minutes)',
      );
    }

    const formatted = this.textFormatter.format(newContent);
    const now = new Date().toISOString();

    await this.messagesCollection
      .updateOne({ _id: messageId }, {
        content: newContent,
        formattedContent: formatted.formatted,
        isEdited: true,
        editedAt: now,
      } as Partial<MessageRecord>)
      .exec();

    return this.recordToMessage({
      ...message,
      content: newContent,
      formattedContent: formatted.formatted,
      isEdited: true,
      editedAt: now,
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messagesCollection
      .findOne({ _id: messageId })
      .exec();
    if (!message) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageNotFound,
        'Message not found',
      );
    }
    if (message.senderId !== userId) {
      throw new MessagingServiceError(
        MessagingErrorCode.Unauthorized,
        'Only the sender can delete a message',
      );
    }
    if (message.isDeleted) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageAlreadyDeleted,
        'Message is already deleted',
      );
    }

    // Soft-delete: replace content with placeholder
    await this.messagesCollection
      .updateOne({ _id: messageId }, {
        content: '',
        formattedContent: '<p><em>This message was deleted</em></p>',
        isDeleted: true,
        attachments: [],
      } as Partial<MessageRecord>)
      .exec();
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseDirectMessage<string>>> {
    await this.assertParticipant(conversationId, userId);

    const limit = this.clampLimit(options?.limit);
    let messages = await this.messagesCollection
      .find({ conversationId } as Partial<MessageRecord>)
      .exec();

    // Apply cursor
    if (options?.cursor) {
      messages = messages.filter((m) => m.createdAt < options.cursor!);
    }

    // Sort by newest first
    messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = messages.slice(0, limit);
    const hasMore = messages.length > limit;
    const lastItem = page[page.length - 1];

    return {
      items: page.map((m) => this.recordToMessage(m)),
      cursor: hasMore && lastItem ? lastItem.createdAt : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Reactions (Req 39.8-39.10)
  // ═══════════════════════════════════════════════════════

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<IBaseMessageReaction<string>> {
    const message = await this.messagesCollection
      .findOne({ _id: messageId })
      .exec();
    if (!message || message.isDeleted) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageNotFound,
        'Message not found',
      );
    }

    // Check user is participant
    await this.assertParticipant(message.conversationId, userId);

    // Check for duplicate reaction (same user, same emoji)
    const existing = await this.messageReactionsCollection
      .find({ messageId } as Partial<MessageReactionRecord>)
      .exec();
    const duplicate = existing.find(
      (r) => r.userId === userId && r.emoji === emoji,
    );
    if (duplicate) {
      throw new MessagingServiceError(
        MessagingErrorCode.ReactionAlreadyExists,
        'You already reacted with this emoji',
      );
    }

    // Check unique emoji limit per message
    const uniqueEmojis = new Set(existing.map((r) => r.emoji));
    if (
      !uniqueEmojis.has(emoji) &&
      uniqueEmojis.size >= MAX_REACTIONS_PER_MESSAGE
    ) {
      throw new MessagingServiceError(
        MessagingErrorCode.ReactionLimitExceeded,
        `Maximum ${MAX_REACTIONS_PER_MESSAGE} unique emoji reactions per message`,
      );
    }

    const record: MessageReactionRecord = {
      _id: randomUUID(),
      messageId,
      userId,
      emoji,
      createdAt: new Date().toISOString(),
    };
    await this.messageReactionsCollection.create(record);

    return {
      _id: record._id,
      messageId: record.messageId,
      userId: record.userId,
      emoji: record.emoji,
      createdAt: record.createdAt,
    };
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const reactions = await this.messageReactionsCollection
      .find({ messageId } as Partial<MessageReactionRecord>)
      .exec();
    const reaction = reactions.find(
      (r) => r.userId === userId && r.emoji === emoji,
    );
    if (!reaction) {
      throw new MessagingServiceError(
        MessagingErrorCode.ReactionNotFound,
        'Reaction not found',
      );
    }
    await this.messageReactionsCollection
      .deleteOne({ _id: reaction._id })
      .exec();
  }

  // ═══════════════════════════════════════════════════════
  // Read Receipts & Typing (Req 39.5-39.7)
  // ═══════════════════════════════════════════════════════

  async markAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<IBaseReadReceipt<string>> {
    await this.assertParticipant(conversationId, userId);

    const now = new Date().toISOString();

    // Upsert read receipt
    const existing = await this.readReceiptsCollection
      .find({ conversationId } as Partial<ReadReceiptRecord>)
      .exec();
    const userReceipt = existing.find((r) => r.userId === userId);

    if (userReceipt) {
      await this.readReceiptsCollection
        .updateOne({ _id: userReceipt._id }, {
          lastReadAt: now,
          lastReadMessageId: messageId,
        } as Partial<ReadReceiptRecord>)
        .exec();
      return {
        conversationId,
        userId,
        lastReadAt: now,
        lastReadMessageId: messageId,
      };
    }

    const record: ReadReceiptRecord = {
      _id: randomUUID(),
      conversationId,
      userId,
      lastReadAt: now,
      lastReadMessageId: messageId,
    };
    await this.readReceiptsCollection.create(record);
    return {
      conversationId: record.conversationId,
      userId: record.userId,
      lastReadAt: record.lastReadAt,
      lastReadMessageId: record.lastReadMessageId,
    };
  }

  async sendTypingIndicator(
    conversationId: string,
    userId: string,
  ): Promise<{ expiresAt: string }> {
    await this.assertParticipant(conversationId, userId);
    const expiresAt = new Date(
      Date.now() + TYPING_INDICATOR_TIMEOUT_MS,
    ).toISOString();
    return { expiresAt };
  }

  // ═══════════════════════════════════════════════════════
  // Message Requests & Privacy (Req 42.1-42.12)
  // ═══════════════════════════════════════════════════════

  async createMessageRequest(
    senderId: string,
    recipientId: string,
    messagePreview: string,
  ): Promise<IBaseMessageRequest<string>> {
    if (await this.isBlocked(senderId, recipientId)) {
      throw new MessagingServiceError(
        MessagingErrorCode.UserBlocked,
        'Cannot send message request to this user',
      );
    }

    // Check for existing pending request
    const allRequests = await this.messageRequestsCollection
      .find({ senderId } as Partial<MessageRequestRecord>)
      .exec();
    const existing = allRequests.find(
      (r) =>
        r.recipientId === recipientId &&
        r.status === MessageRequestStatus.Pending,
    );
    if (existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageRequestAlreadyExists,
        'A pending message request already exists for this user',
      );
    }

    const preview =
      messagePreview.length > 100
        ? messagePreview.substring(0, 97) + '...'
        : messagePreview;

    const record: MessageRequestRecord = {
      _id: randomUUID(),
      senderId,
      recipientId,
      messagePreview: preview,
      status: MessageRequestStatus.Pending,
      createdAt: new Date().toISOString(),
    };
    await this.messageRequestsCollection.create(record);

    return {
      _id: record._id,
      senderId: record.senderId,
      recipientId: record.recipientId,
      messagePreview: record.messagePreview,
      status: record.status as MessageRequestStatus,
      createdAt: record.createdAt,
    };
  }

  async acceptMessageRequest(
    requestId: string,
    recipientId: string,
  ): Promise<IBaseConversation<string>> {
    const request = await this.messageRequestsCollection
      .findOne({ _id: requestId })
      .exec();
    if (!request || request.recipientId !== recipientId) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageRequestNotFound,
        'Message request not found',
      );
    }

    // Update request status
    await this.messageRequestsCollection
      .updateOne({ _id: requestId }, {
        status: MessageRequestStatus.Accepted,
      } as Partial<MessageRequestRecord>)
      .exec();

    // Create a direct conversation
    return this.createDirectConversation(recipientId, request.senderId);
  }

  async declineMessageRequest(
    requestId: string,
    recipientId: string,
  ): Promise<void> {
    const request = await this.messageRequestsCollection
      .findOne({ _id: requestId })
      .exec();
    if (!request || request.recipientId !== recipientId) {
      throw new MessagingServiceError(
        MessagingErrorCode.MessageRequestNotFound,
        'Message request not found',
      );
    }

    await this.messageRequestsCollection
      .updateOne({ _id: requestId }, {
        status: MessageRequestStatus.Declined,
      } as Partial<MessageRequestRecord>)
      .exec();
  }

  /**
   * Get pending message requests for a recipient user.
   */
  async getMessageRequests(
    recipientId: string,
  ): Promise<IBaseMessageRequest<string>[]> {
    const allRequests = await this.messageRequestsCollection
      .find({ recipientId } as Partial<MessageRequestRecord>)
      .exec();
    return allRequests
      .filter((r) => r.status === MessageRequestStatus.Pending)
      .map((r) => ({
        _id: r._id,
        senderId: r.senderId,
        recipientId: r.recipientId,
        messagePreview: r.messagePreview,
        status: r.status as MessageRequestStatus,
        createdAt: r.createdAt,
      }));
  }

  async canMessageDirectly(
    senderId: string,
    recipientId: string,
  ): Promise<boolean> {
    if (await this.isBlocked(senderId, recipientId)) {
      return false;
    }

    // Check mutual follow
    const senderFollows = await this.followsCollection
      .findOne({
        followerId: senderId,
        followedId: recipientId,
      } as Partial<FollowRecord>)
      .exec();
    const recipientFollows = await this.followsCollection
      .findOne({
        followerId: recipientId,
        followedId: senderId,
      } as Partial<FollowRecord>)
      .exec();

    return !!(senderFollows && recipientFollows);
  }

  // ═══════════════════════════════════════════════════════
  // Conversation Management Features (Req 43.3-43.11)
  // ═══════════════════════════════════════════════════════

  async pinConversation(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId);

    const existing = await this.pinnedConversationsCollection
      .findOne({ userId, conversationId } as Partial<PinnedConversationRecord>)
      .exec();
    if (existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.AlreadyPinned,
        'Conversation is already pinned',
      );
    }

    // Check pin limit
    const pinned = await this.pinnedConversationsCollection
      .find({ userId } as Partial<PinnedConversationRecord>)
      .exec();
    if (pinned.length >= MAX_PINNED_CONVERSATIONS) {
      throw new MessagingServiceError(
        MessagingErrorCode.PinLimitExceeded,
        `Maximum ${MAX_PINNED_CONVERSATIONS} pinned conversations allowed`,
      );
    }

    await this.pinnedConversationsCollection.create({
      _id: randomUUID(),
      userId,
      conversationId,
      pinnedAt: new Date().toISOString(),
    });
  }

  async unpinConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.pinnedConversationsCollection
      .findOne({ userId, conversationId } as Partial<PinnedConversationRecord>)
      .exec();
    if (!existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotPinned,
        'Conversation is not pinned',
      );
    }
    await this.pinnedConversationsCollection
      .deleteOne({ _id: existing._id })
      .exec();
  }

  async archiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.assertParticipant(conversationId, userId);

    const existing = await this.archivedConversationsCollection
      .findOne({
        userId,
        conversationId,
      } as Partial<ArchivedConversationRecord>)
      .exec();
    if (existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.AlreadyArchived,
        'Conversation is already archived',
      );
    }

    await this.archivedConversationsCollection.create({
      _id: randomUUID(),
      userId,
      conversationId,
      archivedAt: new Date().toISOString(),
    });
  }

  async unarchiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.archivedConversationsCollection
      .findOne({
        userId,
        conversationId,
      } as Partial<ArchivedConversationRecord>)
      .exec();
    if (!existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotArchived,
        'Conversation is not archived',
      );
    }
    await this.archivedConversationsCollection
      .deleteOne({ _id: existing._id })
      .exec();
  }

  async muteConversation(
    conversationId: string,
    userId: string,
    expiresAt?: string,
  ): Promise<void> {
    await this.assertParticipant(conversationId, userId);

    const existing = await this.mutedConversationsCollection
      .findOne({ userId, conversationId } as Partial<MutedConversationRecord>)
      .exec();
    if (existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.AlreadyMuted,
        'Conversation is already muted',
      );
    }

    await this.mutedConversationsCollection.create({
      _id: randomUUID(),
      userId,
      conversationId,
      expiresAt,
      mutedAt: new Date().toISOString(),
    });
  }

  async unmuteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.mutedConversationsCollection
      .findOne({ userId, conversationId } as Partial<MutedConversationRecord>)
      .exec();
    if (!existing) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotMuted,
        'Conversation is not muted',
      );
    }
    await this.mutedConversationsCollection
      .deleteOne({ _id: existing._id })
      .exec();
  }

  async searchMessages(
    userId: string,
    query: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseDirectMessage<string>>> {
    const limit = this.clampLimit(options?.limit);
    const lowerQuery = query.toLowerCase();

    // Get user's conversations
    const allConvs = await this.conversationsCollection
      .find({} as Partial<ConversationRecord>)
      .exec();
    const userConvIds = allConvs
      .filter((c) => c.participantIds.includes(userId))
      .map((c) => c._id);

    // Search messages in those conversations
    const allMessages = await this.messagesCollection
      .find({} as Partial<MessageRecord>)
      .exec();

    let matched = allMessages.filter(
      (m) =>
        userConvIds.includes(m.conversationId) &&
        !m.isDeleted &&
        m.content.toLowerCase().includes(lowerQuery),
    );

    if (options?.cursor) {
      matched = matched.filter((m) => m.createdAt < options.cursor!);
    }

    matched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = matched.slice(0, limit);
    const hasMore = matched.length > limit;
    const lastItem = page[page.length - 1];

    return {
      items: page.map((m) => this.recordToMessage(m)),
      cursor: hasMore && lastItem ? lastItem.createdAt : undefined,
      hasMore,
    };
  }

  async searchInConversation(
    conversationId: string,
    userId: string,
    query: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseDirectMessage<string>>> {
    await this.assertParticipant(conversationId, userId);

    const limit = this.clampLimit(options?.limit);
    const lowerQuery = query.toLowerCase();

    let messages = await this.messagesCollection
      .find({ conversationId } as Partial<MessageRecord>)
      .exec();

    messages = messages.filter(
      (m) => !m.isDeleted && m.content.toLowerCase().includes(lowerQuery),
    );

    if (options?.cursor) {
      messages = messages.filter((m) => m.createdAt < options.cursor!);
    }

    messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = messages.slice(0, limit);
    const hasMore = messages.length > limit;
    const lastItem = page[page.length - 1];

    return {
      items: page.map((m) => this.recordToMessage(m)),
      cursor: hasMore && lastItem ? lastItem.createdAt : undefined,
      hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Group Conversation Management (Req 40.1-40.12)
  // ═══════════════════════════════════════════════════════

  async addParticipants(
    conversationId: string,
    adminId: string,
    userIds: string[],
  ): Promise<void> {
    const conv = await this.assertParticipant(conversationId, adminId);
    await this.assertGroupAdmin(conv, adminId);

    const newParticipants = userIds.filter(
      (id) => !conv.participantIds.includes(id),
    );
    if (newParticipants.length === 0) return;

    const totalAfter = conv.participantIds.length + newParticipants.length;
    if (totalAfter > MAX_GROUP_PARTICIPANTS) {
      throw new MessagingServiceError(
        MessagingErrorCode.GroupParticipantLimitExceeded,
        `Group cannot exceed ${MAX_GROUP_PARTICIPANTS} participants`,
      );
    }

    const now = new Date().toISOString();
    const updatedParticipants = [...conv.participantIds, ...newParticipants];

    await this.conversationsCollection
      .updateOne({ _id: conversationId }, {
        participantIds: updatedParticipants,
        updatedAt: now,
      } as Partial<ConversationRecord>)
      .exec();

    for (const uid of newParticipants) {
      await this.participantsCollection.create({
        _id: randomUUID(),
        conversationId,
        userId: uid,
        role: GroupParticipantRole.Participant,
        notificationsEnabled: true,
        joinedAt: now,
      });
    }
  }

  async removeParticipant(
    conversationId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    const conv = await this.assertParticipant(conversationId, adminId);
    await this.assertGroupAdmin(conv, adminId);

    if (!conv.participantIds.includes(userId)) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotParticipant,
        'User is not a participant in this group',
      );
    }

    const now = new Date().toISOString();
    const updatedParticipants = conv.participantIds.filter(
      (id) => id !== userId,
    );
    const updatedAdmins = (conv.adminIds ?? []).filter((id) => id !== userId);

    await this.conversationsCollection
      .updateOne({ _id: conversationId }, {
        participantIds: updatedParticipants,
        adminIds: updatedAdmins,
        updatedAt: now,
      } as Partial<ConversationRecord>)
      .exec();

    // Remove participant record
    const participants = await this.participantsCollection
      .find({ conversationId } as Partial<ConversationParticipantRecord>)
      .exec();
    const participantRecord = participants.find((p) => p.userId === userId);
    if (participantRecord) {
      await this.participantsCollection
        .deleteOne({ _id: participantRecord._id })
        .exec();
    }
  }

  async promoteToAdmin(
    conversationId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    const conv = await this.assertParticipant(conversationId, adminId);
    await this.assertGroupAdmin(conv, adminId);

    if (!conv.participantIds.includes(userId)) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotParticipant,
        'User is not a participant in this group',
      );
    }

    if (conv.adminIds?.includes(userId)) {
      return; // Already admin, idempotent
    }

    const updatedAdmins = [...(conv.adminIds ?? []), userId];
    await this.conversationsCollection
      .updateOne({ _id: conversationId }, {
        adminIds: updatedAdmins,
        updatedAt: new Date().toISOString(),
      } as Partial<ConversationRecord>)
      .exec();

    // Update participant role
    const participants = await this.participantsCollection
      .find({ conversationId } as Partial<ConversationParticipantRecord>)
      .exec();
    const participantRecord = participants.find((p) => p.userId === userId);
    if (participantRecord) {
      await this.participantsCollection
        .updateOne({ _id: participantRecord._id }, {
          role: GroupParticipantRole.Admin,
        } as Partial<ConversationParticipantRecord>)
        .exec();
    }
  }

  async demoteFromAdmin(
    conversationId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    const conv = await this.assertParticipant(conversationId, adminId);
    await this.assertGroupAdmin(conv, adminId);

    if (!conv.adminIds?.includes(userId)) {
      return; // Not admin, idempotent
    }

    // Prevent demoting the last admin
    if (conv.adminIds.length <= 1) {
      throw new MessagingServiceError(
        MessagingErrorCode.LastAdminCannotLeave,
        'Cannot demote the last admin',
      );
    }

    const updatedAdmins = conv.adminIds.filter((id) => id !== userId);
    await this.conversationsCollection
      .updateOne({ _id: conversationId }, {
        adminIds: updatedAdmins,
        updatedAt: new Date().toISOString(),
      } as Partial<ConversationRecord>)
      .exec();

    // Update participant role
    const participants = await this.participantsCollection
      .find({ conversationId } as Partial<ConversationParticipantRecord>)
      .exec();
    const participantRecord = participants.find((p) => p.userId === userId);
    if (participantRecord) {
      await this.participantsCollection
        .updateOne({ _id: participantRecord._id }, {
          role: GroupParticipantRole.Participant,
        } as Partial<ConversationParticipantRecord>)
        .exec();
    }
  }

  async leaveGroup(conversationId: string, userId: string): Promise<void> {
    const conv = await this.assertParticipant(conversationId, userId);

    if (conv.type !== ConversationType.Group) {
      throw new MessagingServiceError(
        MessagingErrorCode.NotAdmin,
        'Cannot leave a direct conversation',
      );
    }

    // If user is the last admin, they can't leave
    if (
      conv.adminIds?.includes(userId) &&
      conv.adminIds.length === 1 &&
      conv.participantIds.length > 1
    ) {
      throw new MessagingServiceError(
        MessagingErrorCode.LastAdminCannotLeave,
        'Last admin must promote another admin before leaving',
      );
    }

    const now = new Date().toISOString();
    const updatedParticipants = conv.participantIds.filter(
      (id) => id !== userId,
    );
    const updatedAdmins = (conv.adminIds ?? []).filter((id) => id !== userId);

    await this.conversationsCollection
      .updateOne({ _id: conversationId }, {
        participantIds: updatedParticipants,
        adminIds: updatedAdmins,
        updatedAt: now,
      } as Partial<ConversationRecord>)
      .exec();

    // Remove participant record
    const participants = await this.participantsCollection
      .find({ conversationId } as Partial<ConversationParticipantRecord>)
      .exec();
    const participantRecord = participants.find((p) => p.userId === userId);
    if (participantRecord) {
      await this.participantsCollection
        .deleteOne({ _id: participantRecord._id })
        .exec();
    }
  }

  async updateGroupSettings(
    conversationId: string,
    adminId: string,
    updates: { name?: string; avatarUrl?: string },
  ): Promise<IBaseGroupConversation<string>> {
    const conv = await this.assertParticipant(conversationId, adminId);
    await this.assertGroupAdmin(conv, adminId);

    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new MessagingServiceError(
        MessagingErrorCode.InvalidGroupName,
        'Group name cannot be empty',
      );
    }

    const now = new Date().toISOString();
    const updateFields: Partial<ConversationRecord> = { updatedAt: now };
    if (updates.name !== undefined) updateFields.name = updates.name.trim();
    if (updates.avatarUrl !== undefined)
      updateFields.avatarUrl = updates.avatarUrl;

    await this.conversationsCollection
      .updateOne({ _id: conversationId }, updateFields)
      .exec();

    const updated: ConversationRecord = {
      ...conv,
      ...updateFields,
    };
    return this.recordToGroupConversation(updated);
  }
}

// ═══════════════════════════════════════════════════════
// Factory function
// ═══════════════════════════════════════════════════════

/**
 * Create a new MessagingService instance
 * @param application Application with database collections
 * @returns MessagingService instance
 */
export function createMessagingService(
  application: IApplicationWithCollections,
): MessagingService {
  return new MessagingService(application);
}
