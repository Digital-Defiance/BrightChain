/**
 * Property-based tests for Channel Service
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the channel service
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 10.3**
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../enumerations/communication';
import { ChannelService } from './channelService';
import { PermissionService } from './permissionService';

/**
 * Arbitrary for non-empty alphanumeric IDs
 */
const idArb = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/**
 * Deterministic random bytes provider for testing.
 * Uses a counter-based approach to produce unique but deterministic keys.
 */
function createDeterministicRandomProvider(): (length: number) => Uint8Array {
  let counter = 0;
  return (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    counter++;
    for (let i = 0; i < length; i++) {
      bytes[i] = (counter * 31 + i * 7) % 256;
    }
    return bytes;
  };
}

/**
 * Helper to create a fresh ChannelService instance for each test run.
 */
function createChannelService(): ChannelService {
  const permissionService = new PermissionService();
  return new ChannelService(
    permissionService,
    undefined,
    undefined,
    undefined,
    createDeterministicRandomProvider(),
  );
}

describe('Feature: api-lib-to-lib-migration, Property 24: Channel Service Visibility', () => {
  /**
   * Property 24: Channel Service Visibility
   *
   * *For any* channel with visibility PUBLIC, it SHALL appear in listChannels
   * for non-members; for PRIVATE/SECRET/INVISIBLE, it SHALL only appear for members.
   *
   * **Validates: Requirements 10.3**
   */

  it('PUBLIC channels appear in listChannels for non-members', async () => {
    let channelCounter = 0;
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseCreator, baseViewer) => {
        const creatorId = baseCreator + '_creator';
        const viewerId = baseViewer + '_viewer';

        const service = createChannelService();
        channelCounter++;
        const channelName = `public-ch-${channelCounter}`;

        const channel = await service.createChannel(
          channelName,
          creatorId,
          ChannelVisibility.PUBLIC,
        );

        // Non-member should see the PUBLIC channel in listChannels
        const result = await service.listChannels(viewerId);
        const channelIds = result.items.map((ch) => ch.id);
        expect(channelIds).toContain(channel.id);
      }),
      { numRuns: 100 },
    );
  });

  it('PRIVATE channels do NOT appear in listChannels for non-members', async () => {
    let channelCounter = 0;
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseCreator, baseViewer) => {
        const creatorId = baseCreator + '_creator';
        const viewerId = baseViewer + '_viewer';

        const service = createChannelService();
        channelCounter++;
        const channelName = `private-ch-${channelCounter}`;

        const channel = await service.createChannel(
          channelName,
          creatorId,
          ChannelVisibility.PRIVATE,
        );

        // Non-member should NOT see the PRIVATE channel
        const result = await service.listChannels(viewerId);
        const channelIds = result.items.map((ch) => ch.id);
        expect(channelIds).not.toContain(channel.id);
      }),
      { numRuns: 100 },
    );
  });

  it('SECRET channels do NOT appear in listChannels for non-members', async () => {
    let channelCounter = 0;
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseCreator, baseViewer) => {
        const creatorId = baseCreator + '_creator';
        const viewerId = baseViewer + '_viewer';

        const service = createChannelService();
        channelCounter++;
        const channelName = `secret-ch-${channelCounter}`;

        const channel = await service.createChannel(
          channelName,
          creatorId,
          ChannelVisibility.SECRET,
        );

        // Non-member should NOT see the SECRET channel
        const result = await service.listChannels(viewerId);
        const channelIds = result.items.map((ch) => ch.id);
        expect(channelIds).not.toContain(channel.id);
      }),
      { numRuns: 100 },
    );
  });

  it('INVISIBLE channels do NOT appear in listChannels for non-members', async () => {
    let channelCounter = 0;
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseCreator, baseViewer) => {
        const creatorId = baseCreator + '_creator';
        const viewerId = baseViewer + '_viewer';

        const service = createChannelService();
        channelCounter++;
        const channelName = `invisible-ch-${channelCounter}`;

        const channel = await service.createChannel(
          channelName,
          creatorId,
          ChannelVisibility.INVISIBLE,
        );

        // Non-member should NOT see the INVISIBLE channel
        const result = await service.listChannels(viewerId);
        const channelIds = result.items.map((ch) => ch.id);
        expect(channelIds).not.toContain(channel.id);
      }),
      { numRuns: 100 },
    );
  });

  it('PRIVATE/SECRET/INVISIBLE channels appear in listChannels for members (the creator)', async () => {
    let channelCounter = 0;
    const nonPublicVisibilities = [
      ChannelVisibility.PRIVATE,
      ChannelVisibility.SECRET,
      ChannelVisibility.INVISIBLE,
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...nonPublicVisibilities),
        async (baseCreator, visibility) => {
          const creatorId = baseCreator + '_creator';

          const service = createChannelService();
          channelCounter++;
          const channelName = `member-vis-ch-${channelCounter}`;

          const channel = await service.createChannel(
            channelName,
            creatorId,
            visibility,
          );

          // Creator (who is a member) should see the channel
          const result = await service.listChannels(creatorId);
          const channelIds = result.items.map((ch) => ch.id);
          expect(channelIds).toContain(channel.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('for any visibility, the creator (member) always sees the channel in listChannels', async () => {
    let channelCounter = 0;
    const allVisibilities = [
      ChannelVisibility.PUBLIC,
      ChannelVisibility.PRIVATE,
      ChannelVisibility.SECRET,
      ChannelVisibility.INVISIBLE,
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        idArb,
        fc.constantFrom(...allVisibilities),
        async (baseCreator, visibility) => {
          const creatorId = baseCreator + '_creator';

          const service = createChannelService();
          channelCounter++;
          const channelName = `all-vis-ch-${channelCounter}`;

          const channel = await service.createChannel(
            channelName,
            creatorId,
            visibility,
          );

          // Creator is always a member, so should always see the channel
          const result = await service.listChannels(creatorId);
          const channelIds = result.items.map((ch) => ch.id);
          expect(channelIds).toContain(channel.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-member joining a PUBLIC channel then sees it in listChannels', async () => {
    let channelCounter = 0;
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseCreator, baseJoiner) => {
        const creatorId = baseCreator + '_creator';
        const joinerId = baseJoiner + '_joiner';

        const service = createChannelService();
        channelCounter++;
        const channelName = `join-pub-ch-${channelCounter}`;

        const channel = await service.createChannel(
          channelName,
          creatorId,
          ChannelVisibility.PUBLIC,
        );

        // Join the public channel
        await service.joinChannel(channel.id, joinerId);

        // After joining, the member should see the channel
        const result = await service.listChannels(joinerId);
        const channelIds = result.items.map((ch) => ch.id);
        expect(channelIds).toContain(channel.id);
      }),
      { numRuns: 100 },
    );
  });

  it('non-members cannot join non-PUBLIC channels directly', async () => {
    let channelCounter = 0;
    const nonPublicVisibilities = [
      ChannelVisibility.PRIVATE,
      ChannelVisibility.SECRET,
      ChannelVisibility.INVISIBLE,
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.constantFrom(...nonPublicVisibilities),
        async (baseCreator, baseJoiner, visibility) => {
          const creatorId = baseCreator + '_creator';
          const joinerId = baseJoiner + '_joiner';

          const service = createChannelService();
          channelCounter++;
          const channelName = `nojoin-ch-${channelCounter}`;

          const channel = await service.createChannel(
            channelName,
            creatorId,
            visibility,
          );

          // Attempting to join a non-PUBLIC channel should throw
          await expect(
            service.joinChannel(channel.id, joinerId),
          ).rejects.toThrow();

          // And the non-member should still not see the channel
          const result = await service.listChannels(joinerId);
          const channelIds = result.items.map((ch) => ch.id);
          expect(channelIds).not.toContain(channel.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});
