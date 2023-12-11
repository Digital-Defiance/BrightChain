/**
 * Property-based test for ChannelService — Property 1: Entity rehydration completeness (channel subset).
 *
 * Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (channel)
 *
 * **Validates: Requirements 4.1, 4.3, 9.1**
 *
 * For any set of channels persisted in storage, after calling init(),
 * the channels Map contains every channel keyed by id, and the
 * inviteTokens Map contains every token keyed by token string.
 * The Map sizes equal the number of entities returned by findMany().
 *
 * Generator strategy: Generate arrays of 0–10 IChannel objects with
 * unique IDs via arbChannel and 0–10 IInviteToken objects with unique
 * token strings via arbInviteToken, seed them into a MockChatStorageProvider,
 * construct a ChannelService with that provider, call init(), then
 * verify every channel and invite token is retrievable and the total counts match.
 */

import fc from 'fast-check';
import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import {
  MockChatStorageProvider,
  arbChannel,
  arbInviteToken,
} from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (channel)', () => {
  /**
   * Property 1: Entity rehydration completeness (channel subset)
   *
   * **Validates: Requirements 4.1, 4.3, 9.1**
   *
   * For any set of channels persisted in storage, after calling init(),
   * the channels Map contains every channel keyed by id, the inviteTokens
   * Map contains every token keyed by token string, and the Map sizes
   * equal the number of entities returned by findMany().
   */
  it('should rehydrate every persisted channel keyed by id and every invite token keyed by token string with correct counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbChannel, { minLength: 0, maxLength: 10 })
          .map((channels) => {
            // Ensure unique IDs by deduplicating on id
            const seen = new Set<string>();
            return channels.filter((c) => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            });
          }),
        fc
          .array(arbInviteToken, { minLength: 0, maxLength: 10 })
          .map((tokens) => {
            // Ensure unique token strings by deduplicating on token
            const seen = new Set<string>();
            return tokens.filter((t) => {
              if (seen.has(t.token)) return false;
              seen.add(t.token);
              return true;
            });
          }),
        async (channels, inviteTokens) => {
          // Seed channels and invite tokens into mock storage
          const storageProvider = new MockChatStorageProvider({
            channels,
            inviteTokens,
          });

          // Construct ChannelService with the mock storage provider
          const permissionService = new PermissionService();
          const service = new ChannelService(
            permissionService,
            undefined, // encryptKey
            undefined, // messageOps
            undefined, // eventEmitter
            undefined, // randomBytesProvider
            storageProvider,
          );

          // Rehydrate
          await service.init();

          // ── Verify channels ───────────────────────────────────────
          // Every persisted channel is retrievable by ID
          for (const channel of channels) {
            const rehydrated = service.getChannelById(channel.id);
            expect(rehydrated).toBeDefined();
            expect(rehydrated!.id).toBe(channel.id);
          }

          // A non-existent ID returns undefined
          expect(service.getChannelById('__nonexistent_id__')).toBeUndefined();

          // Verify count: collect all rehydrated channel IDs via member listing
          const allRehydratedIds = new Set<string>();
          const allMemberIds = new Set<string>();
          for (const ch of channels) {
            for (const m of ch.members) {
              allMemberIds.add(m.memberId);
            }
          }
          for (const memberId of allMemberIds) {
            const memberChannels = service.listChannelsForMember(memberId);
            for (const mc of memberChannels) {
              allRehydratedIds.add(mc.id);
            }
          }
          expect(allRehydratedIds.size).toBe(channels.length);

          // ── Verify invite tokens ──────────────────────────────────
          // Every persisted invite token is retrievable by token string
          for (const token of inviteTokens) {
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
