/**
 * In-memory mock implementation of IChatStorageProvider for property-based
 * and unit tests.
 *
 * Each IChatCollection<T> is backed by a T[] array. findMany() returns the
 * full array by default, but can be configured to throw for error-propagation
 * tests.
 *
 * Also exports fast-check arbitraries for all BrightChat entity types.
 *
 * Requirements: all (test infrastructure)
 */

import fc from 'fast-check';
import {
  IChatCollection,
  IChatStorageProvider,
} from '../../../interfaces/communication/chatStorageProvider';
import {
  IConversation,
  ICommunicationMessage,
  IGroup,
  IChannel,
  IInviteToken,
  IGroupMember,
  IChannelMember,
} from '../../../interfaces/communication';
import {
  IServer,
  IServerInviteToken,
  IServerCategory,
} from '../../../interfaces/communication/server';
import {
  ChannelVisibility,
  DefaultRole,
} from '../../../enumerations/communication';

// ─── Mock Collection ────────────────────────────────────────────────────────

/**
 * In-memory IChatCollection backed by a plain array.
 *
 * `findMany()` returns the full backing array unless `errorOnFindMany` is set,
 * in which case it throws the configured error.
 */
export class MockChatCollection<T> implements IChatCollection<T> {
  private items: T[] = [];
  private errorOnFindMany: Error | null = null;

  constructor(initialItems: T[] = []) {
    this.items = [...initialItems];
  }

  /** Configure findMany() to throw the given error on next (and subsequent) calls. */
  setFindManyError(error: Error): void {
    this.errorOnFindMany = error;
  }

  /** Clear any configured findMany() error. */
  clearFindManyError(): void {
    this.errorOnFindMany = null;
  }

  async create(doc: T): Promise<void> {
    this.items.push(doc);
  }

  async findById(key: string): Promise<T | null> {
    // Simple lookup — assumes T has an `id` or `token` field
    const item = this.items.find(
      (i) =>
        (i as Record<string, unknown>)['id'] === key ||
        (i as Record<string, unknown>)['token'] === key,
    );
    return item ?? null;
  }

  async findMany(_filter?: Partial<T>): Promise<T[]> {
    if (this.errorOnFindMany) {
      throw this.errorOnFindMany;
    }
    return [...this.items];
  }

  async update(key: string, doc: T): Promise<void> {
    const idx = this.items.findIndex(
      (i) =>
        (i as Record<string, unknown>)['id'] === key ||
        (i as Record<string, unknown>)['token'] === key,
    );
    if (idx >= 0) {
      this.items[idx] = doc;
    }
  }

  async delete(key: string): Promise<void> {
    this.items = this.items.filter(
      (i) =>
        (i as Record<string, unknown>)['id'] !== key &&
        (i as Record<string, unknown>)['token'] !== key,
    );
  }

  /** Direct access to the backing array (for test assertions). */
  getItems(): T[] {
    return [...this.items];
  }
}


// ─── Mock Storage Provider ──────────────────────────────────────────────────

/**
 * In-memory IChatStorageProvider. All collections are MockChatCollection
 * instances that can be pre-populated and configured independently.
 */
export class MockChatStorageProvider implements IChatStorageProvider {
  readonly conversations: MockChatCollection<IConversation>;
  readonly messages: MockChatCollection<ICommunicationMessage>;
  readonly groups: MockChatCollection<IGroup>;
  readonly groupMessages: MockChatCollection<ICommunicationMessage>;
  readonly channels: MockChatCollection<IChannel>;
  readonly channelMessages: MockChatCollection<ICommunicationMessage>;
  readonly inviteTokens: MockChatCollection<IInviteToken>;
  readonly servers: MockChatCollection<IServer>;
  readonly serverInvites: MockChatCollection<IServerInviteToken>;

  constructor(opts?: {
    conversations?: IConversation[];
    messages?: ICommunicationMessage[];
    groups?: IGroup[];
    groupMessages?: ICommunicationMessage[];
    channels?: IChannel[];
    channelMessages?: ICommunicationMessage[];
    inviteTokens?: IInviteToken[];
    servers?: IServer[];
    serverInvites?: IServerInviteToken[];
  }) {
    this.conversations = new MockChatCollection(opts?.conversations);
    this.messages = new MockChatCollection(opts?.messages);
    this.groups = new MockChatCollection(opts?.groups);
    this.groupMessages = new MockChatCollection(opts?.groupMessages);
    this.channels = new MockChatCollection(opts?.channels);
    this.channelMessages = new MockChatCollection(opts?.channelMessages);
    this.inviteTokens = new MockChatCollection(opts?.inviteTokens);
    this.servers = new MockChatCollection(opts?.servers);
    this.serverInvites = new MockChatCollection(opts?.serverInvites);
  }
}

