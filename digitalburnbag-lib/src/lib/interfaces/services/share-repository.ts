import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IShareLinkBase } from '../bases/share-link';
import type { ISharedItem } from '../params/share-service-params';

/**
 * Repository interface abstracting BrightDB access for share operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IShareRepository<TID extends PlatformID> {
  /** Create a new share link */
  createShareLink(link: IShareLinkBase<TID>): Promise<IShareLinkBase<TID>>;

  /** Get a share link by ID, or null if not found */
  getShareLinkById(linkId: TID): Promise<IShareLinkBase<TID> | null>;

  /** Get a share link by its unique token, or null if not found */
  getShareLinkByToken(token: string): Promise<IShareLinkBase<TID> | null>;

  /** Update an existing share link */
  updateShareLink(link: IShareLinkBase<TID>): Promise<IShareLinkBase<TID>>;

  /** Delete a share link */
  deleteShareLink(linkId: TID): Promise<void>;

  /** Get all share links for a file */
  getShareLinksForFile(fileId: TID): Promise<IShareLinkBase<TID>[]>;

  /** Get all items shared with a user */
  getSharedItems(userId: TID): Promise<ISharedItem<TID>[]>;
}
