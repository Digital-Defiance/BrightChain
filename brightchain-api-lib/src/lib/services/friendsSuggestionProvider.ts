/**
 * FriendsSuggestionProvider implementation.
 *
 * Wraps IFriendsService.getFriends() with case-insensitive substring search
 * filtering on display name and username for use in recipient/attendee pickers.
 *
 * @see Requirements: 14.3, 16.1, 17.1, 18.2
 */

import type {
  IFriendsSuggestionProvider,
  IFriendsService,
  IBaseFriendship,
  IPaginatedResult,
  IPaginationOptions,
} from '@brightchain/brightchain-lib';

/**
 * Resolves a user ID to display name and username for search filtering.
 */
export type UserInfoResolver = (
  userId: string,
) => Promise<{ displayName: string; username: string } | null>;

export class FriendsSuggestionProvider implements IFriendsSuggestionProvider {
  constructor(
    private readonly friendsService: IFriendsService,
    private readonly resolveUserInfo: UserInfoResolver,
  ) {}

  async getFriendSuggestions(
    userId: string,
    searchQuery?: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendship<string>>> {
    // Fetch friends from the underlying service
    const friendsResult = await this.friendsService.getFriends(userId, options);

    // If no search query, return the result as-is
    if (!searchQuery || searchQuery.trim().length === 0) {
      return friendsResult;
    }

    const query = searchQuery.toLowerCase();

    // Filter friends by case-insensitive substring match on display name / username
    const filtered: IBaseFriendship<string>[] = [];
    for (const friendship of friendsResult.items) {
      const friendId =
        friendship.memberIdA === userId
          ? friendship.memberIdB
          : friendship.memberIdA;

      const userInfo = await this.resolveUserInfo(friendId);
      if (!userInfo) continue;

      if (
        userInfo.displayName.toLowerCase().includes(query) ||
        userInfo.username.toLowerCase().includes(query)
      ) {
        filtered.push(friendship);
      }
    }

    return {
      items: filtered,
      hasMore: false,
      totalCount: filtered.length,
    };
  }
}

/**
 * Factory function for creating a FriendsSuggestionProvider.
 */
export function createFriendsSuggestionProvider(
  friendsService: IFriendsService,
  resolveUserInfo: UserInfoResolver,
): FriendsSuggestionProvider {
  return new FriendsSuggestionProvider(friendsService, resolveUserInfo);
}
