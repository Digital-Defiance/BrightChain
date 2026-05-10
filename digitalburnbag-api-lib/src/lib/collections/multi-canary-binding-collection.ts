import type { Collection } from '@brightchain/db';
import type { IMultiCanaryBindingBase } from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/**
 * BrightDB repository for the `multi_canary_bindings` collection.
 *
 * Stores multi-canary redundancy bindings that associate 2–20 provider
 * connections with a single vault, file, or folder using a configurable
 * redundancy policy. Evaluates provider signals collectively before
 * executing protocol actions, preventing premature vault destruction from
 * single-provider false positives.
 *
 * Follows the same pattern as BrightDBProviderConnectionRepository: accepts a
 * `Collection` from `@brightchain/db` and an `IdSerializer<TID>`.
 *
 * Requirements: 9.1, 9.6
 */
export class BrightDBMultiCanaryBindingRepository<TID extends PlatformID> {
  constructor(
    private readonly bindings: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  /**
   * Retrieve a single binding by its ID.
   */
  async getBindingById(
    bindingId: TID,
  ): Promise<IMultiCanaryBindingBase<TID> | null> {
    const doc = await this.bindings.findOne(
      filter({ _id: bindingId }, this.ids),
    );
    return doc
      ? fromDoc<TID, IMultiCanaryBindingBase<TID>>(doc, this.ids)
      : null;
  }

  /**
   * Retrieve all bindings belonging to a user.
   */
  async getBindingsForUser(
    userId: TID,
  ): Promise<IMultiCanaryBindingBase<TID>[]> {
    const docs = await this.bindings
      .find(filter({ userId }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IMultiCanaryBindingBase<TID>>(d, this.ids),
    );
  }

  /**
   * Retrieve all bindings that reference a specific target ID.
   * Searches across vaultContainerIds, fileIds, and folderIds arrays.
   */
  async getBindingsForTarget(
    targetId: TID,
  ): Promise<IMultiCanaryBindingBase<TID>[]> {
    const serializedId = this.ids.idToString(targetId);
    const docs = await this.bindings
      .find({
        $or: [
          { vaultContainerIds: serializedId },
          { fileIds: serializedId },
          { folderIds: serializedId },
        ],
      } as Parameters<Collection['find']>[0])
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IMultiCanaryBindingBase<TID>>(d, this.ids),
    );
  }

  /**
   * Retrieve all bindings that include a specific provider connection.
   * Used when a provider emits a signal to find all affected bindings.
   */
  async getBindingsForConnection(
    connectionId: TID,
  ): Promise<IMultiCanaryBindingBase<TID>[]> {
    const serializedId = this.ids.idToString(connectionId);
    const docs = await this.bindings
      .find({
        providerConnectionIds: serializedId,
      } as Parameters<Collection['find']>[0])
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IMultiCanaryBindingBase<TID>>(d, this.ids),
    );
  }

  /**
   * Persist a new multi-canary binding.
   */
  async createBinding(binding: IMultiCanaryBindingBase<TID>): Promise<void> {
    await this.bindings.insertOne(toDoc(binding, this.ids));
  }

  /**
   * Apply partial updates to an existing binding.
   * Automatically sets `updatedAt` to the current timestamp.
   */
  async updateBinding(
    bindingId: TID,
    updates: Partial<IMultiCanaryBindingBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    serializedUpdates['updatedAt'] = new Date();
    await this.bindings.updateOne(filter({ _id: bindingId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  /**
   * Remove a binding by its ID.
   */
  async deleteBinding(bindingId: TID): Promise<void> {
    await this.bindings.deleteOne(filter({ _id: bindingId }, this.ids));
  }
}
