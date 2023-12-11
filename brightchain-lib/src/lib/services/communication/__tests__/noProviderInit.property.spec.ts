/**
 * Property-based test — Property 9: No-provider init is a no-op.
 *
 * Feature: brightchat-persistence-rehydration, Property 9: No-provider init is a no-op
 *
 * **Validates: Requirements 1.5, 7.1, 7.2, 7.3, 7.4, 7.5**
 *
 * For any service constructed without an IChatStorageProvider, calling init()
 * SHALL leave all in-memory Maps empty and perform no storage operations.
 *
 * Strategy: For each service, construct WITHOUT a storage provider, call
 * init() N times (N in [1,5]), then verify all maps are empty by checking
 * that lookups for random IDs return undefined.
 */

import fc from 'fast-check';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { ChannelService } from '../channelService';
import { ServerService } from '../serverService';
import { PermissionService } from '../permissionService';

/** Arbitrary for non-empty alphanumeric IDs (1–36 chars). */
const arbId = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

describe('Feature: brightchat-persistence-rehydration, Property 9: No-provider init is a no-op', () => {
  /**
   * ConversationService: init without storage provider leaves maps empty.
   *
   * **Validates: Requirements 1.5, 7.1**
   */
  it('ConversationService: init() without provider leaves all maps empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbId, { minLength: 1, maxLength: 10 }),
        async (n, randomIds) => {
          // Construct without storage provider (no third arg)
          const service = new ConversationService(null, undefined);

          // Call init() N times
          for (let i = 0; i < n; i++) {
            await service.init();
          }

          // Verify all maps are empty: random ID lookups return undefined
          for (const id of randomIds) {
            expect(service.getConversation(id)).toBeUndefined();
            expect(service.getKeyEpochState(id)).toBeUndefined();
            expect(service.getSymmetricKey(id)).toBeUndefined();
            expect(service.getAllMessages(id)).toEqual([]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * GroupService: init without storage provider leaves maps empty.
   *
   * **Validates: Requirements 1.5, 7.2**
   */
  it('GroupService: init() without provider leaves all maps empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbId, { minLength: 1, maxLength: 10 }),
        async (n, randomIds) => {
          const permissionService = new PermissionService();
          // Construct without storage provider (no storageProvider arg)
          const service = new GroupService(permissionService);

          // Call init() N times
          for (let i = 0; i < n; i++) {
            await service.init();
          }

          // Verify all maps are empty: random ID lookups return undefined
          for (const id of randomIds) {
            expect(service.getGroupById(id)).toBeUndefined();
            expect(service.getKeyEpochState(id)).toBeUndefined();
            expect(service.getSymmetricKey(id)).toBeUndefined();
            expect(service.getAllMessages(id)).toEqual([]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * ChannelService: init without storage provider leaves maps empty.
   *
   * **Validates: Requirements 1.5, 7.3**
   */
  it('ChannelService: init() without provider leaves all maps empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbId, { minLength: 1, maxLength: 10 }),
        async (n, randomIds) => {
          const permissionService = new PermissionService();
          // Construct without storage provider (no storageProvider arg)
          const service = new ChannelService(permissionService);

          // Call init() N times
          for (let i = 0; i < n; i++) {
            await service.init();
          }

          // Verify all maps are empty: random ID lookups return undefined
          for (const id of randomIds) {
            expect(service.getChannelById(id)).toBeUndefined();
            expect(service.getKeyEpochState(id)).toBeUndefined();
            expect(service.getSymmetricKey(id)).toBeUndefined();
            expect(service.getAllMessages(id)).toEqual([]);
            expect(service.getInviteToken(id)).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * ServerService: init without storage provider leaves maps empty.
   *
   * **Validates: Requirements 1.5, 7.4, 7.5**
   */
  it('ServerService: init() without provider leaves all maps empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbId, { minLength: 1, maxLength: 10 }),
        async (n, randomIds) => {
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);
          // Construct without storage provider (no storageProvider in options)
          const service = new ServerService({ channelService });

          // Call init() N times
          for (let i = 0; i < n; i++) {
            await service.init();
          }

          // Verify all maps are empty: random ID lookups return undefined
          for (const id of randomIds) {
            expect(service.getServerById(id)).toBeUndefined();
            expect(service.getInviteToken(id)).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
