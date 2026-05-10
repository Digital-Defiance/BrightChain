/**
 * Property-based tests for server WebSocket event state transformations.
 *
 * Tests the pure helper functions exported from useChatWebSocket.ts
 * that implement server-specific state transformations triggered by
 * WebSocket events (Properties 18–21).
 *
 * Uses fast-check with 100+ iterations per property.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

const CommunicationEventTypeEnum = {
  MESSAGE_SENT: 'communication:message_sent',
  MESSAGE_EDITED: 'communication:message_edited',
  MESSAGE_DELETED: 'communication:message_deleted',
  TYPING_START: 'communication:typing_start',
  TYPING_STOP: 'communication:typing_stop',
  REACTION_ADDED: 'communication:reaction_added',
  REACTION_REMOVED: 'communication:reaction_removed',
  PRESENCE_CHANGED: 'communication:presence_changed',
  MEMBER_JOINED: 'communication:member_joined',
  MEMBER_LEFT: 'communication:member_left',
  SERVER_CHANNEL_CREATED: 'communication:server_channel_created',
  SERVER_CHANNEL_DELETED: 'communication:server_channel_deleted',
  SERVER_MEMBER_JOINED: 'communication:server_member_joined',
  SERVER_MEMBER_REMOVED: 'communication:server_member_removed',
  SERVER_UPDATED: 'communication:server_updated',
} as const;

const PresenceStatusEnum = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  DO_NOT_DISTURB: 'dnd',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  CommunicationEventType: CommunicationEventTypeEnum,
  PresenceStatus: PresenceStatusEnum,
}));

jest.mock('@brightchain/brightchat-lib', () => ({}));

import fc from 'fast-check';
import {
  applyServerChannelCreated,
  applyServerChannelDeleted,
  applyServerMemberJoined,
  applyServerMemberRemoved,
} from '../hooks/useChatWebSocket';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generates a minimal channel-like object with a unique id and name. */
const channelArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

type TestChannel = { id: string; name: string };

/** Generates a list of channels with unique IDs. */
const uniqueChannelListArb = fc.uniqueArray(channelArb, {
  comparator: (a, b) => a.id === b.id,
  minLength: 0,
  maxLength: 20,
});

/** Generates a minimal server-like object with a unique id. */
const serverArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

type TestServer = { id: string; name: string };

/** Generates a list of servers with unique IDs. */
const uniqueServerListArb = fc.uniqueArray(serverArb, {
  comparator: (a, b) => a.id === b.id,
  minLength: 0,
  maxLength: 20,
});

// ─── Property 18: Channel-created state transform ───────────────────────────

