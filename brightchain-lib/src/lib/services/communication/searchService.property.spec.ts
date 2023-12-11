/**
 * Property-based tests for Search Service
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the search service
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 10.4**
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../enumerations/communication';
import { ChannelService } from './channelService';
import { ConversationService } from './conversationService';
import { GroupService } from './groupService';
import { PermissionService } from './permissionService';
import { SearchService } from './searchService';

/**
 * Arbitrary for non-empty alphanumeric IDs
 */
const idArb = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/**
 * Arbitrary for a search keyword — lowercase alpha so it always matches case-insensitively.
 */
const keywordArb = fc.stringMatching(/^[a-z]{3,10}$/);

/**
 * Deterministic random bytes provider for testing.
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
 * Helper: create all services wired together for a single test run.
 * Each call returns a fresh, isolated set of services.
 */
function createServices(): {
  conversationService: ConversationService;
  groupService: GroupService;
  channelService: ChannelService;
  searchService: SearchService;
} {
  const permissionService = new PermissionService();
  const conversationService = new ConversationService();
  const groupService = new GroupService(
    permissionService,
    undefined,
    undefined,
    undefined,
    createDeterministicRandomProvider(),
  );
  const channelService = new ChannelService(
    permissionService,
    undefined,
    undefined,
    undefined,
    createDeterministicRandomProvider(),
  );
  const searchService = new SearchService(
    conversationService,
    groupService,
    channelService,
  );
  return {
    conversationService,
    groupService,
    channelService,
    searchService,
  };
}

