import type { Collection } from '@brightchain/db';
import type {
  IFileVersionBase,
  IStorageQuotaBase,
  IStorageQuotaRepository,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBStorageQuotaRepository<TID extends PlatformID>
  implements IStorageQuotaRepository<TID>
{
  constructor(
    private readonly storageQuotas: Collection,
    private readonly fileVersions: Collection,
    private readonly fileMetadata: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getQuota(userId: TID): Promise<IStorageQuotaBase<TID> | null> {
    const doc = await this.storageQuotas.findOne(
      filter({ _id: userId }, this.ids),
    );
    if (!doc) return null;
    const d = doc as Record<string, unknown>;
    const { _id, ...rest } = d;
    let parsedUserId: TID;
    try {
      parsedUserId =
        typeof _id === 'string' ? this.ids.parseId(_id) : (_id as TID);
    } catch {
      parsedUserId = _id as TID;
    }
    return { userId: parsedUserId, ...rest } as IStorageQuotaBase<TID>;
  }

  async upsertQuota(quota: IStorageQuotaBase<TID>): Promise<void> {
    const { userId, ...rest } = quota;
    const userIdStr = this.ids.idToString(userId);
    const result = await this.storageQuotas.updateOne(
      filter({ _id: userId }, this.ids),
      { $set: rest },
    );
    if (result.matchedCount === 0) {
      await this.storageQuotas.insertOne({
        _id: userIdStr,
        ...rest,
      });
    }
  }

  async getNonDeletedFileVersions(
    userId: TID,
  ): Promise<IFileVersionBase<TID>[]> {
    const fileDocs = await this.fileMetadata
      .find(filter({ ownerId: userId, deletedAt: null }, this.ids))
      .toArray();
    const fileIds = fileDocs.map((d) => {
      const id = (d as Record<string, unknown>)['_id'] as string;
      return id; // Already a string in storage
    });

    if (fileIds.length === 0) return [];

    const versionDocs = await this.fileVersions
      .find(filter({ fileId: { $in: fileIds } }, this.ids))
      .toArray();

    return versionDocs.map((d) =>
      fromDoc<TID, IFileVersionBase<TID>>(d, this.ids),
    );
  }
}
