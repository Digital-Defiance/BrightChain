import type { Collection } from '@brightchain/db';
import type {
  IExportableFile,
  IExportableFolder,
  IFolderExportRepository,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, type IdSerializer } from './brightdb-helpers';

export class BrightDBFolderExportRepository<TID extends PlatformID>
  implements IFolderExportRepository<TID>
{
  constructor(
    private readonly fileMetadata: Collection,
    private readonly folders: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getFilesInFolder(folderId: TID): Promise<IExportableFile<TID>[]> {
    const docs = await this.fileMetadata
      .find(filter({ folderId, deletedAt: null }, this.ids))
      .toArray();
    return docs.map((d) => {
      const doc = d as Record<string, unknown>;
      const rawId = doc['_id'] as string;
      let fileId: TID;
      try {
        fileId = this.ids.parseId(rawId);
      } catch {
        fileId = rawId as unknown as TID;
      }
      return {
        fileId,
        fileName: doc['fileName'] as string,
        mimeType: doc['mimeType'] as string,
        sizeBytes: doc['sizeBytes'] as number,
        relativePath: doc['fileName'] as string,
        depth: 0,
      } as IExportableFile<TID>;
    });
  }

  async getSubfolders(folderId: TID): Promise<IExportableFolder<TID>[]> {
    const docs = await this.folders
      .find(filter({ parentFolderId: folderId, deletedAt: null }, this.ids))
      .toArray();
    return docs.map((d) => {
      const doc = d as Record<string, unknown>;
      const rawId = doc['_id'] as string;
      let parsedId: TID;
      try {
        parsedId = this.ids.parseId(rawId);
      } catch {
        parsedId = rawId as unknown as TID;
      }
      return {
        folderId: parsedId,
        name: doc['name'] as string,
      } as IExportableFolder<TID>;
    });
  }
}
