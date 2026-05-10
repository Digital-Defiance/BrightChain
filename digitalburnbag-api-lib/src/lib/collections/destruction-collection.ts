import type { Collection } from '@brightchain/db';
import type {
  IDestructionRepository,
  IFileMetadataBase,
  IFileVersionBase,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBDestructionRepository<TID extends PlatformID>
  implements IDestructionRepository<TID>
{
  constructor(
    private readonly fileMetadata: Collection,
    private readonly fileVersions: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getFileMetadata(fileId: TID): Promise<IFileMetadataBase<TID> | null> {
    const doc = await this.fileMetadata.findOne(
      filter({ _id: fileId }, this.ids),
    );
    return doc ? fromDoc<TID, IFileMetadataBase<TID>>(doc, this.ids) : null;
  }

  async getFileVersions(fileId: TID): Promise<IFileVersionBase<TID>[]> {
    const docs = await this.fileVersions
      .find(filter({ fileId }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IFileVersionBase<TID>>(d, this.ids));
  }

  async updateFileMetadata(
    fileId: TID,
    updates: Partial<IFileMetadataBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.fileMetadata.updateOne(filter({ _id: fileId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  async getFilesScheduledForDestruction(
    before: Date,
  ): Promise<IFileMetadataBase<TID>[]> {
    const docs = await this.fileMetadata
      .find(filter({ scheduledDestructionAt: { $lt: before } }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IFileMetadataBase<TID>>(d, this.ids));
  }

  async getExpiredTrashItems(before: Date): Promise<IFileMetadataBase<TID>[]> {
    const docs = await this.fileMetadata
      .find(filter({ deletedAt: { $ne: null, $lt: before } }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IFileMetadataBase<TID>>(d, this.ids));
  }
}
