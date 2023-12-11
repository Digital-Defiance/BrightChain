/**
 * Preservation Property Tests — Non-Content Metadata Operations Unchanged
 *
 * Feature: brightchat-block-storage-fix, Property 2: Preservation
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**
 *
 * These tests capture the BASELINE behavior of metadata operations on UNFIXED code.
 * They must PASS on the current (unfixed) code, confirming that non-content
 * operations (conversation/group/channel metadata CRUD, membership, key rotation,
 * permissions, events, pagination, invite tokens) work correctly.
 *
 * After the fix is applied, these same tests must continue to pass, proving
 * that the fix did not regress any non-content behavior.
 *
 * Observation-first methodology:
 *   1. Observe actual behavior of each service on unfixed code
 *   2. Write property-based tests that match observed behavior
 *   3. Run on unfixed code → PASS (baseline captured)
 *   4. Run on fixed code → PASS (preservation confirmed)
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../../enumerations/communication';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';
import { ICommunicationEventEmitter } from '../../../interfaces/events/communicationEventEmitter';
import { CommunicationContextType } from '../../../interfaces/communicationEvents';

// ─── Spy Event Emitter ──────────────────────────────────────────────────────

interface EventRecord {
  method: string;
  args: unknown[];
}

function createSpyEventEmitter(): ICommunicationEventEmitter & {
  events: EventRecord[];
} {
  const events: EventRecord[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      events.push({ method, args });
    };

  return {
    events,
    emitMessageSent: record('emitMessageSent') as ICommunicationEventEmitter['emitMessageSent'],
    emitMessageDeleted: record('emitMessageDeleted') as ICommunicationEventEmitter['emitMessageDeleted'],
    emitMessageEdited: record('emitMessageEdited') as ICommunicationEventEmitter['emitMessageEdited'],
    emitTypingEvent: record('emitTypingEvent') as ICommunicationEventEmitter['emitTypingEvent'],
    emitPresenceChanged: record('emitPresenceChanged') as ICommunicationEventEmitter['emitPresenceChanged'],
    emitReactionEvent: record('emitReactionEvent') as ICommunicationEventEmitter['emitReactionEvent'],
    emitMessagePinEvent: record('emitMessagePinEvent') as ICommunicationEventEmitter['emitMessagePinEvent'],
    emitMemberJoined: record('emitMemberJoined') as ICommunicationEventEmitter['emitMemberJoined'],
    emitMemberLeft: record('emitMemberLeft') as ICommunicationEventEmitter['emitMemberLeft'],
    emitMemberKicked: record('emitMemberKicked') as ICommunicationEventEmitter['emitMemberKicked'],
    emitMemberMuted: record('emitMemberMuted') as ICommunicationEventEmitter['emitMemberMuted'],
    emitGroupCreated: record('emitGroupCreated') as ICommunicationEventEmitter['emitGroupCreated'],
    emitChannelUpdated: record('emitChannelUpdated') as ICommunicationEventEmitter['emitChannelUpdated'],
    emitServerMemberRemoved: record('emitServerMemberRemoved') as ICommunicationEventEmitter['emitServerMemberRemoved'],
    emitServerChannelCreated: record('emitServerChannelCreated') as ICommunicationEventEmitter['emitServerChannelCreated'],
    emitServerChannelDeleted: record('emitServerChannelDeleted') as ICommunicationEventEmitter['emitServerChannelDeleted'],
  };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Pair of distinct UUIDs for conversation participants. */
const arbMemberPair = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([a, b]) => a !== b);

/** Triple of distinct UUIDs for group operations. */
const arbMemberTriple = fc
  .tuple(fc.uuid(), fc.uuid(), fc.uuid())
  .filter(([a, b, c]) => a !== b && b !== c && a !== c);

/** Random group/channel name (at least one letter). */
const arbContextName = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /[a-zA-Z]/.test(s))
  .map((s) => s.replace(/\s+/g, '-'));

/** Unique channel name to avoid name conflicts across runs. */
const arbUniqueChannelName = fc.uuid().map((id) => `ch-${id}`);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compare two Map<number, Map<string, string>> structures for equality.
 * Used to compare encryptedSharedKey epoch maps.
 */
