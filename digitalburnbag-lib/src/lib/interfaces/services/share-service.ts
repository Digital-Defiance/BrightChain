import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IShareLinkBase } from '../bases/share-link';
import type { IAccessContext } from '../params/access-context';
import type {
  ICreateShareLinkParams,
  IInternalShareParams,
  IMagnetUrlResult,
  IShareLinkAccess,
  ISharedItem,
} from '../params/share-service-params';

/**
 * Result of a batch share-with-friends operation.
 */
export interface IShareWithFriendsResult {
  sharedCount: number;
  failedCount: number;
}

/**
 * Service interface for internal sharing, external share links, magnet URLs,
 * and share audit trails.
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3, 14.4,
 * 14.5, 14.6, 17.1, 17.2, 17.3, 37.1, 37.2, 37.3, 38.1, 38.2, 38.3,
 * 41.1, 41.2, 41.3, 41.4, 41.5, 42.1, 42.2, 42.3, 43.1, 43.2, 43.3, 43.4,
 * 44.4, 11.1, 11.2, 11.3
 */
export interface IShareService<TID extends PlatformID> {
  /** Share a file or folder with an internal user */
  shareWithUser(params: IInternalShareParams<TID>): Promise<void>;

  /** Create an external share link */
  createShareLink(
    params: ICreateShareLinkParams<TID>,
    requesterId: TID,
  ): Promise<IShareLinkBase<TID>>;

  /** Revoke an existing share link */
  revokeShareLink(shareLinkId: TID, requesterId: TID): Promise<void>;

  /** Access a share link by token */
  accessShareLink(
    token: string,
    password?: string,
    context?: IAccessContext,
  ): Promise<IShareLinkAccess<TID>>;

  /** Get the audit trail for all sharing activity on a file */
  getShareAuditTrail(fileId: TID, requesterId: TID): Promise<unknown[]>;

  /** Get all items shared with a user */
  getSharedWithMe(userId: TID): Promise<ISharedItem<TID>[]>;

  /** Get a magnet URL for direct P2P file access */
  getMagnetUrl(fileId: TID, requesterId: TID): Promise<IMagnetUrlResult>;

  /**
   * Share a file or folder with all of the user's friends.
   * Calls shareWithUser for each friend.
   * @returns The number of friends the item was shared with and failures.
   *
   * Validates: Requirements 17.3
   */
  shareWithFriends(
    params: Omit<IInternalShareParams<TID>, 'recipientId'>,
    userId: TID,
  ): Promise<IShareWithFriendsResult>;
}
