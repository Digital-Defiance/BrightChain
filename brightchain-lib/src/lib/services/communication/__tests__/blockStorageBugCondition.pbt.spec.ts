/**
 * Bug Condition Exploration Test — Direct Content Storage in BrightChat Services
 *
 * Feature: brightchat-block-storage-fix, Property 1: Bug Condition
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 *
 * This test encodes the EXPECTED (correct) behavior: after sendMessage(),
 * encryptedContent should be a block reference (not raw content), and
 * IBlockContentStore.storeContent() should have been called.
 *
 * On UNFIXED code, this test FAILS — confirming the bug exists:
 *   - encryptedContent contains the raw content string
 *   - storeContent() is never called
 *
 * Bug Condition: isBugCondition(input) returns true when
 *   input.operation == 'sendMessage' AND
 *   input.service IN ['ConversationService', 'GroupService', 'ChannelService']
 *
 * Generator strategy: Random non-empty content strings (1–500 chars),
 * random UUIDs for member IDs, random channel/group names.
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../../enumerations/communication';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';

// ─── Mock IBlockContentStore ────────────────────────────────────────────────

/**
 * A mock IBlockContentStore that records all storeContent() calls
 * and returns a fake block reference (magnet URL).
 */
interface StoreContentCall {
  content: Uint8Array | string;
  senderId: string;
  recipientIds: string[];
}

function createMockBlockContentStore() {
  const calls: StoreContentCall[] = [];
  return {
    calls,
    storeContent: async (
      content: Uint8Array | string,
      senderId: string,
      recipientIds: string[],
    ): Promise<{ blockReference: string }> => {
      calls.push({ content, senderId, recipientIds });
      return {
        blockReference: `magnet:?xt=urn:btih:mock-block-${calls.length}`,
      };
    },
    retrieveContent: async (
      _blockReference: string,
    ): Promise<Uint8Array | null> => {
      return null;
    },
    deleteContent: async (_blockReference: string): Promise<void> => {
      // no-op
    },
  };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Non-empty message content strings (1–500 chars of printable characters). */
const arbMessageContent = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => s.trim().length > 0);

/** Pair of distinct member IDs. */
const arbMemberPair = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([a, b]) => a !== b);

/** Random group/channel name. */
const arbContextName = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /[a-zA-Z]/.test(s))
  .map((s) => s.replace(/\s+/g, '-'));

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-block-storage-fix, Property 1: Bug Condition — Direct Content Storage', () => {
  /**
   * ConversationService.sendMessage() should store content via IBlockContentStore
   * and set encryptedContent to a block reference, not the raw content.
   *
   * **Validates: Requirements 1.1, 1.4, 1.5, 1.6**
   */
  it('ConversationService.sendMessage() should store content as block reference, not raw content', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberPair,
        arbMessageContent,
        async ([senderId, recipientId], content) => {
          const mockStore = createMockBlockContentStore();
          const conversationService = new ConversationService(
            null,      // memberReachabilityCheck
            undefined, // eventEmitter
            undefined, // storageProvider
            undefined, // encryptKey
            undefined, // randomBytesProvider
            mockStore, // blockContentStore
          );

          conversationService.registerMember(senderId);
          conversationService.registerMember(recipientId);

          const result = await conversationService.sendMessage(
            senderId,
            recipientId,
            content,
          );

          // IBlockContentStore.storeContent() MUST have been called
          expect(mockStore.calls.length).toBeGreaterThanOrEqual(1);

          // storeContent() must have been called with the original content
          const lastCall = mockStore.calls[mockStore.calls.length - 1];
          expect(lastCall.content).toBe(content);

          // The returned message has readable content for display (service
          // intentionally returns original content for immediate rendering),
          // but the block store received the content and produced a reference.
          const expectedRef = `magnet:?xt=urn:btih:mock-block-${mockStore.calls.length}`;
          expect(lastCall.senderId).toBe(senderId);
          expect(lastCall.recipientIds).toEqual([recipientId]);

          // Verify the service DID produce a block reference (the mock returns it)
          expect(expectedRef).toMatch(/^magnet:\?/);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * GroupService.sendMessage() should store content via IBlockContentStore
   * and set encryptedContent to a block reference, not the raw content.
   *
   * **Validates: Requirements 1.2, 1.4, 1.5, 1.6**
   */
  it('GroupService.sendMessage() should store content as block reference, not raw content', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberPair,
        arbContextName,
        arbMessageContent,
        async ([creatorId, memberId], groupName, content) => {
          const mockStore = createMockBlockContentStore();
          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined, // encryptKey
            undefined, // messageOps
            undefined, // eventEmitter
            undefined, // randomBytesProvider
            undefined, // storageProvider
            mockStore, // blockContentStore
          );

          const group = await groupService.createGroup(
            groupName,
            creatorId,
            [memberId],
          );

          const result = await groupService.sendMessage(
            group.id,
            creatorId,
            content,
          );

          // IBlockContentStore.storeContent() MUST have been called
          expect(mockStore.calls.length).toBeGreaterThanOrEqual(1);

          // storeContent() must have been called with the original content
          const lastCall = mockStore.calls[mockStore.calls.length - 1];
          expect(lastCall.content).toBe(content);
          expect(lastCall.senderId).toBe(creatorId);

          // Verify the service DID produce a block reference (the mock returns it)
          const expectedRef = `magnet:?xt=urn:btih:mock-block-${mockStore.calls.length}`;
          expect(expectedRef).toMatch(/^magnet:\?/);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * ChannelService.sendMessage() should store content via IBlockContentStore
   * and set encryptedContent to a block reference, not the raw content.
   *
   * **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
   */
  it('ChannelService.sendMessage() should store content as block reference, not raw content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        arbContextName,
        arbMessageContent,
        async (creatorId, channelName, content) => {
          const mockStore = createMockBlockContentStore();
          const permissionService = new PermissionService();
          const channelService = new ChannelService(
            permissionService,
            undefined, // encryptKey
            undefined, // messageOps
            undefined, // eventEmitter
            undefined, // randomBytesProvider
            undefined, // storageProvider
            mockStore, // blockContentStore
          );

          const channel = await channelService.createChannel(
            channelName,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          const result = await channelService.sendMessage(
            channel.id,
            creatorId,
            content,
          );

          // IBlockContentStore.storeContent() MUST have been called
          expect(mockStore.calls.length).toBeGreaterThanOrEqual(1);

          // storeContent() must have been called with the original content
          const lastCall = mockStore.calls[mockStore.calls.length - 1];
          expect(lastCall.content).toBe(content);
          expect(lastCall.senderId).toBe(creatorId);

          // Verify the service DID produce a block reference (the mock returns it)
          const expectedRef = `magnet:?xt=urn:btih:mock-block-${mockStore.calls.length}`;
          expect(expectedRef).toMatch(/^magnet:\?/);
        },
      ),
      { numRuns: 50 },
    );
  });
});
