/**
 * Tests for ChatCollectionAdapter and createChatStorageProvider.
 *
 * The adapter bridges two different collection APIs:
 *   1. Raw BrightDb collections – have `insertOne`, `findOne` returning
 *      a Promise directly, and `find` returning a Cursor with `toArray()`.
 *   2. Wrapped / Model collections – have `create`, `findOne` returning
 *      `{ exec() }`, and `find` returning `{ exec() }`.
 *
 * Each method on the adapter must detect which API the underlying collection
 * exposes and call the correct one.
 */

import {
  ChatCollectionAdapter,
  createChatStorageProvider,
  BRIGHTCHAT_COLLECTIONS,
} from '../chatStorageAdapter';

// ---------------------------------------------------------------------------
// Mock collection factories
// ---------------------------------------------------------------------------

interface TestDoc {
  id: string;
  name: string;
}

/**
 * Creates a mock that mimics a raw BrightDb collection:
 *   - insertOne(doc) → Promise
 *   - findOne(filter) → Promise (NOT an object with .exec())
 *   - find(filter) → { toArray() } (Cursor-style, NOT .exec())
 *   - updateOne(filter, update) → Promise
 *   - deleteOne(filter) → Promise
 */
function createBrightDbMock() {
  return {
    insertOne: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1, matchedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };
}

/**
 * Creates a mock that mimics a wrapped / Model collection:
 *   - create(doc) → Promise
 *   - findOne(filter) → { exec: () => Promise }
 *   - find(filter) → { exec: () => Promise }
 *   - updateOne(filter, update) → Promise
 *   - deleteOne(filter) → Promise
 */
