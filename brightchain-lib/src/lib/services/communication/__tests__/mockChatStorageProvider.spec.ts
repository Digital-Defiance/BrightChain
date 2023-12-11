/**
 * Smoke tests for MockChatStorageProvider and fast-check arbitraries.
 *
 * Validates that the mock provider and all arbitraries produce valid
 * entity shapes that conform to the BrightChat interfaces.
 */

import fc from 'fast-check';
import {
  MockChatCollection,
  MockChatStorageProvider,
  arbConversation,
  arbGroup,
  arbChannel,
  arbServer,
  arbMessage,
  arbInviteToken,
  arbServerInviteToken,
  arbEncryptedSharedKey,
} from './mockChatStorageProvider';

describe('MockChatCollection', () => {
  it('findMany returns all items from the backing array', async () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const col = new MockChatCollection(items);
    const result = await col.findMany();
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('findMany returns a copy, not the internal array', async () => {
    const col = new MockChatCollection([{ id: 'x' }]);
    const r1 = await col.findMany();
    r1.push({ id: 'y' });
    const r2 = await col.findMany();
    expect(r2).toHaveLength(1);
  });

  it('findMany throws when error is configured', async () => {
    const col = new MockChatCollection([{ id: '1' }]);
    col.setFindManyError(new Error('storage failure'));
    await expect(col.findMany()).rejects.toThrow('storage failure');
  });

  it('findMany works again after clearing error', async () => {
    const col = new MockChatCollection([{ id: '1' }]);
    col.setFindManyError(new Error('fail'));
    await expect(col.findMany()).rejects.toThrow();
    col.clearFindManyError();
    const result = await col.findMany();
    expect(result).toHaveLength(1);
  });

  it('create appends to the backing array', async () => {
    const col = new MockChatCollection<{ id: string }>();
    await col.create({ id: 'new' });
    const result = await col.findMany();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new');
  });
});

describe('MockChatStorageProvider', () => {
  it('constructs with empty collections by default', async () => {
    const provider = new MockChatStorageProvider();
    expect(await provider.conversations.findMany()).toEqual([]);
    expect(await provider.messages.findMany()).toEqual([]);
    expect(await provider.groups.findMany()).toEqual([]);
    expect(await provider.servers.findMany()).toEqual([]);
  });

  it('constructs with pre-populated collections', async () => {
    const conv = fc.sample(arbConversation, 1)[0];
    const provider = new MockChatStorageProvider({
      conversations: [conv],
    });
    const result = await provider.conversations.findMany();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(conv.id);
  });
});

describe('Arbitraries generate valid entity shapes', () => {
  it('arbConversation produces valid IConversation', () => {
    fc.assert(
      fc.property(arbConversation, (conv) => {
        expect(conv.id).toBeDefined();
        expect(conv.participants).toHaveLength(2);
        expect(conv.participants[0]).not.toBe(conv.participants[1]);
        expect(conv.encryptedSharedKey).toBeInstanceOf(Map);
        expect(conv.encryptedSharedKey.size).toBeGreaterThanOrEqual(1);
        expect(conv.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('arbGroup produces valid IGroup', () => {
    fc.assert(
      fc.property(arbGroup, (group) => {
        expect(group.id).toBeDefined();
        expect(group.name.length).toBeGreaterThan(0);
        expect(group.members.length).toBeGreaterThanOrEqual(1);
        expect(group.encryptedSharedKey).toBeInstanceOf(Map);
        expect(group.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('arbChannel produces valid IChannel', () => {
    fc.assert(
      fc.property(arbChannel, (channel) => {
        expect(channel.id).toBeDefined();
        expect(channel.name.length).toBeGreaterThan(0);
        expect(channel.members.length).toBeGreaterThanOrEqual(1);
        expect(channel.encryptedSharedKey).toBeInstanceOf(Map);
        expect(channel.visibility).toBeDefined();
        expect(channel.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('arbServer produces valid IServer', () => {
    fc.assert(
      fc.property(arbServer, (server) => {
        expect(server.id).toBeDefined();
        expect(server.name.length).toBeGreaterThan(0);
        expect(server.ownerId).toBeDefined();
        expect(server.memberIds.length).toBeGreaterThanOrEqual(1);
        expect(server.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('arbMessage produces valid ICommunicationMessage', () => {
    fc.assert(
      fc.property(arbMessage(), (msg) => {
        expect(msg.id).toBeDefined();
        expect(['conversation', 'group', 'channel']).toContain(msg.contextType);
        expect(msg.contextId).toBeDefined();
        expect(msg.senderId).toBeDefined();
        expect(msg.createdAt).toBeInstanceOf(Date);
        expect(typeof msg.keyEpoch).toBe('number');
      }),
      { numRuns: 50 },
    );
  });

  it('arbMessage with fixed contextId uses that contextId', () => {
    fc.assert(
      fc.property(arbMessage('fixed-ctx'), (msg) => {
        expect(msg.contextId).toBe('fixed-ctx');
      }),
      { numRuns: 20 },
    );
  });

  it('arbInviteToken produces valid IInviteToken', () => {
    fc.assert(
      fc.property(arbInviteToken, (token) => {
        expect(token.token.length).toBeGreaterThanOrEqual(8);
        expect(token.channelId).toBeDefined();
        expect(token.maxUses).toBeGreaterThanOrEqual(1);
        expect(token.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('arbServerInviteToken produces valid IServerInviteToken', () => {
    fc.assert(
      fc.property(arbServerInviteToken, (token) => {
        expect(token.token.length).toBeGreaterThanOrEqual(8);
        expect(token.serverId).toBeDefined();
        expect(token.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 50 },
    );
  });

  it('arbEncryptedSharedKey produces valid epoch maps', () => {
    fc.assert(
      fc.property(arbEncryptedSharedKey(1, 5), (keyMap) => {
        expect(keyMap).toBeInstanceOf(Map);
        expect(keyMap.size).toBeGreaterThanOrEqual(1);
        for (const [epoch, memberMap] of keyMap) {
          expect(typeof epoch).toBe('number');
          expect(memberMap).toBeInstanceOf(Map);
          expect(memberMap.size).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 50 },
    );
  });
});
