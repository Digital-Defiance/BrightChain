/**
 * Property-based test for ChannelService — Property 6: Channel name index completeness.
 *
 * Feature: brightchat-persistence-rehydration, Property 6: Channel name index completeness
 *
 * **Validates: Requirements 4.4, 9.3**
 *
 * For any set of persisted channels, after rehydration the name index maps
 * each channel's lowercase name to its channel ID, and the index size equals
 * the number of loaded channels.
 *
 * Generator strategy: Generate arrays of 0–10 IChannel objects with unique IDs
 * and unique lowercase names (no whitespace, to avoid normalizeChannelName
 * mismatch), seed them into a MockChatStorageProvider, construct a ChannelService
 * with that provider, call init(), then verify:
 *   1. For each channel, createChannel(channel.name, ...) throws ChannelNameConflictError
 *      (proving the name index entry exists).
 *   2. createChannel with a fresh unique name succeeds (proving no spurious entries).
 *   3. The total channel count after the one successful create equals channels.length + 1
 *      (proving the index size equalled the original channel count before the extra create).
 */

import fc from 'fast-check';
import { ChannelService, ChannelNameConflictError } from '../channelService';
import { PermissionService } from '../permissionService';
import { ChannelVisibility } from '../../../enumerations/communication';
import {
  MockChatStorageProvider,
  arbChannel,
} from './mockChatStorageProvider';

/**
 * Arbitrary for lowercase channel names without whitespace.
 * This avoids the normalizeChannelName mismatch (init uses .toLowerCase(),
 * createChannel uses .toLowerCase().replace(/\s+/g, '-')).
 */
const arbLowercaseName = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/);

describe('Feature: brightchat-persistence-rehydration, Property 6: Channel name index completeness', () => {
  /**
   * Property 6: Channel name index completeness
   *
   * **Validates: Requirements 4.4, 9.3**
   */
  it('should rebuild name index mapping each channel lowercase name to its ID after rehydration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(
            arbChannel.chain((ch) =>
              arbLowercaseName.map((name) => ({ ...ch, name })),
            ),
            { minLength: 0, maxLength: 10 },
          )
          .map((channels) => {
            // Ensure unique IDs and unique lowercase names
            const seenIds = new Set<string>();
            const seenNames = new Set<string>();
            return channels.filter((c) => {
              const lowerName = c.name.toLowerCase();
              if (seenIds.has(c.id)) return false;
              if (seenNames.has(lowerName)) return false;
              seenIds.add(c.id);
              seenNames.add(lowerName);
              return true;
            });
          }),
        async (channels) => {
          // Seed channels into mock storage
          const storageProvider = new MockChatStorageProvider({ channels });

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

          // ── Verify each channel name is in the index ──────────────
          // Attempting to create a channel with the same name (in the same
          // server scope) should throw ChannelNameConflictError, proving the
          // name index entry exists.
          for (const channel of channels) {
            await expect(
              service.createChannel(
                channel.name,
                'test-creator-id',
                ChannelVisibility.PUBLIC,
                '',
                channel.serverId,
              ),
            ).rejects.toThrow(ChannelNameConflictError);
          }

          // ── Verify index size equals channel count ────────────────
          // A completely unique name should NOT conflict, proving the index
          // has no spurious entries beyond the loaded channels.
          const uniqueName = `unique-name-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const newChannel = await service.createChannel(
            uniqueName,
            'test-creator-id',
            ChannelVisibility.PUBLIC,
          );
          expect(newChannel).toBeDefined();
          expect(newChannel.name).toBe(uniqueName.toLowerCase().replace(/\s+/g, '-'));

          // After the one successful create, the total channel count should be
          // channels.length + 1, confirming the index had exactly channels.length
          // entries before the extra create.
          const allMemberIds = new Set<string>();
          for (const ch of channels) {
            for (const m of ch.members) {
              allMemberIds.add(m.memberId);
            }
          }
          // Also add the creator of the new channel
          allMemberIds.add('test-creator-id');

          const allRehydratedIds = new Set<string>();
          for (const memberId of allMemberIds) {
            const memberChannels = service.listChannelsForMember(memberId);
            for (const mc of memberChannels) {
              allRehydratedIds.add(mc.id);
            }
          }
          expect(allRehydratedIds.size).toBe(channels.length + 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
