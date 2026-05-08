import { FriendRequestStatus } from '../../enumerations/friendRequestStatus';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';

/**
 * Represents a directional friend request from one member to another.
 */
export interface IBaseFriendRequest<TId> {
  _id: TId;
  requesterId: TId;
  recipientId: TId;
  message?: string;
  status: FriendRequestStatus;
  createdAt: BrightDateTimestamp;
}
