import type { Collection } from '@brightchain/db';
import type {
  IKeyWrappingEntryBase,
  IKeyWrappingRepository,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBKeyWrappingRepository<TID extends PlatformID>
  implements IKeyWrappingRepository<TID>
{
  constructor(
    private readonly keyWrappingEntries: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async createEntry(
    entry: IKeyWrappingEntryBase<TID>,
  ): Promise<IKeyWrappingEntryBase<TID>> {
    await this.keyWrappingEntries.insertOne(toDoc(entry, this.ids));
    return entry;
  }

  async getEntry(entryId: TID): Promise<IKeyWrappingEntryBase<TID> | null> {
    const doc = await this.keyWrappingEntries.findOne(
      filter({ _id: entryId }, this.ids),
    );
    return doc ? fromDoc<TID, IKeyWrappingEntryBase<TID>>(doc, this.ids) : null;
  }

  async getEntryByRecipient(
    fileVersionId: TID,
    recipientUserId: TID,
  ): Promise<IKeyWrappingEntryBase<TID> | null> {
    const doc = await this.keyWrappingEntries.findOne(
      filter({ fileVersionId, recipientUserId }, this.ids),
    );
    return doc ? fromDoc<TID, IKeyWrappingEntryBase<TID>>(doc, this.ids) : null;
  }

  async getEntryByShareLink(
    fileVersionId: TID,
    shareLinkId: TID,
  ): Promise<IKeyWrappingEntryBase<TID> | null> {
    const doc = await this.keyWrappingEntries.findOne(
      filter({ fileVersionId, shareLinkId }, this.ids),
    );
    return doc ? fromDoc<TID, IKeyWrappingEntryBase<TID>>(doc, this.ids) : null;
  }

  async deleteEntry(entryId: TID): Promise<void> {
    await this.keyWrappingEntries.deleteOne(filter({ _id: entryId }, this.ids));
  }

  async deleteAllForFileVersion(fileVersionId: TID): Promise<number> {
    const result = await this.keyWrappingEntries.deleteMany(
      filter({ fileVersionId }, this.ids),
    );
    return result.deletedCount;
  }

  async getEntriesForFileVersion(
    fileVersionId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>[]> {
    const docs = await this.keyWrappingEntries
      .find(filter({ fileVersionId }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IKeyWrappingEntryBase<TID>>(d, this.ids),
    );
  }
}
