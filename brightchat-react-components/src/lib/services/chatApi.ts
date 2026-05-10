/**
 * ChatApiClient — typed service wrapping all BrightChat API endpoints
 * for conversations, groups, and channels.
 *
 * Accepts an AxiosInstance (provided via useAuthenticatedApi from
 * @digitaldefiance/express-suite-react-components) so the component library
 * has no hardcoded API configuration.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 3.3, 3.4, 3.6, 4.2, 4.4, 4.5, 4.6,
 *              4.7, 4.8, 5.2, 5.4, 5.5, 5.6, 5.7, 5.9, 5.10, 5.11,
 *              6.1, 6.2, 6.3, 6.5, 6.6,
 *              2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 3.1, 3.2
 */

import {
  IAddGroupMembersResponse,
  IAddReactionResponse,
  IAddServerMembersResponse,
  IApiEnvelope,
  IAssignRoleResponse,
  IChannelUpdate,
  // Channel responses
  ICreateChannelResponse,
  // Group responses
  ICreateGroupResponse,
  ICreateInviteResponse,
  ICreateServerInviteResponse,
  // Server responses
  ICreateServerResponse,
  IDeleteChannelResponse,
  IDeleteMessageResponse,
  IDeleteServerIconResponse,
  IDeleteServerResponse,
  // Message operation responses
  IEditMessageResponse,
  IGetChannelMessagesResponse,
  IGetChannelResponse,
  IGetGroupMessagesResponse,
  IGetGroupResponse,
  IGetMessagesResponse,
  IGetServerResponse,
  IJoinChannelResponse,
  IKickChannelMemberResponse,
  ILeaveChannelResponse,
  ILeaveGroupResponse,
  IListChannelsResponse,
  IListConversationsResponse,
  IListGroupsResponse,
  IListServersResponse,
  IMuteChannelMemberResponse,
  IPinMessageResponse,
  IPromoteToGroupResponse,
  IRedeemInviteResponse,
  IRedeemServerInviteResponse,
  IRemoveGroupMemberResponse,
  IRemoveReactionResponse,
  IRemoveServerMemberResponse,
  ISearchMessagesResponse,
  ISearchUsersResponse,
  ISendChannelMessageResponse,
  // Conversation responses
  ISendDirectMessageResponse,
  ISendGroupMessageResponse,
  // Staging & server icon responses
  ITempUploadResponse,
  IUnpinMessageResponse,
  IUpdateChannelResponse,
  IUpdateServerResponse,
  IUploadServerIconResponse,
} from '@brightchain/brightchain-lib';

import {
  AddMembersParams,
  AddReactionParams,
  AddServerMembersParams,
  AssignRoleParams,
  CreateChannelParams,
  CreateGroupParams,
  CreateInviteParams,
  CreateServerInviteParams,
  CreateServerParams,
  EditMessageParams,
  MuteMemberParams,
  PaginationParams,
  PromoteToGroupParams,
  SearchParams,
  SendDirectMessageParams,
  SendMessageParams,
  UpdateServerParams,
} from '@brightchain/brightchat-lib';
import { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';

// ─── Error envelope extraction ──────────────────────────────────────────────

/**
 * Wraps an Axios call that returns an IApiEnvelope<T>, extracts the data
 * payload on success, and propagates the server-provided error message on
 * failure.
 */
export async function handleApiCall<T>(
  call: () => Promise<AxiosResponse<IApiEnvelope<T>>>,
): Promise<T> {
  try {
    const response = await call();
    if (response.data.status === 'error') {
      throw new Error(response.data.error?.message ?? 'Unknown error');
    }
    return response.data.data as T;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    }
    throw error;
  }
}

// ─── ChatApiClient factory ──────────────────────────────────────────────────

