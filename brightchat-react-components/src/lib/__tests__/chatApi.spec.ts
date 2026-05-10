/**
 * Unit tests for the BrightChat API Client (chatApi.ts).
 *
 * Tests verify that each API method constructs the correct HTTP method, URL,
 * and request body/params using a mocked AxiosInstance.
 *
 * Requirements: 8.1, 3.3, 3.4, 3.5, 5.8
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

const DefaultRoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

const ChannelVisibilityEnum = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  SECRET: 'secret',
  INVISIBLE: 'invisible',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  DefaultRole: DefaultRoleEnum,
  ChannelVisibility: ChannelVisibilityEnum,
}));

jest.mock('@brightchain/brightchat-lib', () => ({}));

import { AxiosInstance } from 'axios';
import { createChatApiClient, handleApiCall } from '../services/chatApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockAxios() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  } as unknown as AxiosInstance;
}

function successEnvelope(data: unknown = {}) {
  return { data: { status: 'success', data } };
}

// ─── Conversations ──────────────────────────────────────────────────────────

describe('ChatApiClient — Conversations', () => {
  let mockAxios: AxiosInstance;
  let client: ReturnType<typeof createChatApiClient>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());
    client = createChatApiClient(mockAxios);
  });

  it('sendDirectMessage → POST /conversations', async () => {
    await client.sendDirectMessage({ recipientId: 'r1', content: 'hello' });
    expect(mockAxios.post).toHaveBeenCalledWith('/brightchat/conversations', {
      recipientId: 'r1',
      content: 'hello',
    });
  });

  it('listConversations → GET /conversations', async () => {
    await client.listConversations({ cursor: 'c1', limit: 10 });
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/conversations', {
      params: { cursor: 'c1', limit: 10 },
    });
  });

  it('listConversations without params → GET /conversations', async () => {
    await client.listConversations();
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/conversations', {
      params: undefined,
    });
  });

  it('getConversationMessages → GET /conversations/:id/messages', async () => {
    await client.getConversationMessages('conv-1', { cursor: 'c', limit: 5 });
    expect(mockAxios.get).toHaveBeenCalledWith(
      '/brightchat/conversations/conv-1/messages',
      { params: { cursor: 'c', limit: 5 } },
    );
  });

  it('getConversationMessages encodes special characters', async () => {
    await client.getConversationMessages('a/b c');
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/brightchat/conversations/${encodeURIComponent('a/b c')}/messages`,
      { params: undefined },
    );
  });

  it('deleteMessage → DELETE /conversations/:cid/messages/:mid', async () => {
    await client.deleteMessage('conv-1', 'msg-1');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/conversations/conv-1/messages/msg-1',
    );
  });

  it('promoteToGroup → POST /conversations/:id/promote', async () => {
    await client.promoteToGroup('conv-1', { newMemberIds: ['u1', 'u2'] });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/conversations/conv-1/promote',
      { newMemberIds: ['u1', 'u2'] },
    );
  });
});

// ─── Groups ─────────────────────────────────────────────────────────────────

describe('ChatApiClient — Groups', () => {
  let mockAxios: AxiosInstance;
  let client: ReturnType<typeof createChatApiClient>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());
    client = createChatApiClient(mockAxios);
  });

  it('createGroup → POST /groups', async () => {
    await client.createGroup({ name: 'Team', memberIds: ['u1'] });
    expect(mockAxios.post).toHaveBeenCalledWith('/brightchat/groups', {
      name: 'Team',
      memberIds: ['u1'],
    });
  });

  it('getGroup → GET /groups/:id', async () => {
    await client.getGroup('g1');
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/groups/g1');
  });

  it('sendGroupMessage → POST /groups/:id/messages', async () => {
    await client.sendGroupMessage('g1', { content: 'hi' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages',
      {
        content: 'hi',
      },
    );
  });

  it('getGroupMessages → GET /groups/:id/messages', async () => {
    await client.getGroupMessages('g1', { cursor: 'c', limit: 20 });
    expect(mockAxios.get).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages',
      {
        params: { cursor: 'c', limit: 20 },
      },
    );
  });

  it('addGroupMembers → POST /groups/:id/members', async () => {
    await client.addGroupMembers('g1', { memberIds: ['u2', 'u3'] });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/groups/g1/members',
      {
        memberIds: ['u2', 'u3'],
      },
    );
  });

  it('removeGroupMember → DELETE /groups/:gid/members/:mid', async () => {
    await client.removeGroupMember('g1', 'u2');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/groups/g1/members/u2',
    );
  });

  it('leaveGroup → POST /groups/:id/leave', async () => {
    await client.leaveGroup('g1');
    expect(mockAxios.post).toHaveBeenCalledWith('/brightchat/groups/g1/leave');
  });

  it('assignGroupRole → PUT /groups/:gid/roles/:mid', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.assignGroupRole('g1', 'u1', { role: 'admin' as any });
    expect(mockAxios.put).toHaveBeenCalledWith(
      '/brightchat/groups/g1/roles/u1',
      {
        role: 'admin',
      },
    );
  });

  it('addGroupReaction → POST /groups/:gid/messages/:mid/reactions', async () => {
    await client.addGroupReaction('g1', 'm1', { emoji: '👍' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages/m1/reactions',
      { emoji: '👍' },
    );
  });

  it('removeGroupReaction → DELETE /groups/:gid/messages/:mid/reactions/:rid', async () => {
    await client.removeGroupReaction('g1', 'm1', 'r1');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages/m1/reactions/r1',
    );
  });

  it('editGroupMessage → PUT /groups/:gid/messages/:mid', async () => {
    await client.editGroupMessage('g1', 'm1', { content: 'edited' });
    expect(mockAxios.put).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages/m1',
      { content: 'edited' },
    );
  });

  it('pinGroupMessage → POST /groups/:gid/messages/:mid/pin', async () => {
    await client.pinGroupMessage('g1', 'm1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages/m1/pin',
    );
  });

  it('unpinGroupMessage → DELETE /groups/:gid/messages/:mid/pin', async () => {
    await client.unpinGroupMessage('g1', 'm1');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/groups/g1/messages/m1/pin',
    );
  });
});

// ─── Channels ───────────────────────────────────────────────────────────────

describe('ChatApiClient — Channels', () => {
  let mockAxios: AxiosInstance;
  let client: ReturnType<typeof createChatApiClient>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());
    client = createChatApiClient(mockAxios);
  });

  it('createChannel → POST /channels', async () => {
    await client.createChannel({
      name: 'general',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visibility: 'public' as any,
    });
    expect(mockAxios.post).toHaveBeenCalledWith('/brightchat/channels', {
      name: 'general',
      visibility: 'public',
    });
  });

  it('listChannels → GET /channels', async () => {
    await client.listChannels({ cursor: 'c', limit: 25 });
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/channels', {
      params: { cursor: 'c', limit: 25 },
    });
  });

  it('getChannel → GET /channels/:id', async () => {
    await client.getChannel('ch1');
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/channels/ch1');
  });

  it('updateChannel → PUT /channels/:id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.updateChannel('ch1', { name: 'renamed' } as any);
    expect(mockAxios.put).toHaveBeenCalledWith('/brightchat/channels/ch1', {
      name: 'renamed',
    });
  });

  it('deleteChannel → DELETE /channels/:id', async () => {
    await client.deleteChannel('ch1');
    expect(mockAxios.delete).toHaveBeenCalledWith('/brightchat/channels/ch1');
  });

  it('joinChannel → POST /channels/:id/join', async () => {
    await client.joinChannel('ch1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/join',
    );
  });

  it('leaveChannel → POST /channels/:id/leave', async () => {
    await client.leaveChannel('ch1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/leave',
    );
  });

  it('sendChannelMessage → POST /channels/:id/messages', async () => {
    await client.sendChannelMessage('ch1', { content: 'msg' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages',
      {
        content: 'msg',
      },
    );
  });

  it('getChannelMessages → GET /channels/:id/messages', async () => {
    await client.getChannelMessages('ch1', { cursor: 'c', limit: 10 });
    expect(mockAxios.get).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages',
      {
        params: { cursor: 'c', limit: 10 },
      },
    );
  });

  it('searchChannelMessages → GET /channels/:id/messages/search', async () => {
    await client.searchChannelMessages('ch1', { query: 'hello', limit: 5 });
    expect(mockAxios.get).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages/search',
      { params: { query: 'hello', limit: 5 } },
    );
  });

  it('createInvite → POST /channels/:id/invites', async () => {
    await client.createInvite('ch1', { maxUses: 10, expiresInMs: 3600000 });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/invites',
      {
        maxUses: 10,
        expiresInMs: 3600000,
      },
    );
  });

  it('createInvite without params → POST /channels/:id/invites', async () => {
    await client.createInvite('ch1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/invites',
      undefined,
    );
  });

  it('redeemInvite → POST /channels/:cid/invites/:token/redeem', async () => {
    await client.redeemInvite('ch1', 'tok-abc');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/invites/tok-abc/redeem',
    );
  });

  it('assignChannelRole → PUT /channels/:cid/roles/:mid', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.assignChannelRole('ch1', 'u1', { role: 'moderator' as any });
    expect(mockAxios.put).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/roles/u1',
      {
        role: 'moderator',
      },
    );
  });

  it('addChannelReaction → POST /channels/:cid/messages/:mid/reactions', async () => {
    await client.addChannelReaction('ch1', 'm1', { emoji: '❤️' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages/m1/reactions',
      { emoji: '❤️' },
    );
  });

  it('removeChannelReaction → DELETE /channels/:cid/messages/:mid/reactions/:rid', async () => {
    await client.removeChannelReaction('ch1', 'm1', 'r1');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages/m1/reactions/r1',
    );
  });

  it('editChannelMessage → PUT /channels/:cid/messages/:mid', async () => {
    await client.editChannelMessage('ch1', 'm1', { content: 'updated' });
    expect(mockAxios.put).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages/m1',
      {
        content: 'updated',
      },
    );
  });

  it('pinChannelMessage → POST /channels/:cid/messages/:mid/pin', async () => {
    await client.pinChannelMessage('ch1', 'm1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages/m1/pin',
    );
  });

  it('unpinChannelMessage → DELETE /channels/:cid/messages/:mid/pin', async () => {
    await client.unpinChannelMessage('ch1', 'm1');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/messages/m1/pin',
    );
  });

  it('muteChannelMember → POST /channels/:cid/mute/:mid', async () => {
    await client.muteChannelMember('ch1', 'u1', { durationMs: 60000 });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/mute/u1',
      { durationMs: 60000 },
    );
  });

  it('kickChannelMember → POST /channels/:cid/kick/:mid', async () => {
    await client.kickChannelMember('ch1', 'u1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/channels/ch1/kick/u1',
    );
  });
});

// ─── Servers ────────────────────────────────────────────────────────────────

describe('ChatApiClient — Servers', () => {
  let mockAxios: AxiosInstance;
  let client: ReturnType<typeof createChatApiClient>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());
    client = createChatApiClient(mockAxios);
  });

  it('createServer → POST /servers', async () => {
    await client.createServer({ name: 'My Server' });
    expect(mockAxios.post).toHaveBeenCalledWith('/brightchat/servers', {
      name: 'My Server',
    });
  });

  it('listServers → GET /servers', async () => {
    await client.listServers({ cursor: 'c1', limit: 10 });
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/servers', {
      params: { cursor: 'c1', limit: 10 },
    });
  });

  it('listServers without params → GET /servers', async () => {
    await client.listServers();
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/servers', {
      params: undefined,
    });
  });

  it('getServer → GET /servers/:id', async () => {
    await client.getServer('s1');
    expect(mockAxios.get).toHaveBeenCalledWith('/brightchat/servers/s1');
  });

  it('updateServer → PUT /servers/:id', async () => {
    await client.updateServer('s1', { name: 'Renamed' });
    expect(mockAxios.put).toHaveBeenCalledWith('/brightchat/servers/s1', {
      name: 'Renamed',
    });
  });

  it('deleteServer → DELETE /servers/:id', async () => {
    await client.deleteServer('s1');
    expect(mockAxios.delete).toHaveBeenCalledWith('/brightchat/servers/s1');
  });

  it('addServerMembers → POST /servers/:id/members', async () => {
    await client.addServerMembers('s1', { memberIds: ['u1', 'u2'] });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/servers/s1/members',
      { memberIds: ['u1', 'u2'] },
    );
  });

  it('removeServerMember → DELETE /servers/:sid/members/:mid', async () => {
    await client.removeServerMember('s1', 'u2');
    expect(mockAxios.delete).toHaveBeenCalledWith(
      '/brightchat/servers/s1/members/u2',
    );
  });

  it('createServerInvite → POST /servers/:id/invites', async () => {
    await client.createServerInvite('s1', {
      maxUses: 5,
      expiresInMs: 86400000,
    });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/servers/s1/invites',
      { maxUses: 5, expiresInMs: 86400000 },
    );
  });

  it('redeemServerInvite → POST /servers/:sid/invites/:token/redeem', async () => {
    await client.redeemServerInvite('s1', 'tok-xyz');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/brightchat/servers/s1/invites/tok-xyz/redeem',
    );
  });

  it('encodes URI components in server path segments', async () => {
    const specialId = 'id with spaces/and+slashes';
    const encoded = encodeURIComponent(specialId);

    await client.getServer(specialId);
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/brightchat/servers/${encoded}`,
    );
  });
});

// ─── Message Operations (cross-context) ─────────────────────────────────────

describe('ChatApiClient — Message Operations', () => {
  let mockAxios: AxiosInstance;
  let client: ReturnType<typeof createChatApiClient>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());
    client = createChatApiClient(mockAxios);
  });

  it('encodes URI components in all path segments', async () => {
    const specialId = 'id with spaces/and+slashes';
    const encoded = encodeURIComponent(specialId);

    await client.getGroup(specialId);
    expect(mockAxios.get).toHaveBeenCalledWith(`/brightchat/groups/${encoded}`);

    await client.getChannel(specialId);
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/brightchat/channels/${encoded}`,
    );
  });

  it('all 47 methods exist on the client', () => {
    const expectedMethods = [
      // Conversations (5)
      'sendDirectMessage',
      'listConversations',
      'getConversationMessages',
      'deleteMessage',
      'promoteToGroup',
      // Groups (13)
      'createGroup',
      'getGroup',
      'sendGroupMessage',
      'getGroupMessages',
      'addGroupMembers',
      'removeGroupMember',
      'leaveGroup',
      'assignGroupRole',
      'addGroupReaction',
      'removeGroupReaction',
      'editGroupMessage',
      'pinGroupMessage',
      'unpinGroupMessage',
      // Channels (16)
      'createChannel',
      'listChannels',
      'getChannel',
      'updateChannel',
      'deleteChannel',
      'joinChannel',
      'leaveChannel',
      'sendChannelMessage',
      'getChannelMessages',
      'searchChannelMessages',
      'createInvite',
      'redeemInvite',
      'assignChannelRole',
      'addChannelReaction',
      'removeChannelReaction',
      'editChannelMessage',
      'pinChannelMessage',
      'unpinChannelMessage',
      'muteChannelMember',
      'kickChannelMember',
      // Servers (9)
      'createServer',
      'listServers',
      'getServer',
      'updateServer',
      'deleteServer',
      'addServerMembers',
      'removeServerMember',
      'createServerInvite',
      'redeemServerInvite',
      // User Search (2)
      'searchUsers',
      'batchLookupUsers',
      // Staging & Server Icon (4)
      'stageFile',
      'uploadServerIcon',
      'removeServerIcon',
      'getServerIconUrl',
    ];

    for (const method of expectedMethods) {
      expect(typeof (client as Record<string, unknown>)[method]).toBe(
        'function',
      );
    }
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

describe('ChatApiClient — Error Handling', () => {
  /**
   * Req 3.5: 404 privacy-preserving error for DM send.
   * When sendDirectMessage gets a 404, handleApiCall should throw Error
   * with the server message ("Not found"), not reveal blocked/non-existent.
   */
  it('404 on DM send throws privacy-preserving error (Req 3.5)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = new Error('Request failed') as any;
    axiosError.isAxiosError = true;
    axiosError.response = {
      status: 404,
      data: {
        status: 'error',
        error: { message: 'Not found' },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failingCall = () => Promise.reject(axiosError) as any;

    await expect(handleApiCall(failingCall)).rejects.toThrow('Not found');
    // The error message must NOT reveal blocked/non-existent details
    try {
      await handleApiCall(failingCall);
    } catch (err) {
      const msg = (err as Error).message.toLowerCase();
      expect(msg).not.toContain('blocked');
      expect(msg).not.toContain('non-existent');
      expect(msg).not.toContain('does not exist');
    }
  });

  /**
   * Req 5.8: 410 invite expired error.
   * When redeemInvite gets a 410, handleApiCall should throw Error
   * with the server message about expired invite.
   */
  it('410 on redeemInvite throws invite expired error (Req 5.8)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = new Error('Request failed') as any;
    axiosError.isAxiosError = true;
    axiosError.response = {
      status: 410,
      data: {
        status: 'error',
        error: {
          message: 'This invite has expired or reached its usage limit',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failingCall = () => Promise.reject(axiosError) as any;

    await expect(handleApiCall(failingCall)).rejects.toThrow(
      'This invite has expired or reached its usage limit',
    );
  });

  it('handleApiCall extracts error message from envelope error response', async () => {
    const response = {
      data: {
        status: 'error',
        error: { message: 'Validation failed' },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = () => Promise.resolve(response) as any;

    await expect(handleApiCall(call)).rejects.toThrow('Validation failed');
  });

  it('handleApiCall re-throws non-Axios errors as-is', async () => {
    const genericError = new Error('Network timeout');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = () => Promise.reject(genericError) as any;

    await expect(handleApiCall(call)).rejects.toThrow('Network timeout');
  });

  it('handleApiCall returns data on success', async () => {
    const response = {
      data: {
        status: 'success',
        data: { id: '123', content: 'hello' },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = () => Promise.resolve(response) as any;
    const result = await handleApiCall(call);
    expect(result).toEqual({ id: '123', content: 'hello' });
  });
});

// ─── Staging & Server Icon ──────────────────────────────────────────────────

describe('ChatApiClient — Staging & Server Icon', () => {
  let mockAxios: AxiosInstance;
  let client: ReturnType<typeof createChatApiClient>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    (mockAxios.get as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.post as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.put as jest.Mock).mockResolvedValue(successEnvelope());
    (mockAxios.delete as jest.Mock).mockResolvedValue(successEnvelope());
    client = createChatApiClient(mockAxios);
  });

  it('stageFile → POST /temp-upload with FormData', async () => {
    const file = new File(['image-data'], 'icon.png', { type: 'image/png' });
    await client.stageFile(file);

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    const [url, body] = (mockAxios.post as jest.Mock).mock.calls[0];
    expect(url).toBe('/temp-upload');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBeInstanceOf(File);
    expect((body.get('file') as File).name).toBe('icon.png');
  });

  it('uploadServerIcon → POST /servers/:id/icon with JSON body', async () => {
    await client.uploadServerIcon('s1', 'tok-abc-123');

    expect(mockAxios.post).toHaveBeenCalledWith('/servers/s1/icon', {
      commitToken: 'tok-abc-123',
    });
  });

  it('uploadServerIcon encodes URI components in serverId', async () => {
    const specialId = 'id with spaces/and+slashes';
    const encoded = encodeURIComponent(specialId);

    await client.uploadServerIcon(specialId, 'tok-xyz');

    expect(mockAxios.post).toHaveBeenCalledWith(
      `/servers/${encoded}/icon`,
      { commitToken: 'tok-xyz' },
    );
  });

  it('removeServerIcon → DELETE /servers/:id/icon', async () => {
    await client.removeServerIcon('s1');

    expect(mockAxios.delete).toHaveBeenCalledWith('/servers/s1/icon');
  });

  it('removeServerIcon encodes URI components in serverId', async () => {
    const specialId = 'id with spaces/and+slashes';
    const encoded = encodeURIComponent(specialId);

    await client.removeServerIcon(specialId);

    expect(mockAxios.delete).toHaveBeenCalledWith(
      `/servers/${encoded}/icon`,
    );
  });

  it('getServerIconUrl returns correct URL pattern', () => {
    expect(client.getServerIconUrl('s1')).toBe('/api/servers/s1/icon');
  });

  it('getServerIconUrl encodes URI components in serverId', () => {
    const specialId = 'id with spaces/and+slashes';
    const encoded = encodeURIComponent(specialId);

    expect(client.getServerIconUrl(specialId)).toBe(
      `/api/servers/${encoded}/icon`,
    );
  });
});
