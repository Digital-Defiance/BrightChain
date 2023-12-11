/**
 * Unit tests for ChannelService.init()
 *
 * Validates: Requirements 1.3, 1.5, 1.6, 7.3, 8.1, 8.2, 8.3
 *
 * Tests:
 * - init with no storage provider returns immediately, maps empty
 * - init idempotence (second call is no-op)
 * - findMany error is logged and propagated
 * - malformed encryptedSharedKey logs warning and skips epoch
 */

import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import {
  MockChatStorageProvider,
  MockChatCollection,
} from './mockChatStorageProvider';
import {
  IChannel,
  ICommunicationMessage,
  IInviteToken,
} from '../../../interfaces/communication';
import {
  ChannelVisibility,
  DefaultRole,
} from '../../../enumerations/communication';

describe('ChannelService.init()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Validates: Requirements 1.5, 7.3
   *
   * When no IChatStorageProvider is provided, init() returns immediately
   * and all in-memory maps remain empty.
   */
  it('should return immediately with empty maps when no storage provider is given', async () => {
    const permissionService = new PermissionService();
    const service = new ChannelService(
      permissionService,
      undefined, // encryptKey
      undefined, // messageOps
      undefined, // eventEmitter
      undefined, // randomBytesProvider
      // no storageProvider
    );

    await service.init();

    expect(service.getChannelById('any-id')).toBeUndefined();
    expect(service.getAllMessages('any-id')).toEqual([]);
    expect(service.getKeyEpochState('any-id')).toBeUndefined();
    expect(service.getInviteToken('any-token')).toBeUndefined();
    expect(service.listChannelsForMember('any-member')).toEqual([]);
  });

  /**
   * Validates: Requirement 1.6
   *
   * Calling init() a second time is a no-op — the storage provider's
   * findMany is not called again.
   */
  it('should be idempotent: second call is a no-op', async () => {
    const channel: IChannel = {
      id: 'chan-1',
      name: 'General',
      topic: 'General discussion',
      creatorId: 'alice',
      visibility: ChannelVisibility.PUBLIC,
      members: [
        { memberId: 'alice', role: DefaultRole.OWNER, joinedAt: new Date() },
        { memberId: 'bob', role: DefaultRole.MEMBER, joinedAt: new Date() },
      ],
      encryptedSharedKey: new Map([[0, new Map([['alice', 'key1']])]]),
      createdAt: new Date(),
      lastMessageAt: new Date(),
      pinnedMessageIds: [],
      historyVisibleToNewMembers: true,
    };

    const storageProvider = new MockChatStorageProvider({
      channels: [channel],
    });

    const findManySpy = jest.spyOn(storageProvider.channels, 'findMany');

    const permissionService = new PermissionService();
    const service = new ChannelService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    // First call — performs rehydration
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1);
    expect(service.getChannelById('chan-1')).toBeDefined();

    // Second call — should be a no-op
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1); // still 1, not 2
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When channelCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from channels collection', async () => {
    const storageProvider = new MockChatStorageProvider();
    const testError = new Error('DB connection lost');
    (storageProvider.channels as MockChatCollection<IChannel>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const permissionService = new PermissionService();
    const service = new ChannelService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('DB connection lost');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ChannelService]'),
      expect.objectContaining({ message: 'DB connection lost' }),
    );
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When channelMessageCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from channelMessages collection', async () => {
    const storageProvider = new MockChatStorageProvider({
      channels: [], // empty so channel loading succeeds
    });
    const testError = new Error('Message store unavailable');
    (storageProvider.channelMessages as MockChatCollection<ICommunicationMessage>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const permissionService = new PermissionService();
    const service = new ChannelService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('Message store unavailable');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ChannelService]'),
      expect.objectContaining({ message: 'Message store unavailable' }),
    );
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When inviteTokenCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from inviteTokens collection', async () => {
    const storageProvider = new MockChatStorageProvider({
      channels: [],        // empty so channel loading succeeds
      channelMessages: [], // empty so message loading succeeds
    });
    const testError = new Error('Token store unavailable');
    (storageProvider.inviteTokens as MockChatCollection<IInviteToken>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const permissionService = new PermissionService();
    const service = new ChannelService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('Token store unavailable');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ChannelService]'),
      expect.objectContaining({ message: 'Token store unavailable' }),
    );
  });

  /**
   * Validates: Requirement 8.3
   *
   * When a channel has a malformed encryptedSharedKey (null),
   * a warning is logged and epoch reconstruction is skipped for that
   * channel, but the channel itself is still loaded.
   */
  it('should log warning and skip epoch for channel with null encryptedSharedKey', async () => {
    const channel: IChannel = {
      id: 'chan-malformed',
      name: 'Broken Channel',
      topic: '',
      creatorId: 'alice',
      visibility: ChannelVisibility.PUBLIC,
      members: [
        { memberId: 'alice', role: DefaultRole.OWNER, joinedAt: new Date() },
      ],
      encryptedSharedKey: null as unknown as Map<number, Map<string, string>>,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      pinnedMessageIds: [],
      historyVisibleToNewMembers: false,
    };

    const storageProvider = new MockChatStorageProvider({
      channels: [channel],
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const permissionService = new PermissionService();
    const service = new ChannelService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await service.init();

    // Channel is still loaded
    expect(service.getChannelById('chan-malformed')).toBeDefined();

    // But no key epoch state was created
    expect(service.getKeyEpochState('chan-malformed')).toBeUndefined();

    // Warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('encryptedSharedKey'),
    );
  });
});