export function createChatApiClient(api: AxiosInstance) {
  return {
    // ─── Conversations ────────────────────────────────────────────────

    sendDirectMessage: (params: SendDirectMessageParams) =>
      handleApiCall<
        ISendDirectMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ISendDirectMessageResponse>(
          '/brightchat/conversations',
          params,
        ),
      ),

    listConversations: (params?: PaginationParams) =>
      handleApiCall<
        IListConversationsResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IListConversationsResponse>('/brightchat/conversations', {
          params,
        }),
      ),

    getConversationMessages: (
      conversationId: string,
      params?: PaginationParams,
    ) =>
      handleApiCall<
        IGetMessagesResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetMessagesResponse>(
          `/brightchat/conversations/${encodeURIComponent(conversationId)}/messages`,
          { params },
        ),
      ),

    deleteMessage: (conversationId: string, messageId: string) =>
      handleApiCall<
        IDeleteMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IDeleteMessageResponse>(
          `/brightchat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
        ),
      ),

    promoteToGroup: (conversationId: string, params: PromoteToGroupParams) =>
      handleApiCall<
        IPromoteToGroupResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IPromoteToGroupResponse>(
          `/brightchat/conversations/${encodeURIComponent(conversationId)}/promote`,
          params,
        ),
      ),

    // ─── Groups ───────────────────────────────────────────────────────

    createGroup: (params: CreateGroupParams) =>
      handleApiCall<
        ICreateGroupResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.post<ICreateGroupResponse>('/brightchat/groups', params)),

    listGroups: (params?: PaginationParams) =>
      handleApiCall<
        IListGroupsResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.get<IListGroupsResponse>('/brightchat/groups', { params })),

    getGroup: (groupId: string) =>
      handleApiCall<
        IGetGroupResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetGroupResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}`,
        ),
      ),

    sendGroupMessage: (groupId: string, params: SendMessageParams) =>
      handleApiCall<
        ISendGroupMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ISendGroupMessageResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages`,
          params,
        ),
      ),

    getGroupMessages: (groupId: string, params?: PaginationParams) =>
      handleApiCall<
        IGetGroupMessagesResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetGroupMessagesResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages`,
          { params },
        ),
      ),

    addGroupMembers: (groupId: string, params: AddMembersParams) =>
      handleApiCall<
        IAddGroupMembersResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IAddGroupMembersResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/members`,
          params,
        ),
      ),

    removeGroupMember: (groupId: string, memberId: string) =>
      handleApiCall<
        IRemoveGroupMemberResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IRemoveGroupMemberResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
        ),
      ),

    leaveGroup: (groupId: string) =>
      handleApiCall<
        ILeaveGroupResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ILeaveGroupResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/leave`,
        ),
      ),

    assignGroupRole: (
      groupId: string,
      memberId: string,
      params: AssignRoleParams,
    ) =>
      handleApiCall<
        IAssignRoleResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.put<IAssignRoleResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/roles/${encodeURIComponent(memberId)}`,
          params,
        ),
      ),

    addGroupReaction: (
      groupId: string,
      messageId: string,
      params: AddReactionParams,
    ) =>
      handleApiCall<
        IAddReactionResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IAddReactionResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/reactions`,
          params,
        ),
      ),

    removeGroupReaction: (
      groupId: string,
      messageId: string,
      reactionId: string,
    ) =>
      handleApiCall<
        IRemoveReactionResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IRemoveReactionResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(reactionId)}`,
        ),
      ),

    editGroupMessage: (
      groupId: string,
      messageId: string,
      params: EditMessageParams,
    ) =>
      handleApiCall<
        IEditMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.put<IEditMessageResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
          params,
        ),
      ),

    pinGroupMessage: (groupId: string, messageId: string) =>
      handleApiCall<
        IPinMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IPinMessageResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/pin`,
        ),
      ),

    unpinGroupMessage: (groupId: string, messageId: string) =>
      handleApiCall<
        IUnpinMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IUnpinMessageResponse>(
          `/brightchat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/pin`,
        ),
      ),

    // ─── Channels ─────────────────────────────────────────────────────

    createChannel: (params: CreateChannelParams) =>
      handleApiCall<
        ICreateChannelResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.post<ICreateChannelResponse>('/brightchat/channels', params)),

    listChannels: (params?: PaginationParams) =>
      handleApiCall<
        IListChannelsResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IListChannelsResponse>('/brightchat/channels', { params }),
      ),

    getChannel: (channelId: string) =>
      handleApiCall<
        IGetChannelResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetChannelResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}`,
        ),
      ),

    updateChannel: (channelId: string, params: IChannelUpdate) =>
      handleApiCall<
        IUpdateChannelResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.put<IUpdateChannelResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}`,
          params,
        ),
      ),

    deleteChannel: (channelId: string) =>
      handleApiCall<
        IDeleteChannelResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IDeleteChannelResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}`,
        ),
      ),

    joinChannel: (channelId: string) =>
      handleApiCall<
        IJoinChannelResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IJoinChannelResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/join`,
        ),
      ),

    leaveChannel: (channelId: string) =>
      handleApiCall<
        ILeaveChannelResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ILeaveChannelResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/leave`,
        ),
      ),

    sendChannelMessage: (channelId: string, params: SendMessageParams) =>
      handleApiCall<
        ISendChannelMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ISendChannelMessageResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages`,
          params,
        ),
      ),

    getChannelMessages: (channelId: string, params?: PaginationParams) =>
      handleApiCall<
        IGetChannelMessagesResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetChannelMessagesResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages`,
          { params },
        ),
      ),

    searchChannelMessages: (channelId: string, params: SearchParams) =>
      handleApiCall<
        ISearchMessagesResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<ISearchMessagesResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages/search`,
          { params },
        ),
      ),

    createInvite: (channelId: string, params?: CreateInviteParams) =>
      handleApiCall<
        ICreateInviteResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ICreateInviteResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/invites`,
          params,
        ),
      ),

    redeemInvite: (channelId: string, token: string) =>
      handleApiCall<
        IRedeemInviteResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IRedeemInviteResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/invites/${encodeURIComponent(token)}/redeem`,
        ),
      ),

    assignChannelRole: (
      channelId: string,
      memberId: string,
      params: AssignRoleParams,
    ) =>
      handleApiCall<
        IAssignRoleResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.put<IAssignRoleResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/roles/${encodeURIComponent(memberId)}`,
          params,
        ),
      ),

    addChannelReaction: (
      channelId: string,
      messageId: string,
      params: AddReactionParams,
    ) =>
      handleApiCall<
        IAddReactionResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IAddReactionResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reactions`,
          params,
        ),
      ),

    removeChannelReaction: (
      channelId: string,
      messageId: string,
      reactionId: string,
    ) =>
      handleApiCall<
        IRemoveReactionResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IRemoveReactionResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(reactionId)}`,
        ),
      ),

    editChannelMessage: (
      channelId: string,
      messageId: string,
      params: EditMessageParams,
    ) =>
      handleApiCall<
        IEditMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.put<IEditMessageResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`,
          params,
        ),
      ),

    pinChannelMessage: (channelId: string, messageId: string) =>
      handleApiCall<
        IPinMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IPinMessageResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/pin`,
        ),
      ),

    unpinChannelMessage: (channelId: string, messageId: string) =>
      handleApiCall<
        IUnpinMessageResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IUnpinMessageResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/pin`,
        ),
      ),

    muteChannelMember: (
      channelId: string,
      memberId: string,
      params: MuteMemberParams,
    ) =>
      handleApiCall<
        IMuteChannelMemberResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IMuteChannelMemberResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/mute/${encodeURIComponent(memberId)}`,
          params,
        ),
      ),

    kickChannelMember: (channelId: string, memberId: string) =>
      handleApiCall<
        IKickChannelMemberResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IKickChannelMemberResponse>(
          `/brightchat/channels/${encodeURIComponent(channelId)}/kick/${encodeURIComponent(memberId)}`,
        ),
      ),

    // ─── Servers ──────────────────────────────────────────────────────

    createServer: (params: CreateServerParams) =>
      handleApiCall<
        ICreateServerResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.post<ICreateServerResponse>('/brightchat/servers', params)),

    listServers: (params?: PaginationParams) =>
      handleApiCall<
        IListServersResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.get<IListServersResponse>('/brightchat/servers', { params })),

    getServer: (serverId: string) =>
      handleApiCall<
        IGetServerResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetServerResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}`,
        ),
      ),

    updateServer: (serverId: string, params: UpdateServerParams) =>
      handleApiCall<
        IUpdateServerResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.put<IUpdateServerResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}`,
          params,
        ),
      ),

    deleteServer: (serverId: string) =>
      handleApiCall<
        IDeleteServerResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IDeleteServerResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}`,
        ),
      ),

    addServerMembers: (serverId: string, params: AddServerMembersParams) =>
      handleApiCall<
        IAddServerMembersResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IAddServerMembersResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}/members`,
          params,
        ),
      ),

    removeServerMember: (serverId: string, memberId: string) =>
      handleApiCall<
        IRemoveServerMemberResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IRemoveServerMemberResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}/members/${encodeURIComponent(memberId)}`,
        ),
      ),

    createServerInvite: (serverId: string, params: CreateServerInviteParams) =>
      handleApiCall<
        ICreateServerInviteResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ICreateServerInviteResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}/invites`,
          params,
        ),
      ),

    redeemServerInvite: (serverId: string, token: string) =>
      handleApiCall<
        IRedeemServerInviteResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IRedeemServerInviteResponse>(
          `/brightchat/servers/${encodeURIComponent(serverId)}/invites/${encodeURIComponent(token)}/redeem`,
        ),
      ),

    // ─── User Search ────────────────────────────────────────────────────

    searchUsers: (query?: string) =>
      handleApiCall<
        ISearchUsersResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<ISearchUsersResponse>('/brightchat/users/search', {
          params: { query },
        }),
      ),

    /** Batch-resolve user IDs to display names. */
    batchLookupUsers: (ids: string[]) =>
      handleApiCall<
        ISearchUsersResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<ISearchUsersResponse>('/brightchat/users/search/batch', {
          ids,
        }),
      ),

    // ─── Staging & Server Icon ────────────────────────────────────────

    /** Stage a file for upload via the temporary upload system. */
    stageFile: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // temp-upload returns ITempUploadResponse directly (not wrapped in IApiEnvelope)
      return api
        .post<ITempUploadResponse>('/temp-upload', formData)
        .then((res) => res.data)
        .catch((error) => {
          if (isAxiosError(error) && error.response?.data?.error?.message) {
            throw new Error(error.response.data.error.message);
          }
          throw error;
        });
    },

    /** Upload a server icon using a staging commit token. */
    uploadServerIcon: (serverId: string, commitToken: string) =>
      handleApiCall<
        IUploadServerIconResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IUploadServerIconResponse>(
          `/servers/${encodeURIComponent(serverId)}/icon`,
          { commitToken },
        ),
      ),

    /** Remove a server icon. */
    removeServerIcon: (serverId: string) =>
      handleApiCall<
        IDeleteServerIconResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IDeleteServerIconResponse>(
          `/servers/${encodeURIComponent(serverId)}/icon`,
        ),
      ),

    /** Get the icon serving URL for a server (utility, no API call). */
    getServerIconUrl: (serverId: string): string =>
      `/api/servers/${encodeURIComponent(serverId)}/icon`,
  };
}

export type ChatApiClient = ReturnType<typeof createChatApiClient>;
