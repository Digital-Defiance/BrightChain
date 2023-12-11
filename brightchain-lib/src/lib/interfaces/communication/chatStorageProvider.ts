/**
 * Storage abstraction for BrightChat services.
 *
 * This interface lives in brightchain-lib so that ConversationService,
 * GroupService, and ChannelService can depend on it without importing
 * brightchain-db. A BrightDb-backed implementation is provided at
 * construction time from application.ts.
 *
 * When no provider is injected (e.g. in unit tests), services fall back
 * to their existing in-memory Maps.
 *
 * Collection names (for BrightDb wiring):
 *   - brightchat_conversations
 *   - brightchat_messages
 *   - brightchat_groups
 *   - brightchat_group_messages
 *   - brightchat_channels
 *   - brightchat_channel_messages
 *   - brightchat_invite_tokens
 *   - brightchat_servers
 *   - brightchat_server_invites
 */

import {
  IConversation,
  ICommunicationMessage,
  IGroup,
  IChannel,
  IInviteToken,
} from '../communication';
import { IServer, IServerInviteToken } from './server';

/**
 * Minimal async CRUD collection interface.
 *
 * Mirrors the subset of operations that BrightChat services perform
 * on their internal Maps. Any backing store (BrightDb, in-memory, etc.)
 * can satisfy this contract.
 *
 * The `key` parameter in findById / update / delete is the logical
 * primary key for the entity (e.g. `id` for most types, `token` for
 * invite tokens).
 */
export interface IChatCollection<T> {
  /** Insert a new document. */
  create(doc: T): Promise<void>;

  /** Find a single document by its primary key, or return null. */
  findById(key: string): Promise<T | null>;

  /**
   * Find all documents matching a partial filter.
   * An empty/undefined filter returns all documents.
   */
  findMany(filter?: Partial<T>): Promise<T[]>;

  /** Replace the document with the matching primary key. */
  update(key: string, doc: T): Promise<void>;

  /** Delete the document with the matching primary key. */
  delete(key: string): Promise<void>;
}

/**
 * Groups all BrightChat collections behind a single injectable provider.
 *
 * Services receive this at construction time. Each getter returns a
 * typed collection backed by BrightDb (or an in-memory fallback).
 */
export interface IChatStorageProvider {
  /** Collection for 1-on-1 conversations (`brightchat_conversations`). */
  readonly conversations: IChatCollection<IConversation>;

  /** Collection for conversation messages (`brightchat_messages`). */
  readonly messages: IChatCollection<ICommunicationMessage>;

  /** Collection for group entities (`brightchat_groups`). */
  readonly groups: IChatCollection<IGroup>;

  /** Collection for group messages (`brightchat_group_messages`). */
  readonly groupMessages: IChatCollection<ICommunicationMessage>;

  /** Collection for channel entities (`brightchat_channels`). */
  readonly channels: IChatCollection<IChannel>;

  /** Collection for channel messages (`brightchat_channel_messages`). */
  readonly channelMessages: IChatCollection<ICommunicationMessage>;

  /** Collection for channel invite tokens (`brightchat_invite_tokens`). */
  readonly inviteTokens: IChatCollection<IInviteToken>;

  /** Collection for server entities (`brightchat_servers`). */
  readonly servers: IChatCollection<IServer>;

  /** Collection for server invite tokens (`brightchat_server_invites`). */
  readonly serverInvites: IChatCollection<IServerInviteToken>;
}
