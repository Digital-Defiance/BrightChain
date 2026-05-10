import type { Collection } from '@brightchain/db';
import type {
  IACLDocumentBase,
  IACLRepository,
  IFileMetadataBase,
  IFolderMetadataBase,
  IPermissionSetBase,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBACLRepository<TID extends PlatformID>
  implements IACLRepository<TID>
{
  constructor(
    private readonly aclDocuments: Collection,
    private readonly files: Collection,
    private readonly folders: Collection,
    private readonly permissionSets: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getACLById(aclId: TID): Promise<IACLDocumentBase<TID> | null> {
    const doc = await this.aclDocuments.findOne(
      filter({ _id: aclId }, this.ids),
    );
    return doc ? fromDoc<TID, IACLDocumentBase<TID>>(doc, this.ids) : null;
  }

  async upsertACL(acl: IACLDocumentBase<TID>): Promise<void> {
    const docData = toDoc(acl, this.ids);
    const { _id, ...rest } = docData;
    const result = await this.aclDocuments.updateOne(
      filter({ _id: acl.id }, this.ids),
      { $set: rest },
    );
    if (result.matchedCount === 0) {
      await this.aclDocuments.insertOne(docData);
    }
  }

  async updateFileAclId(fileId: TID, aclId: TID): Promise<void> {
    await this.files.updateOne(filter({ _id: fileId }, this.ids), {
      $set: { aclId: this.ids.idToString(aclId) },
    });
  }

  async updateFolderAclId(folderId: TID, aclId: TID): Promise<void> {
    await this.folders.updateOne(filter({ _id: folderId }, this.ids), {
      $set: { aclId: this.ids.idToString(aclId) },
    });
  }

  async getFolderById(folderId: TID): Promise<IFolderMetadataBase<TID> | null> {
    const doc = await this.folders.findOne(filter({ _id: folderId }, this.ids));
    return doc ? fromDoc<TID, IFolderMetadataBase<TID>>(doc, this.ids) : null;
  }

  async getFileById(fileId: TID): Promise<IFileMetadataBase<TID> | null> {
    const doc = await this.files.findOne(filter({ _id: fileId }, this.ids));
    return doc ? fromDoc<TID, IFileMetadataBase<TID>>(doc, this.ids) : null;
  }

  async getPermissionSetById(id: TID): Promise<IPermissionSetBase<TID> | null> {
    const doc = await this.permissionSets.findOne(
      filter({ _id: id }, this.ids),
    );
    return doc ? fromDoc<TID, IPermissionSetBase<TID>>(doc, this.ids) : null;
  }

  async createPermissionSet(ps: IPermissionSetBase<TID>): Promise<void> {
    await this.permissionSets.insertOne(toDoc(ps, this.ids));
  }

  async listPermissionSets(
    organizationId?: TID,
  ): Promise<IPermissionSetBase<TID>[]> {
    const f: Record<string, unknown> = organizationId ? { organizationId } : {};
    const docs = await this.permissionSets.find(filter(f, this.ids)).toArray();
    return docs.map((d) => fromDoc<TID, IPermissionSetBase<TID>>(d, this.ids));
  }
}