describe('Feature: api-lib-to-lib-migration, Property 25: Search Service Cross-Context', () => {
  /**
   * Property 25: Search Service Cross-Context
   *
   * *For any* search query, results SHALL include matching messages from all
   * conversations, groups, and channels the member has access to.
   *
   * **Validates: Requirements 10.4**
   */

  let channelCounter = 0;

  it('searchAll returns matching messages from conversations, groups, and channels', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        keywordArb,
        async (baseMemberA, baseMemberB, keyword) => {
          const memberA = baseMemberA + '_A';
          const memberB = baseMemberB + '_B';
          channelCounter++;

          const {
            conversationService,
            groupService,
            channelService,
            searchService,
          } = createServices();

          // Register members for conversation service
          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          // 1. Create a conversation and send a message containing the keyword
          const conv = await conversationService.createOrGetConversation(
            memberA,
            memberB,
          );
          await conversationService.sendMessage(
            memberA,
            memberB,
            `conv message with ${keyword} inside`,
            conv.id,
          );

          // 2. Create a group and send a message containing the keyword
          const group = await groupService.createGroup('TestGroup', memberA, [
            memberB,
          ]);
          await groupService.sendMessage(
            group.id,
            memberA,
            `group message with ${keyword} inside`,
          );

          // 3. Create a public channel and send a message containing the keyword
          const channelName = `search-ch-${channelCounter}`;
          const channel = await channelService.createChannel(
            channelName,
            memberA,
            ChannelVisibility.PUBLIC,
          );
          await channelService.sendMessage(
            channel.id,
            memberA,
            `channel message with ${keyword} inside`,
          );

          // Search for the keyword
          const results = searchService.searchAll(memberA, keyword);

          // Results should include at least one match from each context
          const contextNames = results.items.map((r) => r.contextName);

          const hasConversation = contextNames.some((n) =>
            n.startsWith('DM with'),
          );
          const hasGroup = contextNames.some((n) => n.startsWith('Group:'));
          const hasChannel = contextNames.some((n) => n.startsWith('Channel:'));

          expect(hasConversation).toBe(true);
          expect(hasGroup).toBe(true);
          expect(hasChannel).toBe(true);

          // Total results should be at least 3 (one per context)
          expect(results.items.length).toBeGreaterThanOrEqual(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('searchAll only returns messages whose content matches the query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        keywordArb,
        keywordArb,
        async (baseMemberA, baseMemberB, matchKeyword, noMatchKeyword) => {
          // Ensure the two keywords are distinct so the non-matching message won't match
          const keyword = matchKeyword + 'xyz';
          const otherWord = noMatchKeyword + 'qrs';

          const memberA = baseMemberA + '_A';
          const memberB = baseMemberB + '_B';

          const { conversationService, searchService } = createServices();

          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          const conv = await conversationService.createOrGetConversation(
            memberA,
            memberB,
          );

          // Send one matching and one non-matching message
          await conversationService.sendMessage(
            memberA,
            memberB,
            `hello ${keyword} world`,
            conv.id,
          );
          await conversationService.sendMessage(
            memberA,
            memberB,
            `hello ${otherWord} world`,
            conv.id,
          );

          const results = searchService.searchAll(memberA, keyword);

          // Every returned message must contain the keyword (case-insensitive)
          for (const item of results.items) {
            const content = (item.message.encryptedContent ?? '').toLowerCase();
            expect(content).toContain(keyword.toLowerCase());
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('searchAll does not return messages from contexts the member has no access to', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        keywordArb,
        async (baseMemberA, baseMemberB, baseMemberC, keyword) => {
          const memberA = baseMemberA + '_A';
          const memberB = baseMemberB + '_B';
          const memberC = baseMemberC + '_C';
          channelCounter++;

          const {
            conversationService,
            groupService,
            channelService,
            searchService,
          } = createServices();

          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);
          conversationService.registerMember(memberC);

          // memberB and memberC have a private conversation — memberA is NOT a participant
          const conv = await conversationService.createOrGetConversation(
            memberB,
            memberC,
          );
          await conversationService.sendMessage(
            memberB,
            memberC,
            `secret ${keyword} message`,
            conv.id,
          );

          // memberB creates a group without memberA
          const group = await groupService.createGroup(
            'PrivateGroup',
            memberB,
            [memberC],
          );
          await groupService.sendMessage(
            group.id,
            memberB,
            `group ${keyword} message`,
          );

          // memberB creates a PRIVATE channel — memberA cannot see it
          const channelName = `priv-ch-${channelCounter}`;
          const channel = await channelService.createChannel(
            channelName,
            memberB,
            ChannelVisibility.PRIVATE,
          );
          await channelService.sendMessage(
            channel.id,
            memberB,
            `channel ${keyword} message`,
          );

          // memberA searches — should find nothing
          const results = searchService.searchAll(memberA, keyword);
          expect(results.items.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('searchAll excludes deleted messages from results', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        keywordArb,
        async (baseMemberA, baseMemberB, keyword) => {
          const memberA = baseMemberA + '_A';
          const memberB = baseMemberB + '_B';

          const { conversationService, searchService } = createServices();

          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          const conv = await conversationService.createOrGetConversation(
            memberA,
            memberB,
          );
          const msg = await conversationService.sendMessage(
            memberA,
            memberB,
            `deletable ${keyword} content`,
            conv.id,
          );

          // Delete the message (conversationId, messageId, memberId)
          await conversationService.deleteMessage(conv.id, msg.id, memberA);

          // Search should not return the deleted message
          const results = searchService.searchAll(memberA, keyword);
          const matchingIds = results.items.map((r) => r.message.id);
          expect(matchingIds).not.toContain(msg.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('searchAll results are sorted by createdAt descending (newest first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        keywordArb,
        async (baseMemberA, baseMemberB, keyword) => {
          const memberA = baseMemberA + '_A';
          const memberB = baseMemberB + '_B';
          channelCounter++;

          const {
            conversationService,
            groupService,
            channelService,
            searchService,
          } = createServices();

          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          // Send messages across contexts
          const conv = await conversationService.createOrGetConversation(
            memberA,
            memberB,
          );
          await conversationService.sendMessage(
            memberA,
            memberB,
            `first ${keyword}`,
            conv.id,
          );

          const group = await groupService.createGroup('SortGroup', memberA, [
            memberB,
          ]);
          await groupService.sendMessage(
            group.id,
            memberA,
            `second ${keyword}`,
          );

          const channelName = `sort-ch-${channelCounter}`;
          const channel = await channelService.createChannel(
            channelName,
            memberA,
            ChannelVisibility.PUBLIC,
          );
          await channelService.sendMessage(
            channel.id,
            memberA,
            `third ${keyword}`,
          );

          const results = searchService.searchAll(memberA, keyword);

          // Verify descending order by createdAt
          for (let i = 1; i < results.items.length; i++) {
            const prev = results.items[i - 1].message.createdAt.getTime();
            const curr = results.items[i].message.createdAt.getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('searchAll with non-matching query returns no results', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        keywordArb,
        async (baseMemberA, baseMemberB, keyword) => {
          const memberA = baseMemberA + '_A';
          const memberB = baseMemberB + '_B';

          const { conversationService, searchService } = createServices();

          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          const conv = await conversationService.createOrGetConversation(
            memberA,
            memberB,
          );
          await conversationService.sendMessage(
            memberA,
            memberB,
            `some ${keyword} content`,
            conv.id,
          );

          // Search with a completely non-matching query
          const results = searchService.searchAll(memberA, 'ZZZNONEXISTENT999');
          expect(results.items.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
