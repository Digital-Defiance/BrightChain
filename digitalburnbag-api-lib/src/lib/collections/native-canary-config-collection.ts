import type { Collection } from '@brightchain/db';
import type { INativeCanaryConfigBase } from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/**
 * BrightDB repository for the `native_canary_configs` collection.
 *
 * Stores configuration for BrightChain-native canary providers that monitor
 * platform activity (logins, duress codes, file access, API usage, vault
 * interactions) without requiring external network access.
 *
 * Follows the same pattern as BrightDBProviderConnectionRepository: accepts a
 * `Collection` from `@brightchain/db` and an `IdSerializer<TID>`.
 *
 * Requirements: 8.1, 8.4, 8.5, 8.6
 */
export class BrightDBNativeCanaryConfigRepository<TID extends PlatformID> {
  constructor(
    private readonly configs: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getConfigById(
    configId: TID,
  ): Promise<INativeCanaryConfigBase<TID> | null> {
    const doc = await this.configs.findOne(filter({ _id: configId }, this.ids));
    return doc
      ? fromDoc<TID, INativeCanaryConfigBase<TID>>(doc, this.ids)
      : null;
  }

  async getConfigsByUser(
    userId: TID,
  ): Promise<INativeCanaryConfigBase<TID>[]> {
    const docs = await this.configs
      .find(filter({ userId }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, INativeCanaryConfigBase<TID>>(d, this.ids),
    );
  }

  async createConfig(config: INativeCanaryConfigBase<TID>): Promise<void> {
    await this.configs.insertOne(toDoc(config, this.ids));
  }

  async updateConfig(
    configId: TID,
    updates: Partial<INativeCanaryConfigBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    serializedUpdates['updatedAt'] = new Date();
    await this.configs.updateOne(filter({ _id: configId }, this.ids), {
      $set: serializedUpdates,
    });
  }
}
