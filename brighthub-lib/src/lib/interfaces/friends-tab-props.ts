import type { IBaseFriendship } from '@brightchain/brightchain-lib';
import type { IBaseUserProfile } from './base-user-profile';

/**
 * Props for the Friends tab on a user profile view.
 * The actual React component implementation lives in brighthub-react-components.
 */
export interface IFriendsTabProps {
  /** The profile being viewed */
  profileUserId: string;
  /** The currently logged-in user */
  currentUserId: string;
  /** Whether the current user is friends with the profile user */
  isFriend: boolean;
  /** Whether the profile user has hidden their friends list from non-friends */
  hideFriendsFromNonFriends: boolean;
  /** Friends list (empty if hidden from non-friends) */
  friends: IBaseFriendship<string>[];
  /** Total friend count */
  friendCount: number;
  /** Whether more friends are available to load */
  hasMore: boolean;
  /** Callback to load more friends */
  onLoadMore?: () => void;
}

/**
 * Props for the friend count display on a user profile card.
 */
export interface IFriendCountDisplayProps {
  /** Number of friends */
  friendCount: number;
  /** User profile data */
  profile: IBaseUserProfile<string>;
}
