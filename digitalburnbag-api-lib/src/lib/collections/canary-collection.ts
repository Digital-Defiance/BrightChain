import type { Collection } from '@brightchain/db';
import type {
  ICanaryBindingBase,
  ICanaryRepository,
  IRecipientListBase,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBCanaryRepository<TID extends PlatformID>
  implements ICanaryRepository<TID>
{
  constructor(
    private readonly canaryBindings: Collection,
    private readonly recipientLists: Collection,
    private readonly fileMetadata: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getBinding(bindingId: TID): Promise<ICanaryBindingBase<TID> | null> {
    const doc = await this.canaryBindings.findOne(
      filter({ _id: bindingId }, this.ids),
    );
    return doc ? fromDoc<TID, ICanaryBindingBase<TID>>(doc, this.ids) : null;
  }

  async createBinding(binding: ICanaryBindingBase<TID>): Promise<void> {
    await this.canaryBindings.insertOne(toDoc(binding, this.ids));
  }

  async updateBinding(
    bindingId: TID,
    updates: Partial<ICanaryBindingBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.canaryBindings.updateOne(filter({ _id: bindingId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  async deleteBinding(bindingId: TID): Promise<void> {
    await this.canaryBindings.deleteOne(filter({ _id: bindingId }, this.ids));
  }

  async getBindingsByUser(userId: TID): Promise<ICanaryBindingBase<TID>[]> {
    const docs = await this.canaryBindings
      .find(filter({ createdBy: userId }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, ICanaryBindingBase<TID>>(d, this.ids));
  }

  async getBindingsByCondition(
    condition: string,
  ): Promise<ICanaryBindingBase<TID>[]> {
    const docs = await this.canaryBindings
      .find(filter({ canaryCondition: condition }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, ICanaryBindingBase<TID>>(d, this.ids));
  }

  async getRecipientList(listId: TID): Promise<IRecipientListBase<TID> | null> {
    const doc = await this.recipientLists.findOne(
      filter({ _id: listId }, this.ids),
    );
    return doc ? fromDoc<TID, IRecipientListBase<TID>>(doc, this.ids) : null;
  }

  async createRecipientList(list: IRecipientListBase<TID>): Promise<void> {
    await this.recipientLists.insertOne(toDoc(list, this.ids));
  }

  async updateRecipientList(
    listId: TID,
    updates: Partial<IRecipientListBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.recipientLists.updateOne(filter({ _id: listId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  async getRecipientListsByUser(
    userId: TID,
  ): Promise<IRecipientListBase<TID>[]> {
    const docs = await this.recipientLists
      .find(filter({ createdBy: userId }, this.ids))
      .toArray();
    return docs.map((d) => fromDoc<TID, IRecipientListBase<TID>>(d, this.ids));
  }

  async getFilesInFolders(folderIds: TID[]): Promise<TID[]> {
    const serializedIds = folderIds.map((id) => this.ids.idToString(id));
    const docs = await this.fileMetadata
      .find(filter({ folderId: { $in: serializedIds } }, this.ids))
      .toArray();
    return docs.map((d) => {
      const _id = (d as Record<string, unknown>)['_id'] as string;
      try {
        return this.ids.parseId(_id);
      } catch {
        return _id as unknown as TID;
      }
    });
  }
}
