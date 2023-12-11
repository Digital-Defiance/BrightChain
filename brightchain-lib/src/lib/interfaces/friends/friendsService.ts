import { FriendshipStatus } from '../../enumerations/friendshipStatus';
import { IBaseFriendRequest } from './baseFriendRequest';
import { IBaseFriendship } from './baseFriendship';
import { IPaginatedResult, IPaginationOptions } from './pagination';

/**
 * Result of a send-friend-request operation.
 */
export interface IFriendRequestResult {
  success: boolean;
  autoAccepted?: boolean;
  friendship?: IBaseFriendship<string>;
  friendRequest?: IBaseFriendRequest<string>;
  error?: string;
}

/**
 * Platform-agnostic Friends service contract consumed by all dApps.
 */
export interface IFriendsService {
  // ── Friend Requests ──────────────────────────────────────────────────
  sendFriendRequest(
    requesterId: string,
    recipientId: string,
    message?: string,
  ): Promise<IFriendRequestResult>;

  acceptFriendRequest(userId: string, requestId: string): Promise<void>;
  rejectFriendRequest(userId: string, requestId: string): Promise<void>;
  cancelFriendRequest(userId: string, requestId: string): Promise<void>;

  // ── Friendship Management ────────────────────────────────────────────
  removeFriend(userId: string, friendId: string): Promise<void>;

  // ── Queries ──────────────────────────────────────────────────────────
  getFriends(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendship<string>>>;

  getReceivedFriendRequests(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendRequest<string>>>;

  getSentFriendRequests(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendRequest<string>>>;

  getFriendshipStatus(
    userId: string,
    otherUserId: string,
  ): Promise<FriendshipStatus>;

  areFriends(userIdA: string, userIdB: string): Promise<boolean>;

  getMutualFriends(
    userId: string,
    otherUserId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseFriendship<string>>>;

  // ── Block integration ────────────────────────────────────────────────
  onUserBlocked(blockerId: string, blockedId: string): Promise<void>;
}
