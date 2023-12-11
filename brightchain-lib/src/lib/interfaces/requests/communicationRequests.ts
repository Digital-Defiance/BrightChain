/**
 * Communication API request interfaces.
 * These interfaces define the shape of request payloads for all
 * communication controller endpoints (direct messages, groups, channels, presence).
 *
 * Requirements: 10.2
 */

import {
  ChannelVisibility,
  DefaultRole,
  PresenceStatus,
} from '../../enumerations/communication';

// ─── Direct Message requests ────────────────────────────────────────────────

export interface ISendDirectMessageRequest {
  recipientId: string;
  content: string; // base64-encoded encrypted content
}

export interface IListConversationsRequest {
  cursor?: string;
  limit?: number;
}

export interface IGetConversationMessagesRequest {
  conversationId: string;
  cursor?: string;
  limit?: number;
}

export interface IDeleteConversationMessageRequest {
  conversationId: string;
  messageId: string;
}

export interface IPromoteConversationRequest {
  conversationId: string;
  newMemberIds: string[];
}

// ─── Group requests ─────────────────────────────────────────────────────────

export interface ICreateGroupRequest {
  name: string;
  memberIds: string[];
}

export interface IGetGroupRequest {
  groupId: string;
}

export interface ISendGroupMessageRequest {
  groupId: string;
  content: string;
}

export interface IGetGroupMessagesRequest {
  groupId: string;
  cursor?: string;
  limit?: number;
}

export interface IAddGroupMembersRequest {
  groupId: string;
  memberIds: string[];
}

export interface IRemoveGroupMemberRequest {
  groupId: string;
  memberId: string;
}

export interface ILeaveGroupRequest {
  groupId: string;
}

export interface IAssignGroupRoleRequest {
  groupId: string;
  memberId: string;
  role: DefaultRole;
}

// ─── Channel requests ───────────────────────────────────────────────────────

export interface ICreateChannelRequest {
  name: string;
  topic?: string;
  visibility: ChannelVisibility;
}

export interface IListChannelsRequest {
  cursor?: string;
  limit?: number;
}

export interface IGetChannelRequest {
  channelId: string;
}

export interface IUpdateChannelRequest {
  channelId: string;
  name?: string;
  topic?: string;
  visibility?: ChannelVisibility;
  historyVisibleToNewMembers?: boolean;
}

export interface IDeleteChannelRequest {
  channelId: string;
}

export interface IJoinChannelRequest {
  channelId: string;
}

export interface ILeaveChannelRequest {
  channelId: string;
}

export interface ISendChannelMessageRequest {
  channelId: string;
  content: string;
}

export interface IGetChannelMessagesRequest {
  channelId: string;
  cursor?: string;
  limit?: number;
}

export interface ISearchChannelMessagesRequest {
  channelId: string;
  query: string;
  cursor?: string;
  limit?: number;
}

export interface ICreateInviteRequest {
  channelId: string;
  maxUses?: number;
  expiresInMs?: number;
}

export interface IRedeemInviteRequest {
  channelId: string;
  token: string;
}

export interface IAssignChannelRoleRequest {
  channelId: string;
  memberId: string;
  role: DefaultRole;
}

export interface IMuteChannelMemberRequest {
  channelId: string;
  memberId: string;
  durationMs: number;
}

export interface IKickChannelMemberRequest {
  channelId: string;
  memberId: string;
}

// ─── Message operation requests (shared across groups and channels) ─────────

export interface IEditMessageRequest {
  messageId: string;
  content: string;
}

export interface IAddReactionRequest {
  messageId: string;
  emoji: string;
}

export interface IRemoveReactionRequest {
  messageId: string;
  reactionId: string;
}

export interface IPinMessageRequest {
  messageId: string;
}

export interface IUnpinMessageRequest {
  messageId: string;
}

// ─── Presence requests ──────────────────────────────────────────────────────

export interface ISetPresenceRequest {
  status: PresenceStatus;
}

// ─── Search requests ────────────────────────────────────────────────────────

export interface ISearchAllMessagesRequest {
  query: string;
  cursor?: string;
  limit?: number;
}