describe('Feature: brightchat-discord-experience, Property 18: Channel-created state transform', () => {
  /**
   * **Validates: Requirements 10.1**
   *
   * For any current channel list and a SERVER_CHANNEL_CREATED event with
   * channelId C, applying the transform SHALL produce a list that contains
   * C and all previously existing channels.
   */
  it('should produce a list containing the new channel and all existing channels', () => {
    fc.assert(
      fc.property(
        uniqueChannelListArb,
        channelArb,
        (existingChannels: TestChannel[], newChannel: TestChannel) => {
          const result = applyServerChannelCreated(
            existingChannels,
            newChannel,
          );

          // All existing channels are preserved
          for (const ch of existingChannels) {
            expect(result.some((r) => r.id === ch.id)).toBe(true);
          }

          // New channel is present
          expect(result.some((r) => r.id === newChannel.id)).toBe(true);

          // Length is existingChannels + 1
          expect(result.length).toBe(existingChannels.length + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not mutate the original array', () => {
    fc.assert(
      fc.property(
        uniqueChannelListArb,
        channelArb,
        (existingChannels: TestChannel[], newChannel: TestChannel) => {
          const originalLength = existingChannels.length;
          applyServerChannelCreated(existingChannels, newChannel);
          expect(existingChannels.length).toBe(originalLength);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 19: Channel-deleted state transform ───────────────────────────

describe('Feature: brightchat-discord-experience, Property 19: Channel-deleted state transform', () => {
  /**
   * **Validates: Requirements 10.2**
   *
   * For any current channel list containing channelId C and a
   * SERVER_CHANNEL_DELETED event for C, applying the transform SHALL
   * produce a list that does not contain C but contains all other
   * previously existing channels.
   */
  it('should remove the deleted channel and preserve all others', () => {
    fc.assert(
      fc.property(
        uniqueChannelListArb.filter((arr) => arr.length > 0),
        (channels: TestChannel[]) => {
          // Pick a random channel to delete
          const indexToDelete = Math.floor(Math.random() * channels.length);
          const deletedId = channels[indexToDelete].id;

          const result = applyServerChannelDeleted(channels, deletedId);

          // Deleted channel is not present
          expect(result.some((r) => r.id === deletedId)).toBe(false);

          // All other channels are preserved
          for (const ch of channels) {
            if (ch.id !== deletedId) {
              expect(result.some((r) => r.id === ch.id)).toBe(true);
            }
          }

          // Length decreased by 1
          expect(result.length).toBe(channels.length - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return the same list when deleting a non-existent channel', () => {
    fc.assert(
      fc.property(
        uniqueChannelListArb,
        fc.uuid(),
        (channels: TestChannel[], nonExistentId: string) => {
          // Ensure the ID doesn't exist in the list
          const filtered = channels.filter((ch) => ch.id !== nonExistentId);

          const result = applyServerChannelDeleted(filtered, nonExistentId);

          expect(result.length).toBe(filtered.length);
          for (const ch of filtered) {
            expect(result.some((r) => r.id === ch.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 20: Member-joined state transform ─────────────────────────────

describe('Feature: brightchat-discord-experience, Property 20: Member-joined state transform', () => {
  /**
   * **Validates: Requirements 10.3**
   *
   * For any current member list and a SERVER_MEMBER_JOINED event for
   * memberId M, applying the transform SHALL produce a list containing M
   * and all previously existing members, with length increased by exactly 1
   * (assuming M was not already present).
   */
  it('should add the new member and preserve all existing members', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        (existingMembers: string[], newMemberId: string) => {
          // Ensure newMemberId is not already in the list
          const members = existingMembers.filter((m) => m !== newMemberId);

          const result = applyServerMemberJoined(members, newMemberId);

          // All existing members are preserved
          for (const m of members) {
            expect(result).toContain(m);
          }

          // New member is present
          expect(result).toContain(newMemberId);

          // Length increased by exactly 1
          expect(result.length).toBe(members.length + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        (members: string[], newMemberId: string) => {
          const originalLength = members.length;
          applyServerMemberJoined(members, newMemberId);
          expect(members.length).toBe(originalLength);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 21: Server removal on member-removed event ────────────────────

describe('Feature: brightchat-discord-experience, Property 21: Server removal on member-removed event', () => {
  /**
   * **Validates: Requirements 10.4**
   *
   * For any current server list containing serverId S and a
   * SERVER_MEMBER_REMOVED event where the removed member is the current
   * user, applying the transform SHALL produce a list that does not
   * contain S but contains all other servers.
   */
  it('should remove the server and preserve all others when current user is removed', () => {
    fc.assert(
      fc.property(
        uniqueServerListArb.filter((arr) => arr.length > 0),
        (servers: TestServer[]) => {
          // Pick a random server to remove
          const indexToRemove = Math.floor(Math.random() * servers.length);
          const removedServerId = servers[indexToRemove].id;

          const result = applyServerMemberRemoved(servers, removedServerId);

          // Removed server is not present
          expect(result.some((s) => s.id === removedServerId)).toBe(false);

          // All other servers are preserved
          for (const s of servers) {
            if (s.id !== removedServerId) {
              expect(result.some((r) => r.id === s.id)).toBe(true);
            }
          }

          // Length decreased by 1
          expect(result.length).toBe(servers.length - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return the same list when removing a non-existent server', () => {
    fc.assert(
      fc.property(
        uniqueServerListArb,
        fc.uuid(),
        (servers: TestServer[], nonExistentId: string) => {
          const filtered = servers.filter((s) => s.id !== nonExistentId);

          const result = applyServerMemberRemoved(filtered, nonExistentId);

          expect(result.length).toBe(filtered.length);
          for (const s of filtered) {
            expect(result.some((r) => r.id === s.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
