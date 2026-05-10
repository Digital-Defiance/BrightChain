/**
 * Request parameter interfaces for the BrightChat API Client.
 * These interfaces define the shape of request bodies sent to the
 * BrightChat REST API endpoints for conversations, groups, and channels.
 *
 * Requirements: 10.3, 10.4
 */

import {
  ChannelVisibility,
  DefaultRole,
  IServerCategory,
} from '@brightchain/brightchain-lib';

export interface SendDirectMessageParams {
  recipientId?: string;
  conversationId?: string;
  content?: string;
}

export interface CreateGroupParams {
  name: string;
  memberIds: string[];
}

export interface SendMessageParams {
  content: string;
}

export interface AddMembersParams {
  memberIds: string[];
}

export interface AssignRoleParams {
  role: DefaultRole;
}

export interface CreateChannelParams {
  name: string;
  topic?: string;
  visibility: ChannelVisibility;
  serverId?: string;
  categoryId?: string;
}

export interface CreateInviteParams {
  maxUses?: number;
  expiresInMs?: number;
}

export interface MuteMemberParams {
  durationMs: number;
}

export interface AddReactionParams {
  emoji: string;
}

export interface EditMessageParams {
  content: string;
}

export interface PromoteToGroupParams {
  newMemberIds: string[];
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  query: string;
}

export interface CreateServerParams {
  name: string;
  iconUrl?: string;
}

export interface UpdateServerParams {
  name?: string;
  iconUrl?: string;
  iconFaClass?: string;
  categories?: IServerCategory[];
}

export interface CreateServerInviteParams {
  maxUses?: number;
  expiresInMs?: number;
}

export interface AddServerMembersParams {
  memberIds: string[];
}
