/**
 * SearchService — cross-context keyword search across conversations, groups, and channels.
 *
 * Aggregates search results from all contexts a member has access to,
 * returning paginated results with context metadata (sender, timestamp,
 * context name/type).
 *
 * Requirements: 10.4
 */

import {
  IPaginatedResult,
  ISearchResultItem,
} from '../../interfaces/communication';
import { paginateItems } from '../../utils/pagination';
import { ChannelService } from './channelService';
import { ConversationService } from './conversationService';
import { GroupService } from './groupService';

/**
 * Internal search-result item with an `id` for cursor-based pagination.
 */
interface IdentifiableSearchResult extends ISearchResultItem {
  id: string;
}

export class SearchService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly groupService: GroupService,
    private readonly channelService: ChannelService,
  ) {}

  /**
   * Search messages by keyword across all contexts the member has access to.
   *
   * Results are sorted by `createdAt` descending (newest first) and include
   * sender, timestamp, and context name for each match.
   */
  searchAll(
    memberId: string,
    query: string,
    cursor?: string,
    limit = 50,
  ): IPaginatedResult<ISearchResultItem> {
    const lowerQuery = query.toLowerCase();
    const results: IdentifiableSearchResult[] = [];

    this.searchConversations(memberId, lowerQuery, results);
    this.searchGroups(memberId, lowerQuery, results);
    this.searchChannels(memberId, lowerQuery, results);

    // Sort by createdAt descending (newest first)
    results.sort(
      (a, b) => b.message.createdAt.getTime() - a.message.createdAt.getTime(),
    );

    return paginateItems(results, cursor, limit);
  }

  private searchConversations(
    memberId: string,
    lowerQuery: string,
    results: IdentifiableSearchResult[],
  ): void {
    const conversations =
      this.conversationService.listAllConversationsForMember(memberId);

    for (const conv of conversations) {
      const msgs = this.conversationService.getAllMessages(conv.id);
      const otherParticipant =
        conv.participants[0] === memberId
          ? conv.participants[1]
          : conv.participants[0];
      const contextName = `DM with ${otherParticipant}`;

      for (const msg of msgs) {
        if (
          !msg.deleted &&
          typeof msg.encryptedContent === 'string' &&
          msg.encryptedContent.toLowerCase().includes(lowerQuery)
        ) {
          results.push({ id: msg.id, message: msg, contextName });
        }
      }
    }
  }

  private searchGroups(
    memberId: string,
    lowerQuery: string,
    results: IdentifiableSearchResult[],
  ): void {
    const groups = this.groupService.listGroupsForMember(memberId);

    for (const group of groups) {
      const msgs = this.groupService.getAllMessages(group.id);
      const contextName = `Group: ${group.name}`;

      for (const msg of msgs) {
        if (
          !msg.deleted &&
          typeof msg.encryptedContent === 'string' &&
          msg.encryptedContent.toLowerCase().includes(lowerQuery)
        ) {
          results.push({ id: msg.id, message: msg, contextName });
        }
      }
    }
  }

  private searchChannels(
    memberId: string,
    lowerQuery: string,
    results: IdentifiableSearchResult[],
  ): void {
    const channels = this.channelService.listChannelsForMember(memberId);

    for (const channel of channels) {
      const msgs = this.channelService.getAllMessages(channel.id);
      const contextName = `Channel: #${channel.name}`;

      for (const msg of msgs) {
        if (
          !msg.deleted &&
          typeof msg.encryptedContent === 'string' &&
          msg.encryptedContent.toLowerCase().includes(lowerQuery)
        ) {
          results.push({ id: msg.id, message: msg, contextName });
        }
      }
    }
  }
}
