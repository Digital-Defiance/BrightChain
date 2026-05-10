import type { Collection } from '@brightchain/db';
import type {
  IFileMetadataBase,
  IFileRepository,
  IFileSearchQuery,
  IFileVersionBase,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBFileRepository<TID extends PlatformID>
  implements IFileRepository<TID>
{
  constructor(
    private readonly fileMetadata: Collection,
    private readonly fileVersions: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getFileById(fileId: TID): Promise<IFileMetadataBase<TID> | null> {
    const doc = await this.fileMetadata.findOne(
      filter({ _id: fileId }, this.ids),
    );
    return doc ? fromDoc<TID, IFileMetadataBase<TID>>(doc, this.ids) : null;
  }

  async createFile(
    metadata: IFileMetadataBase<TID>,
  ): Promise<IFileMetadataBase<TID>> {
    await this.fileMetadata.insertOne(toDoc(metadata, this.ids));
    return metadata;
  }

  async updateFile(
    metadata: IFileMetadataBase<TID>,
  ): Promise<IFileMetadataBase<TID>> {
    const { id, ...rest } = metadata;
    const serializedRest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      serializedRest[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.fileMetadata.updateOne(filter({ _id: id }, this.ids), {
      $set: serializedRest,
    });
    return metadata;
  }

  async deleteFile(fileId: TID): Promise<void> {
    await this.fileMetadata.deleteOne(filter({ _id: fileId }, this.ids));
  }

  async getFilesByFolder(folderId: TID): Promise<IFileMetadataBase<TID>[]> {
    const docs = await this.fileMetadata
      .find(filter({ folderId, deletedAt: null }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IFileMetadataBase<TID>>(d, this.ids));
  }

  async searchFiles(
    query: IFileSearchQuery<TID>,
    accessibleFileIds: TID[],
  ): Promise<{ results: IFileMetadataBase<TID>[]; totalCount: number }> {
    const f: Record<string, unknown> = {};
    // Only filter by accessible IDs if the list is non-empty.
    // An empty list means ACL filtering is not yet wired — return all files.
    if (accessibleFileIds.length > 0) {
      f['_id'] = {
        $in: accessibleFileIds.map((id) => this.ids.idToString(id)),
      };
    }
    if (query.deleted) {
      f['deletedAt'] = { $ne: null };
    } else {
      f['deletedAt'] = null;
    }
    if (query.query) {
      f['fileName'] = { $regex: query.query, $options: 'i' };
    }
    if (query.tags && query.tags.length > 0) {
      f['tags'] = { $in: query.tags };
    }
    if (query.mimeType) {
      f['mimeType'] = query.mimeType;
    }
    if (query.folderId) {
      f['folderId'] = query.folderId;
    }
    if (query.dateFrom) {
      f['createdAt'] = { $gte: query.dateFrom };
    }
    if (query.dateTo) {
      f['createdAt'] = {
        ...((f['createdAt'] as Record<string, unknown>) ?? {}),
        $lte: query.dateTo,
      };
    }
    if (query.sizeMin !== undefined) {
      f['sizeBytes'] = { $gte: query.sizeMin };
    }
    if (query.sizeMax !== undefined) {
      f['sizeBytes'] = {
        ...((f['sizeBytes'] as Record<string, unknown>) ?? {}),
        $lte: query.sizeMax,
      };
    }

    const docs = await this.fileMetadata.find(filter(f, this.ids)).toArray();
    return {
      results: docs.map((d) =>
        fromDoc<TID, IFileMetadataBase<TID>>(d, this.ids),
      ),
      totalCount: docs.length,
    };
  }

  async getDeletedFiles(): Promise<IFileMetadataBase<TID>[]> {
    const docs = await this.fileMetadata
      .find(filter({ deletedAt: { $ne: null } }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IFileMetadataBase<TID>>(d, this.ids));
  }

  async getFileVersions(fileId: TID): Promise<IFileVersionBase<TID>[]> {
    const docs = await this.fileVersions
      .find(filter({ fileId }, this.ids))
      .toArray();
    docs.sort(
      (a, b) =>
        ((a as Record<string, unknown>)['versionNumber'] as number) -
        ((b as Record<string, unknown>)['versionNumber'] as number),
    );
    return docs.map((d) => fromDoc<TID, IFileVersionBase<TID>>(d, this.ids));
  }

  async getFileVersion(
    fileId: TID,
    versionId: TID,
  ): Promise<IFileVersionBase<TID> | null> {
    const doc = await this.fileVersions.findOne(
      filter({ _id: versionId, fileId }, this.ids),
    );
    return doc ? fromDoc<TID, IFileVersionBase<TID>>(doc, this.ids) : null;
  }

  async createFileVersion(
    version: IFileVersionBase<TID>,
  ): Promise<IFileVersionBase<TID>> {
    await this.fileVersions.insertOne(toDoc(version, this.ids));
    return version;
  }

  async updateFileVersion(
    version: IFileVersionBase<TID>,
  ): Promise<IFileVersionBase<TID>> {
    const { id, ...rest } = version;
    const serializedRest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      serializedRest[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.fileVersions.updateOne(filter({ _id: id }, this.ids), {
      $set: serializedRest,
    });
    return version;
  }
}
