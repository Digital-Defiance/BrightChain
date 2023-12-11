/**
 * Unit tests for ConversationService.init()
 *
 * Validates: Requirements 1.1, 1.5, 1.6, 7.1, 8.1, 8.2, 8.3
 *
 * Tests:
 * - init with no storage provider returns immediately, maps empty
 * - init idempotence (second call is no-op)
 * - findMany error is logged and propagated
 * - malformed encryptedSharedKey logs warning and skips epoch
 */

import { ConversationService } from '../conversationService';
import {
  MockChatStorageProvider,
  MockChatCollection,
} from './mockChatStorageProvider';
import {
  IConversation,
  ICommunicationMessage,
} from '../../../interfaces/communication';

describe('ConversationService.init()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Validates: Requirements 1.5, 7.1
   *
   * When no IChatStorageProvider is provided, init() returns immediately
   * and all in-memory maps remain empty.
   */
  it('should return immediately with empty maps when no storage provider is given', async () => {
    const service = new ConversationService(
      null,      // memberReachabilityCheck
      undefined, // eventEmitter
      undefined, // no storage provider
    );

    await service.init();

    expect(service.getConversation('any-id')).toBeUndefined();
    expect(service.getAllMessages('any-id')).toEqual([]);
    expect(service.getKeyEpochState('any-id')).toBeUndefined();
    expect(service.listAllConversationsForMember('any-member')).toEqual([]);
  });

  /**
   * Validates: Requirement 1.6
   *
   * Calling init() a second time is a no-op — the storage provider's
   * findMany is not called again.
   */
  it('should be idempotent: second call is a no-op', async () => {
    const conversation: IConversation = {
      id: 'conv-1',
      participants: ['alice', 'bob'] as [string, string],
      encryptedSharedKey: new Map([[0, new Map([['alice', 'key1']])]]),
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };

    const storageProvider = new MockChatStorageProvider({
      conversations: [conversation],
    });

    const findManySpy = jest.spyOn(
      storageProvider.conversations,
      'findMany',
    );

    const service = new ConversationService(
      null,
      undefined,
      storageProvider,
    );

    // First call — performs rehydration
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1);
    expect(service.getConversation('conv-1')).toBeDefined();

    // Second call — should be a no-op
    await service.init();
    expect(findManySpy).toHaveBeenCalledTimes(1); // still 1, not 2
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When conversationCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from conversations collection', async () => {
    const storageProvider = new MockChatStorageProvider();
    const testError = new Error('DB connection lost');
    (storageProvider.conversations as MockChatCollection<IConversation>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const service = new ConversationService(
      null,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('DB connection lost');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ConversationService]'),
      expect.objectContaining({ message: 'DB connection lost' }),
    );
  });

  /**
   * Validates: Requirements 8.1, 8.2
   *
   * When messageCollection.findMany() throws, the error is logged
   * with context and propagated to the caller.
   */
  it('should log and propagate findMany errors from messages collection', async () => {
    const storageProvider = new MockChatStorageProvider({
      conversations: [], // empty so conversation loading succeeds
    });
    const testError = new Error('Message store unavailable');
    (storageProvider.messages as MockChatCollection<ICommunicationMessage>)
      .setFindManyError(testError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const service = new ConversationService(
      null,
      undefined,
      storageProvider,
    );

    await expect(service.init()).rejects.toThrow('Message store unavailable');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ConversationService]'),
      expect.objectContaining({ message: 'Message store unavailable' }),
    );
  });

  /**
   * Validates: Requirement 8.3
   *
   * When a conversation has a malformed encryptedSharedKey (null),
   * a warning is logged and epoch reconstruction is skipped for that
   * conversation, but the conversation itself is still loaded.
   */
  it('should log warning and skip epoch for conversation with null encryptedSharedKey', async () => {
    const conversation: IConversation = {
      id: 'conv-malformed',
      participants: ['alice', 'bob'] as [string, string],
      encryptedSharedKey: null as unknown as Map<number, Map<string, string>>,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };

    const storageProvider = new MockChatStorageProvider({
      conversations: [conversation],
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const service = new ConversationService(
      null,
      undefined,
      storageProvider,
    );

    await service.init();

    // Conversation is still loaded
    expect(service.getConversation('conv-malformed')).toBeDefined();

    // But no key epoch state was created
    expect(service.getKeyEpochState('conv-malformed')).toBeUndefined();

    // Warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('encryptedSharedKey'),
    );
  });

  /**
   * Validates: Requirement 8.3
   *
   * When a conversation has a non-Map encryptedSharedKey (e.g. a plain object),
   * a warning is logged and epoch reconstruction is skipped.
   */
  it('should log warning and skip epoch for conversation with non-Map encryptedSharedKey', async () => {
    const conversation: IConversation = {
      id: 'conv-bad-type',
      participants: ['carol', 'dave'] as [string, string],
      encryptedSharedKey: { 0: { carol: 'key' } } as unknown as Map<number, Map<string, string>>,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };

    const storageProvider = new MockChatStorageProvider({
      conversations: [conversation],
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const service = new ConversationService(
      null,
      undefined,
      storageProvider,
    );

    await service.init();

    // Conversation is loaded
    expect(service.getConversation('conv-bad-type')).toBeDefined();

    // No key epoch state
    expect(service.getKeyEpochState('conv-bad-type')).toBeUndefined();

    // Warning was logged (from rehydrationHelpers)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('encryptedSharedKey'),
    );
  });
});