// ─── fast-check Arbitraries ─────────────────────────────────────────────────

/** Arbitrary for non-empty alphanumeric IDs (1–36 chars). */
const arbId = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/** Arbitrary for a Date within a reasonable range. */
const arbDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') });

/** Arbitrary for DefaultRole enum values. */
const arbRole = fc.constantFrom(
  DefaultRole.OWNER,
  DefaultRole.ADMIN,
  DefaultRole.MODERATOR,
  DefaultRole.MEMBER,
);

/** Arbitrary for ChannelVisibility enum values. */
const arbVisibility = fc.constantFrom(
  ChannelVisibility.PUBLIC,
  ChannelVisibility.PRIVATE,
  ChannelVisibility.SECRET,
  ChannelVisibility.INVISIBLE,
);

/**
 * Arbitrary for `Map<number, Map<string, string>>` representing
 * encrypted shared keys across 1–5 epochs.
 *
 * Each epoch maps 1–5 member IDs to a base64-like wrapped key string.
 */
export const arbEncryptedSharedKey = (
  minEpochs = 1,
  maxEpochs = 5,
): fc.Arbitrary<Map<number, Map<string, string>>> =>
  fc
    .array(
      fc.tuple(
        fc.nat({ max: 100 }), // epoch number
        fc.array(
          fc.tuple(arbId, fc.base64String({ minLength: 8, maxLength: 64 })),
          { minLength: 1, maxLength: 5 },
        ),
      ),
      { minLength: minEpochs, maxLength: maxEpochs },
    )
    .map((entries) => {
      const outer = new Map<number, Map<string, string>>();
      // Use unique epoch numbers by offsetting duplicates
      let nextEpoch = 0;
      for (const [epoch, members] of entries) {
        const usedEpoch = outer.has(epoch) ? nextEpoch++ : epoch;
        if (outer.has(usedEpoch)) {
          nextEpoch = usedEpoch + 1;
          outer.set(nextEpoch++, new Map(members));
        } else {
          outer.set(usedEpoch, new Map(members));
          if (usedEpoch >= nextEpoch) nextEpoch = usedEpoch + 1;
        }
      }
      return outer;
    });

/** Arbitrary for IGroupMember. */
const arbGroupMember: fc.Arbitrary<IGroupMember> = fc.record({
  memberId: arbId,
  role: arbRole,
  joinedAt: arbDate,
  mutedUntil: fc.option(arbDate, { nil: undefined }),
});

/** Arbitrary for IChannelMember. */
const arbChannelMember: fc.Arbitrary<IChannelMember> = fc.record({
  memberId: arbId,
  role: arbRole,
  joinedAt: arbDate,
  mutedUntil: fc.option(arbDate, { nil: undefined }),
});


/**
 * Arbitrary for IConversation<string, string>.
 * Generates a conversation with two distinct participants and a valid
 * encryptedSharedKey map.
 */
export const arbConversation: fc.Arbitrary<IConversation> = fc
  .record({
    id: arbId,
    participant1: arbId,
    participant2: arbId,
    encryptedSharedKey: arbEncryptedSharedKey(),
    createdAt: arbDate,
    lastMessageAt: arbDate,
    lastMessagePreview: fc.option(fc.string({ minLength: 0, maxLength: 100 }), {
      nil: undefined,
    }),
  })
  .filter((r) => r.participant1 !== r.participant2)
  .map((r) => ({
    id: r.id,
    participants: [r.participant1, r.participant2] as [string, string],
    encryptedSharedKey: r.encryptedSharedKey,
    createdAt: r.createdAt,
    lastMessageAt: r.lastMessageAt,
    lastMessagePreview: r.lastMessagePreview,
  }));

/**
 * Arbitrary for IGroup<string, string>.
 * Generates a group with 1–10 members and a valid encryptedSharedKey map.
 */
export const arbGroup: fc.Arbitrary<IGroup> = fc.record({
  id: arbId,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  creatorId: arbId,
  members: fc.array(arbGroupMember, { minLength: 1, maxLength: 10 }),
  encryptedSharedKey: arbEncryptedSharedKey(),
  createdAt: arbDate,
  lastMessageAt: arbDate,
  pinnedMessageIds: fc.array(arbId, { minLength: 0, maxLength: 5 }),
  promotedFromConversation: fc.option(arbId, { nil: undefined }),
});

