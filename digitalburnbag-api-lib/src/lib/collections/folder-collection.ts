import type { Collection } from '@brightchain/db';
import type {
  IFileMetadataBase,
  IFolderMetadataBase,
  IFolderRepository,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBFolderRepository<TID extends PlatformID>
  implements IFolderRepository<TID>
{
  constructor(
    private readonly folders: Collection,
    private readonly fileMetadata: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getFolderById(folderId: TID): Promise<IFolderMetadataBase<TID> | null> {
    const doc = await this.folders.findOne(filter({ _id: folderId }, this.ids));
    return doc ? fromDoc<TID, IFolderMetadataBase<TID>>(doc, this.ids) : null;
  }

  async getRootFolder(
    userId: TID,
    vaultContainerId?: TID,
  ): Promise<IFolderMetadataBase<TID> | null> {
    const query: Record<string, unknown> = {
      ownerId: userId,
      parentFolderId: null,
    };
    if (vaultContainerId) {
      query.vaultContainerId = vaultContainerId;
    }
    const doc = await this.folders.findOne(filter(query, this.ids));
    return doc ? fromDoc<TID, IFolderMetadataBase<TID>>(doc, this.ids) : null;
  }

  async createFolder(
    folder: IFolderMetadataBase<TID>,
  ): Promise<IFolderMetadataBase<TID>> {
    await this.folders.insertOne(toDoc(folder, this.ids));
    return folder;
  }

  async folderExistsInParent(
    name: string,
    parentFolderId: TID,
    ownerId: TID,
  ): Promise<boolean> {
    const count = await this.folders.countDocuments(
      filter({ name, parentFolderId, ownerId }, this.ids),
    );
    return count > 0;
  }

  async getSubfolders(folderId: TID): Promise<IFolderMetadataBase<TID>[]> {
    const docs = await this.folders
      .find(filter({ parentFolderId: folderId, deletedAt: null }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IFolderMetadataBase<TID>>(d, this.ids));
  }

  async getFilesInFolder(folderId: TID): Promise<IFileMetadataBase<TID>[]> {
    const queryFilter = filter({ folderId, deletedAt: null }, this.ids);
    const docs = await this.fileMetadata.find(queryFilter).toArray();
    // Debug: log all documents in the collection to compare
    const allDocs = await this.fileMetadata.find({}).toArray();
    console.debug(
      '[FolderRepo] getFilesInFolder: query=%j matchCount=%d totalDocs=%d',
      queryFilter,
      docs.length,
      allDocs.length,
    );
    if (allDocs.length > 0 && docs.length === 0) {
      console.debug(
        '[FolderRepo] stored folderIds: %j',
        allDocs.map((d) => (d as Record<string, unknown>).folderId),
      );
    }
    return docs.map((d) => fromDoc<TID, IFileMetadataBase<TID>>(d, this.ids));
  }

  async updateParentFolder(folderId: TID, newParentId: TID): Promise<void> {
    await this.folders.updateOne(filter({ _id: folderId }, this.ids), {
      $set: { parentFolderId: this.ids.idToString(newParentId) },
    });
  }

  async updateFileFolder(fileId: TID, newFolderId: TID): Promise<void> {
    await this.fileMetadata.updateOne(filter({ _id: fileId }, this.ids), {
      $set: { folderId: this.ids.idToString(newFolderId) },
    });
  }

  async updateFolderName(folderId: TID, newName: string): Promise<void> {
    await this.folders.updateOne(filter({ _id: folderId }, this.ids), {
      $set: { name: newName },
    });
  }

  async softDeleteFolder(
    folderId: TID,
    deletedFromPath: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.folders.updateOne(filter({ _id: folderId }, this.ids), {
      $set: { deletedAt: now, deletedFromPath, updatedAt: now },
    });
  }
}
