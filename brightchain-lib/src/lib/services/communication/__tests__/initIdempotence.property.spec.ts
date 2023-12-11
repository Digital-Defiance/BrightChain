/**
 * Property-based test — Property 8: Init idempotence.
 *
 * Feature: brightchat-persistence-rehydration, Property 8: Init idempotence
 *
 * **Validates: Requirements 1.6**
 *
 * For any service with a storage provider and persisted data, calling init()
 * N times (N >= 1) produces the same in-memory state as calling it exactly
 * once — f(x) = f(f(x)).
 *
 * Strategy: For each service, seed a MockChatStorageProvider with random
 * entities, construct the service, call init() once, snapshot observable
 * state via public accessors, call init() N-1 more times (N in [2,5]),
 * snapshot again, and verify both snapshots are identical.
 */

import fc from 'fast-check';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { ChannelService } from '../channelService';
import { ServerService } from '../serverService';
import { PermissionService } from '../permissionService';
import {
  MockChatStorageProvider,
  arbConversation,
  arbGroup,
  arbChannel,
  arbServer,
  arbServerInviteToken,
  arbInviteToken,
} from './mockChatStorageProvider';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Deduplicate an array of objects by a string key. */
function dedup<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

describe('Feature: brightchat-persistence-rehydration, Property 8: Init idempotence', () => {
  /**
   * ConversationService: calling init() N times produces same state as once.
   *
   * **Validates: Requirements 1.6**
   */
  it('ConversationService: init() N times produces same state as calling once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbConversation, { minLength: 0, maxLength: 10 })
          .map((c) => dedup(c, (x) => x.id)),
        fc.integer({ min: 2, max: 5 }),
        async (conversations, n) => {
          const storageProvider = new MockChatStorageProvider({
            conversations,
          });

          const service = new ConversationService(
            null,
            undefined,
            storageProvider,
          );

          // First init — snapshot state
          await service.init();

          const snapshotAfterFirst = conversations.map((c) => ({
            found: service.getConversation(c.id) !== undefined,
            id: service.getConversation(c.id)?.id,
            epochDefined: service.getKeyEpochState(c.id) !== undefined,
            epochCurrent: service.getKeyEpochState(c.id)?.currentEpoch,
          }));
          const bogusAfterFirst = service.getConversation('__bogus__');

          // Call init() N-1 more times
          for (let i = 1; i < n; i++) {
            await service.init();
          }

          // Snapshot again
          const snapshotAfterN = conversations.map((c) => ({
            found: service.getConversation(c.id) !== undefined,
            id: service.getConversation(c.id)?.id,
            epochDefined: service.getKeyEpochState(c.id) !== undefined,
            epochCurrent: service.getKeyEpochState(c.id)?.currentEpoch,
          }));
          const bogusAfterN = service.getConversation('__bogus__');

          expect(snapshotAfterN).toEqual(snapshotAfterFirst);
          expect(bogusAfterN).toEqual(bogusAfterFirst);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * GroupService: calling init() N times produces same state as once.
   *
   * **Validates: Requirements 1.6**
   */
  it('GroupService: init() N times produces same state as calling once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbGroup, { minLength: 0, maxLength: 10 })
          .map((g) => dedup(g, (x) => x.id)),
        fc.integer({ min: 2, max: 5 }),
        async (groups, n) => {
          const storageProvider = new MockChatStorageProvider({ groups });
          const permissionService = new PermissionService();

          const service = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            undefined,
            storageProvider,
          );

          // First init — snapshot state
          await service.init();

          const snapshotAfterFirst = groups.map((g) => ({
            found: service.getGroupById(g.id) !== undefined,
            id: service.getGroupById(g.id)?.id,
            epochDefined: service.getKeyEpochState(g.id) !== undefined,
            epochCurrent: service.getKeyEpochState(g.id)?.currentEpoch,
          }));
          const bogusAfterFirst = service.getGroupById('__bogus__');

          // Call init() N-1 more times
          for (let i = 1; i < n; i++) {
            await service.init();
          }

          // Snapshot again
          const snapshotAfterN = groups.map((g) => ({
            found: service.getGroupById(g.id) !== undefined,
            id: service.getGroupById(g.id)?.id,
            epochDefined: service.getKeyEpochState(g.id) !== undefined,
            epochCurrent: service.getKeyEpochState(g.id)?.currentEpoch,
          }));
          const bogusAfterN = service.getGroupById('__bogus__');

          expect(snapshotAfterN).toEqual(snapshotAfterFirst);
          expect(bogusAfterN).toEqual(bogusAfterFirst);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * ChannelService: calling init() N times produces same state as once.
   *
   * **Validates: Requirements 1.6**
   */
  it('ChannelService: init() N times produces same state as calling once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbChannel, { minLength: 0, maxLength: 10 })
          .map((c) => dedup(c, (x) => x.id)),
        fc
          .array(arbInviteToken, { minLength: 0, maxLength: 10 })
          .map((t) => dedup(t, (x) => x.token)),
        fc.integer({ min: 2, max: 5 }),
        async (channels, inviteTokens, n) => {
          const storageProvider = new MockChatStorageProvider({
            channels,
            inviteTokens,
          });
          const permissionService = new PermissionService();

          const service = new ChannelService(
            permissionService,
            undefined,
            undefined,
            undefined,
            undefined,
            storageProvider,
          );

          // First init — snapshot state
          await service.init();

          const channelSnapshot = channels.map((ch) => ({
            found: service.getChannelById(ch.id) !== undefined,
            id: service.getChannelById(ch.id)?.id,
            epochDefined: service.getKeyEpochState(ch.id) !== undefined,
            epochCurrent: service.getKeyEpochState(ch.id)?.currentEpoch,
          }));
          const tokenSnapshot = inviteTokens.map((t) => ({
            found: service.getInviteToken(t.token) !== undefined,
            token: service.getInviteToken(t.token)?.token,
          }));
          const bogusChannelFirst = service.getChannelById('__bogus__');
          const bogusTokenFirst = service.getInviteToken('__bogus__');

          // Call init() N-1 more times
          for (let i = 1; i < n; i++) {
            await service.init();
          }

          // Snapshot again
          const channelSnapshotN = channels.map((ch) => ({
            found: service.getChannelById(ch.id) !== undefined,
            id: service.getChannelById(ch.id)?.id,
            epochDefined: service.getKeyEpochState(ch.id) !== undefined,
            epochCurrent: service.getKeyEpochState(ch.id)?.currentEpoch,
          }));
          const tokenSnapshotN = inviteTokens.map((t) => ({
            found: service.getInviteToken(t.token) !== undefined,
            token: service.getInviteToken(t.token)?.token,
          }));
          const bogusChannelN = service.getChannelById('__bogus__');
          const bogusTokenN = service.getInviteToken('__bogus__');

          expect(channelSnapshotN).toEqual(channelSnapshot);
          expect(tokenSnapshotN).toEqual(tokenSnapshot);
          expect(bogusChannelN).toEqual(bogusChannelFirst);
          expect(bogusTokenN).toEqual(bogusTokenFirst);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * ServerService: calling init() N times produces same state as once.
   *
   * **Validates: Requirements 1.6**
   */
  it('ServerService: init() N times produces same state as calling once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbServer, { minLength: 0, maxLength: 10 })
          .map((s) => dedup(s, (x) => x.id)),
        fc
          .array(arbServerInviteToken, { minLength: 0, maxLength: 10 })
          .map((t) => dedup(t, (x) => x.token)),
        fc.integer({ min: 2, max: 5 }),
        async (servers, serverInviteTokens, n) => {
          const storageProvider = new MockChatStorageProvider({
            servers,
            serverInvites: serverInviteTokens,
          });
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);

          const service = new ServerService({
            channelService,
            storageProvider,
          });

          // First init — snapshot state
          await service.init();

          const serverSnapshot = servers.map((s) => ({
            found: service.getServerById(s.id) !== undefined,
            id: service.getServerById(s.id)?.id,
          }));
          const tokenSnapshot = serverInviteTokens.map((t) => ({
            found: service.getInviteToken(t.token) !== undefined,
            token: service.getInviteToken(t.token)?.token,
          }));
          const bogusServerFirst = service.getServerById('__bogus__');
          const bogusTokenFirst = service.getInviteToken('__bogus__');

          // Call init() N-1 more times
          for (let i = 1; i < n; i++) {
            await service.init();
          }

          // Snapshot again
          const serverSnapshotN = servers.map((s) => ({
            found: service.getServerById(s.id) !== undefined,
            id: service.getServerById(s.id)?.id,
          }));
          const tokenSnapshotN = serverInviteTokens.map((t) => ({
            found: service.getInviteToken(t.token) !== undefined,
            token: service.getInviteToken(t.token)?.token,
          }));
          const bogusServerN = service.getServerById('__bogus__');
          const bogusTokenN = service.getInviteToken('__bogus__');

          expect(serverSnapshotN).toEqual(serverSnapshot);
          expect(tokenSnapshotN).toEqual(tokenSnapshot);
          expect(bogusServerN).toEqual(bogusServerFirst);
          expect(bogusTokenN).toEqual(bogusTokenFirst);
        },
      ),
      { numRuns: 100 },
    );
  });
});