/**
 * Arbitrary for IChannel<string, string>.
 * Generates a channel with members, visibility, and a valid encryptedSharedKey.
 */
export const arbChannel: fc.Arbitrary<IChannel> = fc.record({
  id: arbId,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  topic: fc.string({ minLength: 0, maxLength: 100 }),
  creatorId: arbId,
  visibility: arbVisibility,
  members: fc.array(arbChannelMember, { minLength: 1, maxLength: 10 }),
  encryptedSharedKey: arbEncryptedSharedKey(),
  createdAt: arbDate,
  lastMessageAt: arbDate,
  pinnedMessageIds: fc.array(arbId, { minLength: 0, maxLength: 5 }),
  historyVisibleToNewMembers: fc.boolean(),
  serverId: fc.option(arbId, { nil: undefined }),
});

/**
 * Arbitrary for IServer<string, string>.
 * Generates a server with members, channels, and categories.
 */
export const arbServer: fc.Arbitrary<IServer> = fc
  .record({
    id: arbId,
    name: fc.string({ minLength: 1, maxLength: 100 }),
    iconUrl: fc.option(fc.webUrl(), { nil: undefined }),
    ownerId: arbId,
    memberIds: fc.array(arbId, { minLength: 1, maxLength: 10 }),
    channelIds: fc.array(arbId, { minLength: 0, maxLength: 10 }),
    categories: fc.array(
      fc.record({
        id: arbId,
        name: fc.string({ minLength: 1, maxLength: 50 }),
        position: fc.nat({ max: 20 }),
        channelIds: fc.array(arbId, { minLength: 0, maxLength: 5 }),
      }) as fc.Arbitrary<IServerCategory>,
      { minLength: 0, maxLength: 5 },
    ),
    createdAt: arbDate,
    updatedAt: arbDate,
  });

/**
 * Arbitrary for ICommunicationMessage<string, string>.
 * Optionally accepts a fixed contextId; otherwise generates a random one.
 */
export const arbMessage = (
  contextId?: string,
): fc.Arbitrary<ICommunicationMessage> =>
  fc.record({
    id: arbId,
    contextType: fc.constantFrom(
      'conversation' as const,
      'group' as const,
      'channel' as const,
    ),
    contextId: contextId ? fc.constant(contextId) : arbId,
    senderId: arbId,
    encryptedContent: fc.base64String({ minLength: 1, maxLength: 200 }),
    createdAt: arbDate,
    editedAt: fc.option(arbDate, { nil: undefined }),
    editHistory: fc.constant([]),
    deleted: fc.constant(false),
    deletedBy: fc.option(arbId, { nil: undefined }),
    pinned: fc.boolean(),
    reactions: fc.constant([]),
    keyEpoch: fc.nat({ max: 100 }),
    attachments: fc.constant([]),
    expiresAt: fc.option(arbDate, { nil: undefined }),
    maxReads: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
    readCount: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
    readBy: fc.option(fc.constant(new Map<string, Date>()), { nil: undefined }),
    exploded: fc.option(fc.boolean(), { nil: undefined }),
    explodedAt: fc.option(arbDate, { nil: undefined }),
  });

/**
 * Arbitrary for IInviteToken<string>.
 * Generates a channel invite token with valid metadata.
 */
export const arbInviteToken: fc.Arbitrary<IInviteToken> = fc.record({
  token: fc.stringMatching(/^[a-zA-Z0-9]{8,32}$/),
  channelId: arbId,
  createdBy: arbId,
  createdAt: arbDate,
  expiresAt: arbDate,
  maxUses: fc.integer({ min: 1, max: 1000 }),
  currentUses: fc.nat({ max: 999 }),
});

/**
 * Arbitrary for IServerInviteToken<string>.
 * Generates a server invite token with valid metadata.
 */
export const arbServerInviteToken: fc.Arbitrary<IServerInviteToken> = fc.record({
  token: fc.stringMatching(/^[a-zA-Z0-9]{8,32}$/),
  serverId: arbId,
  createdBy: arbId,
  createdAt: arbDate,
  expiresAt: fc.option(arbDate, { nil: undefined }),
  maxUses: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
  currentUses: fc.nat({ max: 999 }),
});
