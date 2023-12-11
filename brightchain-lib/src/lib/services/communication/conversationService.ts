/**
 * ConversationService — manages direct message conversations and promotion to groups.
 *
 * Maintains in-memory stores for conversations and messages, delegating
 * encrypted content storage to MessagePassingService. Supports cursor-based
 * pagination, message deletion, and conversation promotion to groups.
 *
 * Uses epoch-aware key management via IKeyEpochState for forward secrecy.
 * DM conversations generate a 256-bit DM_Key at creation, wrapped per-participant
 * using the injected key encryption handler. Messages record the keyEpoch they
 * were encrypted under.
 *
 * When an IChatStorageProvider is injected, conversations and messages are
 * also persisted to the provider's collections (write-through). Sync helper
 * methods continue to read from the in-memory Maps so their signatures
 * remain unchanged.
 *
 * Requirements: 10.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.2
 */

import { v4 as uuidv4 } from 'uuid';
import { getRandomBytes } from '../../crypto/platformCrypto';
import {
  IChatAttachmentInput,
  ICommunicationMessage,
  IConversation,
  IGroup,
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
import {
  reconstructKeyEpochState,
  groupAndSortMessages,
} from './rehydrationHelpers';

/**
 * Callback for encrypting a symmetric key for a specific member.
 * Returns the encrypted key as a string (e.g. base64).
 */
export type ConversationKeyEncryptionHandler = (
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
export function extractConversationKeyFromDefault(
  encrypted: string,
): Uint8Array {
  const parts = encrypted.split(':');
  const base64 = parts[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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

  /** conversationId → epoch-aware key state (raw keys + wrapped keys per epoch) */
  private readonly keyEpochStates = new Map<string, IKeyEpochState<string>>();

  private groupPromotionHandler: GroupPromotionHandler | null = null;
  private initialized = false;
  private readonly memberReachabilityCheck: MemberReachabilityCheck | null;
  private readonly eventEmitter: ICommunicationEventEmitter;
  private readonly encryptKey: ConversationKeyEncryptionHandler;
  private readonly randomBytesProvider: (length: number) => Uint8Array;

  /** Optional persistent collection for conversations (write-through). */
  private readonly conversationCollection:
    | IChatCollection<IConversation>
    | undefined;

  /** Optional persistent collection for messages (write-through). */
  private readonly messageCollection:
    | IChatCollection<ICommunicationMessage>
    | undefined;

  /** Optional block content store for storing message content as blocks. */
  private readonly blockContentStore: IBlockContentStore | undefined;

  constructor(
    memberReachabilityCheck: MemberReachabilityCheck | null = null,
    eventEmitter: ICommunicationEventEmitter = new NullEventEmitter(),
    storageProvider?: IChatStorageProvider,
    encryptKey: ConversationKeyEncryptionHandler = defaultKeyEncryption,
    randomBytesProvider?: (length: number) => Uint8Array,
    blockContentStore?: IBlockContentStore,
  ) {
    this.memberReachabilityCheck = memberReachabilityCheck;
    this.eventEmitter = eventEmitter;
    this.encryptKey = encryptKey;
    this.randomBytesProvider = randomBytesProvider ?? getRandomBytes;
    this.blockContentStore = blockContentStore;
    if (storageProvider) {
      this.conversationCollection = storageProvider.conversations;
      this.messageCollection = storageProvider.messages;
    }
  }

  // ─── Rehydration ────────────────────────────────────────────────────────

  /**
   * Load persisted conversations and messages from the storage provider
   * into in-memory Maps, rebuilding derived indexes and key epoch states.
   *
   * No-op when no storage provider was injected or when already initialized.
   *
   * Requirements: 1.1, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 9.1, 9.2
   */
  public async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.conversationCollection) return;

    this.initialized = true;

    // ── Load conversations ──────────────────────────────────────────────
    let loadedConversations: IConversation[];
    try {
      loadedConversations = await this.conversationCollection.findMany();
    } catch (error) {
      console.error(
        '[ConversationService] Failed to load from conversations collection:',
        error,
      );
      throw error;
    }

    for (const conversation of loadedConversations) {
      this.conversations.set(conversation.id, conversation);

      // Register participants as known members so reachability checks pass
      for (const participantId of conversation.participants) {
        this.knownMembers.add(participantId);
      }

      // Rebuild participant index
      const key = this.participantKey(
        conversation.participants[0],
        conversation.participants[1],
      );
      this.participantIndex.set(key, conversation.id);

      // Reconstruct key epoch state
      const epochState = reconstructKeyEpochState(
        conversation.encryptedSharedKey,
      );
      if (epochState) {
        this.keyEpochStates.set(conversation.id, epochState);
      } else {
        console.warn(
          `[ConversationService] Skipping key epoch reconstruction for conversation ${conversation.id}: malformed encryptedSharedKey`,
        );
      }
    }

    // ── Load messages ───────────────────────────────────────────────────
    let loadedMessages: ICommunicationMessage[];
    try {
      loadedMessages = await this.messageCollection!.findMany();
    } catch (error) {
      console.error(
        '[ConversationService] Failed to load from messages collection:',
        error,
      );
      throw error;
    }

    const grouped = groupAndSortMessages(loadedMessages);
    for (const [contextId, msgs] of grouped) {
      this.messages.set(contextId, msgs);
    }
  }

  // ─── Key management helpers ─────────────────────────────────────────────

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
   * Requirements: 12.3, 12.4
   */
  private assertEpochExists(contextId: string, keyEpoch: number): void {
    const state = this.keyEpochStates.get(contextId);
    if (!state || !state.epochKeys.has(keyEpoch)) {
      throw new KeyEpochNotFoundError(contextId, keyEpoch);
    }
  }

  /**
   * Create initial epoch state (epoch 0) for a new conversation.
   * Uses KeyEpochManager pattern: creates epoch 0 with wrapped keys for all participants.
   *
   * Requirements: 4.1, 4.4
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

  // ─── Member management ──────────────────────────────────────────────────

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

  // ─── Conversation lifecycle ─────────────────────────────────────────────

  /**
   * Create a new conversation between two members, or return the existing one.
   * Generates a DM_Key and wraps for both participants using epoch-aware key management.
   *
   * Requirements: 4.1, 4.4, 9.2
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
    const symmetricKey = this.generateSymmetricKey();
    const participants: [string, string] = [memberA, memberB];

    // Create initial epoch state (epoch 0) with wrapped keys for both participants
    const epochState = this.createInitialEpochState(symmetricKey, participants);

    const conversation: IConversation = {
      id: uuidv4(),
      participants,
      encryptedSharedKey: epochState.encryptedEpochKeys,
      createdAt: now,
      lastMessageAt: now,
    };

    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    this.keyEpochStates.set(conversation.id, epochState);
    this.participantIndex.set(key, conversation.id);

    // Persist to storage provider if available
    if (this.conversationCollection) {
      await this.conversationCollection.create(conversation);
    }

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
   * Messages are returned with their keyEpoch so clients can decrypt
   * using the appropriate epoch's DM_Key.
   * Validates that each message's keyEpoch exists in the epoch state;
   * throws KeyEpochNotFoundError if a message references a non-existent epoch.
   * Supports cursor-based pagination.
   *
   * Requirements: 4.3, 4.5, 12.3, 12.4
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

    // Validate that each message's keyEpoch exists in the epoch state
    for (const msg of msgs) {
      this.assertEpochExists(conversationId, msg.keyEpoch);
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
   * Send a message in a conversation.
   * Creates the conversation if it doesn't exist.
   * Encrypts content with the current epoch's DM_Key and records the keyEpoch.
   * Checks recipient reachability and returns a uniform error for
   * non-existent or blocked members.
   * Optionally accepts attachments which are validated against platform limits.
   *
   * Requirements: 4.2, 4.5, 9.2, 11.1, 11.2, 11.4, 11.5
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    conversationId?: string,
    attachments?: IChatAttachmentInput[],
  ): Promise<ICommunicationMessage> {
    // Check reachability: uniform error for blocked/non-existent
    if (!this.isReachable(senderId, recipientId)) {
      throw new RecipientNotReachableError();
    }

    // Validate and prepare attachment metadata before creating the message
    const attachmentMetadata = attachments?.length
      ? validateAndPrepareAttachments(attachments)
      : [];

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

    const state = this.keyEpochStates.get(conversation.id);
    const currentEpoch = state?.currentEpoch ?? 0;

    // Store content via block content store if available; otherwise use raw content
    let messageContent = content;
    if (this.blockContentStore) {
      const { blockReference } = await this.blockContentStore.storeContent(
        content,
        senderId,
        [recipientId],
      );
      messageContent = blockReference;
    }

    const now = new Date();
    const message: ICommunicationMessage = {
      id: uuidv4(),
      contextType: 'conversation',
      contextId: conversation.id,
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

    const msgs = this.messages.get(conversation.id);
    if (msgs) {
      msgs.push(message);
    }

    // Update conversation's lastMessageAt
    conversation.lastMessageAt = now;

    // Persist to storage provider if available
    if (this.messageCollection) {
      await this.messageCollection.create(message);
    }
    if (this.conversationCollection) {
      await this.conversationCollection.update(conversation.id, conversation);
    }

    // Emit message sent event
    this.eventEmitter.emitMessageSent(
      'conversation',
      conversation.id,
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

    // Persist deletion to storage provider if available
    if (this.messageCollection) {
      await this.messageCollection.update(messageId, message);
    }

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

  // ─── Accessors (for testing / internal use) ───────────────────────────

  /**
   * Get a conversation by ID. Returns undefined if not found.
   */
  getConversation(conversationId: string): IConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get the current epoch's raw symmetric key for a conversation.
   * Returns the key for the latest epoch (backward-compatible accessor).
   */
  getSymmetricKey(conversationId: string): Uint8Array | undefined {
    const state = this.keyEpochStates.get(conversationId);
    if (!state) return undefined;
    return state.epochKeys.get(state.currentEpoch);
  }

  /**
   * Get the full epoch state for a conversation (testing / internal use).
   */
  getKeyEpochState(
    conversationId: string,
  ): IKeyEpochState<string> | undefined {
    return this.keyEpochStates.get(conversationId);
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
