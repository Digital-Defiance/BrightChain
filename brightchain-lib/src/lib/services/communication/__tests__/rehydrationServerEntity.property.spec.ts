/**
 * Property-based test for ServerService — Property 1: Entity rehydration completeness (server subset).
 *
 * Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (server)
 *
 * **Validates: Requirements 5.1, 5.2, 9.1**
 *
 * For any set of servers persisted in storage, after calling init(),
 * the servers Map contains every server keyed by id.
 * For any set of server invite tokens persisted in storage, after calling init(),
 * the serverInviteTokens Map contains every token keyed by token string.
 * The Map sizes equal the number of entities returned by findMany().
 *
 * Generator strategy: Generate arrays of 0–10 IServer objects with
 * unique IDs via arbServer and 0–10 IServerInviteToken objects with unique
 * token strings via arbServerInviteToken, seed them into a MockChatStorageProvider,
 * construct a ServerService with that provider, call init(), then
 * verify every server and server invite token is retrievable and the total counts match.
 */

import fc from 'fast-check';
import { ServerService } from '../serverService';
import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import {
  MockChatStorageProvider,
  arbServer,
  arbServerInviteToken,
} from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (server)', () => {
  /**
   * Property 1: Entity rehydration completeness (server subset)
   *
   * **Validates: Requirements 5.1, 5.2, 9.1**
   *
   * For any set of servers persisted in storage, after calling init(),
   * the servers Map contains every server keyed by id, the serverInviteTokens
   * Map contains every token keyed by token string, and the Map sizes
   * equal the number of entities returned by findMany().
   */
  it('should rehydrate every persisted server keyed by id and every server invite token keyed by token string with correct counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbServer, { minLength: 0, maxLength: 10 })
          .map((servers) => {
            // Ensure unique IDs by deduplicating on id
            const seen = new Set<string>();
            return servers.filter((s) => {
              if (seen.has(s.id)) return false;
              seen.add(s.id);
              return true;
            });
          }),
        fc
          .array(arbServerInviteToken, { minLength: 0, maxLength: 10 })
          .map((tokens) => {
            // Ensure unique token strings by deduplicating on token
            const seen = new Set<string>();
            return tokens.filter((t) => {
              if (seen.has(t.token)) return false;
              seen.add(t.token);
              return true;
            });
          }),
        async (servers, serverInviteTokens) => {
          // Seed servers and server invite tokens into mock storage
          const storageProvider = new MockChatStorageProvider({
            servers,
            serverInvites: serverInviteTokens,
          });

          // Construct ServerService with the mock storage provider
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);
          const service = new ServerService({
            channelService,
            storageProvider,
          });

          // Rehydrate
          await service.init();

          // ── Verify servers ────────────────────────────────────────
          // Every persisted server is retrievable by ID
          for (const server of servers) {
            const rehydrated = service.getServerById(server.id);
            expect(rehydrated).toBeDefined();
            expect(rehydrated!.id).toBe(server.id);
          }

          // A non-existent ID returns undefined
          expect(service.getServerById('__nonexistent_id__')).toBeUndefined();

          // Verify count: collect all rehydrated server IDs via member listing
          const allRehydratedIds = new Set<string>();
          const allMemberIds = new Set<string>();
          for (const s of servers) {
            for (const memberId of s.memberIds) {
              allMemberIds.add(memberId);
            }
          }
          for (const memberId of allMemberIds) {
            const result = await service.listServersForMember(memberId);
            for (const ms of result.items) {
              allRehydratedIds.add(ms.id);
            }
          }
          expect(allRehydratedIds.size).toBe(servers.length);

          // ── Verify server invite tokens ───────────────────────────
          // Every persisted server invite token is retrievable by token string
          for (const token of serverInviteTokens) {
            const rehydrated = service.getInviteToken(token.token);
            expect(rehydrated).toBeDefined();
            expect(rehydrated!.token).toBe(token.token);
          }

          // A non-existent token returns undefined
          expect(
            service.getInviteToken('__nonexistent_token__'),
          ).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
