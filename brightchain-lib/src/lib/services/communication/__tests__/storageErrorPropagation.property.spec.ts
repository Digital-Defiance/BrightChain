/**
 * Property-based test — Property 10: Storage error propagation.
 *
 * Feature: brightchat-persistence-rehydration, Property 10: Storage error propagation
 *
 * **Validates: Requirements 8.2**
 *
 * For any error thrown by a storage collection's findMany() call during
 * rehydration, init() SHALL reject with that same error, allowing the
 * caller to handle it.
 *
 * Strategy: For each service, construct with a MockChatStorageProvider,
 * configure the relevant collection's findMany to throw a random error
 * via MockChatCollection.setFindManyError(), call init(), and verify it
 * rejects with the same error.
 */

import fc from 'fast-check';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { ChannelService } from '../channelService';
import { ServerService } from '../serverService';
import { PermissionService } from '../permissionService';
import { MockChatStorageProvider } from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 10: Storage error propagation', () => {
  /**
   * ConversationService: findMany error on conversations collection
   * propagates through init() rejection.
   *
   * **Validates: Requirements 8.2**
   */
  it('ConversationService: findMany errors propagate through init rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (errorMessage) => {
          const storageProvider = new MockChatStorageProvider();
          const expectedError = new Error(errorMessage);

          storageProvider.conversations.setFindManyError(expectedError);

          const service = new ConversationService(
            null,
            undefined,
            storageProvider,
          );

          await expect(service.init()).rejects.toThrow(expectedError);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * GroupService: findMany error on groups collection
   * propagates through init() rejection.
   *
   * **Validates: Requirements 8.2**
   */
  it('GroupService: findMany errors propagate through init rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (errorMessage) => {
          const storageProvider = new MockChatStorageProvider();
          const permissionService = new PermissionService();
          const expectedError = new Error(errorMessage);

          storageProvider.groups.setFindManyError(expectedError);

          const service = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            undefined,
            storageProvider,
          );

          await expect(service.init()).rejects.toThrow(expectedError);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * ChannelService: findMany error on channels collection
   * propagates through init() rejection.
   *
   * **Validates: Requirements 8.2**
   */
  it('ChannelService: findMany errors propagate through init rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (errorMessage) => {
          const storageProvider = new MockChatStorageProvider();
          const permissionService = new PermissionService();
          const expectedError = new Error(errorMessage);

          storageProvider.channels.setFindManyError(expectedError);

          const service = new ChannelService(
            permissionService,
            undefined,
            undefined,
            undefined,
            undefined,
            storageProvider,
          );

          await expect(service.init()).rejects.toThrow(expectedError);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * ServerService: findMany error on servers collection
   * propagates through init() rejection.
   *
   * **Validates: Requirements 8.2**
   */
  it('ServerService: findMany errors propagate through init rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (errorMessage) => {
          const storageProvider = new MockChatStorageProvider();
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);
          const expectedError = new Error(errorMessage);

          storageProvider.servers.setFindManyError(expectedError);

          const service = new ServerService({
            channelService,
            storageProvider,
          });

          await expect(service.init()).rejects.toThrow(expectedError);
        },
      ),
      { numRuns: 100 },
    );
  });
});