function epochMapsEqual(
  a: Map<number, Map<string, string>>,
  b: Map<number, Map<string, string>>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [epoch, aMap] of a) {
    const bMap = b.get(epoch);
    if (!bMap || aMap.size !== bMap.size) return false;
    for (const [key, val] of aMap) {
      if (bMap.get(key) !== val) return false;
    }
  }
  return true;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-block-storage-fix, Property 2: Preservation — Non-Content Metadata Operations', () => {

  // ─── Conversation Metadata Preservation ─────────────────────────────────

  describe('Conversation metadata preservation', () => {
    /**
     * createOrGetConversation produces correct metadata: id, participants,
     * epoch 0 key state, timestamps.
     *
     * **Validates: Requirements 3.1**
     */
    it('createOrGetConversation produces correct metadata for all member pairs', async () => {
      await fc.assert(
        fc.asyncProperty(arbMemberPair, async ([memberA, memberB]) => {
          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          const conv = await service.createOrGetConversation(memberA, memberB);

          // Has a valid id
          expect(conv.id).toBeDefined();
          expect(typeof conv.id).toBe('string');
          expect(conv.id.length).toBeGreaterThan(0);

          // Participants are the two members
          expect(conv.participants).toHaveLength(2);
          expect(conv.participants).toContain(memberA);
          expect(conv.participants).toContain(memberB);

          // Epoch 0 key state exists
          expect(conv.encryptedSharedKey).toBeDefined();
          expect(conv.encryptedSharedKey.size).toBe(1);
          expect(conv.encryptedSharedKey.has(0)).toBe(true);

          const epoch0Keys = conv.encryptedSharedKey.get(0)!;
          expect(epoch0Keys.has(memberA)).toBe(true);
          expect(epoch0Keys.has(memberB)).toBe(true);

          // Timestamps are valid dates
          expect(conv.createdAt).toBeInstanceOf(Date);
          expect(conv.lastMessageAt).toBeInstanceOf(Date);
          expect(conv.createdAt.getTime()).toBeLessThanOrEqual(
            conv.lastMessageAt.getTime(),
          );
        }),
        { numRuns: 30 },
      );
    });

    /**
     * createOrGetConversation is idempotent — calling twice with the same
     * pair returns the same conversation.
     *
     * **Validates: Requirements 3.1**
     */
    it('createOrGetConversation is idempotent for the same member pair', async () => {
      await fc.assert(
        fc.asyncProperty(arbMemberPair, async ([memberA, memberB]) => {
          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          const conv1 = await service.createOrGetConversation(memberA, memberB);
          const conv2 = await service.createOrGetConversation(memberA, memberB);

          expect(conv1.id).toBe(conv2.id);
          expect(conv1.participants).toEqual(conv2.participants);
        }),
        { numRuns: 30 },
      );
    });

    /**
     * listConversations returns conversations sorted by lastMessageAt descending.
     *
     * **Validates: Requirements 3.1, 3.8**
     */
    it('listConversations returns conversations sorted by lastMessageAt descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberTriple,
          async ([memberA, memberB, memberC]) => {
            const service = new ConversationService();
            service.registerMember(memberA);
            service.registerMember(memberB);
            service.registerMember(memberC);

            await service.createOrGetConversation(memberA, memberB);
            // Small delay to ensure different timestamps
            await service.createOrGetConversation(memberA, memberC);

            const result = await service.listConversations(memberA);

            expect(result.items).toBeDefined();
            expect(result.items.length).toBe(2);
            expect(result.hasMore).toBe(false);

            // Sorted by lastMessageAt descending
            for (let i = 0; i < result.items.length - 1; i++) {
              expect(
                result.items[i].lastMessageAt.getTime(),
              ).toBeGreaterThanOrEqual(
                result.items[i + 1].lastMessageAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * sendMessage updates conversation.lastMessageAt and emits emitMessageSent event.
     *
     * **Validates: Requirements 3.1, 3.10**
     */
    it('sendMessage updates lastMessageAt and emits emitMessageSent', async () => {
      await fc.assert(
        fc.asyncProperty(arbMemberPair, async ([senderId, recipientId]) => {
          const spy = createSpyEventEmitter();
          const service = new ConversationService(null, spy);
          service.registerMember(senderId);
          service.registerMember(recipientId);

          const conv = await service.createOrGetConversation(
            senderId,
            recipientId,
          );
          const beforeTime = conv.lastMessageAt.getTime();

          const msg = await service.sendMessage(
            senderId,
            recipientId,
            'test-content',
          );

          // lastMessageAt was updated
          const updatedConv = service.getConversation(conv.id);
          expect(updatedConv!.lastMessageAt.getTime()).toBeGreaterThanOrEqual(
            beforeTime,
          );

          // emitMessageSent was called
          const sentEvents = spy.events.filter(
            (e) => e.method === 'emitMessageSent',
          );
          expect(sentEvents.length).toBeGreaterThanOrEqual(1);

          const lastSent = sentEvents[sentEvents.length - 1];
          expect(lastSent.args[0]).toBe('conversation');
          expect(lastSent.args[1]).toBe(conv.id);
          expect(lastSent.args[2]).toBe(msg.id);
          expect(lastSent.args[3]).toBe(senderId);
        }),
        { numRuns: 30 },
      );
    });

    /**
     * Pagination structure (items, cursor, hasMore) is correct for conversation listing.
     *
     * **Validates: Requirements 3.8**
     */
    it('listConversations pagination structure is correct', async () => {
      await fc.assert(
        fc.asyncProperty(arbMemberPair, async ([memberA, memberB]) => {
          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          await service.createOrGetConversation(memberA, memberB);

          const result = await service.listConversations(memberA, undefined, 1);

          expect(result.items).toBeDefined();
          expect(Array.isArray(result.items)).toBe(true);
          expect(typeof result.hasMore).toBe('boolean');
          // cursor is string or undefined
          if (result.cursor !== undefined) {
            expect(typeof result.cursor).toBe('string');
          }
        }),
        { numRuns: 20 },
      );
    });
  });


  // ─── Group Metadata Preservation ────────────────────────────────────────

  describe('Group metadata preservation', () => {
    /**
     * createGroup returns group with correct members, roles, epoch 0 key state.
     *
     * **Validates: Requirements 3.2**
     */
    it('createGroup produces correct metadata for all member sets', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbContextName,
          async ([creatorId, memberId], groupName) => {
            const permissionService = new PermissionService();
            const service = new GroupService(permissionService);

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            // Has a valid id
            expect(group.id).toBeDefined();
            expect(typeof group.id).toBe('string');

            // Name matches
            expect(group.name).toBe(groupName);

            // Creator is set
            expect(group.creatorId).toBe(creatorId);

            // Members include creator and member
            const memberIds = group.members.map((m) => m.memberId);
            expect(memberIds).toContain(creatorId);
            expect(memberIds).toContain(memberId);

            // Creator has OWNER role
            const creator = group.members.find(
              (m) => m.memberId === creatorId,
            )!;
            expect(creator.role).toBe('owner');

            // Other member has MEMBER role
            const member = group.members.find(
              (m) => m.memberId === memberId,
            )!;
            expect(member.role).toBe('member');

            // Epoch 0 key state exists with keys for all members
            expect(group.encryptedSharedKey).toBeDefined();
            expect(group.encryptedSharedKey.size).toBe(1);
            expect(group.encryptedSharedKey.has(0)).toBe(true);

            const epoch0Keys = group.encryptedSharedKey.get(0)!;
            expect(epoch0Keys.has(creatorId)).toBe(true);
            expect(epoch0Keys.has(memberId)).toBe(true);

            // Timestamps are valid
            expect(group.createdAt).toBeInstanceOf(Date);
            expect(group.lastMessageAt).toBeInstanceOf(Date);

            // pinnedMessageIds starts empty
            expect(group.pinnedMessageIds).toEqual([]);
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * addMembers wraps all epoch keys for new members.
     *
     * **Validates: Requirements 3.2, 3.5**
     */
    it('addMembers wraps all epoch keys for new members', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberTriple,
          arbContextName,
          async ([creatorId, memberId, newMemberId], groupName) => {
            const permissionService = new PermissionService();
            const service = new GroupService(permissionService);

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            await service.addMembers(group.id, creatorId, [newMemberId]);

            const updatedGroup = await service.getGroup(group.id, creatorId);

            // New member is in the group
            const memberIds = updatedGroup.members.map((m) => m.memberId);
            expect(memberIds).toContain(newMemberId);

            // New member has wrapped keys for all epochs
            for (const [, epochMap] of updatedGroup.encryptedSharedKey) {
              expect(epochMap.has(newMemberId)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * removeMember triggers key rotation (epoch increment, re-wrap).
     *
     * **Validates: Requirements 3.2, 3.5**
     */
    it('removeMember triggers key rotation with epoch increment', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberTriple,
          arbContextName,
          async ([creatorId, memberId, targetId], groupName) => {
            const permissionService = new PermissionService();
            const service = new GroupService(permissionService);

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
              targetId,
            ]);

            // Epoch starts at 0
            expect(group.encryptedSharedKey.has(0)).toBe(true);

            await service.removeMember(group.id, creatorId, targetId);

            const updatedGroup = await service.getGroup(group.id, creatorId);

            // Epoch incremented to 1
            expect(updatedGroup.encryptedSharedKey.has(1)).toBe(true);

            // Removed member is gone from all epochs
            for (const [, epochMap] of updatedGroup.encryptedSharedKey) {
              expect(epochMap.has(targetId)).toBe(false);
            }

            // Remaining members still have keys
            for (const [, epochMap] of updatedGroup.encryptedSharedKey) {
              expect(epochMap.has(creatorId)).toBe(true);
              expect(epochMap.has(memberId)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * leaveGroup triggers key rotation (epoch increment, re-wrap).
     *
     * **Validates: Requirements 3.2, 3.5**
     */
    it('leaveGroup triggers key rotation with epoch increment', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberTriple,
          arbContextName,
          async ([creatorId, memberId, leaverId], groupName) => {
            const permissionService = new PermissionService();
            const service = new GroupService(permissionService);

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
              leaverId,
            ]);

            await service.leaveGroup(group.id, leaverId);

            const updatedGroup = await service.getGroup(group.id, creatorId);

            // Epoch incremented
            expect(updatedGroup.encryptedSharedKey.has(1)).toBe(true);

            // Leaver is gone from all epochs
            for (const [, epochMap] of updatedGroup.encryptedSharedKey) {
              expect(epochMap.has(leaverId)).toBe(false);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Group event emission: createGroup emits emitGroupCreated.
     *
     * **Validates: Requirements 3.10**
     */
    it('createGroup emits emitGroupCreated event', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbContextName,
          async ([creatorId, memberId], groupName) => {
            const spy = createSpyEventEmitter();
            const permissionService = new PermissionService();
            const service = new GroupService(
              permissionService,
              undefined,
              undefined,
              spy,
            );

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            const createEvents = spy.events.filter(
              (e) => e.method === 'emitGroupCreated',
            );
            expect(createEvents.length).toBe(1);
            expect(createEvents[0].args[0]).toBe(group.id);
            expect(createEvents[0].args[2]).toBe(creatorId);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Group membership events: addMembers emits emitMemberJoined,
     * removeMember emits emitMemberKicked, leaveGroup emits emitMemberLeft.
     *
     * **Validates: Requirements 3.10**
     */
    it('group membership operations emit correct events', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberTriple,
          arbContextName,
          async ([creatorId, memberId, extraId], groupName) => {
            const spy = createSpyEventEmitter();
            const permissionService = new PermissionService();
            const service = new GroupService(
              permissionService,
              undefined,
              undefined,
              spy,
            );

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            // Clear events from creation
            spy.events.length = 0;

            // addMembers → emitMemberJoined
            await service.addMembers(group.id, creatorId, [extraId]);
            const joinEvents = spy.events.filter(
              (e) => e.method === 'emitMemberJoined',
            );
            expect(joinEvents.length).toBe(1);
            expect(joinEvents[0].args[0]).toBe('group');
            expect(joinEvents[0].args[1]).toBe(group.id);
            expect(joinEvents[0].args[2]).toBe(extraId);

            spy.events.length = 0;

            // removeMember → emitMemberKicked
            await service.removeMember(group.id, creatorId, extraId);
            const kickEvents = spy.events.filter(
              (e) => e.method === 'emitMemberKicked',
            );
            expect(kickEvents.length).toBe(1);
            expect(kickEvents[0].args[0]).toBe('group');
            expect(kickEvents[0].args[1]).toBe(group.id);
            expect(kickEvents[0].args[2]).toBe(extraId);

            spy.events.length = 0;

            // leaveGroup → emitMemberLeft
            await service.leaveGroup(group.id, memberId);
            const leftEvents = spy.events.filter(
              (e) => e.method === 'emitMemberLeft',
            );
            expect(leftEvents.length).toBe(1);
            expect(leftEvents[0].args[0]).toBe('group');
            expect(leftEvents[0].args[1]).toBe(group.id);
            expect(leftEvents[0].args[2]).toBe(memberId);
          },
        ),
        { numRuns: 20 },
      );
    });
  });


  // ─── Channel Metadata Preservation ──────────────────────────────────────

  describe('Channel metadata preservation', () => {
    /**
     * createChannel returns channel with correct visibility, members, epoch 0.
     *
     * **Validates: Requirements 3.3**
     */
    it('createChannel produces correct metadata for all inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbUniqueChannelName,
          fc.constantFrom(ChannelVisibility.PUBLIC, ChannelVisibility.PRIVATE),
          async (creatorId, channelName, visibility) => {
            const permissionService = new PermissionService();
            const service = new ChannelService(permissionService);

            const channel = await service.createChannel(
              channelName,
              creatorId,
              visibility,
            );

            // Has a valid id
            expect(channel.id).toBeDefined();
            expect(typeof channel.id).toBe('string');

            // Name is normalized (lowercase, hyphens)
            expect(channel.name).toBe(channelName.toLowerCase().replace(/\s+/g, '-'));

            // Creator is set
            expect(channel.creatorId).toBe(creatorId);

            // Visibility matches
            expect(channel.visibility).toBe(visibility);

            // Members include only creator
            expect(channel.members).toHaveLength(1);
            expect(channel.members[0].memberId).toBe(creatorId);
            expect(channel.members[0].role).toBe('owner');

            // Epoch 0 key state exists with key for creator
            expect(channel.encryptedSharedKey).toBeDefined();
            expect(channel.encryptedSharedKey.size).toBe(1);
            expect(channel.encryptedSharedKey.has(0)).toBe(true);
            expect(channel.encryptedSharedKey.get(0)!.has(creatorId)).toBe(
              true,
            );

            // Timestamps are valid
            expect(channel.createdAt).toBeInstanceOf(Date);
            expect(channel.lastMessageAt).toBeInstanceOf(Date);

            // pinnedMessageIds starts empty
            expect(channel.pinnedMessageIds).toEqual([]);

            // historyVisibleToNewMembers defaults to true
            expect(channel.historyVisibleToNewMembers).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * joinChannel correctly manages membership and key wrapping for public channels.
     *
     * **Validates: Requirements 3.3, 3.5**
     */
    it('joinChannel adds member and wraps epoch keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbUniqueChannelName,
          async ([creatorId, joinerId], channelName) => {
            const permissionService = new PermissionService();
            const service = new ChannelService(permissionService);

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            await service.joinChannel(channel.id, joinerId);

            const updated = await service.getChannel(channel.id, joinerId);

            // Joiner is now a member
            const memberIds = updated.members.map((m) => m.memberId);
            expect(memberIds).toContain(joinerId);

            // Joiner has wrapped keys for all epochs
            for (const [, epochMap] of updated.encryptedSharedKey) {
              expect(epochMap.has(joinerId)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * leaveChannel correctly removes member and triggers key rotation.
     *
     * **Validates: Requirements 3.3, 3.5**
     */
    it('leaveChannel removes member and rotates keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbUniqueChannelName,
          async ([creatorId, leaverId], channelName) => {
            const permissionService = new PermissionService();
            const service = new ChannelService(permissionService);

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            await service.joinChannel(channel.id, leaverId);
            await service.leaveChannel(channel.id, leaverId);

            const updated = await service.getChannel(channel.id, creatorId);

            // Leaver is no longer a member
            const memberIds = updated.members.map((m) => m.memberId);
            expect(memberIds).not.toContain(leaverId);

            // Epoch incremented (key rotation happened)
            expect(updated.encryptedSharedKey.has(1)).toBe(true);

            // Leaver removed from all epochs
            for (const [, epochMap] of updated.encryptedSharedKey) {
              expect(epochMap.has(leaverId)).toBe(false);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * kickMember correctly removes member and triggers key rotation.
     *
     * **Validates: Requirements 3.3, 3.5**
     */
    it('kickMember removes member and rotates keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbUniqueChannelName,
          async ([creatorId, targetId], channelName) => {
            const permissionService = new PermissionService();
            const service = new ChannelService(permissionService);

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            await service.joinChannel(channel.id, targetId);
            await service.kickMember(channel.id, creatorId, targetId);

            const updated = await service.getChannel(channel.id, creatorId);

            // Target is no longer a member
            const memberIds = updated.members.map((m) => m.memberId);
            expect(memberIds).not.toContain(targetId);

            // Epoch incremented
            expect(updated.encryptedSharedKey.has(1)).toBe(true);

            // Target removed from all epochs
            for (const [, epochMap] of updated.encryptedSharedKey) {
              expect(epochMap.has(targetId)).toBe(false);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * createInvite / redeemInvite manage invite tokens correctly.
     *
     * **Validates: Requirements 3.3**
     */
    it('createInvite and redeemInvite manage tokens correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbUniqueChannelName,
          async ([creatorId, joinerId], channelName) => {
            const permissionService = new PermissionService();
            const service = new ChannelService(permissionService);

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PRIVATE,
            );

            const invite = await service.createInvite(channel.id, creatorId);

            // Invite has correct structure
            expect(invite.token).toBeDefined();
            expect(typeof invite.token).toBe('string');
            expect(invite.channelId).toBe(channel.id);
            expect(invite.createdBy).toBe(creatorId);
            expect(invite.maxUses).toBe(1);
            expect(invite.currentUses).toBe(0);
            expect(invite.createdAt).toBeInstanceOf(Date);
            expect(invite.expiresAt).toBeInstanceOf(Date);
            expect(invite.expiresAt.getTime()).toBeGreaterThan(
              invite.createdAt.getTime(),
            );

            // Redeem invite
            await service.redeemInvite(invite.token, joinerId);

            const updated = await service.getChannel(channel.id, joinerId);
            const memberIds = updated.members.map((m) => m.memberId);
            expect(memberIds).toContain(joinerId);

            // Invite usage incremented
            const usedInvite = service.getInviteToken(invite.token);
            expect(usedInvite!.currentUses).toBe(1);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Channel event emission: joinChannel emits emitMemberJoined,
     * leaveChannel emits emitMemberLeft, kickMember emits emitMemberKicked.
     *
     * **Validates: Requirements 3.10**
     */
    it('channel membership operations emit correct events', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberTriple,
          arbUniqueChannelName,
          async ([creatorId, joinerId, kickTargetId], channelName) => {
            const spy = createSpyEventEmitter();
            const permissionService = new PermissionService();
            const service = new ChannelService(
              permissionService,
              undefined,
              undefined,
              spy,
            );

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            // joinChannel → emitMemberJoined
            spy.events.length = 0;
            await service.joinChannel(channel.id, joinerId);
            const joinEvents = spy.events.filter(
              (e) => e.method === 'emitMemberJoined',
            );
            expect(joinEvents.length).toBe(1);
            expect(joinEvents[0].args[0]).toBe('channel');
            expect(joinEvents[0].args[1]).toBe(channel.id);
            expect(joinEvents[0].args[2]).toBe(joinerId);

            // Add kickTarget so we can kick them
            await service.joinChannel(channel.id, kickTargetId);

            // kickMember → emitMemberKicked
            spy.events.length = 0;
            await service.kickMember(channel.id, creatorId, kickTargetId);
            const kickEvents = spy.events.filter(
              (e) => e.method === 'emitMemberKicked',
            );
            expect(kickEvents.length).toBe(1);
            expect(kickEvents[0].args[0]).toBe('channel');
            expect(kickEvents[0].args[1]).toBe(channel.id);
            expect(kickEvents[0].args[2]).toBe(kickTargetId);
            expect(kickEvents[0].args[3]).toBe(creatorId);

            // leaveChannel → emitMemberLeft
            spy.events.length = 0;
            await service.leaveChannel(channel.id, joinerId);
            const leftEvents = spy.events.filter(
              (e) => e.method === 'emitMemberLeft',
            );
            expect(leftEvents.length).toBe(1);
            expect(leftEvents[0].args[0]).toBe('channel');
            expect(leftEvents[0].args[1]).toBe(channel.id);
            expect(leftEvents[0].args[2]).toBe(joinerId);
          },
        ),
        { numRuns: 20 },
      );
    });
  });


  // ─── Event Emission Preservation ────────────────────────────────────────

  describe('Event emission preservation', () => {
    /**
     * For all non-content operations (create, join, leave, kick, mute),
     * the same event types fire with the same arguments.
     *
     * **Validates: Requirements 3.10**
     */
    it('mute operation emits emitMemberMuted with correct args', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbUniqueChannelName,
          fc.integer({ min: 1000, max: 60000 }),
          async ([creatorId, targetId], channelName, durationMs) => {
            const spy = createSpyEventEmitter();
            const permissionService = new PermissionService();
            const service = new ChannelService(
              permissionService,
              undefined,
              undefined,
              spy,
            );

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            await service.joinChannel(channel.id, targetId);

            spy.events.length = 0;
            await service.muteMember(
              channel.id,
              creatorId,
              targetId,
              durationMs,
            );

            const muteEvents = spy.events.filter(
              (e) => e.method === 'emitMemberMuted',
            );
            expect(muteEvents.length).toBe(1);
            expect(muteEvents[0].args[0]).toBe('channel');
            expect(muteEvents[0].args[1]).toBe(channel.id);
            expect(muteEvents[0].args[2]).toBe(targetId);
            expect(muteEvents[0].args[3]).toBe(creatorId);
            expect(muteEvents[0].args[4]).toBe(durationMs);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * sendMessage in group emits emitMessageSent with correct context type.
     *
     * **Validates: Requirements 3.10**
     */
    it('group sendMessage emits emitMessageSent with group context', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbContextName,
          async ([creatorId, memberId], groupName) => {
            const spy = createSpyEventEmitter();
            const permissionService = new PermissionService();
            const service = new GroupService(
              permissionService,
              undefined,
              undefined,
              spy,
            );

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            spy.events.length = 0;
            const msg = await service.sendMessage(
              group.id,
              creatorId,
              'test-msg',
            );

            const sentEvents = spy.events.filter(
              (e) => e.method === 'emitMessageSent',
            );
            expect(sentEvents.length).toBe(1);
            expect(sentEvents[0].args[0]).toBe('group');
            expect(sentEvents[0].args[1]).toBe(group.id);
            expect(sentEvents[0].args[2]).toBe(msg.id);
            expect(sentEvents[0].args[3]).toBe(creatorId);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * sendMessage in channel emits emitMessageSent with channel context.
     *
     * **Validates: Requirements 3.10**
     */
    it('channel sendMessage emits emitMessageSent with channel context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbUniqueChannelName,
          async (creatorId, channelName) => {
            const spy = createSpyEventEmitter();
            const permissionService = new PermissionService();
            const service = new ChannelService(
              permissionService,
              undefined,
              undefined,
              spy,
            );

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            spy.events.length = 0;
            const msg = await service.sendMessage(
              channel.id,
              creatorId,
              'test-msg',
            );

            const sentEvents = spy.events.filter(
              (e) => e.method === 'emitMessageSent',
            );
            expect(sentEvents.length).toBe(1);
            expect(sentEvents[0].args[0]).toBe('channel');
            expect(sentEvents[0].args[1]).toBe(channel.id);
            expect(sentEvents[0].args[2]).toBe(msg.id);
            expect(sentEvents[0].args[3]).toBe(creatorId);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  // ─── Pagination Preservation ────────────────────────────────────────────

  describe('Pagination preservation', () => {
    /**
     * IPaginatedResult structure (items, cursor, hasMore) is correct for
     * group message queries.
     *
     * **Validates: Requirements 3.8**
     */
    it('group getMessages returns correct pagination structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbContextName,
          fc.integer({ min: 1, max: 5 }),
          async ([creatorId, memberId], groupName, msgCount) => {
            const permissionService = new PermissionService();
            const service = new GroupService(permissionService);

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            // Send some messages
            for (let i = 0; i < msgCount; i++) {
              await service.sendMessage(group.id, creatorId, `msg-${i}`);
            }

            const result = await service.getMessages(group.id, creatorId);

            expect(result.items).toBeDefined();
            expect(Array.isArray(result.items)).toBe(true);
            expect(result.items.length).toBe(msgCount);
            expect(typeof result.hasMore).toBe('boolean');

            // Each item has required fields
            for (const item of result.items) {
              expect(item.id).toBeDefined();
              expect(item.contextType).toBe('group');
              expect(item.contextId).toBe(group.id);
              expect(item.senderId).toBe(creatorId);
              expect(item.createdAt).toBeInstanceOf(Date);
              expect(typeof item.keyEpoch).toBe('number');
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * IPaginatedResult structure is correct for channel message queries.
     *
     * **Validates: Requirements 3.8**
     */
    it('channel getMessages returns correct pagination structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbUniqueChannelName,
          fc.integer({ min: 1, max: 5 }),
          async (creatorId, channelName, msgCount) => {
            const permissionService = new PermissionService();
            const service = new ChannelService(permissionService);

            const channel = await service.createChannel(
              channelName,
              creatorId,
              ChannelVisibility.PUBLIC,
            );

            for (let i = 0; i < msgCount; i++) {
              await service.sendMessage(channel.id, creatorId, `msg-${i}`);
            }

            const result = await service.getMessages(channel.id, creatorId);

            expect(result.items).toBeDefined();
            expect(Array.isArray(result.items)).toBe(true);
            expect(result.items.length).toBe(msgCount);
            expect(typeof result.hasMore).toBe('boolean');

            for (const item of result.items) {
              expect(item.id).toBeDefined();
              expect(item.contextType).toBe('channel');
              expect(item.contextId).toBe(channel.id);
              expect(item.senderId).toBe(creatorId);
              expect(item.createdAt).toBeInstanceOf(Date);
              expect(typeof item.keyEpoch).toBe('number');
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Cursor-based pagination works correctly: requesting with a limit
     * smaller than total items returns hasMore=true and a valid cursor.
     *
     * **Validates: Requirements 3.8**
     */
    it('cursor-based pagination returns hasMore and valid cursor', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMemberPair,
          arbContextName,
          async ([creatorId, memberId], groupName) => {
            const permissionService = new PermissionService();
            const service = new GroupService(permissionService);

            const group = await service.createGroup(groupName, creatorId, [
              memberId,
            ]);

            // Send 3 messages
            for (let i = 0; i < 3; i++) {
              await service.sendMessage(group.id, creatorId, `msg-${i}`);
            }

            // Request with limit 2
            const page1 = await service.getMessages(
              group.id,
              creatorId,
              undefined,
              2,
            );
            expect(page1.items.length).toBe(2);
            expect(page1.hasMore).toBe(true);
            expect(page1.cursor).toBeDefined();

            // Request page 2 using cursor
            const page2 = await service.getMessages(
              group.id,
              creatorId,
              page1.cursor,
              2,
            );
            expect(page2.items.length).toBe(1);
            expect(page2.hasMore).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