function createWrappedMock() {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1, matchedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatCollectionAdapter', () => {
  // -----------------------------------------------------------------------
  // BrightDb (raw) collection
  // -----------------------------------------------------------------------
  describe('with raw BrightDb collection', () => {
    let mock: ReturnType<typeof createBrightDbMock>;
    let adapter: ChatCollectionAdapter<TestDoc>;

    beforeEach(() => {
      mock = createBrightDbMock();
      adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');
    });

    // -- create -----------------------------------------------------------
    describe('create()', () => {
      it('calls insertOne on BrightDb collections', async () => {
        const doc: TestDoc = { id: '1', name: 'Alice' };
        await adapter.create(doc);

        expect(mock.insertOne).toHaveBeenCalledWith(doc);
        expect(mock.insertOne).toHaveBeenCalledTimes(1);
      });

      it('does not call create() (which does not exist on raw collections)', async () => {
        const doc: TestDoc = { id: '2', name: 'Bob' };
        await adapter.create(doc);

        // The mock has no `create` property at all
        expect(mock).not.toHaveProperty('create');
      });
    });

    // -- findById ----------------------------------------------------------
    describe('findById()', () => {
      it('calls findOne with the correct key filter', async () => {
        await adapter.findById('abc');

        expect(mock.findOne).toHaveBeenCalledWith({ id: 'abc' });
      });

      it('returns the document when found', async () => {
        const expected: TestDoc = { id: 'abc', name: 'Charlie' };
        mock.findOne.mockResolvedValue(expected);

        const result = await adapter.findById('abc');
        expect(result).toEqual(expected);
      });

      it('returns null when not found', async () => {
        mock.findOne.mockResolvedValue(null);

        const result = await adapter.findById('missing');
        expect(result).toBeNull();
      });

      it('does NOT call .exec() on the result (BrightDb returns Promise directly)', async () => {
        // BrightDb's findOne returns a plain Promise, not { exec() }.
        // The adapter should detect this and await the Promise directly.
        const expected: TestDoc = { id: 'x', name: 'Direct' };
        mock.findOne.mockResolvedValue(expected);

        const result = await adapter.findById('x');
        expect(result).toEqual(expected);
        // Verify the mock was called — the resolved value came from the
        // Promise, not from an .exec() call.
        expect(mock.findOne).toHaveBeenCalledTimes(1);
      });
    });

    // -- findMany ----------------------------------------------------------
    describe('findMany()', () => {
      it('calls find with the provided filter', async () => {
        const filter: Partial<TestDoc> = { name: 'Alice' };
        await adapter.findMany(filter);

        expect(mock.find).toHaveBeenCalledWith(filter);
      });

      it('calls find with empty object when no filter is given', async () => {
        await adapter.findMany();

        expect(mock.find).toHaveBeenCalledWith({});
      });

      it('uses toArray() on the BrightDb Cursor', async () => {
        const docs: TestDoc[] = [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ];
        const cursor = { toArray: jest.fn().mockResolvedValue(docs) };
        mock.find.mockReturnValue(cursor);

        const result = await adapter.findMany();

        expect(cursor.toArray).toHaveBeenCalledTimes(1);
        expect(result).toEqual(docs);
      });

      it('returns empty array when no documents match', async () => {
        const result = await adapter.findMany({ name: 'Nobody' });
        expect(result).toEqual([]);
      });
    });

    // -- update ------------------------------------------------------------
    describe('update()', () => {
      it('calls updateOne with the correct filter and document', async () => {
        const doc: TestDoc = { id: '1', name: 'Updated' };
        await adapter.update('1', doc);

        expect(mock.updateOne).toHaveBeenCalledWith({ id: '1' }, doc);
        expect(mock.updateOne).toHaveBeenCalledTimes(1);
      });
    });

    // -- delete ------------------------------------------------------------
    describe('delete()', () => {
      it('calls deleteOne with the correct filter', async () => {
        await adapter.delete('1');

        expect(mock.deleteOne).toHaveBeenCalledWith({ id: '1' });
        expect(mock.deleteOne).toHaveBeenCalledTimes(1);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Wrapped / Model collection
  // -----------------------------------------------------------------------
  describe('with wrapped (Model) collection', () => {
    let mock: ReturnType<typeof createWrappedMock>;
    let adapter: ChatCollectionAdapter<TestDoc>;

    beforeEach(() => {
      mock = createWrappedMock();
      adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');
    });

    // -- create -----------------------------------------------------------
    describe('create()', () => {
      it('calls create() on wrapped collections (no insertOne)', async () => {
        const doc: TestDoc = { id: '1', name: 'Alice' };
        await adapter.create(doc);

        expect(mock.create).toHaveBeenCalledWith(doc);
        expect(mock.create).toHaveBeenCalledTimes(1);
      });

      it('does not call insertOne (which does not exist on wrapped collections)', async () => {
        const doc: TestDoc = { id: '2', name: 'Bob' };
        await adapter.create(doc);

        expect(mock).not.toHaveProperty('insertOne');
      });
    });

    // -- findById ----------------------------------------------------------
    describe('findById()', () => {
      it('calls findOne with the correct key filter', async () => {
        await adapter.findById('abc');

        expect(mock.findOne).toHaveBeenCalledWith({ id: 'abc' });
      });

      it('calls .exec() on the query result', async () => {
        const expected: TestDoc = { id: 'abc', name: 'Charlie' };
        const execFn = jest.fn().mockResolvedValue(expected);
        mock.findOne.mockReturnValue({ exec: execFn });

        const result = await adapter.findById('abc');

        expect(execFn).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expected);
      });

      it('returns null when .exec() resolves to null', async () => {
        const execFn = jest.fn().mockResolvedValue(null);
        mock.findOne.mockReturnValue({ exec: execFn });

        const result = await adapter.findById('missing');
        expect(result).toBeNull();
      });

      it('returns null when .exec() resolves to undefined', async () => {
        const execFn = jest.fn().mockResolvedValue(undefined);
        mock.findOne.mockReturnValue({ exec: execFn });

        const result = await adapter.findById('missing');
        expect(result).toBeNull();
      });
    });

    // -- findMany ----------------------------------------------------------
    describe('findMany()', () => {
      it('calls find with the provided filter', async () => {
        const filter: Partial<TestDoc> = { name: 'Alice' };
        await adapter.findMany(filter);

        expect(mock.find).toHaveBeenCalledWith(filter);
      });

      it('calls find with empty object when no filter is given', async () => {
        await adapter.findMany();

        expect(mock.find).toHaveBeenCalledWith({});
      });

      it('uses .exec() on the wrapped query result', async () => {
        const docs: TestDoc[] = [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ];
        const execFn = jest.fn().mockResolvedValue(docs);
        mock.find.mockReturnValue({ exec: execFn });

        const result = await adapter.findMany();

        expect(execFn).toHaveBeenCalledTimes(1);
        expect(result).toEqual(docs);
      });

      it('returns empty array when .exec() resolves to empty array', async () => {
        const execFn = jest.fn().mockResolvedValue([]);
        mock.find.mockReturnValue({ exec: execFn });

        const result = await adapter.findMany();
        expect(result).toEqual([]);
      });
    });

    // -- update ------------------------------------------------------------
    describe('update()', () => {
      it('calls updateOne with the correct filter and document', async () => {
        const doc: TestDoc = { id: '1', name: 'Updated' };
        await adapter.update('1', doc);

        expect(mock.updateOne).toHaveBeenCalledWith({ id: '1' }, doc);
        expect(mock.updateOne).toHaveBeenCalledTimes(1);
      });
    });

    // -- delete ------------------------------------------------------------
    describe('delete()', () => {
      it('calls deleteOne with the correct filter', async () => {
        await adapter.delete('1');

        expect(mock.deleteOne).toHaveBeenCalledWith({ id: '1' });
        expect(mock.deleteOne).toHaveBeenCalledTimes(1);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Custom keyField
  // -----------------------------------------------------------------------
  describe('keyField handling', () => {
    it('uses the specified keyField for filter construction', async () => {
      const mock = createBrightDbMock();
      const adapter = new ChatCollectionAdapter<{ token: string }>(mock, 'token');

      await adapter.findById('my-token');
      expect(mock.findOne).toHaveBeenCalledWith({ token: 'my-token' });

      await adapter.update('my-token', { token: 'my-token' });
      expect(mock.updateOne).toHaveBeenCalledWith(
        { token: 'my-token' },
        { token: 'my-token' },
      );

      await adapter.delete('my-token');
      expect(mock.deleteOne).toHaveBeenCalledWith({ token: 'my-token' });
    });
  });

  // -----------------------------------------------------------------------
  // API detection edge cases
  // -----------------------------------------------------------------------
  describe('API detection', () => {
    it('prefers insertOne over create when both exist', async () => {
      const mock = {
        insertOne: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
        updateOne: jest.fn().mockResolvedValue({}),
        deleteOne: jest.fn().mockResolvedValue({}),
      };
      const adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');

      await adapter.create({ id: '1', name: 'Test' });

      expect(mock.insertOne).toHaveBeenCalledTimes(1);
      expect(mock.create).not.toHaveBeenCalled();
    });

    it('prefers toArray() over exec() for find when both exist', async () => {
      const toArrayFn = jest.fn().mockResolvedValue([{ id: '1', name: 'A' }]);
      const execFn = jest.fn().mockResolvedValue([{ id: '1', name: 'A' }]);
      const mock = {
        insertOne: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockReturnValue({ toArray: toArrayFn, exec: execFn }),
        updateOne: jest.fn().mockResolvedValue({}),
        deleteOne: jest.fn().mockResolvedValue({}),
      };
      const adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');

      await adapter.findMany();

      expect(toArrayFn).toHaveBeenCalledTimes(1);
      expect(execFn).not.toHaveBeenCalled();
    });

    it('falls back to awaiting the cursor directly when neither toArray nor exec exist', async () => {
      const docs = [{ id: '1', name: 'Fallback' }];
      const mock = {
        insertOne: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn().mockResolvedValue(null),
        // find returns a thenable (Promise-like) with no toArray or exec
        find: jest.fn().mockResolvedValue(docs),
        updateOne: jest.fn().mockResolvedValue({}),
        deleteOne: jest.fn().mockResolvedValue({}),
      };
      const adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');

      const result = await adapter.findMany();
      expect(result).toEqual(docs);
    });

    it('handles findOne returning undefined from BrightDb (coerces to null)', async () => {
      const mock = createBrightDbMock();
      mock.findOne.mockResolvedValue(undefined);
      const adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');

      const result = await adapter.findById('missing');
      expect(result).toBeNull();
    });

    it('handles findMany returning null from exec (coerces to empty array)', async () => {
      const execFn = jest.fn().mockResolvedValue(null);
      const mock = createWrappedMock();
      mock.find.mockReturnValue({ exec: execFn });
      const adapter = new ChatCollectionAdapter<TestDoc>(mock, 'id');

      const result = await adapter.findMany();
      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// createChatStorageProvider
// ---------------------------------------------------------------------------

describe('createChatStorageProvider', () => {
  it('creates a provider with all 9 expected collection properties', () => {
    const getCollection = jest.fn().mockReturnValue(createBrightDbMock());
    const provider = createChatStorageProvider(getCollection);

    expect(provider).toHaveProperty('conversations');
    expect(provider).toHaveProperty('messages');
    expect(provider).toHaveProperty('groups');
    expect(provider).toHaveProperty('groupMessages');
    expect(provider).toHaveProperty('channels');
    expect(provider).toHaveProperty('channelMessages');
    expect(provider).toHaveProperty('inviteTokens');
    expect(provider).toHaveProperty('servers');
    expect(provider).toHaveProperty('serverInvites');
  });

  it('calls getCollection with the correct collection names', () => {
    const getCollection = jest.fn().mockReturnValue(createBrightDbMock());
    createChatStorageProvider(getCollection);

    expect(getCollection).toHaveBeenCalledTimes(9);
    expect(getCollection).toHaveBeenCalledWith('brightchat_conversations');
    expect(getCollection).toHaveBeenCalledWith('brightchat_messages');
    expect(getCollection).toHaveBeenCalledWith('brightchat_groups');
    expect(getCollection).toHaveBeenCalledWith('brightchat_group_messages');
    expect(getCollection).toHaveBeenCalledWith('brightchat_channels');
    expect(getCollection).toHaveBeenCalledWith('brightchat_channel_messages');
    expect(getCollection).toHaveBeenCalledWith('brightchat_invite_tokens');
    expect(getCollection).toHaveBeenCalledWith('brightchat_servers');
    expect(getCollection).toHaveBeenCalledWith('brightchat_server_invites');
  });

  it('each collection property is a ChatCollectionAdapter instance', () => {
    const getCollection = jest.fn().mockReturnValue(createBrightDbMock());
    const provider = createChatStorageProvider(getCollection);

    expect(provider.conversations).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.messages).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.groups).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.groupMessages).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.channels).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.channelMessages).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.inviteTokens).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.servers).toBeInstanceOf(ChatCollectionAdapter);
    expect(provider.serverInvites).toBeInstanceOf(ChatCollectionAdapter);
  });

  it('inviteTokens uses "token" as keyField', async () => {
    const mock = createBrightDbMock();
    const getCollection = jest.fn().mockReturnValue(mock);
    const provider = createChatStorageProvider(getCollection);

    await provider.inviteTokens.findById('invite-abc');
    expect(mock.findOne).toHaveBeenCalledWith({ token: 'invite-abc' });
  });

  it('serverInvites uses "token" as keyField', async () => {
    const mock = createBrightDbMock();
    const getCollection = jest.fn().mockReturnValue(mock);
    const provider = createChatStorageProvider(getCollection);

    await provider.serverInvites.findById('server-invite-xyz');
    expect(mock.findOne).toHaveBeenCalledWith({ token: 'server-invite-xyz' });
  });

  it('conversations uses "id" as keyField', async () => {
    const mock = createBrightDbMock();
    const getCollection = jest.fn().mockReturnValue(mock);
    const provider = createChatStorageProvider(getCollection);

    await provider.conversations.findById('conv-123');
    expect(mock.findOne).toHaveBeenCalledWith({ id: 'conv-123' });
  });

  it('servers uses "id" as keyField', async () => {
    const mock = createBrightDbMock();
    const getCollection = jest.fn().mockReturnValue(mock);
    const provider = createChatStorageProvider(getCollection);

    await provider.servers.findById('server-456');
    expect(mock.findOne).toHaveBeenCalledWith({ id: 'server-456' });
  });
});

// ---------------------------------------------------------------------------
// BRIGHTCHAT_COLLECTIONS constant
// ---------------------------------------------------------------------------

describe('BRIGHTCHAT_COLLECTIONS', () => {
  it('has the expected collection name values', () => {
    expect(BRIGHTCHAT_COLLECTIONS).toEqual({
      conversations: 'brightchat_conversations',
      messages: 'brightchat_messages',
      groups: 'brightchat_groups',
      groupMessages: 'brightchat_group_messages',
      channels: 'brightchat_channels',
      channelMessages: 'brightchat_channel_messages',
      inviteTokens: 'brightchat_invite_tokens',
      servers: 'brightchat_servers',
      serverInvites: 'brightchat_server_invites',
    });
  });

  it('has exactly 9 collection entries', () => {
    expect(Object.keys(BRIGHTCHAT_COLLECTIONS)).toHaveLength(9);
  });
});
