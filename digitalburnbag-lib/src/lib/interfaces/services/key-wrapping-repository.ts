import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IKeyWrappingEntryBase } from '../bases/key-wrapping-entry';

/**
 * Repository interface abstracting BrightDB access for key wrapping operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IKeyWrappingRepository<TID extends PlatformID> {
  /** Create a new key wrapping entry */
  createEntry(
    entry: IKeyWrappingEntryBase<TID>,
  ): Promise<IKeyWrappingEntryBase<TID>>;

  /** Get a key wrapping entry by ID, or null if not found */
  getEntry(entryId: TID): Promise<IKeyWrappingEntryBase<TID> | null>;

  /** Get a key wrapping entry by file version and recipient user */
  getEntryByRecipient(
    fileVersionId: TID,
    recipientUserId: TID,
  ): Promise<IKeyWrappingEntryBase<TID> | null>;

  /** Get a key wrapping entry by file version and share link */
  getEntryByShareLink(
    fileVersionId: TID,
    shareLinkId: TID,
  ): Promise<IKeyWrappingEntryBase<TID> | null>;

  /** Delete a key wrapping entry */
  deleteEntry(entryId: TID): Promise<void>;

  /** Delete all key wrapping entries for a file version */
  deleteAllForFileVersion(fileVersionId: TID): Promise<number>;

  /** Get all key wrapping entries for a file version */
  getEntriesForFileVersion(
    fileVersionId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>[]>;
}
