/**
 * Unit tests for ServerService.init()
 *
 * Validates: Requirements 1.4, 1.5, 1.6, 7.4, 8.1, 8.2
 *
 * Tests:
 * - init with no storage provider returns immediately, maps empty
 * - init idempotence (second call is no-op)
 * - findMany error is logged and propagated (servers and serverInvites)
 */

import { ServerService } from '../serverService';
import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import {
  MockChatStorageProvider,
  MockChatCollection,
} from './mockChatStorageProvider';
import {
  IServer,
  IServerInviteToken,
} from '../../../interfaces/communication/server';

/** Create a minimal ChannelService for ServerService construction. */
function createChannelService(): ChannelService {
  return new ChannelService(new PermissionService());
}

describe('ServerService.init()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Validates: Requirements 1.5, 7.4
   *
   * When no IChatStorageProvider is provided, init() returns immediately
   * and all in-memory maps remain empty.
   */
  it('should return immediately with empty maps when no storage provider is given', async () => {
    const service = new ServerService({
      channelService: createChannelService(),
      // no storageProvider
    });

    await service.init();

    expect(service.getServerById('any-id')).toBeUndefined();
    expect(service.getInviteToken('any-token')).toBeUndefined();
    const result = await service.listServersForMember('any-member');
    expect(result.items).toEqual([]);
  });

  /**
   * Validates: Requirement 1.6
   *
   * Calling init() a second time is a no-op — the storage provider's
   * findMany is not called again.
   */
  it('should be idempotent: second call is a no-op', async () => {
    const server: IServer = {
      id: 'srv-1',
      name: 'Test Server',
      ownerId: 'alice',
      memberIds: ['alice', 'bob'],
      channelIds: [],
      categories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const storageProvider = new MockChatStorageProvider({
      servers: [server],
    });

    const findManySpy = jest.spyOn(storageProvider.servers, 'findMany');

    const service = new ServerService({
      channelService: createChannelService(),
      storageProvider,
    });

    // First call — performs rehydration
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1);
    expect(service.getServerById('srv-1')).toBeDefined();

    // Second call — should be a no-op
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1); // still 1, not 2
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When serverCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from servers collection', async () => {
    const storageProvider = new MockChatStorageProvider();
    const testError = new Error('DB connection lost');
    (storageProvider.servers as MockChatCollection<IServer>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const service = new ServerService({
      channelService: createChannelService(),
      storageProvider,
    });

    await expect(service.init()).rejects.toThrow('DB connection lost');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ServerService]'),
      expect.objectContaining({ message: 'DB connection lost' }),
    );
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When serverInviteCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from serverInvites collection', async () => {
    const storageProvider = new MockChatStorageProvider({
      servers: [], // empty so server loading succeeds
    });
    const testError = new Error('Invite store unavailable');
    (storageProvider.serverInvites as MockChatCollection<IServerInviteToken>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const service = new ServerService({
      channelService: createChannelService(),
      storageProvider,
    });

    await expect(service.init()).rejects.toThrow('Invite store unavailable');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ServerService]'),
      expect.objectContaining({ message: 'Invite store unavailable' }),
    );
  });
});
