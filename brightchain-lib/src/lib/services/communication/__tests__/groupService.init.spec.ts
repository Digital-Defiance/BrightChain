/**
 * Unit tests for GroupService.init()
 *
 * Validates: Requirements 1.2, 1.5, 1.6, 7.2, 8.1, 8.2, 8.3
 *
 * Tests:
 * - init with no storage provider returns immediately, maps empty
 * - init idempotence (second call is no-op)
 * - findMany error is logged and propagated
 * - malformed encryptedSharedKey logs warning and skips epoch
 */

import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';
import {
  MockChatStorageProvider,
  MockChatCollection,
} from './mockChatStorageProvider';
import {
  IGroup,
  ICommunicationMessage,
} from '../../../interfaces/communication';
import { DefaultRole } from '../../../enumerations/communication';

describe('GroupService.init()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Validates: Requirements 1.5, 7.2
   *
   * When no IChatStorageProvider is provided, init() returns immediately
   * and all in-memory maps remain empty.
   */
  it('should return immediately with empty maps when no storage provider is given', async () => {
    const permissionService = new PermissionService();
    const service = new GroupService(
      permissionService,
      undefined, // encryptKey
      undefined, // messageOps
      undefined, // eventEmitter
      undefined, // randomBytesProvider
      // no storageProvider
    );

    await service.init();

    expect(service.getGroupById('any-id')).toBeUndefined();
    expect(service.getAllMessages('any-id')).toEqual([]);
    expect(service.getKeyEpochState('any-id')).toBeUndefined();
    expect(service.listGroupsForMember('any-member')).toEqual([]);
  });

  /**
   * Validates: Requirement 1.6
   *
   * Calling init() a second time is a no-op — the storage provider's
   * findMany is not called again.
   */
  it('should be idempotent: second call is a no-op', async () => {
    const group: IGroup = {
      id: 'group-1',
      name: 'Test Group',
      creatorId: 'alice',
      members: [
        { memberId: 'alice', role: DefaultRole.OWNER, joinedAt: new Date() },
        { memberId: 'bob', role: DefaultRole.MEMBER, joinedAt: new Date() },
      ],
      encryptedSharedKey: new Map([[0, new Map([['alice', 'key1']])]]),
      createdAt: new Date(),
      lastMessageAt: new Date(),
      pinnedMessageIds: [],
    };

    const storageProvider = new MockChatStorageProvider({
      groups: [group],
    });

    const findManySpy = jest.spyOn(storageProvider.groups, 'findMany');

    const permissionService = new PermissionService();
    const service = new GroupService(
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
    expect(service.getGroupById('group-1')).toBeDefined();

    // Second call — should be a no-op
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1); // still 1, not 2
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When groupCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from groups collection', async () => {
    const storageProvider = new MockChatStorageProvider();
    const testError = new Error('DB connection lost');
    (storageProvider.groups as MockChatCollection<IGroup>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const permissionService = new PermissionService();
    const service = new GroupService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('DB connection lost');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GroupService]'),
      expect.objectContaining({ message: 'DB connection lost' }),
    );
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When groupMessageCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from groupMessages collection', async () => {
    const storageProvider = new MockChatStorageProvider({
      groups: [], // empty so group loading succeeds
    });
    const testError = new Error('Message store unavailable');
    (storageProvider.groupMessages as MockChatCollection<ICommunicationMessage>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const permissionService = new PermissionService();
    const service = new GroupService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('Message store unavailable');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GroupService]'),
      expect.objectContaining({ message: 'Message store unavailable' }),
    );
  });

  /**
   * Validates: Requirement 8.3
   *
   * When a group has a malformed encryptedSharedKey (null),
   * a warning is logged and epoch reconstruction is skipped for that
   * group, but the group itself is still loaded.
   */
  it('should log warning and skip epoch for group with null encryptedSharedKey', async () => {
    const group: IGroup = {
      id: 'group-malformed',
      name: 'Malformed Group',
      creatorId: 'alice',
      members: [
        { memberId: 'alice', role: DefaultRole.OWNER, joinedAt: new Date() },
      ],
      encryptedSharedKey: null as unknown as Map<number, Map<string, string>>,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      pinnedMessageIds: [],
    };

    const storageProvider = new MockChatStorageProvider({
      groups: [group],
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const permissionService = new PermissionService();
    const service = new GroupService(
      permissionService,
      undefined,
      undefined,
      undefined,
      undefined,
      storageProvider,
    );

    await service.init();

    // Group is still loaded
    expect(service.getGroupById('group-malformed')).toBeDefined();

    // But no key epoch state was created
    expect(service.getKeyEpochState('group-malformed')).toBeUndefined();

    // Warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('encryptedSharedKey'),
    );
  });
});
