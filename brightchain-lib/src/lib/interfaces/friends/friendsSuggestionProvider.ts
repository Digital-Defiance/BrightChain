import { IBaseFriendship } from './baseFriendship';
import { IPaginatedResult, IPaginationOptions } from './pagination';

/**
 * Provides friend suggestions for recipient/attendee pickers across dApps.
 * Wraps IFriendsService.getFriends() with search filtering.
 */
export interface IFriendsSuggestionProvider {
  /**
   * Get friends for display in a suggestion picker.
   * @param userId The member requesting suggestions
   * @param searchQuery Optional search string to filter by displayName/username
   * @param options Pagination options
   * @returns Paginated friends matching the query (or all friends if no query)
   */
  getFriendSuggestions(
    userId: string,
    searchQuery?: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendship<string>>>;
}
