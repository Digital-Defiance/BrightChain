/**
 * BrightDb-backed implementation of IChatStorageProvider.
 *
 * Bridges BrightDb DocumentCollection instances to the IChatCollection
 * interface that BrightChat services (ConversationService, GroupService,
 * ChannelService) expect.
 *
 * Follows the same getModel/wrapCollection pattern used by BrightHub services,
 * but adapts to the simpler IChatCollection contract instead of BrightHubCollection.
 */

import type {
  IChannel,
  IChatCollection,
  IChatStorageProvider,
  ICommunicationMessage,
  IConversation,
  IGroup,
  IInviteToken,
  IServer,
  IServerInviteToken,
} from '@brightchain/brightchain-lib';
import type {
  DocumentCollection,
  DocumentRecord,
} from '../../datastore/document-store';

/**
 * Adapts a BrightDb DocumentCollection to the IChatCollection interface.
 *
 * The `keyField` parameter specifies which property on the document serves
 * as the logical primary key (e.g. `'id'` for most entities, `'token'` for
 * invite tokens).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export class ChatCollectionAdapter<T> implements IChatCollection<T> {
  constructor(
    private readonly collection: any,
    private readonly keyField: string,
  ) {}

  async create(doc: T): Promise<void> {
    // BrightDb Collection has insertOne(), BlockCollection has create()
    if (typeof this.collection.insertOne === 'function') {
      await this.collection.insertOne(doc);
    } else if (typeof this.collection.create === 'function') {
      await this.collection.create(doc);
    }
  }

  async findById(key: string): Promise<T | null> {
    const filter = { [this.keyField]: key };
    const result = this.collection.findOne(filter);
    // BrightDb returns Promise directly; wrapped collections return { exec() }
    if (result && typeof result.exec === 'function') {
      return ((await result.exec()) as T | null) ?? null;
    }
    return ((await result) as T | null) ?? null;
  }

  async findMany(filter?: Partial<T>): Promise<T[]> {
    const dbFilter = (filter ?? {}) as any;
    const cursor = this.collection.find(dbFilter);
    // BrightDb Cursor has toArray(); wrapped collections have exec()
    if (cursor && typeof cursor.toArray === 'function') {
      return ((await cursor.toArray()) as T[]) ?? [];
    }
    if (cursor && typeof cursor.exec === 'function') {
      return ((await cursor.exec()) as T[]) ?? [];
    }
    // Cursor is thenable (awaiting returns the array)
    return ((await cursor) as T[]) ?? [];
  }

  async update(key: string, doc: T): Promise<void> {
    const filter = { [this.keyField]: key };
    await this.collection.updateOne(filter, doc);
  }

  async delete(key: string): Promise<void> {
    const filter = { [this.keyField]: key };
    await this.collection.deleteOne(filter);
  }
}

/**
 * Collection names used by BrightChat in BrightDb.
 */
export const BRIGHTCHAT_COLLECTIONS = {
  conversations: 'brightchat_conversations',
  messages: 'brightchat_messages',
  groups: 'brightchat_groups',
  groupMessages: 'brightchat_group_messages',
  channels: 'brightchat_channels',
  channelMessages: 'brightchat_channel_messages',
  inviteTokens: 'brightchat_invite_tokens',
  servers: 'brightchat_servers',
  serverInvites: 'brightchat_server_invites',
} as const;

/**
 * Creates an IChatStorageProvider backed by BrightDb collections.
 *
 * @param getCollection - Function that returns a DocumentCollection for a given name.
 *   Typically `(name) => app.getModel(name)` or `(name) => brightDb.collection(name)`.
 */
export function createChatStorageProvider(
  getCollection: <T extends DocumentRecord>(
    name: string,
  ) => DocumentCollection<T>,
): IChatStorageProvider {
  return {
    conversations: new ChatCollectionAdapter<IConversation>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.conversations),
      'id',
    ),
    messages: new ChatCollectionAdapter<ICommunicationMessage>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.messages),
      'id',
    ),
    groups: new ChatCollectionAdapter<IGroup>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.groups),
      'id',
    ),
    groupMessages: new ChatCollectionAdapter<ICommunicationMessage>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.groupMessages),
      'id',
    ),
    channels: new ChatCollectionAdapter<IChannel>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.channels),
      'id',
    ),
    channelMessages: new ChatCollectionAdapter<ICommunicationMessage>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.channelMessages),
      'id',
    ),
    inviteTokens: new ChatCollectionAdapter<IInviteToken>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.inviteTokens),
      'token',
    ),
    servers: new ChatCollectionAdapter<IServer>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.servers),
      'id',
    ),
    serverInvites: new ChatCollectionAdapter<IServerInviteToken>(
      getCollection<DocumentRecord>(BRIGHTCHAT_COLLECTIONS.serverInvites),
      'token',
    ),
  };
}
