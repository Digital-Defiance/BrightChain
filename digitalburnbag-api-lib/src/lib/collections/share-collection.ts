import type { Collection } from '@brightchain/db';
import type {
  IACLDocumentBase,
  IShareLinkBase,
  IShareRepository,
  ISharedItem,
} from '@brightchain/digitalburnbag-lib';
import { PermissionLevel } from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBShareRepository<TID extends PlatformID>
  implements IShareRepository<TID>
{
  constructor(
    private readonly shareLinks: Collection,
    private readonly aclDocuments: Collection,
    private readonly files: Collection,
    private readonly folders: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async createShareLink(
    link: IShareLinkBase<TID>,
  ): Promise<IShareLinkBase<TID>> {
    const { id, ...rest } = link;
    const serializedRest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      serializedRest[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.shareLinks.insertOne({
      _id: this.ids.idToString(id as TID),
      ...serializedRest,
    });
    return link;
  }

  async getShareLinkById(linkId: TID): Promise<IShareLinkBase<TID> | null> {
    const doc = await this.shareLinks.findOne(
      filter({ _id: linkId }, this.ids),
    );
    return doc ? fromDoc<TID, IShareLinkBase<TID>>(doc, this.ids) : null;
  }

  async getShareLinkByToken(
    token: string,
  ): Promise<IShareLinkBase<TID> | null> {
    const doc = await this.shareLinks.findOne(filter({ token }, this.ids));
    return doc ? fromDoc<TID, IShareLinkBase<TID>>(doc, this.ids) : null;
  }

  async updateShareLink(
    link: IShareLinkBase<TID>,
  ): Promise<IShareLinkBase<TID>> {
    const { id, ...rest } = link;
    const serializedRest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      serializedRest[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.shareLinks.updateOne(filter({ _id: id }, this.ids), {
      $set: serializedRest,
    });
    return link;
  }

  async deleteShareLink(linkId: TID): Promise<void> {
    await this.shareLinks.deleteOne(filter({ _id: linkId }, this.ids));
  }

  async getShareLinksForFile(fileId: TID): Promise<IShareLinkBase<TID>[]> {
    const docs = await this.shareLinks
      .find(filter({ fileId }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IShareLinkBase<TID>>(d, this.ids));
  }

  async getSharedItems(userId: TID): Promise<ISharedItem<TID>[]> {
    const aclDocs = await this.aclDocuments
      .find(filter({}, this.ids))
      .toArray();
    const items: ISharedItem<TID>[] = [];
    const userIdStr = this.ids.idToString(userId);

    for (const aclDoc of aclDocs) {
      const acl = fromDoc<TID, IACLDocumentBase<TID> & { id: TID }>(
        aclDoc,
        this.ids,
      );
      const matchingEntry = acl.entries.find(
        (e) =>
          e.principalType === 'user' &&
          (e.principalId instanceof Uint8Array
            ? this.ids.idToString(e.principalId as TID) === userIdStr
            : e.principalId === userId),
      );
      if (!matchingEntry) continue;

      const aclId = acl.id;
      const aclIdStr = this.ids.idToString(aclId);

      const fileDocs = await this.files
        .find(filter({ aclId: aclIdStr }, this.ids))
        .toArray();
      for (const fd of fileDocs) {
        const f = fromDoc<TID, { id: TID; ownerId: TID }>(fd, this.ids);
        items.push({
          itemId: f.id,
          itemType: 'file',
          sharedBy: f.ownerId,
          permissionLevel: matchingEntry.permissionLevel as PermissionLevel,
          sharedAt: acl.updatedAt,
        });
      }

      const folderDocs = await this.folders
        .find(filter({ aclId: aclIdStr }, this.ids))
        .toArray();
      for (const fld of folderDocs) {
        const fl = fromDoc<TID, { id: TID; ownerId: TID }>(fld, this.ids);
        items.push({
          itemId: fl.id,
          itemType: 'folder',
          sharedBy: fl.ownerId,
          permissionLevel: matchingEntry.permissionLevel as PermissionLevel,
          sharedAt: acl.updatedAt,
        });
      }
    }

    return items;
  }
}
