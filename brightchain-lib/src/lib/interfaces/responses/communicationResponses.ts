/**
 * Communication API response interfaces.
 * All responses use the IApiEnvelope wrapper defined in communication.ts.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them. The Express-specific wrappers
 * (extending Response) live in brightchain-api-lib.
 *
 * Generic parameters:
 *   TId   – identifier type (string on frontend, GuidV4Buffer on backend)
 *   TData – binary-data type (string/base64 on frontend, Buffer on backend)
 *
 * Requirements: 10.1
 */

import {
  IApiEnvelope,
  IChannel,
  ICommunicationMessage,
  IConversation,
  IGroup,
  IInviteToken,
  IPaginatedResult,
  ISearchResultItem,
} from '../communication';

// ─── Direct Message responses ───────────────────────────────────────────────

export type ISendDirectMessageResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<ICommunicationMessage<TId, TData>>;

export type IListConversationsResponse<TId = string> = IApiEnvelope<
  IPaginatedResult<IConversation<TId>>
>;

export type IGetMessagesResponse<TId = string, TData = string> = IApiEnvelope<
  IPaginatedResult<ICommunicationMessage<TId, TData>>
>;

export type IDeleteMessageResponse = IApiEnvelope<{ deleted: boolean }>;

export type IPromoteToGroupResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<IGroup<TId, TData>>;

// ─── Group responses ────────────────────────────────────────────────────────

export type ICreateGroupResponse<TId = string, TData = string> = IApiEnvelope<
  IGroup<TId, TData>
>;

export type IGetGroupResponse<TId = string, TData = string> = IApiEnvelope<
  IGroup<TId, TData>
>;

export type ISendGroupMessageResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<ICommunicationMessage<TId, TData>>;

export type IGetGroupMessagesResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<IPaginatedResult<ICommunicationMessage<TId, TData>>>;

export type IAddGroupMembersResponse = IApiEnvelope<{ added: string[] }>;

export type IRemoveGroupMemberResponse = IApiEnvelope<{ removed: string }>;

export type ILeaveGroupResponse = IApiEnvelope<{ left: boolean }>;

export type IAssignRoleResponse = IApiEnvelope<{
  memberId: string;
  role: string;
}>;

// ─── Channel responses ──────────────────────────────────────────────────────

export type ICreateChannelResponse<TId = string, TData = string> = IApiEnvelope<
  IChannel<TId, TData>
>;

export type IListChannelsResponse<TId = string, TData = string> = IApiEnvelope<
  IPaginatedResult<IChannel<TId, TData>>
>;

export type IGetChannelResponse<TId = string, TData = string> = IApiEnvelope<
  IChannel<TId, TData>
>;

export type IUpdateChannelResponse<TId = string, TData = string> = IApiEnvelope<
  IChannel<TId, TData>
>;

export type IDeleteChannelResponse = IApiEnvelope<{ deleted: boolean }>;

export type IJoinChannelResponse = IApiEnvelope<{ joined: boolean }>;

export type ILeaveChannelResponse = IApiEnvelope<{ left: boolean }>;

export type ISendChannelMessageResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<ICommunicationMessage<TId, TData>>;

export type IGetChannelMessagesResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<IPaginatedResult<ICommunicationMessage<TId, TData>>>;

export type ISearchMessagesResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<IPaginatedResult<ICommunicationMessage<TId, TData>>>;

export type ICreateInviteResponse<TId = string> = IApiEnvelope<
  IInviteToken<TId>
>;

export type IRedeemInviteResponse = IApiEnvelope<{ redeemed: boolean }>;

export type IMuteChannelMemberResponse = IApiEnvelope<{
  muted: boolean;
  until: string;
}>;

export type IKickChannelMemberResponse = IApiEnvelope<{ kicked: boolean }>;

// ─── Message operation responses ────────────────────────────────────────────

export type IEditMessageResponse<TId = string, TData = string> = IApiEnvelope<
  ICommunicationMessage<TId, TData>
>;

export type IAddReactionResponse = IApiEnvelope<{
  reactionId: string;
  emoji: string;
}>;

export type IRemoveReactionResponse = IApiEnvelope<{ removed: boolean }>;

export type IPinMessageResponse = IApiEnvelope<{ pinned: boolean }>;

export type IUnpinMessageResponse = IApiEnvelope<{ unpinned: boolean }>;

// ─── Cross-context search responses ─────────────────────────────────────────

export type ISearchAllMessagesResponse<
  TId = string,
  TData = string,
> = IApiEnvelope<IPaginatedResult<ISearchResultItem<TId, TData>>>;
