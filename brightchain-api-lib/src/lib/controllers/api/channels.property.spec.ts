/**
 * Property tests for ChannelService / ChannelController.
 *
 * Feature: communication-api-controllers
 *
 * Property 12: Channel creation assigns owner role
 * Property 13: Channel visibility filtering
 * Property 14: Visibility change enforcement
 * Property 15: Invite token validity
 */

import { ChannelVisibility, DefaultRole } from '@brightchain/brightchain-lib';
import { ChannelService } from '@brightchain/brightchain-lib/lib/services/communication/channelService';
import { PermissionService } from '@brightchain/brightchain-lib/lib/services/communication/permissionService';
import * as fc from 'fast-check';

// --- arbitraries ---

const arbMemberId = fc.uuid();
const arbChannelName = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /\S/.test(s));
const arbTopic = fc.string({ minLength: 0, maxLength: 100 });
const arbVisibility = fc.constantFrom(
  ChannelVisibility.PUBLIC,
  ChannelVisibility.PRIVATE,
  ChannelVisibility.SECRET,
  ChannelVisibility.INVISIBLE,
);

// --- helpers ---

function createServices(): {
  channelService: ChannelService;
  permissionService: PermissionService;
} {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  return { channelService, permissionService };
}

// ─── Property 12: Channel creation assigns owner role ───────────────────────

describe('ChannelService – Property 12: Channel creation assigns owner role', () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any Channel creation request, the resulting Channel SHALL have
   * the creator assigned the `owner` Role, and the Channel SHALL have
   * the specified name, topic, and visibility.
   */
  it('creator gets owner role and channel has correct name, topic, visibility', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbChannelName,
        arbTopic,
        arbVisibility,
        async (creatorId, name, topic, visibility) => {
          const { channelService } = createServices();
          const channel = await channelService.createChannel(
            name,
            creatorId,
            visibility,
            topic,
          );

          // Creator is assigned OWNER role
          const creator = channel.members.find((m) => m.memberId === creatorId);
          expect(creator).toBeDefined();
          expect(creator!.role).toBe(DefaultRole.OWNER);

          // Channel has the specified properties
          expect(channel.name).toBe(name.toLowerCase().replace(/\s+/g, '-'));
          expect(channel.topic).toBe(topic);
          expect(channel.visibility).toBe(visibility);
          expect(channel.creatorId).toBe(creatorId);

          // Only one member (the creator)
          expect(channel.members.length).toBe(1);

          // Encrypted key exists for creator
          expect(channel.encryptedSharedKey.has(creatorId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Channel visibility filtering ──────────────────────────────

describe('ChannelService – Property 13: Channel visibility filtering', () => {
  /**
   * **Validates: Requirements 4.3, 5.1**
   *
   * For any set of Channels with mixed visibility modes and any Member,
   * listing available Channels SHALL return only Channels that are public,
   * or private/secret/invisible Channels where the Member is already a member.
   * Invisible Channels the Member has no access to SHALL never appear.
   */
  it('non-member only sees public channels; members see their own channels', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        async (creatorId, outsiderId) => {
          fc.pre(creatorId !== outsiderId);

          const { channelService } = createServices();

          // Create one channel per visibility mode
          const publicCh = await channelService.createChannel(
            `pub-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.PUBLIC,
          );
          const privateCh = await channelService.createChannel(
            `priv-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.PRIVATE,
          );
          const secretCh = await channelService.createChannel(
            `sec-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.SECRET,
          );
          const invisibleCh = await channelService.createChannel(
            `inv-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.INVISIBLE,
          );

          // Outsider should only see the public channel
          const outsiderList = await channelService.listChannels(outsiderId);
          const outsiderIds = outsiderList.items.map((c) => c.id);
          expect(outsiderIds).toContain(publicCh.id);
          expect(outsiderIds).not.toContain(privateCh.id);
          expect(outsiderIds).not.toContain(secretCh.id);
          expect(outsiderIds).not.toContain(invisibleCh.id);

          // Creator (member of all) should see all four
          const creatorList = await channelService.listChannels(creatorId);
          const creatorIds = creatorList.items.map((c) => c.id);
          expect(creatorIds).toContain(publicCh.id);
          expect(creatorIds).toContain(privateCh.id);
          expect(creatorIds).toContain(secretCh.id);
          expect(creatorIds).toContain(invisibleCh.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 14: Visibility change enforcement ─────────────────────────────

describe('ChannelService – Property 14: Visibility change enforcement', () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * For any Channel, when the owner changes visibility from public to secret,
   * subsequent listing queries from non-member Members SHALL no longer
   * include that Channel.
   */
  it('changing visibility from public to secret hides channel from non-members', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        async (creatorId, outsiderId) => {
          fc.pre(creatorId !== outsiderId);

          const { channelService } = createServices();

          const channel = await channelService.createChannel(
            `vis-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          // Outsider can see the public channel
          const beforeList = await channelService.listChannels(outsiderId);
          expect(beforeList.items.some((c) => c.id === channel.id)).toBe(true);

          // Owner changes visibility to SECRET
          await channelService.updateChannel(channel.id, creatorId, {
            visibility: ChannelVisibility.SECRET,
          });

          // Outsider can no longer see the channel
          const afterList = await channelService.listChannels(outsiderId);
          expect(afterList.items.some((c) => c.id === channel.id)).toBe(false);

          // Creator (member) can still see it
          const creatorList = await channelService.listChannels(creatorId);
          expect(creatorList.items.some((c) => c.id === channel.id)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 15: Invite token validity ─────────────────────────────────────

describe('ChannelService – Property 15: Invite token validity', () => {
  /**
   * **Validates: Requirements 5.3, 5.4, 5.5**
   *
   * For any invite token with maxUses=K, redeeming the token K times
   * SHALL succeed, and the (K+1)th redemption SHALL fail.
   * For any invite token with an expiry, redemption after the expiry
   * time SHALL fail.
   */
  it('invite token respects maxUses limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbMemberId, { minLength: 6, maxLength: 10 }),
        async (creatorId, maxUses, redeemers) => {
          // Ensure all redeemers are unique and different from creator
          const uniqueRedeemers = [
            ...new Set(redeemers.filter((id) => id !== creatorId)),
          ];
          fc.pre(uniqueRedeemers.length > maxUses);

          const { channelService } = createServices();

          const channel = await channelService.createChannel(
            `inv-test-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.PRIVATE,
          );

          const invite = await channelService.createInvite(
            channel.id,
            creatorId,
            maxUses,
          );

          // First K redemptions should succeed
          for (let i = 0; i < maxUses; i++) {
            await channelService.redeemInvite(invite.token, uniqueRedeemers[i]);
          }

          // (K+1)th redemption should fail
          await expect(
            channelService.redeemInvite(invite.token, uniqueRedeemers[maxUses]),
          ).rejects.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('expired invite token is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        async (creatorId, joinerId) => {
          fc.pre(creatorId !== joinerId);

          const { channelService } = createServices();

          const channel = await channelService.createChannel(
            `exp-test-${creatorId.slice(0, 8)}`,
            creatorId,
            ChannelVisibility.PRIVATE,
          );

          // Create an invite that expires immediately (0ms)
          const invite = await channelService.createInvite(
            channel.id,
            creatorId,
            10,
            0, // expires immediately
          );

          // Redemption should fail because the token is expired
          await expect(
            channelService.redeemInvite(invite.token, joinerId),
          ).rejects.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});
